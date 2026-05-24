import path from "node:path";
import { promises as fs } from "node:fs";
import type { SkillOpsConfig } from "../shared/types.js";
import { pathExists, writeJson } from "./fs.js";
import { hasSkillMarkdownFile } from "./skill-markdown.js";

const CONFIG_FILE = "skillops.config.json";

export function configPath(root: string): string {
  return path.join(root, CONFIG_FILE);
}

export async function loadConfig(root: string): Promise<SkillOpsConfig> {
  const filePath = configPath(root);
  if (!(await pathExists(filePath))) {
    return defaultConfigForRoot(root);
  }
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as SkillOpsConfig;
  const fallback = await defaultConfigForRoot(root);
  return {
    ...fallback,
    ...parsed,
    sourceDir: parsed.sourceDir ?? fallback.sourceDir,
    profiles: parsed.profiles ?? []
  };
}

export async function defaultConfigForRoot(root: string): Promise<SkillOpsConfig> {
  return {
    ...defaultConfig(),
    sourceDir: await hasSkillMarkdownFile(root) ? "." : "skills"
  };
}

export async function saveConfig(root: string, config: SkillOpsConfig): Promise<void> {
  await writeJson(configPath(root), config);
}

export function defaultConfig(): SkillOpsConfig {
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
