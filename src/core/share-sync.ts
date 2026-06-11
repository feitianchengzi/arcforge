import path from "node:path";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import type { SharedAssetSummary, ArcForgeConfig, SkillSummary } from "../shared/types.js";
import { copyDirectory, pathExists } from "./fs.js";

export function resolveShareProfile(config: ArcForgeConfig, profileName?: string, skillNames?: string[]): ArcForgeConfig["profiles"][number] {
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

export async function syncProjectToShareTarget(root: string, targetRoot: string, config: ArcForgeConfig, skills: SkillSummary[], assets: SharedAssetSummary[], visibility: "private" | "public", sectionName: string, namespace: string): Promise<void> {
  await fs.mkdir(targetRoot, { recursive: true });
  const sourceRoot = path.resolve(root, config.sourceDir);
  const targetSourceRoot = path.join(targetRoot, config.sourceDir);
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

export async function syncProjectMetadata(targetRoot: string, config: ArcForgeConfig, visibility: "private" | "public", sectionName: string): Promise<void> {
  const targetReadme = path.join(targetRoot, "README.md");
  if (!(await pathExists(targetReadme))) {
    await fs.writeFile(targetReadme, `# ${path.basename(targetRoot)}\n`, "utf8");
  }
  await writeSharingReadme(targetRoot, config, visibility, sectionName);
}

export function namespaceProfiles(config: ArcForgeConfig, namespace: string): ArcForgeConfig {
  return {
    ...config,
    profiles: config.profiles.map((profile) => ({
      ...profile,
      name: profile.name.includes("/") ? profile.name : `${namespace}/${profile.name || "default"}`
    }))
  };
}

export function normalizeConfig(config: ArcForgeConfig): ArcForgeConfig {
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
  const ownerPath = path.join(target, ".arcforge-owner.json");
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
  await fs.writeFile(path.join(target, ".arcforge-owner.json"), `${JSON.stringify({ namespace }, null, 2)}\n`, "utf8");
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


async function writeSharingReadme(root: string, config: ArcForgeConfig, visibility: "private" | "public", sectionName: string): Promise<void> {
  const readmePath = path.join(root, "README.md");
  const existing = await pathExists(readmePath) ? await fs.readFile(readmePath, "utf8") : `# ${path.basename(root)}\n`;
  const sectionId = slug(sectionName || path.basename(root));
  const section = sharingSection(config, visibility, sectionName || path.basename(root), sectionId);
  const start = `<!-- arcforge:share:start:${sectionId} -->`;
  const end = `<!-- arcforge:share:end:${sectionId} -->`;
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
  const legacyPattern = new RegExp(`${escapeRegExp("<!-- arcforge:share:start -->")}[\\s\\S]*?${escapeRegExp("<!-- arcforge:share:end -->")}`);
  const next = pattern.test(existing)
    ? existing.replace(pattern, section)
    : legacyPattern.test(existing)
      ? existing.replace(legacyPattern, section)
      : `${existing.trimEnd()}\n\n${section}\n`;
  await fs.writeFile(readmePath, next, "utf8");
}

function sharingSection(config: ArcForgeConfig, visibility: "private" | "public", sectionName: string, sectionId: string): string {
  const installRef = config.teamRepo || "github.com/<owner>/<repo>";
  const profiles = config.profiles.map((profile) => `- \`${profile.name || "unnamed"}\`: ${profile.skills.includes("*") ? "all skills" : profile.skills.join(", ") || "no skills selected"}`).join("\n");
  return `<!-- arcforge:share:start:${sectionId} -->
## ArcForge: ${sectionName}

Visibility: \`${visibility}\`

### Use in ArcForge Desktop

1. Open ArcForge.
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
<!-- arcforge:share:end:${sectionId} -->`;
}

function slug(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "project";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
