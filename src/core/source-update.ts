import path from "node:path";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";
import type { SourceUpdateResult, SourceUpdateStatus } from "../shared/types.js";
import { detectLocalGitSource } from "./local-git.js";
import { migrateRepositoryConfig } from "./config.js";

const execFileAsync = promisify(execFile);

export interface SourceUpdateOptions {
  root: string;
  fetch?: boolean;
  confirm?: boolean;
}

export async function checkSourceUpdate(options: SourceUpdateOptions): Promise<SourceUpdateStatus> {
  const root = path.resolve(options.root);
  await migrateRepositoryConfig(root);
  const localGit = await detectLocalGitSource(root);
  if (!localGit) throw new Error("Current SkillOps project is not inside a Git repository.");
  if (!localGit.currentBranch) throw new Error("Source update checks require the local repository to be on a branch, not a detached HEAD.");

  const messages: string[] = [];
  const upstream = await resolveUpstream(localGit.root, localGit.currentBranch, messages);
  if (!upstream) throw new Error(`Branch ${localGit.currentBranch} has no upstream branch. Set one with git branch --set-upstream-to or clone from GitHub again.`);

  const remoteName = upstream.split("/")[0];
  const remote = localGit.remotes.find((item) => item.name === remoteName);
  const previousFetchAt = await lastFetchAt(localGit.root, messages);
  const checkedAt = new Date();
  if (options.fetch !== false) {
    await git(localGit.root, ["fetch", "--prune", remoteName], messages);
  }

  const [head, upstreamHead, counts, dirtyOutput] = await Promise.all([
    git(localGit.root, ["rev-parse", "HEAD"], messages),
    git(localGit.root, ["rev-parse", upstream], messages),
    git(localGit.root, ["rev-list", "--left-right", "--count", `HEAD...${upstream}`], messages),
    git(localGit.root, ["status", "--porcelain"], messages)
  ]);
  const [aheadRaw, behindRaw] = counts.trim().split(/\s+/);
  const ahead = Number.parseInt(aheadRaw ?? "0", 10) || 0;
  const behind = Number.parseInt(behindRaw ?? "0", 10) || 0;
  const dirty = dirtyOutput.trim().length > 0;

  return {
    root,
    gitRoot: localGit.root,
    relativePath: localGit.relativePath,
    branch: localGit.currentBranch,
    upstream,
    remoteName,
    remoteUrl: remote?.fetchUrl || remote?.pushUrl,
    head: head.trim(),
    upstreamHead: upstreamHead.trim(),
    ahead,
    behind,
    dirty,
    canUpdate: behind > 0 && ahead === 0 && !dirty,
    previousFetchAt: previousFetchAt?.toISOString(),
    previousFetchAgeMs: previousFetchAt ? Math.max(0, checkedAt.getTime() - previousFetchAt.getTime()) : undefined,
    checkedAt: checkedAt.toISOString(),
    messages
  };
}

export async function updateSource(options: SourceUpdateOptions): Promise<SourceUpdateResult> {
  if (!options.confirm) throw new Error("Source update requires --confirm after reviewing source status.");
  const before = await checkSourceUpdate({ ...options, fetch: true });
  const messages = [...before.messages];
  if (before.ahead > 0) throw new Error("Local source has commits ahead of upstream. Update manually with Git so local changes are not overwritten.");
  if (before.dirty) throw new Error("Local source has uncommitted changes. Commit, stash, or discard them before updating.");
  if (before.behind === 0) {
    const after = await checkSourceUpdate({ ...options, fetch: false });
    return { before, after, updated: false, fastForwardOnly: true, messages: [...messages, ...after.messages] };
  }
  const upstreamBranch = before.upstream && before.remoteName ? before.upstream.slice(before.remoteName.length + 1) : "";
  if (!before.remoteName || !upstreamBranch) throw new Error("Unable to resolve source remote or upstream branch.");

  await git(before.gitRoot, ["pull", "--ff-only", before.remoteName, upstreamBranch], messages);
  const after = await checkSourceUpdate({ ...options, fetch: false });
  return {
    before,
    after,
    updated: before.head !== after.head,
    fastForwardOnly: true,
    messages: [...messages, ...after.messages]
  };
}


async function resolveUpstream(root: string, branch: string, messages: string[]): Promise<string | undefined> {
  const configured = await git(root, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], messages).catch(() => "");
  if (configured.trim()) return configured.trim();
  const originBranch = `origin/${branch}`;
  const exists = await git(root, ["rev-parse", "--verify", originBranch], messages).then(() => true, () => false);
  return exists ? originBranch : undefined;
}

async function lastFetchAt(root: string, messages: string[]): Promise<Date | undefined> {
  try {
    const fetchHeadPath = (await git(root, ["rev-parse", "--git-path", "FETCH_HEAD"], messages)).trim();
    if (!fetchHeadPath) return undefined;
    const stats = await fs.stat(path.isAbsolute(fetchHeadPath) ? fetchHeadPath : path.join(root, fetchHeadPath));
    return stats.mtime;
  } catch {
    return undefined;
  }
}

async function git(cwd: string, args: string[], messages: string[]): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, { cwd });
    const stdoutText = String(stdout);
    const output = `${stdoutText}${String(stderr)}`.trim();
    messages.push(`git ${args.join(" ")}${output ? `\n${output}` : ""}`);
    return stdoutText;
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const stdout = typeof (error as { stdout?: unknown }).stdout === "string" ? (error as { stdout: string }).stdout : "";
    const stderr = typeof (error as { stderr?: unknown }).stderr === "string" ? (error as { stderr: string }).stderr : "";
    throw new Error(`git ${args.join(" ")} failed.\n${details}\n${stdout}${stderr}`.trim());
  }
}
