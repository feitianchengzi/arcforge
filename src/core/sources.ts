import crypto, { randomUUID } from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import type { AppliedSourceRecord, DriftReport, ImportSkillsPlan, ImportSkillsResult, MergePlan, MergeResult, ArcForgeConfig, SkillSummary } from "../shared/types.js";
import { defaultConfigForRoot, loadConfig, saveConfig } from "./config.js";
import { copyDirectory, pathExists } from "./fs.js";
import { applyProfile, compareDirectory, driftReport } from "./profiles.js";
import { loadLocalProjectState, saveLocalProjectAppliedSources } from "./project-store.js";
import { downloadSource } from "./share.js";
import { selectProfileSkills } from "./share-sync.js";
import { currentCommit } from "./share-git.js";
import { scanWorkspace } from "./workspace.js";

export interface MergeOptions {
  root: string;
  sourceDir?: string;
  to: string;
  targetPath: string;
  profile?: string;
  skills?: string[];
  targetDir?: string;
  confirm?: boolean;
  cacheDir?: string;
}

export interface AppliedSourceOptions {
  root: string;
  id?: string;
  from?: string;
  profile?: string;
  targetDir?: string;
  skills?: string[];
  cacheDir?: string;
  allowUnrelatedRoot?: boolean;
}

export interface ImportSkillsOptions {
  root: string;
  from: string;
  profile?: string;
  skills?: string[];
  targetDir?: string;
  targetProfile?: string;
  confirm?: boolean;
  cacheDir?: string;
}

export async function resolveSkillProjectRoot(input: string, cacheDir: string): Promise<string> {
  const value = input.trim();
  if (!value) throw new Error("Skill project path or URL is required.");
  if (isRemoteInput(value)) return path.resolve(await downloadSource({ remoteUrl: value, cacheDir }));
  const root = path.resolve(value);
  const stats = await fs.stat(root);
  if (!stats.isDirectory()) throw new Error("Skill project path is not a directory.");
  await defaultConfigForRoot(root);
  return root;
}

export async function createMergePlan(options: MergeOptions): Promise<MergePlan> {
  const root = path.resolve(options.root);
  const targetProjectRoot = await resolveSkillProjectRoot(options.to, requiredCacheDir(options.cacheDir));
  const current = await scanWorkspace(root, { sourceDir: options.sourceDir });
  const targetSnapshot = await scanWorkspace(targetProjectRoot);
  const profile = options.profile?.trim() || "default";
  const targetPath = cleanRelativePath(options.targetPath);
  if (!targetPath) throw new Error("Merge target path is required.");
  const targetDir = options.targetDir?.trim() || ".arcforge/skills";
  const selected = selectedSkills(current.skills, current.config, profile, options.skills);
  if (selected.length === 0) throw new Error("No skills selected for merge.");
  const targetRoot = path.resolve(targetProjectRoot, targetPath);
  assertInside(targetRoot, targetProjectRoot, "merge");
  const skills = await Promise.all(selected.map(async (skill) => {
    const target = path.join(targetRoot, skill.name);
    const comparison = await compareDirectory(skill.path, target);
    return {
      name: skill.name,
      sourcePath: skill.path,
      targetPath: target,
      status: comparison.status === "missing" ? "new" as const : comparison.status === "same" ? "same" as const : "conflict" as const,
      files: comparison.files
    };
  }));
  const appliedRecord = await appliedRecordFor(root, targetProjectRoot, path.basename(targetProjectRoot), profile, targetDir, selected.map((skill) => skill.name), "profileApply");
  return {
    root,
    targetProjectRoot,
    targetProjectName: path.basename(targetSnapshot.root),
    targetPath,
    profile,
    targetDir,
    skills,
    appliedRecord,
    hasConflicts: skills.some((item) => item.status === "conflict")
  };
}

export async function mergeIntoProject(options: MergeOptions): Promise<MergeResult> {
  const plan = await createMergePlan(options);
  if (!options.confirm) throw new Error("Merge requires --confirm after reviewing the plan.");
  if (plan.hasConflicts) throw new Error(`Merge has conflicts: ${plan.skills.filter((item) => item.status === "conflict").map((item) => item.name).join(", ")}`);
  const copied: string[] = [];
  const skipped: string[] = [];
  for (const item of plan.skills) {
    if (item.status === "same") {
      skipped.push(item.name);
      continue;
    }
    await replaceDirectory(item.sourcePath, item.targetPath);
    copied.push(item.name);
  }
  await mergeSourceProfile(plan.targetProjectRoot, plan.profile, plan.skills.map((item) => item.name));
  const appliedRecord = await upsertAppliedSource(plan.root, plan.appliedRecord);
  return {
    plan: { ...plan, appliedRecord },
    copied,
    skipped,
    appliedRecord,
    messages: [`Merged ${copied.length} skills to ${plan.targetProjectName}.`, `Updated applied source ${appliedRecord.id}.`]
  };
}

