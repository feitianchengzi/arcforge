import { auditWorkspace } from "./audit.js";
import { loadConfig } from "./config.js";
import { discoverSharedAssets, discoverSkills } from "./skills.js";
import type { WorkspaceSnapshot } from "../shared/types.js";
import { promises as fs } from "node:fs";
import { detectLocalGitSource } from "./local-git.js";

export async function scanWorkspace(root: string): Promise<WorkspaceSnapshot> {
  const stats = await fs.stat(root);
  if (!stats.isDirectory()) throw new Error("Workspace root is not a directory.");
  const config = await loadConfig(root);
  const skills = await discoverSkills(root, config);
  const assets = await discoverSharedAssets(root, config);
  const audit = await auditWorkspace(root, skills);
  const localGit = await detectLocalGitSource(root);
  return { root, config, skills, assets, audit, localGit };
}
