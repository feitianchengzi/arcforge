import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import type {
  CatalogListResult,
  CatalogResolveCandidate,
  CatalogResolveMode,
  CatalogResolveResult,
  CatalogSourceSelection,
  CatalogVersionDecision,
  UserSkillCatalog,
  UserSkillCatalogConflictReason,
  UserSkillCatalogEntry,
  UserSkillCatalogSourceClaim
} from "../shared/types.js";

export interface SkillCatalogOptions {
  catalogRoot?: string;
}

export interface SaveUserSkillCatalogOptions extends SkillCatalogOptions {
  now?: Date;
}

type SkillCatalogErrorCode = "CATALOG_INVALID" | "CATALOG_PATH_ESCAPE" | "CATALOG_CONTENT_DRIFT" | "CATALOG_VERSION_CONFLICT";

interface LegacyCatalogEntry {
  qualifiedName: string;
  sourceKey: string;
  skillName: string;
  aliases?: string[];
  summary?: string;
  sourceRoot: string;
  sourceRemoteUrl?: string;
  sourceCommit?: string;
  skillPath: string;
  version?: string;
  installedPath: string;
  contentDigest: string;
  appliedRecordIds: string[];
  installedAt: string;
}

export class SkillCatalogError extends Error {
  constructor(public readonly code: SkillCatalogErrorCode, message: string) {
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

/** The v2 qualified name is the stable logical skill name. The two-argument form remains source-compatible with v1 callers. */
export function catalogQualifiedName(sourceKeyOrSkillName: string, skillName?: string): string {
  return skillName ?? sourceKeyOrSkillName;
}

export function catalogLegacyQualifiedName(sourceKey: string, skillName: string): string {
  return `${sourceKey}:${skillName}`;
}

export async function loadUserSkillCatalog(options: SkillCatalogOptions = {}): Promise<UserSkillCatalog> {
  const indexPath = userSkillCatalogPath(options);
  let raw: string;
  try {
    raw = await fs.readFile(indexPath, "utf8");
  } catch (error) {
    if (isNodeError(error, "ENOENT")) return { version: 2, updatedAt: new Date(0).toISOString(), entries: [] };
    throw error;
  }
  try {
    return parseUserSkillCatalog(JSON.parse(raw), userSkillCatalogRoot(options));
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
  const catalog = parseUserSkillCatalog({
    version: 2,
    updatedAt: (options.now ?? new Date()).toISOString(),
    entries: entries.map(normalizeCatalogEntry).sort(compareCatalogEntries)
  }, root);
  await atomicWriteCatalog(`${JSON.stringify(catalog, null, 2)}\n`, options);
  return catalog;
}

export async function readUserSkillCatalogIndex(options: SkillCatalogOptions = {}): Promise<string | undefined> {
  try {
    return await fs.readFile(userSkillCatalogPath(options), "utf8");
  } catch (error) {
    if (isNodeError(error, "ENOENT")) return undefined;
    throw error;
  }
}

export async function restoreUserSkillCatalogIndex(raw: string | undefined, options: SkillCatalogOptions = {}): Promise<void> {
  if (raw === undefined) {
    await fs.unlink(userSkillCatalogPath(options)).catch((error) => {
      if (!isNodeError(error, "ENOENT")) throw error;
    });
    return;
  }
  parseUserSkillCatalog(JSON.parse(raw), userSkillCatalogRoot(options));
  await atomicWriteCatalog(raw.endsWith("\n") ? raw : `${raw}\n`, options);
}

export function decideCatalogVersion(
  current: UserSkillCatalogEntry | undefined,
  incomingVersion: string | undefined,
  incomingDigest: string,
  options: {
    incomingSourceKey?: string;
    incomingSourceCommit?: string;
    selection?: CatalogSourceSelection;
  } = {}
): CatalogVersionDecision {
  if (!current) {
    return {
      action: "install",
      incomingVersion,
      incomingDigest,
      incomingSourceKey: options.incomingSourceKey,
      incomingSourceCommit: options.incomingSourceCommit,
      reason: "No logical catalog entry exists for this skill."
    };
  }
  const activeClaim = current.sourceClaims.find((claim) => claim.sourceKey === current.activeSourceKey && claim.contentDigest === current.contentDigest);
  const base = {
    currentVersion: current.version,
    incomingVersion,
    currentDigest: current.contentDigest,
    incomingDigest,
    currentSourceKey: current.activeSourceKey,
    incomingSourceKey: options.incomingSourceKey,
    currentSourceCommit: activeClaim?.sourceCommit,
    incomingSourceCommit: options.incomingSourceCommit
  };
  const selection = options.selection;
  if (selection
    && options.incomingSourceKey
    && selection.sourceKey === options.incomingSourceKey
    && selection.contentDigest === incomingDigest
    && selection.expectedCurrentDigest === current.contentDigest) {
    return { ...base, action: "source-selected", reason: "The incoming source was explicitly selected against the current catalog digest; a fresh apply may replace the active copy." };
  }
  if (current.status === "conflict") {
    return { ...base, action: "conflict", reason: "The logical catalog entry already has an unresolved source conflict." };
  }
  if (current.contentDigest === incomingDigest) {
    return { ...base, action: "merge-provenance", reason: "The incoming content matches the active logical catalog copy." };
  }
  const currentSemVer = parseSemVer(current.version);
  const incomingSemVer = parseSemVer(incomingVersion);
  if (!currentSemVer || !incomingSemVer) {
    return { ...base, action: "conflict", reason: "Differing content cannot be ordered because one or both versions are missing or invalid Semantic Versions." };
  }
  const comparison = compareSemVer(incomingSemVer, currentSemVer);
  if (comparison > 0) return { ...base, action: "upgrade", reason: `Incoming version ${incomingVersion} is newer than active version ${current.version}.` };
  if (comparison < 0) return { ...base, action: "downgrade-blocked", reason: `Incoming version ${incomingVersion} is older than active version ${current.version}.` };
  return { ...base, action: "conflict", reason: `Version ${incomingVersion} has differing content digests across sources.` };
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
  const matches = catalog.entries.filter((entry) => mode === "exact" ? exactMatch(entry, normalizedQuery) : searchMatch(entry, normalizedQuery));
  const candidates = matches.map(toCandidate).sort(compareCandidates);
  if (matches.length === 0) return { status: "not-found", candidates: [] };
  if (matches.length > 1) return { status: "ambiguous", candidates };
  if (matches[0].status === "conflict") {
    throw new SkillCatalogError("CATALOG_VERSION_CONFLICT", `Catalog skill has an unresolved version conflict: ${matches[0].qualifiedName}`);
  }

  await validateResolvedCatalogEntry(matches[0], options);
  return { status: "resolved", resolved: matches[0], candidates };
}

export async function listCatalogSkills(options: SkillCatalogOptions = {}): Promise<CatalogListResult> {
  const catalog = await loadUserSkillCatalog(options);
  const candidates = catalog.entries.map(toCandidate).sort(compareCandidates);
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

function parseUserSkillCatalog(value: unknown, catalogRoot: string): UserSkillCatalog {
  if (!isRecord(value) || !isDateTime(value.updatedAt) || !Array.isArray(value.entries)) {
    throw new SkillCatalogError("CATALOG_INVALID", "Catalog index must contain updatedAt and entries.");
  }
  if (value.version === 1) return migrateLegacyCatalog(value.entries, value.updatedAt as string, catalogRoot);
  if (value.version !== 2) throw new SkillCatalogError("CATALOG_INVALID", "Catalog index must use version 1 or 2.");
  const entries = value.entries.map((entry, index) => parseCatalogEntry(entry, index));
  validateUniqueEntries(entries);
  return { version: 2, updatedAt: value.updatedAt as string, entries };
}

function parseCatalogEntry(value: unknown, index: number): UserSkillCatalogEntry {
  if (!isRecord(value)) throw new SkillCatalogError("CATALOG_INVALID", `Catalog entry ${index} must be an object.`);
  const requiredStrings = ["qualifiedName", "skillName", "status", "activeSourceKey", "installedPath", "contentDigest", "installedAt"] as const;
  for (const field of requiredStrings) {
    if (typeof value[field] !== "string" || !value[field].trim()) throw new SkillCatalogError("CATALOG_INVALID", `Catalog entry ${index} has an invalid ${field}.`);
  }
  if (!isSafePathSegment(value.skillName as string) || value.qualifiedName !== catalogQualifiedName(value.skillName as string)) {
    throw new SkillCatalogError("CATALOG_INVALID", `Catalog entry ${index} has an invalid logical name.`);
  }
  if (value.status !== "ready" && value.status !== "conflict") throw new SkillCatalogError("CATALOG_INVALID", `Catalog entry ${index} has an invalid status.`);
  if (!isSourceKey(value.activeSourceKey) || !path.isAbsolute(value.installedPath as string) || !isDigest(value.contentDigest) || !isDateTime(value.installedAt)) {
    throw new SkillCatalogError("CATALOG_INVALID", `Catalog entry ${index} has invalid active installation metadata.`);
  }
  const conflictReason = optionalConflictReason(value.conflictReason, `Catalog entry ${index} conflictReason`);
  if ((value.status === "conflict") !== Boolean(conflictReason)) throw new SkillCatalogError("CATALOG_INVALID", `Catalog entry ${index} conflict status and reason do not agree.`);
  if (!Array.isArray(value.sourceClaims) || value.sourceClaims.length === 0) throw new SkillCatalogError("CATALOG_INVALID", `Catalog entry ${index} sourceClaims must not be empty.`);
  const sourceClaims = value.sourceClaims.map((claim, claimIndex) => parseSourceClaim(claim, `${index}.${claimIndex}`));
  if (!sourceClaims.some((claim) => claim.sourceKey === value.activeSourceKey && claim.contentDigest === value.contentDigest)) {
    throw new SkillCatalogError("CATALOG_INVALID", `Catalog entry ${index} active source is absent from sourceClaims.`);
  }
  const version = optionalString(value.version, `Catalog entry ${index} version`);
  const aliases = optionalStringArray(value.aliases, `Catalog entry ${index} aliases`);
  const summary = optionalString(value.summary, `Catalog entry ${index} summary`);
  const appliedRecordIds = requiredStringArray(value.appliedRecordIds, `Catalog entry ${index} appliedRecordIds`);
  return {
    qualifiedName: value.qualifiedName as string,
    skillName: value.skillName as string,
    version,
    status: value.status as UserSkillCatalogEntry["status"],
    conflictReason,
    activeSourceKey: value.activeSourceKey as string,
    aliases,
    summary,
    installedPath: path.resolve(value.installedPath as string),
    contentDigest: value.contentDigest as string,
    sourceClaims,
    appliedRecordIds,
    installedAt: value.installedAt as string
  };
}

function parseSourceClaim(value: unknown, label: string): UserSkillCatalogSourceClaim {
  if (!isRecord(value)) throw new SkillCatalogError("CATALOG_INVALID", `Catalog source claim ${label} must be an object.`);
  const requiredStrings = ["sourceKey", "sourceRoot", "skillPath", "contentDigest", "observedAt"] as const;
  for (const field of requiredStrings) {
    if (typeof value[field] !== "string" || !value[field].trim()) throw new SkillCatalogError("CATALOG_INVALID", `Catalog source claim ${label} has an invalid ${field}.`);
  }
  if (!isSourceKey(value.sourceKey) || !isSafeRelativePath(value.skillPath as string) || !isDigest(value.contentDigest) || !isDateTime(value.observedAt)) {
    throw new SkillCatalogError("CATALOG_INVALID", `Catalog source claim ${label} has invalid provenance metadata.`);
  }
  return {
    sourceKey: value.sourceKey as string,
    sourceRoot: value.sourceRoot as string,
    sourceRemoteUrl: optionalString(value.sourceRemoteUrl, `Catalog source claim ${label} sourceRemoteUrl`),
    sourceCommit: optionalString(value.sourceCommit, `Catalog source claim ${label} sourceCommit`),
    skillPath: normalizeSkillPath(value.skillPath as string),
    version: optionalString(value.version, `Catalog source claim ${label} version`),
    contentDigest: value.contentDigest as string,
    appliedRecordIds: requiredStringArray(value.appliedRecordIds, `Catalog source claim ${label} appliedRecordIds`),
    observedAt: value.observedAt as string
  };
}

function parseLegacyEntry(value: unknown, index: number): LegacyCatalogEntry {
  if (!isRecord(value)) throw new SkillCatalogError("CATALOG_INVALID", `Legacy catalog entry ${index} must be an object.`);
  const requiredStrings = ["qualifiedName", "sourceKey", "skillName", "sourceRoot", "skillPath", "installedPath", "contentDigest", "installedAt"] as const;
  for (const field of requiredStrings) {
    if (typeof value[field] !== "string" || !value[field].trim()) throw new SkillCatalogError("CATALOG_INVALID", `Legacy catalog entry ${index} has an invalid ${field}.`);
  }
  if (!isSourceKey(value.sourceKey) || !isSafePathSegment(value.skillName as string)
    || value.qualifiedName !== catalogLegacyQualifiedName(value.sourceKey as string, value.skillName as string)
    || !isSafeRelativePath(value.skillPath as string) || !path.isAbsolute(value.installedPath as string)
    || !isDigest(value.contentDigest) || !isDateTime(value.installedAt)) {
    throw new SkillCatalogError("CATALOG_INVALID", `Legacy catalog entry ${index} has invalid identity or installation metadata.`);
  }
  return {
    qualifiedName: value.qualifiedName as string,
    sourceKey: value.sourceKey as string,
    skillName: value.skillName as string,
    aliases: optionalStringArray(value.aliases, `Legacy catalog entry ${index} aliases`),
    summary: optionalString(value.summary, `Legacy catalog entry ${index} summary`),
    sourceRoot: value.sourceRoot as string,
    sourceRemoteUrl: optionalString(value.sourceRemoteUrl, `Legacy catalog entry ${index} sourceRemoteUrl`),
    sourceCommit: optionalString(value.sourceCommit, `Legacy catalog entry ${index} sourceCommit`),
    skillPath: normalizeSkillPath(value.skillPath as string),
    version: optionalString(value.version, `Legacy catalog entry ${index} version`),
    installedPath: path.resolve(value.installedPath as string),
    contentDigest: value.contentDigest as string,
    appliedRecordIds: requiredStringArray(value.appliedRecordIds, `Legacy catalog entry ${index} appliedRecordIds`),
    installedAt: value.installedAt as string
  };
}

function migrateLegacyCatalog(values: unknown[], updatedAt: string, catalogRoot: string): UserSkillCatalog {
  const legacy = values.map(parseLegacyEntry).sort((left, right) => left.qualifiedName.localeCompare(right.qualifiedName));
  const groups = new Map<string, LegacyCatalogEntry[]>();
  for (const entry of legacy) {
    const key = normalizeLookup(entry.skillName);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  const entries = [...groups.values()].map((group) => migrateLegacyGroup(group, catalogRoot)).sort(compareCatalogEntries);
  validateUniqueEntries(entries);
  return { version: 2, updatedAt, entries, migratedFromVersion: 1 };
}

function migrateLegacyGroup(group: LegacyCatalogEntry[], catalogRoot: string): UserSkillCatalogEntry {
  const ordered = [...group].sort((left, right) => left.qualifiedName.localeCompare(right.qualifiedName));
  const resolution = resolveLegacyActive(ordered);
  const active = resolution.active;
  const sourceClaims = ordered.map((entry) => ({
    sourceKey: entry.sourceKey,
    sourceRoot: entry.sourceRoot,
    sourceRemoteUrl: entry.sourceRemoteUrl,
    sourceCommit: entry.sourceCommit,
    skillPath: entry.skillPath,
    version: entry.version,
    contentDigest: entry.contentDigest,
    appliedRecordIds: [...new Set(entry.appliedRecordIds)].sort(),
    observedAt: entry.installedAt
  }));
  return normalizeCatalogEntry({
    qualifiedName: catalogQualifiedName(active.skillName),
    skillName: active.skillName,
    version: active.version,
    status: resolution.conflictReason ? "conflict" : "ready",
    conflictReason: resolution.conflictReason,
    activeSourceKey: active.sourceKey,
    aliases: [...new Set(ordered.flatMap((entry) => entry.aliases ?? []))].sort(),
    summary: active.summary,
    installedPath: path.join(catalogRoot, active.skillName),
    contentDigest: active.contentDigest,
    sourceClaims,
    appliedRecordIds: [...new Set(ordered.flatMap((entry) => entry.appliedRecordIds))].sort(),
    installedAt: active.installedAt
  });
}

function resolveLegacyActive(group: LegacyCatalogEntry[]): { active: LegacyCatalogEntry; conflictReason?: UserSkillCatalogConflictReason } {
  if (new Set(group.map((entry) => entry.contentDigest)).size === 1) {
    return { active: highestVersionEntry(group) ?? group[0] };
  }
  const versioned = group.map((entry) => ({ entry, version: parseSemVer(entry.version) }));
  if (versioned.some((item) => !item.version)) return { active: group[0], conflictReason: "version-unknown-conflict" };
  versioned.sort((left, right) => compareSemVer(right.version as SemVer, left.version as SemVer) || left.entry.qualifiedName.localeCompare(right.entry.qualifiedName));
  const top = versioned[0];
  const sameTop = versioned.filter((item) => compareSemVer(item.version as SemVer, top.version as SemVer) === 0);
  if (new Set(sameTop.map((item) => item.entry.contentDigest)).size > 1) {
    return { active: sameTop[0].entry, conflictReason: "same-version-content-conflict" };
  }
  return { active: top.entry };
}

function highestVersionEntry(entries: LegacyCatalogEntry[]): LegacyCatalogEntry | undefined {
  return entries
    .map((entry) => ({ entry, version: parseSemVer(entry.version) }))
    .filter((item): item is { entry: LegacyCatalogEntry; version: SemVer } => Boolean(item.version))
    .sort((left, right) => compareSemVer(right.version, left.version) || left.entry.qualifiedName.localeCompare(right.entry.qualifiedName))[0]?.entry;
}

function validateUniqueEntries(entries: UserSkillCatalogEntry[]): void {
  const names = new Set<string>();
  const qualifiedNames = new Set<string>();
  for (const entry of entries) {
    const name = normalizeLookup(entry.skillName);
    const qualifiedName = normalizeLookup(entry.qualifiedName);
    if (names.has(name)) throw new SkillCatalogError("CATALOG_INVALID", `Catalog skillName is duplicated: ${entry.skillName}`);
    if (qualifiedNames.has(qualifiedName)) throw new SkillCatalogError("CATALOG_INVALID", `Catalog qualifiedName is duplicated: ${entry.qualifiedName}`);
    names.add(name);
    qualifiedNames.add(qualifiedName);
  }
}

async function validateResolvedCatalogEntry(entry: UserSkillCatalogEntry, options: SkillCatalogOptions): Promise<void> {
  const root = userSkillCatalogRoot(options);
  const expectedPath = path.join(root, entry.skillName);
  if (path.resolve(entry.installedPath) !== path.resolve(expectedPath)) {
    throw new SkillCatalogError("CATALOG_PATH_ESCAPE", `Catalog skill path is not its canonical flat destination: ${entry.qualifiedName}`);
  }
  const resolvedCatalogRoot = await fs.realpath(root).catch(() => root);
  let stats: Awaited<ReturnType<typeof fs.lstat>>;
  let resolvedInstalledPath: string;
  try {
    stats = await fs.lstat(expectedPath);
    resolvedInstalledPath = await fs.realpath(expectedPath);
  } catch {
    throw new SkillCatalogError("CATALOG_CONTENT_DRIFT", `Catalog skill directory is missing: ${entry.qualifiedName}`);
  }
  const expectedResolvedPath = path.join(resolvedCatalogRoot, entry.skillName);
  if (!stats.isDirectory() || stats.isSymbolicLink() || resolvedInstalledPath !== expectedResolvedPath || !isContainedPath(resolvedCatalogRoot, resolvedInstalledPath)) {
    throw new SkillCatalogError("CATALOG_PATH_ESCAPE", `Catalog skill path escapes its canonical flat destination: ${entry.qualifiedName}`);
  }
  let digest: string;
  try {
    digest = await catalogDirectoryDigest(resolvedInstalledPath);
  } catch {
    throw new SkillCatalogError("CATALOG_CONTENT_DRIFT", `Catalog skill content could not be read consistently: ${entry.qualifiedName}`);
  }
  if (digest !== entry.contentDigest) throw new SkillCatalogError("CATALOG_CONTENT_DRIFT", `Catalog skill content digest differs from the index: ${entry.qualifiedName}`);
}

function normalizeCatalogEntry(entry: UserSkillCatalogEntry): UserSkillCatalogEntry {
  const sourceClaims = [...entry.sourceClaims]
    .map((claim) => ({
      ...claim,
      skillPath: normalizeSkillPath(claim.skillPath),
      appliedRecordIds: [...new Set(claim.appliedRecordIds.map((item) => item.trim()).filter(Boolean))].sort()
    }))
    .sort((left, right) => left.sourceKey.localeCompare(right.sourceKey) || left.skillPath.localeCompare(right.skillPath));
  return {
    ...entry,
    qualifiedName: catalogQualifiedName(entry.skillName),
    aliases: entry.aliases ? [...new Set(entry.aliases.map((item) => item.trim()).filter(Boolean))].sort() : undefined,
    installedPath: path.resolve(entry.installedPath),
    sourceClaims,
    appliedRecordIds: [...new Set(entry.appliedRecordIds.map((item) => item.trim()).filter(Boolean))].sort()
  };
}

function exactMatch(entry: UserSkillCatalogEntry, query: string): boolean {
  const legacyNames = entry.sourceClaims.map((claim) => catalogLegacyQualifiedName(claim.sourceKey, entry.skillName));
  return [entry.qualifiedName, entry.skillName, ...legacyNames, ...(entry.aliases ?? [])].some((value) => normalizeLookup(value) === query);
}

function searchMatch(entry: UserSkillCatalogEntry, query: string): boolean {
  return [entry.skillName, ...(entry.aliases ?? []), entry.summary ?? ""].some((value) => normalizeLookup(value).includes(query));
}

function toCandidate(entry: UserSkillCatalogEntry): CatalogResolveCandidate {
  return { skillName: entry.skillName, qualifiedName: entry.qualifiedName, version: entry.version ?? null, status: entry.status, summary: entry.summary };
}

function compareCatalogEntries(left: UserSkillCatalogEntry, right: UserSkillCatalogEntry): number {
  return normalizeLookup(left.skillName).localeCompare(normalizeLookup(right.skillName));
}

function compareCandidates(left: CatalogResolveCandidate, right: CatalogResolveCandidate): number {
  return normalizeLookup(left.skillName).localeCompare(normalizeLookup(right.skillName));
}

async function atomicWriteCatalog(raw: string, options: SkillCatalogOptions): Promise<void> {
  const root = userSkillCatalogRoot(options);
  const indexPath = userSkillCatalogPath(options);
  await fs.mkdir(root, { recursive: true });
  const temporaryPath = path.join(root, `.index.json.tmp-${process.pid}-${crypto.randomUUID()}`);
  let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
  try {
    handle = await fs.open(temporaryPath, "wx", 0o600);
    await handle.writeFile(raw, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await fs.rename(temporaryPath, indexPath);
  } finally {
    await handle?.close().catch(() => undefined);
    await fs.unlink(temporaryPath).catch(() => undefined);
  }
}

interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: Array<number | string>;
}

function parseSemVer(value: string | undefined): SemVer | undefined {
  if (!value) return undefined;
  const match = value.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/);
  if (!match) return undefined;
  const prerelease = match[4]?.split(".").map((item) => /^\d+$/.test(item) && (item === "0" || !item.startsWith("0")) ? Number(item) : item) ?? [];
  if (prerelease.some((item) => typeof item === "string" && /^\d+$/.test(item))) return undefined;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), prerelease };
}

function compareSemVer(left: SemVer, right: SemVer): number {
  for (const key of ["major", "minor", "patch"] as const) {
    if (left[key] !== right[key]) return left[key] > right[key] ? 1 : -1;
  }
  if (left.prerelease.length === 0 || right.prerelease.length === 0) {
    return left.prerelease.length === right.prerelease.length ? 0 : left.prerelease.length === 0 ? 1 : -1;
  }
  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = left.prerelease[index];
    const rightPart = right.prerelease[index];
    if (leftPart === undefined || rightPart === undefined) return leftPart === rightPart ? 0 : leftPart === undefined ? -1 : 1;
    if (leftPart === rightPart) continue;
    if (typeof leftPart === "number" && typeof rightPart === "string") return -1;
    if (typeof leftPart === "string" && typeof rightPart === "number") return 1;
    return leftPart > rightPart ? 1 : -1;
  }
  return 0;
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
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) throw new SkillCatalogError("CATALOG_INVALID", `${label} must be an array of non-empty strings.`);
  return [...value];
}

function optionalStringArray(value: unknown, label: string): string[] | undefined {
  if (value === undefined) return undefined;
  return requiredStringArray(value, label);
}

function optionalString(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !value.trim()) throw new SkillCatalogError("CATALOG_INVALID", `${label} must be a non-empty string.`);
  return value;
}

function optionalConflictReason(value: unknown, label: string): UserSkillCatalogConflictReason | undefined {
  if (value === undefined || value === null) return undefined;
  if (value !== "same-version-content-conflict" && value !== "version-unknown-conflict") throw new SkillCatalogError("CATALOG_INVALID", `${label} is invalid.`);
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

function isSourceKey(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{24}$/.test(value);
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
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