export async function createImportSkillsPlan(options: ImportSkillsOptions): Promise<ImportSkillsPlan> {
  const root = path.resolve(options.root);
  const sourceProjectRoot = await resolveSkillProjectRoot(options.from, requiredCacheDir(options.cacheDir));
  const current = await scanWorkspace(root);
  const sourceSnapshot = await scanWorkspace(sourceProjectRoot);
  const sourceProfile = options.profile?.trim() || sourceSnapshot.config.profiles[0]?.name || "default";
  const targetProfile = options.targetProfile?.trim() || current.config.profiles[0]?.name || "default";
  const targetDir = options.targetDir?.trim() || current.config.sourceDir || "skills";
  const selected = selectedSkills(sourceSnapshot.skills, sourceSnapshot.config, sourceProfile, options.skills);
  if (selected.length === 0) throw new Error("No skills selected for import.");
  const targetRoot = path.resolve(root, targetDir);
  assertInside(targetRoot, root, "import");
  const skills = await Promise.all(selected.map(async (skill) => {
    const target = path.join(targetRoot, skill.name);
    const comparison = await compareDirectory(skill.path, target);
    return {
      name: skill.name,
      sourcePath: skill.path,
      targetPath: target,
      status: comparison.status === "missing" ? "new" as const : comparison.status === "same" ? "same" as const : "conflict" as const,
      files: comparison.files
    };
  }));
  const appliedRecord = await appliedRecordFor(root, sourceProjectRoot, path.basename(sourceProjectRoot), sourceProfile, targetDir, selected.map((skill) => skill.name), "maintenanceImport");
  return {
    root,
    sourceProjectRoot,
    sourceProjectName: path.basename(sourceSnapshot.root),
    sourceProfile,
    targetDir,
    targetProfile,
    skills,
    appliedRecord,
    hasConflicts: skills.some((item) => item.status === "conflict")
  };
}

export async function importSkillsIntoProject(options: ImportSkillsOptions): Promise<ImportSkillsResult> {
  const plan = await createImportSkillsPlan(options);
  if (!options.confirm) throw new Error("Import requires confirm after reviewing the plan.");
  if (plan.hasConflicts) throw new Error(`Import has conflicts: ${plan.skills.filter((item) => item.status === "conflict").map((item) => item.name).join(", ")}`);
  const copied: string[] = [];
  const skipped: string[] = [];
  for (const item of plan.skills) {
    if (item.status === "same") {
      skipped.push(item.name);
      continue;
    }
    await replaceDirectory(item.sourcePath, item.targetPath);
    copied.push(item.name);
  }
  await mergeSourceProfile(plan.root, plan.targetProfile, plan.skills.map((item) => item.name));
  const appliedRecord = await upsertAppliedSource(plan.root, plan.appliedRecord);
  return {
    plan: { ...plan, appliedRecord },
    copied,
    skipped,
    appliedRecord,
    messages: [`Imported ${copied.length} skills from ${plan.sourceProjectName}.`, `Updated maintenance import relation ${appliedRecord.id}.`]
  };
}

export async function listAppliedSources(root: string): Promise<AppliedSourceRecord[]> {
  return [...((await loadLocalProjectState(root))?.appliedSources ?? [])].sort(compareAppliedRecord);
}

export async function addAppliedSource(options: AppliedSourceOptions): Promise<AppliedSourceRecord> {
  if (!options.from) throw new Error("Applied source requires --from.");
  if (!options.profile) throw new Error("Applied source requires --profile.");
  if (!options.targetDir) throw new Error("Applied source requires --target.");
  const sourceRoot = await resolveSkillProjectRoot(options.from, requiredCacheDir(options.cacheDir));
  assertAppliedRelationRoot(options.root, sourceRoot, options.targetDir, options.allowUnrelatedRoot);
  const snapshot = await scanWorkspace(sourceRoot);
  const skills = selectedSkills(snapshot.skills, snapshot.config, options.profile, options.skills).map((skill) => skill.name);
  const record = await appliedRecordFor(options.root, sourceRoot, path.basename(snapshot.root), options.profile, options.targetDir, skills, "profileApply");
  return upsertAppliedSource(options.root, record);
}

export async function removeAppliedSource(root: string, id: string): Promise<AppliedSourceRecord> {
  const records = await listAppliedSources(root);
  const record = records.find((item) => item.id === id);
  if (!record) throw new Error(`Applied source not found: ${id}`);
  await saveLocalProjectAppliedSources(root, records.filter((item) => item.id !== id));
  return record;
}

