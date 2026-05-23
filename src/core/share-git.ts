import path from "node:path";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ShareTargetMode } from "../shared/types.js";
import { pathExists } from "./fs.js";
import { canonicalRemoteKey, remoteProjectRef, repoName, shareTargetSubdir, type ParsedRemoteSource } from "./share-remote.js";

const execFileAsync = promisify(execFile);

export async function prepareShareCheckout(cacheDir: string, target: ParsedRemoteSource, messages: string[]): Promise<{ root: string; branch: string; source: ParsedRemoteSource }> {
  const checkoutsRoot = path.join(cacheDir, "share-worktrees");
  const checkoutRoot = path.join(checkoutsRoot, `${repoName(target.cloneUrl)}-${crypto.createHash("sha256").update(target.cloneUrl).digest("hex").slice(0, 8)}`);
  await fs.mkdir(checkoutsRoot, { recursive: true });
  if (await pathExists(checkoutRoot)) {
    await runGit(checkoutRoot, ["fetch", "--prune", "origin"], messages);
  } else {
    await execFileAsync("git", ["clone", target.cloneUrl, checkoutRoot]);
    messages.push(`git clone ${target.cloneUrl}`);
  }

  const source = await resolveRemoteSourceRef(target, checkoutRoot, messages);
  const branch = source.ref || await remoteDefaultBranch(checkoutRoot, messages) || "main";
  if (await remoteBranchExists(checkoutRoot, branch, messages)) {
    await runGit(checkoutRoot, ["checkout", "-B", branch, `origin/${branch}`], messages);
    await runGit(checkoutRoot, ["pull", "--ff-only", "origin", branch], messages);
  } else {
    await runGit(checkoutRoot, ["checkout", "-B", branch], messages);
    messages.push(`Remote branch ${branch} does not exist yet; it will be created on push.`);
  }
  return { root: checkoutRoot, branch, source };
}

export async function directShareTarget(root: string, target: ParsedRemoteSource, targetMode: ShareTargetMode, projectName: string, sourceDir: string, messages: string[]): Promise<{
  checkoutRoot: string;
  branch: string;
  source: ParsedRemoteSource;
  targetSubdir: string;
  installRef: string;
} | undefined> {
  try {
    const checkoutRoot = (await runGit(root, ["rev-parse", "--show-toplevel"], messages)).trim();
    const remoteName = await matchingRemoteName(checkoutRoot, target.cloneUrl, messages);
    if (!remoteName) return undefined;

    await runGit(checkoutRoot, ["fetch", "--prune", remoteName], messages);
    const source = await resolveRemoteSourceRef(target, checkoutRoot, messages);
    const currentBranchName = await currentBranch(checkoutRoot, messages);
    const branch = source.ref || currentBranchName || await remoteDefaultBranch(checkoutRoot, messages) || "main";
    if (currentBranchName !== branch) return undefined;

    const targetSubdir = shareTargetSubdir(source.subdir, targetMode, projectName, sourceDir);
    const expectedRoot = targetSubdir ? path.join(checkoutRoot, targetSubdir) : checkoutRoot;
    if (path.resolve(root) !== path.resolve(expectedRoot)) return undefined;

    return {
      checkoutRoot,
      branch,
      source,
      targetSubdir,
      installRef: remoteProjectRef(source.cloneUrl, branch, targetSubdir)
    };
  } catch {
    return undefined;
  }
}

export async function resolveRemoteSourceRef(source: ParsedRemoteSource, checkoutRoot: string, messages: string[]): Promise<ParsedRemoteSource> {
  if (!source.ref || !source.subdir) return source;
  const branches = await remoteBranches(checkoutRoot, messages);
  const pathParts = source.subdir.split("/").filter(Boolean);
  let bestRef = source.ref;
  let bestSubdir = source.subdir;
  for (let index = 0; index < pathParts.length; index += 1) {
    const candidateRef = [source.ref, ...pathParts.slice(0, index + 1)].join("/");
    if (branches.includes(candidateRef) && candidateRef.length > bestRef.length) {
      bestRef = candidateRef;
      bestSubdir = pathParts.slice(index + 1).join("/");
    }
  }
  if (bestRef !== source.ref) {
    messages.push(`Resolved GitHub tree ref ${source.ref} to branch ${bestRef}.`);
  }
  return { ...source, ref: bestRef, subdir: bestSubdir };
}

