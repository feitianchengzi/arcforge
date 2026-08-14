import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import type {
  CatalogListResult,
  CatalogResolveCandidate,
  CatalogResolveMode,
  CatalogResolveResult,
  UserSkillCatalog,
  UserSkillCatalogEntry
} from "../shared/types.js";

export interface SkillCatalogOptions {
  catalogRoot?: string;
}

export interface SaveUserSkillCatalogOptions extends SkillCatalogOptions {
  now?: Date;
}

export class SkillCatalogError extends Error {
  constructor(public readonly code: "CATALOG_INVALID" | "CATALOG_PATH_ESCAPE" | "CATALOG_CONTENT_DRIFT", message: string) {
    super(message);
    this.name = "SkillCatalogError";
  }
}

export function userSkillCatalogRoot(options: SkillCatalogOptions = {}): string {
  return path.resolve(options.catalogRoot ?? path.join(os.homedir(), ".arcforge", "catalog"));
}

export function userSkillCatalogPath(options: SkillCatalogOptions = {}): string {
  return path.join(userSkillCatalogRoot(options), "index.json");
}

export function catalogQualifiedName(sourceKey: string, skillName: string): string {
  return `${sourceKey}:${skillName}`;
}

export async function loadUserSkillCatalog(options: SkillCatalogOptions = {}): Promise<UserSkillCatalog> {
  const indexPath = userSkillCatalogPath(options);
  let raw: string;
  try {
    raw = await fs.readFile(indexPath, "utf8");
  } catch (error) {
    if (isNodeError(error, "ENOENT")) return { version: 1, updatedAt: new Date(0).toISOString(), entries: [] };
    throw error;
  }
  try {
    return parseUserSkillCatalog(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SkillCatalogError) throw error;
    throw new SkillCatalogError("CATALOG_INVALID", `Catalog index is not valid JSON: ${indexPath}`);
  }
}

