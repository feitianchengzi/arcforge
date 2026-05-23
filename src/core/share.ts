import path from "node:path";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ShareResult, ShareTargetMode } from "../shared/types.js";
import { saveConfig } from "./config.js";
import { pathExists } from "./fs.js";
import { directShareTarget, prepareShareCheckout, pushWithRebaseRetry, resolveRemoteSourceRef, runGit, withShareLock } from "./share-git.js";
import { parseRemoteSource, remoteProjectRef, repoName, shareTargetSubdir, sourceProjectRoot } from "./share-remote.js";
import { namespaceProfiles, normalizeConfig, resolveShareProfile, selectProfileSkills, syncProjectMetadata, syncProjectToShareTarget } from "./share-sync.js";
import { scanWorkspace } from "./workspace.js";

const execFileAsync = promisify(execFile);

export interface ShareProjectOptions {
  root: string;
  remoteUrl: string;
  visibility: "private" | "public";
  message?: string;
  targetMode?: ShareTargetMode;
  projectName?: string;
  profileName?: string;
  skills?: string[];
  cacheDir: string;
}

export interface DownloadSourceOptions {
  remoteUrl: string;
  cacheDir: string;
}

export async function shareProject(options: ShareProjectOptions): Promise<ShareResult> {
  const root = path.resolve(options.root);
  const target = parseRemoteSource(options.remoteUrl);
  const snapshot = await scanWorkspace(root);
  const profile = resolveShareProfile(snapshot.config, options.profileName, options.skills);
  const selectedSkills = selectProfileSkills(snapshot.skills, profile.skills, true);
  const targetMode = options.targetMode ?? "direct";
  const projectName = options.projectName?.trim() || path.basename(root);
  const messages: string[] = [];

  return withShareLock(options.cacheDir, target, messages, async () => {
    const direct = await directShareTarget(root, target, targetMode, projectName, snapshot.config.sourceDir, messages);
    if (direct) {
      const namespace = slug(projectName);
      const localConfig = normalizeConfig({
        ...snapshot.config,
        teamRepo: options.remoteUrl.trim(),
        shareTargetMode: targetMode,
        shareProjectName: options.projectName?.trim() || undefined
      });
      const publishedConfig = namespaceProfiles(normalizeConfig({ ...localConfig, teamRepo: direct.installRef, profiles: [profile] }), namespace);

      await saveConfig(root, localConfig);
      await syncProjectMetadata(root, publishedConfig, options.visibility, projectName);
      messages.push(`Shared project directly from current checkout at ${direct.targetSubdir || "."}.`);

      await stageShareTarget(direct.checkoutRoot, direct.targetSubdir, publishedConfig.sourceDir, messages);
      const committed = await commitIfChanged(direct.checkoutRoot, options.message, messages);
      await pushWithRebaseRetry(direct.checkoutRoot, direct.branch, messages);
      return { remoteUrl: direct.source.cloneUrl, branch: direct.branch, targetPath: direct.targetSubdir || ".", committed, pushed: true, messages };
    }

    const checkout = await prepareShareCheckout(options.cacheDir, target, messages);
    const checkoutRoot = checkout.root;
    const branch = checkout.branch;
    const resolvedTarget = checkout.source;
    const targetSubdir = shareTargetSubdir(resolvedTarget.subdir, targetMode, projectName, snapshot.config.sourceDir);
    const targetRoot = targetSubdir ? path.join(checkoutRoot, targetSubdir) : checkoutRoot;
    const installRef = remoteProjectRef(resolvedTarget.cloneUrl, branch, targetSubdir);
    const namespace = slug(projectName);
    const localConfig = normalizeConfig({
      ...snapshot.config,
      teamRepo: options.remoteUrl.trim(),
      shareTargetMode: targetMode,
      shareProjectName: options.projectName?.trim() || undefined
    });
    const publishedConfig = namespaceProfiles(normalizeConfig({ ...localConfig, teamRepo: installRef, profiles: [profile] }), namespace);

    await saveConfig(root, localConfig);
    await syncProjectToShareTarget(root, targetRoot, publishedConfig, selectedSkills, snapshot.assets, options.visibility, projectName, namespace);
    messages.push(`Shared project files to ${targetSubdir || "."}.`);

    await stageShareTarget(checkoutRoot, targetSubdir, publishedConfig.sourceDir, messages);
    const committed = await commitIfChanged(checkoutRoot, options.message, messages);
    await pushWithRebaseRetry(checkoutRoot, branch, messages);
    return { remoteUrl: resolvedTarget.cloneUrl, branch, targetPath: targetSubdir || ".", committed, pushed: true, messages };
  });
}

export async function downloadSource(options: DownloadSourceOptions): Promise<string> {
  const source = parseRemoteSource(options.remoteUrl);
  const sourcesRoot = path.join(options.cacheDir, "sources");
  const dirName = `${repoName(source.cloneUrl)}-${crypto.createHash("sha256").update(`${source.cloneUrl}#${source.ref}`).digest("hex").slice(0, 8)}`;
  const target = path.join(sourcesRoot, dirName);
  await fs.mkdir(sourcesRoot, { recursive: true });
  if (await pathExists(target)) {
    await execFileAsync("git", ["-C", target, "pull", "--ff-only"]);
  } else {
    await execFileAsync("git", ["clone", source.cloneUrl, target]);
  }
  const resolvedSource = await resolveRemoteSourceRef(source, target, []);
  if (resolvedSource.ref) {
    await execFileAsync("git", ["-C", target, "checkout", resolvedSource.ref]);
  }
  const projectRoot = await sourceProjectRoot(target, resolvedSource.subdir);
  if (!(await pathExists(projectRoot))) {
    throw new Error(`Subdirectory not found after clone: ${resolvedSource.subdir}`);
  }
  return projectRoot;
}

async function stageShareTarget(root: string, targetSubdir: string, sourceDir: string, messages: string[]): Promise<void> {
  await runGit(root, targetSubdir ? ["add", targetSubdir] : ["add", sourceDir, "skillops.config.json", "README.md"], messages);
}

async function commitIfChanged(root: string, message: string | undefined, messages: string[]): Promise<boolean> {
  const status = await runGit(root, ["status", "--porcelain"], messages);
  const committed = status.trim().length > 0;
  if (committed) {
    await runGit(root, ["commit", "-m", message?.trim() || "Share SkillOps project"], messages);
  } else {
    messages.push("No file changes to commit.");
  }
  return committed;
}

function slug(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "project";
}
