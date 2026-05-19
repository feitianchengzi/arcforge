import path from "node:path";
import { promises as fs } from "node:fs";
import type { SkillSummary } from "../shared/types.js";
import { parseFrontmatter } from "./frontmatter.js";
import { pathExists, readText } from "./fs.js";
import type { SkillOpsConfig } from "../shared/types.js";

export async function discoverSkills(root: string, config: SkillOpsConfig): Promise<SkillSummary[]> {
  const sourceRoot = path.resolve(root, config.sourceDir);
  if (!(await pathExists(sourceRoot))) return [];

  const skills: SkillSummary[] = [];
  await walk(sourceRoot, async (dir) => {
    const skillFile = path.join(dir, "SKILL.md");
    if (!(await pathExists(skillFile))) return;
    const raw = await readText(skillFile);
    const parsed = parseFrontmatter(raw);
    const name = stringValue(parsed.frontmatter.name) || path.basename(dir);
    const description = stringValue(parsed.frontmatter.description) || firstParagraph(parsed.body);
    const targets = arrayValue(parsed.frontmatter["metadata.targets"] ?? parsed.frontmatter.targets);
    const relativePath = path.relative(root, dir);
    skills.push({
      name,
      description,
      path: dir,
      relativePath,
      targets,
      version: stringValue(parsed.frontmatter.version),
      hasReferences: await pathExists(path.join(dir, "references")),
      hasScripts: await pathExists(path.join(dir, "scripts"))
    });
  });

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

async function walk(dir: string, onDir: (dir: string) => Promise<void>): Promise<void> {
  await onDir(dir);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    await walk(path.join(dir, entry.name), onDir);
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function arrayValue(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function firstParagraph(body: string): string {
  const paragraph = body.split(/\n\s*\n/).find((part) => part.trim() && !part.trim().startsWith("#"));
  return paragraph?.replace(/\s+/g, " ").trim().slice(0, 180) ?? "";
}
