import { auditWorkspace } from "./audit.js";
import { loadConfig, saveConfig } from "./config.js";
import { discoverSharedAssets, discoverSkills } from "./skills.js";
import type { WorkspaceSnapshot, SkillOpsConfig } from "../shared/types.js";

export async function scanWorkspace(root: string): Promise<WorkspaceSnapshot> {
  const config = await loadConfig(root);
  const skills = await discoverSkills(root, config);
  const assets = await discoverSharedAssets(root, config);
  const audit = await auditWorkspace(root, skills);
  return { root, config, skills, assets, audit };
}

export async function initWorkspace(root: string, config?: Partial<SkillOpsConfig>): Promise<SkillOpsConfig> {
  const next: SkillOpsConfig = {
    version: 1,
    sourceDir: config?.sourceDir ?? "skills",
    teamRepo: config?.teamRepo,
    profiles: config?.profiles ?? [
      {
        name: "default",
        description: "Default skill set for this workspace.",
        skills: ["*"],
        targets: ["claude", "codex", "cursor"]
      }
    ]
  };
  await saveConfig(root, next);
  return next;
}