export async function driftAppliedSources(root: string, id?: string): Promise<DriftReport[]> {
  const records = selectAppliedRecords(await listAppliedSources(root), id);
  const reports: DriftReport[] = [];
  for (const record of records) {
    const snapshot = await scanWorkspace(record.sourceRoot);
    const config = configForAppliedRecord(snapshot.config, record);
    reports.push(await driftReport(record.sourceRoot, config, snapshot.skills, snapshot.assets, record.profile, path.resolve(root, record.targetDir)));
  }
  return reports;
}

export async function runAppliedSources(root: string, id: string | undefined, confirm: boolean) {
  if (!confirm) throw new Error("Applied source run requires --confirm after reviewing drift.");
  const records = selectAppliedRecords(await listAppliedSources(root), id);
  const results = [];
  for (const record of records) {
    const snapshot = await scanWorkspace(record.sourceRoot);
    const config = configForAppliedRecord(snapshot.config, record);
    const result = await applyProfile(record.sourceRoot, config, snapshot.skills, snapshot.assets, record.profile, path.resolve(root, record.targetDir));
    const next = await upsertAppliedSource(root, {
      ...record,
      sourceCommit: await sourceCommit(record.sourceRoot),
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    results.push({ record: next, result });
  }
  return results;
}

export async function applyFromSource(root: string, from: string | undefined, profile: string, targetDir: string, save: boolean, skills?: string[], cacheDir?: string, allowUnrelatedRoot = false) {
  const sourceRoot = from ? await resolveSkillProjectRoot(from, requiredCacheDir(cacheDir)) : path.resolve(root);
  if (save && from) assertAppliedRelationRoot(root, sourceRoot, targetDir, allowUnrelatedRoot);
  const resolvedTargetDir = from ? path.resolve(root, targetDir) : targetDir;
  const snapshot = await scanWorkspace(sourceRoot);
  const config = skills?.length ? configWithSkillSelection(snapshot.config, profile, skills) : snapshot.config;
  const result = await applyProfile(sourceRoot, config, snapshot.skills, snapshot.assets, profile, resolvedTargetDir);
  const record = save && from ? await upsertAppliedSource(root, await appliedRecordFor(root, sourceRoot, path.basename(sourceRoot), profile, targetDir, result.copied, "profileApply")) : undefined;
  return { result, record };
}

export async function driftFromSource(root: string, from: string | undefined, profile: string, targetDir: string, skills?: string[], cacheDir?: string) {
  const sourceRoot = from ? await resolveSkillProjectRoot(from, requiredCacheDir(cacheDir)) : path.resolve(root);
  const resolvedTargetDir = from ? path.resolve(root, targetDir) : targetDir;
  const snapshot = await scanWorkspace(sourceRoot);
  const config = skills?.length ? configWithSkillSelection(snapshot.config, profile, skills) : snapshot.config;
  return driftReport(sourceRoot, config, snapshot.skills, snapshot.assets, profile, resolvedTargetDir);
}

function requiredCacheDir(cacheDir?: string): string {
  if (!cacheDir) throw new Error("Cache directory is required for remote Skill projects.");
  return cacheDir;
}

function assertAppliedRelationRoot(root: string, sourceRoot: string, targetDir: string, allowUnrelatedRoot = false): void {
  const normalizedRoot = path.resolve(root);
  const normalizedSourceRoot = path.resolve(sourceRoot);
  const normalizedTargetDir = path.resolve(normalizedRoot, targetDir);
  if (isSameOrParent(normalizedRoot, normalizedSourceRoot) || isSameOrParent(normalizedRoot, normalizedTargetDir)) return;
  if (allowUnrelatedRoot) return;

  throw new Error([
    "Applied source relation root is unrelated to both source and target.",
    `--root: ${normalizedRoot}`,
    `--from: ${normalizedSourceRoot}`,
    `--target: ${normalizedTargetDir}`,
    "Use the maintenance source root as --root for user-level agent installs, or pass --allow-unrelated-root if this relation intentionally belongs to another workspace."
  ].join("\n"));
}

function isSameOrParent(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function selectedSkills(skills: SkillSummary[], config: ArcForgeConfig, profileName: string, skillNames?: string[]): SkillSummary[] {
  if (skillNames?.length) return selectProfileSkills(skills, skillNames, true);
  const profile = config.profiles.find((item) => item.name === profileName);
  if (!profile) throw new Error(`Profile not found: ${profileName}`);
  return selectProfileSkills(skills, profile.skills);
}

type AppliedRelationKind = NonNullable<AppliedSourceRecord["relationKind"]>;

async function appliedRecordFor(root: string, sourceRoot: string, sourceName: string | undefined, profile: string, targetDir: string, skills: string[], relationKind: AppliedRelationKind): Promise<AppliedSourceRecord> {
  const now = new Date().toISOString();
  const normalizedSourceRoot = path.resolve(sourceRoot);
  const existing = (await listAppliedSources(root)).find((item) => path.resolve(item.sourceRoot) === normalizedSourceRoot && item.profile === profile && item.targetDir === targetDir && recordRelationKind(item) === relationKind);
  return {
    id: existing?.id || `${slug(sourceName || path.basename(normalizedSourceRoot) || "source")}-${slug(profile)}-${crypto.createHash("sha256").update(`${relationKind}:${normalizedSourceRoot}:${targetDir}`).digest("hex").slice(0, 8)}`,
    relationKind,
    sourceRoot: normalizedSourceRoot,
    sourceName,
    profile,
    targetDir,
    skills: mergeNames(existing?.skills ?? [], skills),
    sourceCommit: await sourceCommit(normalizedSourceRoot),
    appliedAt: existing?.appliedAt,
    updatedAt: now
  };
}

function recordRelationKind(record: AppliedSourceRecord): AppliedRelationKind {
  return record.relationKind === "maintenanceImport" ? "maintenanceImport" : "profileApply";
}

async function upsertAppliedSource(root: string, record: AppliedSourceRecord): Promise<AppliedSourceRecord> {
  const records = await listAppliedSources(root);
  const next = [
    ...records.filter((item) => item.id !== record.id),
    { ...record, updatedAt: new Date().toISOString() }
  ].sort(compareAppliedRecord);
  await saveLocalProjectAppliedSources(root, next);
  return next.find((item) => item.id === record.id) ?? record;
}

async function mergeSourceProfile(root: string, profileName: string, skills: string[]): Promise<void> {
  const config = await loadConfig(root);
  const existing = config.profiles.find((item) => item.name === profileName);
  const profiles = existing
    ? config.profiles.map((item) => item.name === profileName ? { ...item, skills: mergeNames(item.skills, skills) } : item)
    : [...config.profiles, { name: profileName, description: `Skills maintained for ${profileName}.`, skills, targets: ["claude", "codex", "cursor"] }];
  await saveConfig(root, { ...config, profiles });
}

function configForAppliedRecord(config: ArcForgeConfig, record: AppliedSourceRecord): ArcForgeConfig {
  if (record.skills.length === 0) return config;
  return configWithSkillSelection(config, record.profile, record.skills);
}

function configWithSkillSelection(config: ArcForgeConfig, profileName: string, skills: string[]): ArcForgeConfig {
  return {
    ...config,
    profiles: config.profiles.some((item) => item.name === profileName)
      ? config.profiles.map((item) => item.name === profileName ? { ...item, skills } : item)
      : [...config.profiles, { name: profileName, skills, targets: ["claude", "codex", "cursor"] }]
  };
}

function selectAppliedRecords(records: AppliedSourceRecord[], id?: string): AppliedSourceRecord[] {
  if (!id) return records;
  const record = records.find((item) => item.id === id);
  if (!record) throw new Error(`Applied source not found: ${id}`);
  return [record];
}

async function replaceDirectory(source: string, target: string): Promise<void> {
  if (path.resolve(source) === path.resolve(target)) throw new Error(`Refusing to replace source directory: ${source}`);
  const parent = path.dirname(target);
  const temp = path.join(parent, `.${path.basename(target)}.tmp-${randomUUID()}`);
  const backup = path.join(parent, `.${path.basename(target)}.backup-${randomUUID()}`);
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

async function sourceCommit(root: string): Promise<string | undefined> {
  return currentCommit(root, []).catch(() => undefined);
}

function isRemoteInput(value: string): boolean {
  return /^https?:\/\//.test(value) || /^git@/.test(value) || /^ssh:\/\//.test(value) || /^github\.com\//.test(value) || /^[\w.-]+\/[\w.-]+(?:\.git)?(?:\/.*)?$/.test(value);
}

function cleanRelativePath(value: string): string {
  return value.replace(/\\/g, "/").split("/").filter((part) => part && part !== "." && part !== "..").join("/");
}

function assertInside(target: string, root: string, action: string): void {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    const boundary = action === "import" ? "current project" : "target project";
    throw new Error(`Refusing to ${action} outside ${boundary}: ${target}`);
  }
}

function mergeNames(left: string[], right: string[]): string[] {
  const names = [...new Set([...left, ...right].filter(Boolean))];
  if (names.includes("*")) return ["*"];
  return names.sort((a, b) => a.localeCompare(b));
}

function compareAppliedRecord(left: AppliedSourceRecord, right: AppliedSourceRecord): number {
  return (left.sourceName || left.sourceRoot).localeCompare(right.sourceName || right.sourceRoot) || left.targetDir.localeCompare(right.targetDir);
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}
