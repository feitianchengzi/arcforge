import path from "node:path";
import { promises as fs } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import type { ApplyProfileResult, DriftFileDiff, DriftReport, SharedAssetSummary, ArcForgeConfig, SkillSummary } from "../shared/types.js";
import { copyDirectory, listFiles, pathExists } from "./fs.js";

export async function applyProfile(
  root: string,
  config: ArcForgeConfig,
  skills: SkillSummary[],
  assets: SharedAssetSummary[],
  profileName: string,
  targetDir: string
): Promise<ApplyProfileResult> {
  const profile = config.profiles.find((item) => item.name === profileName);
  if (!profile) throw new Error(`Profile not found: ${profileName}`);

  const selected = selectSkills(skills, profile.skills);
  const copied: string[] = [];
  const skipped: string[] = [];
  const copiedAssets: string[] = [];
  const skippedAssets: string[] = [];
  const destination = path.resolve(root, targetDir);

  await fs.mkdir(destination, { recursive: true });
  for (const skill of selected) {
    const target = path.join(destination, skill.name);
    await replaceDirectory(skill.path, target);
    copied.push(skill.name);
  }

  for (const asset of assets) {
    const target = path.join(destination, asset.name);
    await replaceDirectory(asset.path, target);
    copiedAssets.push(asset.name);
  }

  return { profile: profileName, targetDir: destination, copied, skipped, copiedAssets, skippedAssets };
}

async function replaceDirectory(source: string, target: string): Promise<void> {
  if (path.resolve(source) === path.resolve(target)) {
    throw new Error(`Refusing to replace source directory: ${source}`);
  }

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

export async function driftReport(
  root: string,
  config: ArcForgeConfig,
  skills: SkillSummary[],
  assets: SharedAssetSummary[],
  profileName: string,
  targetDir: string
): Promise<DriftReport> {
  const profile = config.profiles.find((item) => item.name === profileName);
  if (!profile) throw new Error(`Profile not found: ${profileName}`);

  const selected = selectSkills(skills, profile.skills);
  const destination = path.resolve(root, targetDir);
  const items = [];

  for (const skill of selected) {
    const targetPath = path.join(destination, skill.name);
    const comparison = await compareDirectory(skill.path, targetPath);
    items.push({
      skill: skill.name,
      kind: "skill" as const,
      status: comparison.status,
      sourcePath: skill.path,
      targetPath,
      files: comparison.files,
      summary: comparison.summary
    });
  }

  for (const asset of assets) {
    const targetPath = path.join(destination, asset.name);
    const comparison = await compareDirectory(asset.path, targetPath);
    items.push({
      skill: asset.name,
      kind: "asset" as const,
      status: comparison.status,
      sourcePath: asset.path,
      targetPath,
      files: comparison.files,
      summary: comparison.summary
    });
  }

  return { profile: profileName, targetDir: destination, items };
}

export async function compareDirectory(source: string, target: string): Promise<{
  status: "missing" | "changed" | "same";
  files: DriftFileDiff[];
  summary: { missing: number; changed: number; extra: number };
}> {
  const sourceSignature = await directorySignature(source);
  if (!(await pathExists(target))) {
    const files = [...sourceSignature.keys()].map((filePath) => ({
      path: filePath,
      status: "missing" as const,
      sourceHash: sourceSignature.get(filePath)
    }));
    return { status: "missing", files, summary: summarizeDiff(files) };
  }

  const targetSignature = await directorySignature(target);
  const allPaths = new Set([...sourceSignature.keys(), ...targetSignature.keys()]);
  const files: DriftFileDiff[] = [];

  for (const filePath of [...allPaths].sort((a, b) => a.localeCompare(b))) {
    const sourceHash = sourceSignature.get(filePath);
    const targetHash = targetSignature.get(filePath);
    if (!sourceHash && targetHash) {
      files.push({ path: filePath, status: "extra", targetHash });
    } else if (sourceHash && !targetHash) {
      files.push({ path: filePath, status: "missing", sourceHash });
    } else if (sourceHash && targetHash && sourceHash !== targetHash) {
      files.push({ path: filePath, status: "changed", sourceHash, targetHash });
    }
  }

  const summary = summarizeDiff(files);
  return {
    status: files.length === 0 ? "same" : "changed",
    files,
    summary
  };
}

async function directorySignature(root: string): Promise<Map<string, string>> {
  const files = await listFiles(root);
  const entries = await Promise.all(files.map(async (filePath) => {
    const relativePath = path.relative(root, filePath).split(path.sep).join("/");
    const content = await fs.readFile(filePath);
    return [relativePath, createHash("sha256").update(content).digest("hex")] as const;
  }));
  return new Map(entries.sort(([left], [right]) => left.localeCompare(right)));
}

function summarizeDiff(files: DriftFileDiff[]): { missing: number; changed: number; extra: number } {
  return {
    missing: files.filter((file) => file.status === "missing").length,
    changed: files.filter((file) => file.status === "changed").length,
    extra: files.filter((file) => file.status === "extra").length
  };
}

function selectSkills(skills: SkillSummary[], names: string[]): SkillSummary[] {
  if (names.includes("*")) return skills;
  if (names.length === 0) return [];
  const wanted = new Set(names);
  return skills.filter((skill) => wanted.has(skill.name));
}
