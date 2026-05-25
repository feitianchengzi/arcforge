import path from "node:path";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import type { SharedAssetSummary, SkillOpsConfig, SkillSummary } from "../shared/types.js";
import { copyDirectory, pathExists } from "./fs.js";

export const SHARE_MANIFEST_FILE = ".skillops-share-manifest.json";

export interface ShareManifestEntry {
  namespace: string;
  sourceDir: string;
  kind: "skill" | "asset";
  name: string;
  relativePath: string;
}

export interface ShareManifest {
  version: 1;
  updatedAt: string;
  entries: ShareManifestEntry[];
}

export function resolveShareProfile(config: SkillOpsConfig, profileName?: string, skillNames?: string[]): SkillOpsConfig["profiles"][number] {
  const selectedProfile = profileName
    ? config.profiles.find((item) => item.name === profileName)
    : config.profiles[0];
  if (!selectedProfile) throw new Error(profileName ? `Profile not found: ${profileName}` : "Profile is required for sharing.");
  if (!skillNames || skillNames.length === 0) return selectedProfile;
  return {
    ...selectedProfile,
    skills: skillNames
  };
}

export function selectProfileSkills(skills: SkillSummary[], names: string[], strict = false): SkillSummary[] {
  if (names.includes("*")) return skills;
  if (names.length === 0) return [];
  const wanted = new Set(names);
  const selected = skills.filter((skill) => wanted.has(skill.name));
  if (strict) {
    const found = new Set(selected.map((skill) => skill.name));
    const missing = names.filter((name) => !found.has(name));
    if (missing.length > 0) throw new Error(`Skill not found: ${missing.join(", ")}`);
  }
  return selected;
}

export async function syncProjectToShareTarget(root: string, targetRoot: string, config: SkillOpsConfig, skills: SkillSummary[], assets: SharedAssetSummary[], visibility: "private" | "public", sectionName: string, namespace: string): Promise<void> {
  await fs.mkdir(targetRoot, { recursive: true });
  const sourceRoot = path.resolve(root, config.sourceDir);
  const targetSourceRoot = path.join(targetRoot, config.sourceDir);
  const manifest = await readShareManifest(targetRoot);
  const desiredEntries = shareManifestEntries(root, config, skills, assets, namespace);
  await pruneRemovedSharedEntries(targetSourceRoot, manifest.entries, desiredEntries, namespace, config.sourceDir);
  await fs.mkdir(targetSourceRoot, { recursive: true });
  for (const item of skills) {
    const relativePath = relativeSharedEntryPath(sourceRoot, item.path, item.name);
    await replaceSharedEntry(item.path, path.join(targetSourceRoot, relativePath), targetSourceRoot);
  }
  for (const asset of assets) {
    const relativePath = relativeSharedEntryPath(sourceRoot, asset.path, asset.name);
    await assertSharedAssetWritable(path.join(targetSourceRoot, relativePath), namespace);
    await replaceSharedEntry(asset.path, path.join(targetSourceRoot, relativePath), targetSourceRoot);
    await writeAssetOwner(path.join(targetSourceRoot, relativePath), namespace);
  }
  const sourceReadme = path.join(root, "README.md");
  const targetReadme = path.join(targetRoot, "README.md");
  if (!(await pathExists(targetReadme)) && await pathExists(sourceReadme)) {
    await fs.copyFile(sourceReadme, targetReadme);
  } else if (!(await pathExists(targetReadme))) {
    await fs.writeFile(targetReadme, `# ${path.basename(root)}\n`, "utf8");
  }
  await writeSharingReadme(targetRoot, config, visibility, sectionName);
  await writeShareManifest(targetRoot, mergeShareManifest(manifest, desiredEntries, namespace, config.sourceDir));
}

export function shareManifestEntries(root: string, config: SkillOpsConfig, skills: SkillSummary[], assets: SharedAssetSummary[], namespace: string): ShareManifestEntry[] {
  const sourceRoot = path.resolve(root, config.sourceDir);
  return [
    ...skills.map((skill) => ({
      namespace,
      sourceDir: config.sourceDir,
      kind: "skill" as const,
      name: skill.name,
      relativePath: relativeSharedEntryPath(sourceRoot, skill.path, skill.name)
    })),
    ...assets.map((asset) => ({
      namespace,
      sourceDir: config.sourceDir,
      kind: "asset" as const,
      name: asset.name,
      relativePath: relativeSharedEntryPath(sourceRoot, asset.path, asset.name)
    }))
  ];
}

export async function readShareManifest(targetRoot: string): Promise<ShareManifest> {
  const filePath = path.join(targetRoot, SHARE_MANIFEST_FILE);
  if (!(await pathExists(filePath))) return emptyShareManifest();
  try {
    const raw = JSON.parse(await fs.readFile(filePath, "utf8")) as Partial<ShareManifest>;
    if (raw.version !== 1 || !Array.isArray(raw.entries)) return emptyShareManifest();
    return {
      version: 1,
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date(0).toISOString(),
      entries: raw.entries
        .map(normalizeShareManifestEntry)
        .filter((entry): entry is ShareManifestEntry => Boolean(entry))
    };
  } catch {
    throw new Error(`Share manifest is invalid: ${filePath}`);
  }
}

