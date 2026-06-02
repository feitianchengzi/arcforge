import path from "node:path";
import type { DriftFileDiff, DriftReport, LocalGitRemote, LocalGitSource, ShareTargetMode, WorkspaceSnapshot } from "../shared/types.js";
import { listFiles, pathExists } from "./fs.js";
import { compareDirectory } from "./profiles.js";
import { parseRemoteSource, shareTargetSubdir } from "./share-remote.js";
import { currentCommit, prepareShareCheckout, runGit, withShareLock } from "./share-git.js";
import { readShareManifest, shareManifestEntries, shareNamespace, staleShareManifestEntries, resolveShareProfile, selectProfileSkills } from "./share-sync.js";
import { scanWorkspace } from "./workspace.js";
import { normalizeGitRelativePath } from "./local-git.js";

export interface ShareDriftOptions {
  root: string;
  remoteUrl: string;
  targetMode?: ShareTargetMode;
  projectName?: string;
  profileName?: string;
  cacheDir: string;
  sameRepository?: boolean;
  sameRepositoryRemote?: string;
}

export async function shareDriftReport(options: ShareDriftOptions): Promise<DriftReport> {
  const root = path.resolve(options.root);
  const snapshot = await scanWorkspace(root);
  const profile = resolveShareProfile(snapshot.config, options.profileName);
  const selectedSkills = selectProfileSkills(snapshot.skills, profile.skills);

  if (options.sameRepository) {
    return sameRepositoryDriftReport(snapshot, profile.name, options.sameRepositoryRemote);
  }

  const target = parseRemoteSource(options.remoteUrl);
  const targetMode = options.targetMode ?? "direct";
  const projectName = options.projectName?.trim() || path.basename(root);
  const messages: string[] = [];

  return withShareLock(options.cacheDir, target, messages, async () => {
    const checkout = await prepareShareCheckout(options.cacheDir, target, messages);
    const resolvedTarget = checkout.source;
    const targetSubdir = shareTargetSubdir(resolvedTarget.subdir, targetMode, projectName, snapshot.config.sourceDir);
    const targetRoot = targetSubdir ? path.join(checkout.root, targetSubdir) : checkout.root;
    const sourceRoot = path.resolve(root, snapshot.config.sourceDir);
    const targetSourceRoot = path.join(targetRoot, snapshot.config.sourceDir);
    const items: DriftReport["items"] = [];
    const namespace = shareNamespace(projectName);
    const desiredEntries = shareManifestEntries(root, snapshot.config, selectedSkills, snapshot.assets, namespace);

    for (const skill of selectedSkills) {
      const relativePath = relativeSharedEntryPath(sourceRoot, skill.path, skill.name);
      const targetPath = path.join(targetSourceRoot, relativePath);
      const comparison = await compareDirectory(skill.path, targetPath);
      items.push({
        skill: skill.name,
        kind: "skill",
        status: comparison.status,
        sourcePath: skill.path,
        targetPath,
        files: comparison.files,
        summary: comparison.summary
      });
    }

    for (const asset of snapshot.assets) {
      const relativePath = relativeSharedEntryPath(sourceRoot, asset.path, asset.name);
      const targetPath = path.join(targetSourceRoot, relativePath);
      const comparison = await compareDirectory(asset.path, targetPath);
      items.push({
        skill: asset.name,
        kind: "asset",
        status: comparison.status,
        sourcePath: asset.path,
        targetPath,
        files: comparison.files,
        summary: comparison.summary
      });
    }

    const manifest = await readShareManifest(targetRoot);
    for (const entry of staleShareManifestEntries(manifest, desiredEntries, namespace, snapshot.config.sourceDir)) {
      const targetPath = path.join(targetSourceRoot, entry.relativePath);
      if (!(await pathExists(targetPath))) continue;
      const files = await deletedEntryFiles(targetPath);
      items.push({
        skill: entry.name,
        kind: entry.kind,
        status: files.length > 0 ? "changed" : "same",
        sourcePath: path.join(sourceRoot, entry.relativePath),
        targetPath,
        files,
        summary: summarizeDiff(files)
      });
    }

    messages.push(`Compared share target ${targetSubdir || "."}.`);
    const commit = await currentCommit(checkout.root, messages);
    return {
      profile: profile.name,
      targetDir: targetRoot,
      items,
      remoteUrl: resolvedTarget.cloneUrl,
      targetPath: targetSubdir || ".",
      commitHash: commit,
      messages
    };
  });
}

async function deletedEntryFiles(targetPath: string): Promise<DriftFileDiff[]> {
  const files = await listFiles(targetPath);
  if (files.length === 0) return [{ path: ".skillops-directory", status: "extra" }];
  return files.map((filePath) => ({
    path: path.relative(targetPath, filePath) || path.basename(filePath),
    status: "extra" as const
  }));
}

function sameRepositoryDriftReport(snapshot: WorkspaceSnapshot, profileName: string, remoteName?: string): Promise<DriftReport> {
  const { localGit, remote } = resolveSameRepository(snapshot, remoteName);
  const remoteUrl = remote.pushUrl || remote.fetchUrl || "";
  const targetPath = normalizeGitRelativePath(localGit.relativePath || ".");
  const targetDir = targetPath === "." ? localGit.root : path.join(localGit.root, targetPath);
  return runGit(localGit.root, ["status", "--porcelain", "--untracked-files=all", "--", targetPath], []).then((output) => {
    const files = parseGitStatus(output);
    const changed = files.length > 0;
    return {
      profile: profileName,
      targetDir,
      items: [{
        skill: "Local Git changes",
        status: changed ? "changed" : "same",
        sourcePath: targetDir,
        targetPath: `${remote.name}:${targetPath}`,
        files,
        summary: summarizeDiff(files)
      }],
      remoteUrl,
      targetPath,
      sameRepository: true,
      messages: [`Compared local Git status for ${targetPath}.`]
    };
  });
}

function parseGitStatus(output: string): DriftFileDiff[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const statusCode = line.slice(0, 2);
      const rawPath = line.slice(3).trim();
      const filePath = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() || rawPath : rawPath;
      return { path: filePath.replace(/^"|"$/g, ""), status: gitStatusToDriftStatus(statusCode) };
    });
}

function gitStatusToDriftStatus(statusCode: string): DriftFileDiff["status"] {
  if (statusCode.includes("D")) return "extra";
  if (statusCode.includes("A") || statusCode.includes("?")) return "missing";
  return "changed";
}

function summarizeDiff(files: DriftFileDiff[]): { missing: number; changed: number; extra: number } {
  return {
    missing: files.filter((file) => file.status === "missing").length,
    changed: files.filter((file) => file.status === "changed").length,
    extra: files.filter((file) => file.status === "extra").length
  };
}

function resolveSameRepository(snapshot: WorkspaceSnapshot, remoteName?: string): { localGit: LocalGitSource; remote: LocalGitRemote } {
  const localGit = snapshot.localGit;
  if (!localGit) throw new Error("Current SkillOps project is not inside a Git repository.");
  if (localGit.remotes.length === 0) throw new Error("Current Git repository has no remotes configured.");
  const requested = remoteName?.trim();
  const remote = requested
    ? localGit.remotes.find((item) => item.name === requested)
    : localGit.remotes[0];
  if (!remote) throw new Error(`Git remote ${requested} was not found in the local repository.`);
  return { localGit, remote };
}

function relativeSharedEntryPath(sourceRoot: string, entryPath: string, fallbackName: string): string {
  const relativePath = path.relative(sourceRoot, entryPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to compare shared item outside source directory: ${entryPath}`);
  }
  return relativePath || fallbackName;
}
