import path from "node:path";
import { promises as fs } from "node:fs";
import { pathExists } from "./fs.js";

const SKILL_MARKDOWN = "SKILL.md";

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

export function isSkillMarkdownName(name: string): boolean {
  return name.toLowerCase() === SKILL_MARKDOWN.toLowerCase();
}