export function staleShareManifestEntries(manifest: ShareManifest, desiredEntries: ShareManifestEntry[], namespace: string, sourceDir: string): ShareManifestEntry[] {
  const desiredKeys = new Set(desiredEntries.map(shareManifestEntryKey));
  return manifest.entries.filter((entry) => entry.namespace === namespace && entry.sourceDir === sourceDir && !desiredKeys.has(shareManifestEntryKey(entry)));
}

export function shareManifestEntryKey(entry: Pick<ShareManifestEntry, "kind" | "relativePath">): string {
  return `${entry.kind}:${entry.relativePath}`;
}

export function shareNamespace(value: string): string {
  return slug(value);
}

function relativeSharedEntryPath(sourceRoot: string, entryPath: string, fallbackName: string): string {
  const relativePath = path.relative(sourceRoot, entryPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to share item outside source directory: ${entryPath}`);
  }
  return relativePath || fallbackName;
}

async function writeShareManifest(targetRoot: string, manifest: ShareManifest): Promise<void> {
  await fs.writeFile(path.join(targetRoot, SHARE_MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function mergeShareManifest(manifest: ShareManifest, desiredEntries: ShareManifestEntry[], namespace: string, sourceDir: string): ShareManifest {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries: [
      ...manifest.entries.filter((entry) => entry.namespace !== namespace || entry.sourceDir !== sourceDir),
      ...desiredEntries
    ].sort((a, b) => shareManifestEntryKey(a).localeCompare(shareManifestEntryKey(b)) || a.namespace.localeCompare(b.namespace))
  };
}

async function pruneRemovedSharedEntries(targetSourceRoot: string, previousEntries: ShareManifestEntry[], desiredEntries: ShareManifestEntry[], namespace: string, sourceDir: string): Promise<void> {
  const staleEntries = staleShareManifestEntries({ version: 1, updatedAt: "", entries: previousEntries }, desiredEntries, namespace, sourceDir);
  for (const entry of staleEntries) {
    const targetPath = path.join(targetSourceRoot, entry.relativePath);
    assertInsideRoot(targetPath, targetSourceRoot, "delete");
    if (!(await pathExists(targetPath))) continue;
    await fs.rm(targetPath, { recursive: true, force: true });
    await pruneEmptyParents(path.dirname(targetPath), targetSourceRoot);
  }
}

async function pruneEmptyParents(startDir: string, stopDir: string): Promise<void> {
  let current = path.resolve(startDir);
  const stop = path.resolve(stopDir);
  while (current !== stop && current.startsWith(`${stop}${path.sep}`)) {
    const entries = await fs.readdir(current).catch(() => []);
    if (entries.length > 0) return;
    await fs.rmdir(current);
    current = path.dirname(current);
  }
}

function normalizeShareManifestEntry(value: unknown): ShareManifestEntry | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entry = value as Partial<ShareManifestEntry>;
  if (entry.kind !== "skill" && entry.kind !== "asset") return undefined;
  if (!entry.namespace || !entry.sourceDir || !entry.name || !entry.relativePath) return undefined;
  return {
    namespace: entry.namespace,
    sourceDir: entry.sourceDir,
    kind: entry.kind,
    name: entry.name,
    relativePath: entry.relativePath
  };
}

function emptyShareManifest(): ShareManifest {
  return { version: 1, updatedAt: new Date(0).toISOString(), entries: [] };
}

export async function syncProjectMetadata(targetRoot: string, config: SkillOpsConfig, visibility: "private" | "public", sectionName: string): Promise<void> {
  const targetReadme = path.join(targetRoot, "README.md");
  if (!(await pathExists(targetReadme))) {
    await fs.writeFile(targetReadme, `# ${path.basename(targetRoot)}\n`, "utf8");
  }
  await writeSharingReadme(targetRoot, config, visibility, sectionName);
}

export function namespaceProfiles(config: SkillOpsConfig, namespace: string): SkillOpsConfig {
  return {
    ...config,
    profiles: config.profiles.map((profile) => ({
      ...profile,
      name: profile.name.includes("/") ? profile.name : `${namespace}/${profile.name || "default"}`
    }))
  };
}

export function normalizeConfig(config: SkillOpsConfig): SkillOpsConfig {
  return {
    version: 1,
    sourceDir: config.sourceDir || "skills",
    teamRepo: config.teamRepo?.trim() || undefined,
    shareTargetMode: config.shareTargetMode,
    shareProjectName: config.shareProjectName?.trim() || undefined,
    applyTargets: config.applyTargets?.map((group) => ({
      ...group,
      agentTargetIds: normalizeStringList(group.agentTargetIds),
      projectTargetDirs: normalizeStringList(group.projectTargetDirs),
      customTargetDirs: normalizeStringList(group.customTargetDirs)
    })),
    shareTargets: config.shareTargets,
    profiles: config.profiles.map((profile) => ({
      name: profile.name.trim(),
      description: profile.description?.trim() || undefined,
      skills: profile.skills,
      targets: profile.targets
    }))
  };
}

function normalizeStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean) : [];
}

async function assertSharedAssetWritable(target: string, namespace: string): Promise<void> {
  if (!(await pathExists(target))) return;
  const ownerPath = path.join(target, ".skillops-owner.json");
  if (!(await pathExists(ownerPath))) return;
  try {
    const owner = JSON.parse(await fs.readFile(ownerPath, "utf8")) as { namespace?: string };
    if (owner.namespace === namespace) return;
  } catch {
    throw new Error(`Shared asset ownership metadata is invalid: ${ownerPath}`);
  }
  throw new Error(`Shared asset is owned by another project: ${target}`);
}

async function writeAssetOwner(target: string, namespace: string): Promise<void> {
  await fs.writeFile(path.join(target, ".skillops-owner.json"), `${JSON.stringify({ namespace }, null, 2)}\n`, "utf8");
}

async function replaceSharedEntry(source: string, target: string, targetRoot: string): Promise<void> {
  const resolvedTarget = path.resolve(target);
  const resolvedTargetRoot = path.resolve(targetRoot);
  if (path.resolve(source) === resolvedTarget) {
    throw new Error(`Refusing to replace source directory: ${source}`);
  }
  assertInsideRoot(resolvedTarget, resolvedTargetRoot, "write");

  await replaceDirectoryAtomic(source, resolvedTarget);
}

function assertInsideRoot(target: string, root: string, operation: string): void {
  const resolvedTarget = path.resolve(target);
  const resolvedRoot = path.resolve(root);
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Refusing to ${operation} outside source directory: ${target}`);
  }
}

async function replaceDirectoryAtomic(source: string, target: string): Promise<void> {
  const parent = path.dirname(target);
  const temp = path.join(parent, `.${path.basename(target)}.tmp-${crypto.randomUUID()}`);
  const backup = path.join(parent, `.${path.basename(target)}.backup-${crypto.randomUUID()}`);
  await fs.mkdir(parent, { recursive: true });
  await fs.rm(temp, { recursive: true, force: true });
  await copyDirectory(source, temp);

  const hadTarget = await pathExists(target);
  if (hadTarget) await fs.rename(target, backup);
  try {
    await fs.rename(temp, target);
    if (hadTarget) await fs.rm(backup, { recursive: true, force: true });
  } catch (error) {
    await fs.rm(temp, { recursive: true, force: true });
    if (hadTarget && !(await pathExists(target))) await fs.rename(backup, target);
    throw error;
  }
}


async function writeSharingReadme(root: string, config: SkillOpsConfig, visibility: "private" | "public", sectionName: string): Promise<void> {
  const readmePath = path.join(root, "README.md");
  const existing = await pathExists(readmePath) ? await fs.readFile(readmePath, "utf8") : `# ${path.basename(root)}\n`;
  const sectionId = slug(sectionName || path.basename(root));
  const section = sharingSection(config, visibility, sectionName || path.basename(root), sectionId);
  const start = `<!-- skillops:share:start:${sectionId} -->`;
  const end = `<!-- skillops:share:end:${sectionId} -->`;
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
  const legacyPattern = new RegExp(`${escapeRegExp("<!-- skillops:share:start -->")}[\\s\\S]*?${escapeRegExp("<!-- skillops:share:end -->")}`);
  const next = pattern.test(existing)
    ? existing.replace(pattern, section)
    : legacyPattern.test(existing)
      ? existing.replace(legacyPattern, section)
      : `${existing.trimEnd()}\n\n${section}\n`;
  await fs.writeFile(readmePath, next, "utf8");
}

function sharingSection(config: SkillOpsConfig, visibility: "private" | "public", sectionName: string, sectionId: string): string {
  const installRef = config.teamRepo || "github.com/<owner>/<repo>";
  const profiles = config.profiles.map((profile) => `- \`${profile.name || "unnamed"}\`: ${profile.skills.includes("*") ? "all skills" : profile.skills.join(", ") || "no skills selected"}`).join("\n");
  return `<!-- skillops:share:start:${sectionId} -->
## SkillOps: ${sectionName}

Visibility: \`${visibility}\`

### Use in SkillOps Desktop

1. Open SkillOps.
2. Click **Add Skill project**.
3. Enter \`${installRef}\` as the GitHub source.
4. Choose a profile and add an application target.

### Profiles

${profiles || "- No profiles configured."}

### CLI

\`\`\`bash
skillshare install ${installRef} --track --all && skillshare sync
npx skills add ${installRef}
\`\`\`
<!-- skillops:share:end:${sectionId} -->`;
}

function slug(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "project";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
