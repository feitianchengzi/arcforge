import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { LocalGitRemote, LocalGitSource } from "../shared/types.js";
import { canonicalRemoteKey } from "./share-remote.js";

const execFileAsync = promisify(execFile);

export async function detectLocalGitSource(root: string): Promise<LocalGitSource | undefined> {
  const resolvedRoot = path.resolve(root);
  try {
    const gitRoot = (await git(resolvedRoot, ["rev-parse", "--show-toplevel"])).trim();
    if (!gitRoot) return undefined;
    const currentBranch = (await git(resolvedRoot, ["branch", "--show-current"]).catch(() => "")).trim() || undefined;
    const remotes = parseRemoteOutput(await git(gitRoot, ["remote", "-v"]).catch(() => ""));
    const relativePath = toPosixRelative(path.relative(gitRoot, resolvedRoot)) || ".";
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

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return String(stdout);
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
