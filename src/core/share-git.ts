import path from "node:path";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GitHubAccessResult, ShareDeliveryMethod } from "../shared/types.js";
import { pathExists } from "./fs.js";
import { canonicalRemoteKey, repoName, type ParsedRemoteSource } from "./share-remote.js";

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

export async function checkoutShareBranch(root: string, baseBranch: string, shareBranch: string, messages: string[]): Promise<void> {
  if (baseBranch === shareBranch) {
    messages.push(`Using base branch ${baseBranch} as the share branch.`);
    return;
  }
  try {
    await runGit(root, ["rev-parse", "--verify", `origin/${baseBranch}`], messages);
    await runGit(root, ["checkout", "-B", shareBranch, `origin/${baseBranch}`], messages);
  } catch {
    messages.push(`Remote base origin/${baseBranch} was not found; creating ${shareBranch} from current HEAD.`);
    await runGit(root, ["checkout", "-B", shareBranch], messages);
  }
}

export async function inspectGitHubAccess(remoteUrl: string, messages: string[] = []): Promise<GitHubAccessResult> {
  const target = parseGitHubRepo(remoteUrl);
  const base: GitHubAccessResult = {
    remoteUrl,
    cloneUrl: target?.cloneUrl ?? remoteUrl,
    repository: target?.nameWithOwner,
    authenticated: false,
    ghAvailable: false,
    canPush: false,
    canCreatePullRequest: false,
    canFork: false,
    recommendedDelivery: "localBranch",
    availableDelivery: ["localBranch"],
    unavailableReasons: [],
    messages
  };
  if (!target) {
    base.unavailableReasons.push("Remote is not a GitHub repository; only local branch sharing is available.");
    return base;
  }

  try {
    await runGh(["--version"], messages);
    base.ghAvailable = true;
  } catch {
    base.unavailableReasons.push("GitHub CLI is not available on PATH.");
    return base;
  }

  try {
    await runGh(["auth", "status", "--hostname", "github.com"], messages);
    base.authenticated = true;
  } catch {
    base.unavailableReasons.push("GitHub CLI is not authenticated for github.com.");
    return base;
  }

  try {
    const output = await runGh(["repo", "view", target.nameWithOwner, "--json", "viewerPermission,defaultBranchRef,nameWithOwner"], messages);
    const details = JSON.parse(output || "{}") as {
      viewerPermission?: string;
      defaultBranchRef?: { name?: string };
      nameWithOwner?: string;
    };
    base.repository = details.nameWithOwner ?? target.nameWithOwner;
    base.defaultBranch = details.defaultBranchRef?.name;
    base.viewerPermission = details.viewerPermission;
    const permission = (details.viewerPermission ?? "").toUpperCase();
    base.canPush = ["ADMIN", "MAINTAIN", "WRITE"].includes(permission);
    base.canCreatePullRequest = base.canPush || ["READ", "TRIAGE"].includes(permission);
    base.canFork = true;
  } catch (error) {
    base.unavailableReasons.push(error instanceof Error ? error.message : String(error));
    return base;
  }

  const available: ShareDeliveryMethod[] = ["localBranch"];
  if (base.canPush) {
    available.unshift("directPush");
    available.unshift("targetPullRequest");
  } else if (base.canFork) {
    available.unshift("forkPullRequest");
  }
  base.availableDelivery = available;
  base.recommendedDelivery = base.canPush ? "targetPullRequest" : base.canFork ? "forkPullRequest" : "localBranch";
  if (!base.canPush) base.unavailableReasons.push("Current GitHub user cannot push branches to the target repository.");
  return base;
}

export async function createPullRequest(root: string, options: {
  repository: string;
  head: string;
  base: string;
  title: string;
  body: string;
}, messages: string[]): Promise<string> {
  const output = await runGh([
    "pr",
    "create",
    "--repo",
    options.repository,
    "--head",
    options.head,
    "--base",
    options.base,
    "--title",
    options.title,
    "--body",
    options.body
  ], messages, root);
  return output.trim();
}

export async function ensureForkRemote(root: string, repository: string, messages: string[]): Promise<{ remoteName: string; owner: string; pushUrl: string }> {
  const owner = await currentGitHubLogin(messages);
  await runGh(["repo", "fork", repository, "--clone=false", "--remote=false"], messages, root).catch((error) => {
    messages.push(`gh repo fork skipped or failed; continuing with expected fork remote.\n${error instanceof Error ? error.message : String(error)}`);
  });
  const repo = repository.split("/")[1];
  const pushUrl = `https://github.com/${owner}/${repo}.git`;
  const remotes = await runGit(root, ["remote"], messages);
  if (!remotes.split(/\r?\n/).includes("skillops-fork")) {
    await runGit(root, ["remote", "add", "skillops-fork", pushUrl], messages);
  } else {
    await runGit(root, ["remote", "set-url", "skillops-fork", pushUrl], messages);
  }
  return { remoteName: "skillops-fork", owner, pushUrl };
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

export async function pushBranch(root: string, remote: string, branch: string, messages: string[]): Promise<void> {
  await runGit(root, ["push", "-u", remote, branch], messages);
}

export async function currentCommit(root: string, messages: string[]): Promise<string | undefined> {
  try {
    return (await runGit(root, ["rev-parse", "HEAD"], messages)).trim();
  } catch {
    return undefined;
  }
}

export function parseGitHubRepo(remoteUrl: string): { owner: string; repo: string; nameWithOwner: string; cloneUrl: string } | undefined {
  const key = canonicalRemoteKey(remoteUrl);
  const match = key.match(/^github\.com\/([^/]+)\/([^/]+)$/i);
  if (!match) return undefined;
  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, "");
  return {
    owner,
    repo,
    nameWithOwner: `${owner}/${repo}`,
    cloneUrl: `https://github.com/${owner}/${repo}.git`
  };
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

async function runGh(args: string[], messages: string[], cwd?: string): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync("gh", args, cwd ? { cwd } : undefined);
    const stdoutText = String(stdout);
    const output = `${stdoutText}${String(stderr)}`.trim();
    messages.push(`gh ${args.join(" ")}${output ? `\n${output}` : ""}`);
    return stdoutText;
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const stdout = typeof (error as { stdout?: unknown }).stdout === "string" ? (error as { stdout: string }).stdout : "";
    const stderr = typeof (error as { stderr?: unknown }).stderr === "string" ? (error as { stderr: string }).stderr : "";
    throw new Error(`gh ${args.join(" ")} failed.\n${details}\n${stdout}${stderr}`.trim());
  }
}

async function currentGitHubLogin(messages: string[]): Promise<string> {
  const output = await runGh(["api", "user", "--jq", ".login"], messages);
  const login = output.trim();
  if (!login) throw new Error("Unable to resolve current GitHub login.");
  return login;
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

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
