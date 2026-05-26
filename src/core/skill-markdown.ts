import path from "node:path";
import { promises as fs } from "node:fs";
import { pathExists } from "./fs.js";

const SKILL_MARKDOWN = "SKILL.md";
const IGNORED_SCAN_DIRS = new Set([".git", "node_modules", "dist"]);

export async function findSkillMarkdownFile(dir: string): Promise<string | undefined> {
  const exactPath = path.join(dir, SKILL_MARKDOWN);
  if (await pathExists(exactPath)) return exactPath;

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const match = entries.find((entry) => entry.isFile() && isSkillMarkdownName(entry.name));
    return match ? path.join(dir, match.name) : undefined;
  } catch {
    return undefined;
  }
}

export async function hasSkillMarkdownFile(dir: string): Promise<boolean> {
  return Boolean(await findSkillMarkdownFile(dir));
}

export async function hasDescendantSkillMarkdownFile(dir: string): Promise<boolean> {
  if (await hasSkillMarkdownFile(dir)) return true;

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return false;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (IGNORED_SCAN_DIRS.has(entry.name)) continue;
    if (await hasDescendantSkillMarkdownFile(path.join(dir, entry.name))) return true;
  }
  return false;
}

export function isSkillMarkdownName(name: string): boolean {
  return name.toLowerCase() === SKILL_MARKDOWN.toLowerCase();
}
