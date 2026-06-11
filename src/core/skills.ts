import path from "node:path";
import { promises as fs } from "node:fs";
import type { SharedAssetSummary, SkillSummary } from "../shared/types.js";
import { parseFrontmatter } from "./frontmatter.js";
import { pathExists, readText } from "./fs.js";
import type { ArcForgeConfig } from "../shared/types.js";
import { findSkillMarkdownFile, hasSkillMarkdownFile } from "./skill-markdown.js";

const IGNORED_SCAN_DIRS = new Set([".git", "node_modules", "dist"]);

export async function discoverSkills(root: string, config: ArcForgeConfig): Promise<SkillSummary[]> {
  const sourceRoot = path.resolve(root, config.sourceDir);
  if (!(await pathExists(sourceRoot))) return [];

  const skills: SkillSummary[] = [];
  await walk(sourceRoot, async (dir) => {
    const skillFile = await findSkillMarkdownFile(dir);
    if (!skillFile) return;
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

export async function discoverSharedAssets(root: string, config: ArcForgeConfig): Promise<SharedAssetSummary[]> {
  const sourceRoot = path.resolve(root, config.sourceDir);
  if (!(await pathExists(sourceRoot))) return [];
  if (await hasSkillMarkdownFile(sourceRoot)) return [];

  const assetRoots = config.sourceDir === "." ? await discoverSkillContainerDirs(sourceRoot) : [sourceRoot];
  const assets: SharedAssetSummary[] = [];
  const seen = new Set<string>();
  for (const assetRoot of assetRoots) {
    const entries = await fs.readdir(assetRoot, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (IGNORED_SCAN_DIRS.has(entry.name)) continue;
      const assetPath = path.join(assetRoot, entry.name);
      if (seen.has(assetPath)) continue;
      if (await containsSkillFile(assetPath)) continue;
      seen.add(assetPath);
      assets.push({
        name: entry.name,
        path: assetPath,
        relativePath: path.relative(root, assetPath)
      });
    }
  }
  return assets.sort((a, b) => a.name.localeCompare(b.name));
}

async function walk(dir: string, onDir: (dir: string) => Promise<void>): Promise<void> {
  await onDir(dir);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (IGNORED_SCAN_DIRS.has(entry.name)) continue;
    await walk(path.join(dir, entry.name), onDir);
  }
}

async function containsSkillFile(dir: string): Promise<boolean> {
  if (await hasSkillMarkdownFile(dir)) return true;
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (IGNORED_SCAN_DIRS.has(entry.name)) continue;
    if (await containsSkillFile(path.join(dir, entry.name))) return true;
  }
  return false;
}

async function discoverSkillContainerDirs(root: string): Promise<string[]> {
  const containers: string[] = [];
  async function visit(dir: string): Promise<void> {
    if (path.basename(dir).toLowerCase() === "skills") {
      containers.push(dir);
      return;
    }
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (IGNORED_SCAN_DIRS.has(entry.name)) continue;
      await visit(path.join(dir, entry.name));
    }
  }
  await visit(root);
  return containers;
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
