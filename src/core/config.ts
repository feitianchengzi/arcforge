import path from "node:path";
import { promises as fs } from "node:fs";
import type { SkillOpsConfig } from "../shared/types.js";
import { pathExists, writeJson } from "./fs.js";

const CONFIG_FILE = "skillops.config.json";

export function configPath(root: string): string {
  return path.join(root, CONFIG_FILE);
}

export async function loadConfig(root: string): Promise<SkillOpsConfig> {
  const filePath = configPath(root);
  if (!(await pathExists(filePath))) {
    return defaultConfig();
  }
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as SkillOpsConfig;
  return {
    ...defaultConfig(),
    ...parsed,
    profiles: parsed.profiles ?? []
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