export async function withShareLock<T>(cacheDir: string, target: ParsedRemoteSource, messages: string[], task: () => Promise<T>): Promise<T> {
  const locksRoot = path.join(cacheDir, "share-worktrees");
  const lockPath = path.join(locksRoot, `${repoName(target.cloneUrl)}-${crypto.createHash("sha256").update(`${target.cloneUrl}#${target.ref}`).digest("hex").slice(0, 8)}.lock`);
  await fs.mkdir(locksRoot, { recursive: true });
  const startedAt = Date.now();
  while (true) {
    try {
      await fs.mkdir(lockPath);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (Date.now() - startedAt > 120_000) {
        throw new Error("Another share operation is still running for this repository. Try again after it finishes.");
      }
      await sleep(500);
    }
  }
  messages.push("Acquired share lock.");
  try {
    return await task();
  } finally {
    await fs.rm(lockPath, { recursive: true, force: true });
    messages.push("Released share lock.");
  }
}

export async function runGit(root: string, args: string[], messages: string[]): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, { cwd: root });
    const output = `${stdout}${stderr}`.trim();
    messages.push(`git ${args.join(" ")}${output ? `\n${output}` : ""}`);
    return stdout;
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const stdout = typeof (error as { stdout?: unknown }).stdout === "string" ? (error as { stdout: string }).stdout : "";
    const stderr = typeof (error as { stderr?: unknown }).stderr === "string" ? (error as { stderr: string }).stderr : "";
    throw new Error(`git ${args.join(" ")} failed.\n${details}\n${stdout}${stderr}`.trim());
  }
}

export async function pushWithRebaseRetry(root: string, branch: string, messages: string[]): Promise<void> {
  try {
    await runGit(root, ["push", "-u", "origin", branch], messages);
  } catch {
    messages.push("Push failed; rebasing on the latest remote branch and retrying once.");
    await runGit(root, ["fetch", "origin", branch], messages);
    await runGit(root, ["pull", "--rebase", "origin", branch], messages);
    await runGit(root, ["push", "-u", "origin", branch], messages);
  }
}

async function remoteDefaultBranch(root: string, messages: string[]): Promise<string | undefined> {
  try {
    const value = (await runGit(root, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], messages)).trim();
    return value.replace(/^origin\//, "") || undefined;
  } catch {
    const branches = await remoteBranches(root, messages);
    return branches.includes("main") ? "main" : branches.includes("master") ? "master" : branches[0];
  }
}

async function matchingRemoteName(root: string, targetUrl: string, messages: string[]): Promise<string | undefined> {
  const targetKey = canonicalRemoteKey(targetUrl);
  const output = await runGit(root, ["remote", "-v"], messages);
  for (const line of output.split(/\r?\n/)) {
    const match = line.trim().match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
    if (!match) continue;
    const [, name, url, kind] = match;
    if (kind === "fetch" && canonicalRemoteKey(url) === targetKey) return name;
  }
  return undefined;
}

async function remoteBranchExists(root: string, branch: string, messages: string[]): Promise<boolean> {
  return (await remoteBranches(root, messages)).includes(branch);
}

async function remoteBranches(root: string, messages: string[]): Promise<string[]> {
  try {
    const output = await runGit(root, ["branch", "-r", "--format=%(refname:short)"], messages);
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("origin/") && line !== "origin/HEAD")
      .map((line) => line.replace(/^origin\//, ""));
  } catch {
    return [];
  }
}

async function currentBranch(root: string, messages: string[]): Promise<string> {
  try {
    return (await runGit(root, ["rev-parse", "--abbrev-ref", "HEAD"], messages)).trim();
  } catch {
    return "main";
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
