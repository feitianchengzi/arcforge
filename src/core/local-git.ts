import path from "node:path";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { LocalGitRemote, LocalGitSource } from "../shared/types.js";
import { canonicalRemoteKey } from "./share-remote.js";

const execFileAsync = promisify(execFile);

export async function detectLocalGitSource(root: string): Promise<LocalGitSource | undefined> {
  const resolvedRoot = await realPath(root);
  try {
    const gitRootRaw = (await git(resolvedRoot, ["rev-parse", "--show-toplevel"])).trim();
    const gitRoot = await realPath(gitRootRaw);
    if (!gitRoot) return undefined;
    const currentBranch = (await git(resolvedRoot, ["branch", "--show-current"]).catch(() => "")).trim() || undefined;
    const remotes = parseRemoteOutput(await git(gitRoot, ["remote", "-v"]).catch(() => ""));
    const relativePath = normalizeGitRelativePath(path.relative(gitRoot, resolvedRoot));
    return {
      root: gitRoot,
      relativePath,
      currentBranch,
      remotes
    };
  } catch {
    return undefined;
  }
}

export function normalizeGitRelativePath(relativePath: string): string {
  const normalized = toPosixRelative(relativePath) || ".";
  if (normalized === ".") return normalized;
  if (normalized.startsWith("../") || normalized === ".." || path.isAbsolute(normalized)) {
    throw new Error(`Workspace path is outside the Git repository: ${relativePath}`);
  }
  return normalized;
}

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return String(stdout);
}

async function realPath(value: string): Promise<string> {
  const resolved = path.resolve(value);
  return fs.realpath(resolved).catch(() => resolved);
}

function parseRemoteOutput(output: string): LocalGitRemote[] {
  const remotes = new Map<string, LocalGitRemote>();
  for (const line of output.split(/\r?\n/)) {
    const match = line.trim().match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
    if (!match) continue;
    const [, name, url, kind] = match;
    const current = remotes.get(name) ?? { name, canonicalKey: "" };
    if (kind === "fetch") current.fetchUrl = url;
    if (kind === "push") current.pushUrl = url;
    const preferredUrl = current.pushUrl || current.fetchUrl || url;
    current.canonicalKey = safeCanonicalRemoteKey(preferredUrl);
    remotes.set(name, current);
  }
  return Array.from(remotes.values()).filter((remote) => remote.fetchUrl || remote.pushUrl);
}

function toPosixRelative(value: string): string {
  return value.split(path.sep).filter(Boolean).join("/");
}

function safeCanonicalRemoteKey(value: string): string {
  try {
    return canonicalRemoteKey(value);
  } catch {
    return value.trim().replace(/\/$/, "").replace(/\.git$/, "").toLowerCase();
  }
}