export async function saveUserSkillCatalog(
  entries: UserSkillCatalogEntry[],
  options: SaveUserSkillCatalogOptions = {}
): Promise<UserSkillCatalog> {
  const root = userSkillCatalogRoot(options);
  const indexPath = userSkillCatalogPath(options);
  const catalog = parseUserSkillCatalog({
    version: 1,
    updatedAt: (options.now ?? new Date()).toISOString(),
    entries: entries.map(normalizeCatalogEntry).sort((left, right) => left.qualifiedName.localeCompare(right.qualifiedName))
  });
  await fs.mkdir(root, { recursive: true });
  const temporaryPath = path.join(root, `.index.json.tmp-${process.pid}-${crypto.randomUUID()}`);
  let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
  try {
    handle = await fs.open(temporaryPath, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(catalog, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await fs.rename(temporaryPath, indexPath);
  } finally {
    await handle?.close().catch(() => undefined);
    await fs.unlink(temporaryPath).catch(() => undefined);
  }
  return catalog;
}

export async function resolveCatalogSkill(
  query: string,
  mode: CatalogResolveMode = "exact",
  options: SkillCatalogOptions = {}
): Promise<CatalogResolveResult> {
  const normalizedQuery = normalizeLookup(query);
  if (!normalizedQuery) throw new SkillCatalogError("CATALOG_INVALID", "Catalog query is required.");
  if (mode !== "exact" && mode !== "search") throw new SkillCatalogError("CATALOG_INVALID", `Unsupported catalog resolve mode: ${mode}`);

  const catalog = await loadUserSkillCatalog(options);
  const matches = catalog.entries.filter((entry) => mode === "exact"
    ? exactMatch(entry, normalizedQuery)
    : searchMatch(entry, normalizedQuery));
  const candidates = matches.map(toCandidate).sort((left, right) => left.qualifiedName.localeCompare(right.qualifiedName));
  if (matches.length === 0) return { status: "not-found", candidates: [] };
  if (matches.length > 1) return { status: "ambiguous", candidates };

  await validateResolvedCatalogEntry(matches[0], options);
  return { status: "resolved", resolved: matches[0], candidates };
}

export async function listCatalogSkills(options: SkillCatalogOptions = {}): Promise<CatalogListResult> {
  const catalog = await loadUserSkillCatalog(options);
  const candidates = catalog.entries
    .map(toCandidate)
    .sort((left, right) => left.qualifiedName.localeCompare(right.qualifiedName));
  return { status: candidates.length > 0 ? "available" : "empty", candidates };
}

export async function catalogDirectoryDigest(root: string): Promise<string> {
  const files = await listDigestFiles(root);
  const manifest = await Promise.all(files.map(async (filePath) => [
    toPosixPath(path.relative(root, filePath)),
    crypto.createHash("sha256").update(await fs.readFile(filePath)).digest("hex")
  ] as const));
  return crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
}

function parseUserSkillCatalog(value: unknown): UserSkillCatalog {
  if (!isRecord(value) || value.version !== 1 || !isDateTime(value.updatedAt) || !Array.isArray(value.entries)) {
    throw new SkillCatalogError("CATALOG_INVALID", "Catalog index must contain version 1, updatedAt, and entries.");
  }
  const entries = value.entries.map((entry, index) => parseCatalogEntry(entry, index));
  const qualifiedNames = new Set<string>();
  const sourcePaths = new Set<string>();
  for (const entry of entries) {
    const normalizedQualifiedName = normalizeLookup(entry.qualifiedName);
    const sourcePathKey = `${entry.sourceKey}\u0000${entry.skillPath}`;
    if (qualifiedNames.has(normalizedQualifiedName)) {
      throw new SkillCatalogError("CATALOG_INVALID", `Catalog qualifiedName is duplicated: ${entry.qualifiedName}`);
    }
    if (sourcePaths.has(sourcePathKey)) {
      throw new SkillCatalogError("CATALOG_INVALID", `Catalog sourceKey and skillPath are duplicated: ${entry.sourceKey}/${entry.skillPath}`);
    }
    qualifiedNames.add(normalizedQualifiedName);
    sourcePaths.add(sourcePathKey);
  }
  return { version: 1, updatedAt: value.updatedAt, entries };
}

function parseCatalogEntry(value: unknown, index: number): UserSkillCatalogEntry {
  if (!isRecord(value)) throw new SkillCatalogError("CATALOG_INVALID", `Catalog entry ${index} must be an object.`);
  const requiredStrings = ["qualifiedName", "sourceKey", "skillName", "sourceRoot", "skillPath", "installedPath", "contentDigest", "installedAt"] as const;
  for (const field of requiredStrings) {
    if (typeof value[field] !== "string" || !value[field].trim()) {
      throw new SkillCatalogError("CATALOG_INVALID", `Catalog entry ${index} has an invalid ${field}.`);
    }
  }
  if (!/^[a-f0-9]{24}$/.test(value.sourceKey as string)) {
    throw new SkillCatalogError("CATALOG_INVALID", `Catalog entry ${index} has an invalid sourceKey.`);
  }
  if (!isSafePathSegment(value.skillName as string)) {
    throw new SkillCatalogError("CATALOG_INVALID", `Catalog entry ${index} has an unsafe skillName.`);
  }
  if (value.qualifiedName !== catalogQualifiedName(value.sourceKey as string, value.skillName as string)) {
    throw new SkillCatalogError("CATALOG_INVALID", `Catalog entry ${index} qualifiedName does not match sourceKey and skillName.`);
  }
  if (!isSafeRelativePath(value.skillPath as string)) {
    throw new SkillCatalogError("CATALOG_INVALID", `Catalog entry ${index} has an unsafe skillPath.`);
  }
  if (!path.isAbsolute(value.installedPath as string) || !/^[a-f0-9]{64}$/.test(value.contentDigest as string) || !isDateTime(value.installedAt)) {
    throw new SkillCatalogError("CATALOG_INVALID", `Catalog entry ${index} has invalid installation metadata.`);
  }
  const aliases = optionalStringArray(value.aliases, `Catalog entry ${index} aliases`);
  const appliedRecordIds = requiredStringArray(value.appliedRecordIds, `Catalog entry ${index} appliedRecordIds`);
  const sourceRemoteUrl = optionalString(value.sourceRemoteUrl, `Catalog entry ${index} sourceRemoteUrl`);
  const sourceCommit = optionalString(value.sourceCommit, `Catalog entry ${index} sourceCommit`);
  const summary = optionalString(value.summary, `Catalog entry ${index} summary`);
  return {
    qualifiedName: value.qualifiedName as string,
    sourceKey: value.sourceKey as string,
    skillName: value.skillName as string,
    aliases,
    summary,
    sourceRoot: value.sourceRoot as string,
    sourceRemoteUrl,
    sourceCommit,
    skillPath: normalizeSkillPath(value.skillPath as string),
    installedPath: path.resolve(value.installedPath as string),
    contentDigest: value.contentDigest as string,
    appliedRecordIds,
    installedAt: value.installedAt as string
  };
}

async function validateResolvedCatalogEntry(entry: UserSkillCatalogEntry, options: SkillCatalogOptions): Promise<void> {
  const root = userSkillCatalogRoot(options);
  const sourceRoot = path.join(root, entry.sourceKey);
  const resolvedCatalogRoot = await fs.realpath(root).catch(() => root);
  const resolvedSourceRoot = await fs.realpath(sourceRoot).catch(() => sourceRoot);
  let resolvedInstalledPath: string;
  try {
    resolvedInstalledPath = await fs.realpath(entry.installedPath);
  } catch {
    throw new SkillCatalogError("CATALOG_CONTENT_DRIFT", `Catalog skill directory is missing: ${entry.qualifiedName}`);
  }
  if (!isContainedPath(resolvedCatalogRoot, resolvedSourceRoot) || !isContainedPath(resolvedSourceRoot, resolvedInstalledPath)) {
    throw new SkillCatalogError("CATALOG_PATH_ESCAPE", `Catalog skill path escapes its source root: ${entry.qualifiedName}`);
  }
  let digest: string;
  try {
    digest = await catalogDirectoryDigest(resolvedInstalledPath);
  } catch {
    throw new SkillCatalogError("CATALOG_CONTENT_DRIFT", `Catalog skill content could not be read consistently: ${entry.qualifiedName}`);
  }
  if (digest !== entry.contentDigest) {
    throw new SkillCatalogError("CATALOG_CONTENT_DRIFT", `Catalog skill content digest differs from the index: ${entry.qualifiedName}`);
  }
}

function normalizeCatalogEntry(entry: UserSkillCatalogEntry): UserSkillCatalogEntry {
  return {
    ...entry,
    aliases: entry.aliases ? [...new Set(entry.aliases.map((item) => item.trim()).filter(Boolean))].sort() : undefined,
    appliedRecordIds: [...new Set(entry.appliedRecordIds.map((item) => item.trim()).filter(Boolean))].sort(),
    skillPath: normalizeSkillPath(entry.skillPath),
    installedPath: path.resolve(entry.installedPath)
  };
}

function exactMatch(entry: UserSkillCatalogEntry, query: string): boolean {
  return [entry.qualifiedName, entry.skillName, ...(entry.aliases ?? [])].some((value) => normalizeLookup(value) === query);
}

function searchMatch(entry: UserSkillCatalogEntry, query: string): boolean {
  return [entry.skillName, ...(entry.aliases ?? []), entry.summary ?? ""].some((value) => normalizeLookup(value).includes(query));
}

function toCandidate(entry: UserSkillCatalogEntry): CatalogResolveCandidate {
  return {
    skillName: entry.skillName,
    qualifiedName: entry.qualifiedName,
    sourceKey: entry.sourceKey,
    summary: entry.summary
  };
}

async function listDigestFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  async function walk(directory: string): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if ([".git", "node_modules", "dist"].includes(entry.name)) continue;
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(filePath);
      else if (entry.isFile()) files.push(filePath);
    }
  }
  await walk(root);
  return files;
}

function isContainedPath(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function requiredStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new SkillCatalogError("CATALOG_INVALID", `${label} must be an array of non-empty strings.`);
  }
  return [...value];
}

function optionalStringArray(value: unknown, label: string): string[] | undefined {
  if (value === undefined) return undefined;
  return requiredStringArray(value, label);
}

function optionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) throw new SkillCatalogError("CATALOG_INVALID", `${label} must be a non-empty string.`);
  return value;
}

function isSafeRelativePath(value: string): boolean {
  if (!value || path.posix.isAbsolute(toPosixPath(value))) return false;
  const normalized = normalizeSkillPath(value);
  return normalized !== "." && normalized !== ".." && !normalized.startsWith("../");
}

function isSafePathSegment(value: string): boolean {
  return Boolean(value) && value !== "." && value !== ".." && !value.includes("/") && !value.includes("\\") && value.trim() === value;
}

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase();
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/").replaceAll("\\", "/");
}

function normalizeSkillPath(value: string): string {
  return path.posix.normalize(toPosixPath(value));
}

function isDateTime(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNodeError(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === code;
}
