import path from "node:path";
import { promises as fs } from "node:fs";
import type { ArcForgeConfig } from "../shared/types.js";
import { pathExists } from "./fs.js";
import { loadLocalProjectState, saveLocalProjectConfig } from "./project-store.js";
import { hasDescendantSkillMarkdownFile, hasSkillMarkdownFile } from "./skill-markdown.js";

const CONFIG_FILE = "arcforge.config.json";

export function configPath(root: string): string {
  return path.join(root, CONFIG_FILE);
}

export async function loadConfig(root: string): Promise<ArcForgeConfig> {
  const fallback = await defaultConfigForRoot(root);
  await migrateRepositoryConfig(root);
  const localState = await loadLocalProjectState(root);
  const parsed = localState?.config;
  if (!parsed) return fallback;
  return {
    ...fallback,
    ...parsed,
    sourceDir: parsed.sourceDir ?? fallback.sourceDir,
    profiles: parsed.profiles ?? []
  };
}

export async function defaultConfigForRoot(root: string): Promise<ArcForgeConfig> {
  const conventionalSourceDir = path.join(root, "skills");
  return {
    ...defaultConfig(),
    sourceDir: await defaultSourceDirForRoot(root, conventionalSourceDir)
  };
}

async function defaultSourceDirForRoot(root: string, conventionalSourceDir = path.join(root, "skills")): Promise<string> {
  if (await hasSkillMarkdownFile(root)) return ".";
  if (await isDirectory(conventionalSourceDir) && await hasDescendantSkillMarkdownFile(conventionalSourceDir)) return "skills";
  if (await hasDescendantSkillMarkdownFile(root)) return ".";
  return "skills";
}

async function isDirectory(filePath: string): Promise<boolean> {
  try {
    return (await fs.stat(filePath)).isDirectory();
  } catch {
    return false;
  }
}

export async function saveConfig(root: string, config: ArcForgeConfig): Promise<void> {
  await saveLocalProjectConfig(root, config);
}

export async function migrateRepositoryConfig(root: string): Promise<void> {
  const filePath = configPath(root);
  if (!(await pathExists(filePath))) return;
  const localState = await loadLocalProjectState(root);
  if (!localState?.config) {
    const raw = await fs.readFile(filePath, "utf8");
    await saveLocalProjectConfig(root, JSON.parse(raw) as ArcForgeConfig);
  }
  await fs.unlink(filePath);
}


export function defaultConfig(): ArcForgeConfig {
  return {
    version: 1,
    sourceDir: "skills",
    profiles: [
      {
        name: "default",
        description: "Default skill set for local projects.",
        skills: ["*"],
        targets: ["claude", "codex", "cursor"]
      }
    ]
  };
}
