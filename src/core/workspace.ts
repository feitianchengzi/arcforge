import { auditWorkspace, type AuditWorkspaceOptions } from "./audit.js";
import { loadConfig } from "./config.js";
import { discoverSharedAssets, discoverSkills } from "./skills.js";
import type { WorkspaceSnapshot } from "../shared/types.js";
import { promises as fs } from "node:fs";
import { detectLocalGitSource } from "./local-git.js";
import { loadSkillProjectManifest, validateSkillProjectManifestSkills } from "./skill-project-manifest.js";

export interface ScanWorkspaceOptions {
  sourceDir?: string;
  audit?: AuditWorkspaceOptions;
}

export async function scanWorkspace(root: string, options: ScanWorkspaceOptions = {}): Promise<WorkspaceSnapshot> {
  const stats = await fs.stat(root);
  if (!stats.isDirectory()) throw new Error("Workspace root is not a directory.");
  const sourceManifestResult = await loadSkillProjectManifest(root);
  const config = withSourceDirOverride(
    withManifestSourceDir(await loadConfig(root), sourceManifestResult.manifest?.sourceDir),
    options.sourceDir
  );
  const skills = await discoverSkills(root, config);
  const assets = await discoverSharedAssets(root, config);
  const audit = await auditWorkspace(root, skills, options.audit);
  const localGit = await detectLocalGitSource(root);
  const sourceManifestDiagnostics = validateSkillProjectManifestSkills(
    sourceManifestResult.manifest,
    skills,
    sourceManifestResult.diagnostics
  );
  return {
    root,
    config,
    sourceManifest: sourceManifestResult.manifest,
    sourceManifestDiagnostics,
    skills,
    assets,
    audit,
    localGit
  };
}

function withManifestSourceDir(config: WorkspaceSnapshot["config"], sourceDir?: string): WorkspaceSnapshot["config"] {
  return sourceDir ? { ...config, sourceDir } : config;
}

function withSourceDirOverride(config: WorkspaceSnapshot["config"], sourceDir?: string): WorkspaceSnapshot["config"] {
  const value = sourceDir?.trim();
  if (!value) return config;
  if (value.startsWith("/") || value.split(/[\\/]+/).includes("..")) {
    throw new Error("--source-dir must be a relative path inside the workspace root.");
  }
  return { ...config, sourceDir: value };
}
