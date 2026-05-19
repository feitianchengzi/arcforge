import path from "node:path";
import { promises as fs } from "node:fs";
import type { ApplyProfileResult, DriftReport, SkillOpsConfig, SkillSummary } from "../shared/types.js";
import { copyDirectory, pathExists } from "./fs.js";

export async function applyProfile(
  root: string,
  config: SkillOpsConfig,
  skills: SkillSummary[],
  profileName: string,
  targetDir: string
): Promise<ApplyProfileResult> {
  const profile = config.profiles.find((item) => item.name === profileName);
  if (!profile) throw new Error(`Profile not found: ${profileName}`);

  const selected = selectSkills(skills, profile.skills);
  const copied: string[] = [];
  const skipped: string[] = [];
  const destination = path.resolve(root, targetDir);

  await fs.mkdir(destination, { recursive: true });
  for (const skill of selected) {
    const target = path.join(destination, skill.name);
    if (await pathExists(target)) {
      skipped.push(skill.name);
      continue;
    }
    await copyDirectory(skill.path, target);
    copied.push(skill.name);
  }

  return { profile: profileName, targetDir: destination, copied, skipped };
}

export async function driftReport(
  root: string,
  config: SkillOpsConfig,
  skills: SkillSummary[],
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
    const exists = await pathExists(targetPath);
    items.push({
      skill: skill.name,
      status: exists ? "same" as const : "missing" as const,
      sourcePath: skill.path,
      targetPath
    });
  }

  return { profile: profileName, targetDir: destination, items };
}

function selectSkills(skills: SkillSummary[], names: string[]): SkillSummary[] {
  if (names.length === 0 || names.includes("*")) return skills;
  const wanted = new Set(names);
  return skills.filter((skill) => wanted.has(skill.name));
}
