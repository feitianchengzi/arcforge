import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import type { AppliedSourceRecord, ArcForgeConfig } from "../shared/types.js";
import { pathExists, writeJson } from "./fs.js";
import { detectLocalGitSource } from "./local-git.js";

export interface LocalProjectState {
  version: 1;
  projectKey: string;
  root: string;
  identity: ProjectIdentity;
  config?: ArcForgeConfig;
  appliedSources?: AppliedSourceRecord[];
  list?: ProjectListMetadata;
  updatedAt: string;
}

export interface ProjectListMetadata {
  order?: number;
  lastOpenedAt?: string;
  hidden?: boolean;
  sourceKind?: "local" | "github";
  localSourcePath?: string;
  githubSourceUrl?: string;
}

export interface ProjectIdentity {
  kind: "git" | "path";
  key: string;
  root: string;
  gitRoot?: string;
  relativePath?: string;
  remote?: string;
}

export function arcForgeHome(): string {
  return process.env.ARCFORGE_HOME?.trim() || path.join(os.homedir(), ".arcforge");
}

export function projectStoreDir(): string {
  return path.join(arcForgeHome(), "projects");
}

export async function loadLocalProjectState(root: string): Promise<LocalProjectState | undefined> {
  const filePath = await localProjectStatePath(root);
  if (!(await pathExists(filePath))) return undefined;
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as LocalProjectState;
}

export async function listLocalProjectStates(): Promise<LocalProjectState[]> {
  const entries = await fs.readdir(projectStoreDir(), { withFileTypes: true }).catch(() => []);
  const states: LocalProjectState[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(projectStoreDir(), entry.name), "utf8");
      const parsed = JSON.parse(raw) as Partial<LocalProjectState>;
      if (parsed.version !== 1 || !parsed.root || !parsed.projectKey || !parsed.updatedAt) continue;
      states.push(parsed as LocalProjectState);
    } catch {
      continue;
    }
  }
  return (await dedupeProjectStates(states)).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export async function saveLocalProjectConfig(root: string, config: ArcForgeConfig): Promise<LocalProjectState> {
  const current = await loadLocalProjectState(root);
  return saveLocalProjectState(root, {
    config,
    appliedSources: current?.appliedSources,
    list: current?.list
  });
}

export async function saveLocalProjectAppliedSources(root: string, appliedSources: AppliedSourceRecord[]): Promise<LocalProjectState> {
  const current = await loadLocalProjectState(root);
  return saveLocalProjectState(root, {
    config: current?.config,
    appliedSources,
    list: current?.list
  });
}

export async function saveLocalProjectListMetadata(root: string, list: ProjectListMetadata): Promise<LocalProjectState> {
  const current = await loadLocalProjectState(root);
  return saveLocalProjectState(root, {
    config: current?.config,
    appliedSources: current?.appliedSources,
    list: { ...(current?.list ?? {}), ...list }
  });
}

export async function saveLocalProjectListOrder(roots: string[]): Promise<void> {
  for (const [order, root] of roots.entries()) {
    await saveLocalProjectListMetadata(root, { order, hidden: false });
  }
}

export async function hideLocalProjectInList(root: string): Promise<void> {
  await saveLocalProjectListMetadata(root, { hidden: true });
}

async function saveLocalProjectState(root: string, patch: Partial<Pick<LocalProjectState, "config" | "appliedSources" | "list">>): Promise<LocalProjectState> {
  const identity = await identifyProject(root);
  const projectKey = projectKeyForIdentity(identity);
  const state: LocalProjectState = {
    version: 1,
    projectKey,
    root: path.resolve(root),
    identity,
    config: patch.config,
    appliedSources: patch.appliedSources,
    list: patch.list,
    updatedAt: new Date().toISOString()
  };
  const filePath = path.join(projectStoreDir(), `${projectKey}.json`);
  await writeJson(filePath, state);
  await removeDuplicateProjectStateFiles(state, filePath);
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

async function dedupeProjectStates(states: LocalProjectState[]): Promise<LocalProjectState[]> {
  const byRoot = new Map<string, LocalProjectState>();
  for (const state of states) {
    const key = await canonicalProjectRootKey(state.root);
    const current = byRoot.get(key);
    if (!current || projectStateTimestamp(state) > projectStateTimestamp(current)) {
      byRoot.set(key, state);
    }
  }
  return Array.from(byRoot.values());
}

async function removeDuplicateProjectStateFiles(state: LocalProjectState, currentFilePath: string): Promise<void> {
  const entries = await fs.readdir(projectStoreDir(), { withFileTypes: true }).catch(() => []);
  const rootKey = await canonicalProjectRootKey(state.root);
  const current = normalizeLocalPath(currentFilePath);
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const filePath = path.join(projectStoreDir(), entry.name);
    if (normalizeLocalPath(filePath) === current) continue;
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<LocalProjectState>;
      if (parsed.version !== 1 || !parsed.root || await canonicalProjectRootKey(parsed.root) !== rootKey) continue;
      await fs.unlink(filePath);
    } catch {
      continue;
    }
  }
}

async function canonicalProjectRootKey(root: string): Promise<string> {
  const resolved = path.resolve(root);
  const real = await fs.realpath(resolved).catch(() => resolved);
  return normalizeLocalPath(real);
}

function normalizeLocalPath(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === "win32" || process.platform === "darwin" ? resolved.toLowerCase() : resolved;
}

function projectStateTimestamp(state: LocalProjectState): number {
  const listTime = typeof state.list?.lastOpenedAt === "string" ? Date.parse(state.list.lastOpenedAt) : Number.NaN;
  if (Number.isFinite(listTime)) return listTime;
  const updatedTime = Date.parse(state.updatedAt);
  return Number.isFinite(updatedTime) ? updatedTime : 0;
}
