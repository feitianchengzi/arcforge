import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import type { SkillOpsConfig } from "../shared/types.js";
import { pathExists, writeJson } from "./fs.js";
import { detectLocalGitSource } from "./local-git.js";

export interface LocalProjectState {
  version: 1;
  projectKey: string;
  root: string;
  identity: ProjectIdentity;
  config?: SkillOpsConfig;
  updatedAt: string;
}

export interface ProjectIdentity {
  kind: "git" | "path";
  key: string;
  root: string;
  gitRoot?: string;
  relativePath?: string;
  remote?: string;
}

export function skillOpsHome(): string {
  return process.env.SKILLOPS_HOME?.trim() || path.join(os.homedir(), ".skillops");
}

export function projectStoreDir(): string {
  return path.join(skillOpsHome(), "projects");
}

export async function loadLocalProjectState(root: string): Promise<LocalProjectState | undefined> {
  const filePath = await localProjectStatePath(root);
  if (!(await pathExists(filePath))) return undefined;
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as LocalProjectState;
}

export async function saveLocalProjectConfig(root: string, config: SkillOpsConfig): Promise<LocalProjectState> {
  const identity = await identifyProject(root);
  const projectKey = projectKeyForIdentity(identity);
  const state: LocalProjectState = {
    version: 1,
    projectKey,
    root: path.resolve(root),
    identity,
    config,
    updatedAt: new Date().toISOString()
  };
  await writeJson(path.join(projectStoreDir(), `${projectKey}.json`), state);
  return state;
}

export async function localProjectStatePath(root: string): Promise<string> {
  const identity = await identifyProject(root);
  return path.join(projectStoreDir(), `${projectKeyForIdentity(identity)}.json`);
}

export async function identifyProject(root: string): Promise<ProjectIdentity> {
  const resolvedRoot = path.resolve(root);
  const localGit = await detectLocalGitSource(resolvedRoot);
  const remote = localGit?.remotes.find((item) => item.name === "origin") ?? localGit?.remotes[0];
  if (localGit && remote?.canonicalKey) {
    const relativePath = localGit.relativePath || ".";
    return {
      kind: "git",
      key: `${remote.canonicalKey}#${relativePath}`,
      root: resolvedRoot,
      gitRoot: localGit.root,
      relativePath,
      remote: remote.canonicalKey
    };
  }
  return {
    kind: "path",
    key: resolvedRoot,
    root: resolvedRoot
  };
}

function projectKeyForIdentity(identity: ProjectIdentity): string {
  return crypto.createHash("sha256").update(`${identity.kind}:${identity.key}`).digest("hex").slice(0, 24);
}
