import path from "node:path";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GitHubAccessResult, LocalGitRemote, LocalGitSource, ShareDeliveryMethod, SharePlanResult, ShareResult, ShareTargetMode, SkillOpsConfig, SkillSummary, WorkspaceSnapshot } from "../shared/types.js";
import { saveConfig } from "./config.js";
import { pathExists } from "./fs.js";
import { checkoutShareBranch, createPullRequest, currentCommit, ensureForkRemote, inspectGitHubAccess, parseGitHubRepo, prepareShareCheckout, pushBranch, resolveRemoteSourceRef, runGit, withShareLock } from "./share-git.js";
import { createPublishPlan } from "./publish.js";
import { parseRemoteSource, remoteProjectRef, repoName, shareTargetSubdir, sourceProjectRoot } from "./share-remote.js";
import { namespaceProfiles, normalizeConfig, resolveShareProfile, selectProfileSkills, shareNamespace, syncProjectToShareTarget } from "./share-sync.js";
import { scanWorkspace } from "./workspace.js";
import { normalizeGitRelativePath } from "./local-git.js";

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
  delivery?: ShareDeliveryMethod;
  shareBranch?: string;
  confirm?: boolean;
  sameRepository?: boolean;
  sameRepositoryRemote?: string;
}

export interface DownloadSourceOptions {
  remoteUrl: string;
  cacheDir: string;
}

export async function createSharePlan(options: ShareProjectOptions): Promise<SharePlanResult> {
  const root = path.resolve(options.root);
  const snapshot = await scanWorkspace(root);
  const profile = resolveShareProfile(snapshot.config, options.profileName, options.skills);
  const selectedSkills = selectProfileSkills(snapshot.skills, profile.skills, Boolean(options.skills?.length));
  if (options.sameRepository) {
    const sameRepository = resolveSameRepository(snapshot, options.sameRepositoryRemote);
    const remoteUrl = sameRepository.remote.pushUrl || sameRepository.remote.fetchUrl || options.remoteUrl;
    const access = sameRepositoryAccess(remoteUrl, sameRepository.remote, []);
    const branch = sameRepository.localGit.currentBranch || "HEAD";
    const targetPath = normalizeGitRelativePath(sameRepository.localGit.relativePath || ".");
    const plan = await createPublishPlan(root, snapshot.config, selectedSkills, options.visibility);
    return {
      plan,
      access,
      delivery: "directPush",
      requiresConfirm: true,
      branch,
      targetPath,
      sameRepository: true,
      localGit: sameRepository.localGit,
      commands: sameRepositoryCommands(sameRepository.localGit.root, sameRepository.remote.name, branch, targetPath, options.message)
    };
  }
  const target = parseRemoteSource(options.remoteUrl);
  const targetMode = options.targetMode ?? "direct";
  const projectName = options.projectName?.trim() || path.basename(root);
  const messages: string[] = [];
  const access = await inspectGitHubAccess(target.cloneUrl, messages);
  const delivery = normalizeDelivery(options.delivery, access.recommendedDelivery, access.availableDelivery);
  const branch = options.shareBranch?.trim() || defaultShareBranch(projectName);
  const targetPath = shareTargetSubdir(target.subdir, targetMode, projectName, snapshot.config.sourceDir) || ".";
  const plan = await createPublishPlan(root, snapshot.config, selectedSkills, options.visibility);

  return {
    plan,
    access,
    delivery,
    requiresConfirm: delivery !== "localBranch",
    branch,
    targetPath,
    commands: shareCommands({
      root,
      remoteUrl: options.remoteUrl,
      visibility: options.visibility,
      targetMode,
      projectName,
      profileName: options.profileName,
      message: options.message,
      delivery,
      branch,
      confirm: false
    })
  };
}

export async function shareProject(options: ShareProjectOptions): Promise<ShareResult> {
  const root = path.resolve(options.root);
  const snapshot = await scanWorkspace(root);
  const profile = resolveShareProfile(snapshot.config, options.profileName, options.skills);
  const selectedSkills = selectProfileSkills(snapshot.skills, profile.skills, Boolean(options.skills?.length));
  if (options.sameRepository) {
    return shareSameRepositoryProject(root, options, snapshot, selectedSkills);
  }
  const target = parseRemoteSource(options.remoteUrl);
  const targetMode = options.targetMode ?? "direct";
  const projectName = options.projectName?.trim() || path.basename(root);
  const messages: string[] = [];
  const access = await inspectGitHubAccess(target.cloneUrl, messages);
  const delivery = normalizeDelivery(options.delivery, access.recommendedDelivery, access.availableDelivery);
  if (delivery !== "localBranch" && !options.confirm) {
    throw new Error("Remote sharing requires confirmation. Re-run with --confirm or choose localBranch delivery.");
  }
  const shareBranch = options.shareBranch?.trim() || defaultShareBranch(projectName);

  return withShareLock(options.cacheDir, target, messages, async () => {
    const checkout = await prepareShareCheckout(options.cacheDir, target, messages);
    const checkoutRoot = checkout.root;
    const baseBranch = checkout.branch;
    await checkoutShareBranch(checkoutRoot, checkout.branch, shareBranch, messages);
    const resolvedTarget = checkout.source;
    const targetSubdir = shareTargetSubdir(resolvedTarget.subdir, targetMode, projectName, snapshot.config.sourceDir);
    const targetRoot = targetSubdir ? path.join(checkoutRoot, targetSubdir) : checkoutRoot;
    const installRef = remoteProjectRef(resolvedTarget.cloneUrl, baseBranch, targetSubdir);
    const namespace = shareNamespace(projectName);
    const localConfig = normalizeConfig({
      ...snapshot.config,
      teamRepo: options.remoteUrl.trim(),
      shareTargetMode: targetMode,
      shareProjectName: options.projectName?.trim() || undefined
    });
    const publishedConfig = namespaceProfiles(normalizeConfig({ ...localConfig, teamRepo: installRef, profiles: [publishedShareProfile(profile, selectedSkills)] }), namespace);

    await saveConfig(root, localConfig);
    await syncProjectToShareTarget(root, targetRoot, publishedConfig, selectedSkills, snapshot.assets, options.visibility, projectName, namespace);
    messages.push(`Shared project files to ${targetSubdir || "."}.`);

    await stageShareTarget(checkoutRoot, targetSubdir, publishedConfig.sourceDir, messages);
    const committed = await commitIfChanged(checkoutRoot, options.message, messages);
    const commitHash = await currentCommit(checkoutRoot, messages);
    const manualCommands = manualShareCommands(delivery, shareBranch, baseBranch, access.repository);
    let pushed = false;
    let pullRequestUrl: string | undefined;

    let errorStage: string | undefined;

    try {
      if (!committed) {
        messages.push("No share commit was created, so no push or pull request was attempted.");
      } else if (delivery === "localBranch") {
        messages.push("Local branch delivery selected; no remote push was attempted.");
      } else if (delivery === "forkPullRequest") {
        const repository = access.repository ?? parseGitHubRepo(resolvedTarget.cloneUrl)?.nameWithOwner;
        if (!repository) throw new Error("Fork pull request delivery requires a GitHub repository.");
        errorStage = "fork";
        const fork = await ensureForkRemote(checkoutRoot, repository, messages);
        errorStage = "push";
        await pushBranch(checkoutRoot, fork.remoteName, shareBranch, messages);
        pushed = true;
        errorStage = "pullRequest";
        pullRequestUrl = await createPullRequest(checkoutRoot, {
          repository,
          head: `${fork.owner}:${shareBranch}`,
          base: baseBranch,
          title: prTitle(projectName),
          body: prBody(projectName, options.visibility, targetSubdir || ".", selectedSkills.length, publishedConfig.profiles.map((item) => item.name))
        }, messages);
      } else {
        errorStage = "push";
        await pushBranch(checkoutRoot, "origin", shareBranch, messages);
        pushed = true;
        if (delivery === "targetPullRequest") {
          const repository = access.repository ?? parseGitHubRepo(resolvedTarget.cloneUrl)?.nameWithOwner;
          if (!repository) throw new Error("Pull request delivery requires a GitHub repository.");
          errorStage = "pullRequest";
          pullRequestUrl = await createPullRequest(checkoutRoot, {
            repository,
            head: shareBranch,
            base: baseBranch,
            title: prTitle(projectName),
            body: prBody(projectName, options.visibility, targetSubdir || ".", selectedSkills.length, publishedConfig.profiles.map((item) => item.name))
          }, messages);
        }
      }
      errorStage = undefined;
    } catch (error) {
      const stage = errorStage ?? "delivery";
      messages.push(`Share delivery failed during ${stage}: ${error instanceof Error ? error.message : String(error)}`);
      messages.push("The share commit and local checkout were kept. Use the manual commands below after fixing GitHub access, branch protection, or remote permissions.");
    }

    return {
      remoteUrl: resolvedTarget.cloneUrl,
      branch: shareBranch,
      targetPath: targetSubdir || ".",
      checkoutRoot,
      committed,
      pushed,
      delivery,
      pullRequestUrl,
      commitHash,
      access,
      manualCommands,
      errorStage,
      messages
    };
  });
}

export async function downloadSource(options: DownloadSourceOptions): Promise<string> {
  const source = parseRemoteSource(options.remoteUrl);
  const sourcesRoot = path.join(options.cacheDir, "sources");
  const dirName = `${repoName(source.cloneUrl)}-${crypto.createHash("sha256").update(`${source.cloneUrl}#${source.ref}`).digest("hex").slice(0, 8)}`;
  const target = path.join(sourcesRoot, dirName);
  await fs.mkdir(sourcesRoot, { recursive: true });
  if (await pathExists(target)) {
    await execFileAsync("git", ["-C", target, "fetch", "--prune", "origin"]);
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
  await runGit(root, targetSubdir ? ["add", targetSubdir] : ["add", sourceDir, "README.md"], messages);
}

function publishedShareProfile(profile: SkillOpsConfig["profiles"][number], selectedSkills: SkillSummary[]): SkillOpsConfig["profiles"][number] {
  if (profile.skills.includes("*")) return profile;
  return {
    ...profile,
    skills: selectedSkills.map((skill) => skill.name)
  };
}

async function shareSameRepositoryProject(
  root: string,
  options: ShareProjectOptions,
  snapshot: WorkspaceSnapshot,
  selectedSkills: typeof snapshot.skills
): Promise<ShareResult> {
  const messages: string[] = [];
  const sameRepository = resolveSameRepository(snapshot, options.sameRepositoryRemote);
  const remoteUrl = sameRepository.remote.pushUrl || sameRepository.remote.fetchUrl || options.remoteUrl;
  const branch = sameRepository.localGit.currentBranch;
  if (!branch) {
    throw new Error("Same-repository sharing requires the local repository to be on a branch, not a detached HEAD.");
  }
  if (!options.confirm) {
    throw new Error("Same-repository sharing commits and pushes from the local repository. Re-run with --confirm.");
  }

  const localConfig = normalizeConfig({
    ...snapshot.config,
    teamRepo: remoteUrl,
    shareTargetMode: "direct",
    shareProjectName: undefined
  });
  await saveConfig(root, localConfig);

  const targetPath = normalizeGitRelativePath(sameRepository.localGit.relativePath || ".");
  await runGit(sameRepository.localGit.root, ["add", "--", targetPath], messages);
  const committed = await commitPathIfChanged(sameRepository.localGit.root, targetPath, options.message, messages);
  const commitHash = await currentCommit(sameRepository.localGit.root, messages);
  let pushed = false;
  let errorStage: string | undefined;

  try {
    if (!committed) {
      messages.push("No same-repository share commit was created, so no push was attempted.");
    } else {
      errorStage = "push";
      await pushBranch(sameRepository.localGit.root, sameRepository.remote.name, branch, messages);
      pushed = true;
    }
    errorStage = undefined;
  } catch (error) {
    const stage = errorStage ?? "delivery";
    messages.push(`Same-repository delivery failed during ${stage}: ${error instanceof Error ? error.message : String(error)}`);
    messages.push("The local commit was kept. Push it manually after fixing remote access or branch protection.");
  }

  messages.push(`Same-repository sharing used ${targetPath} as the only Git pathspec.`);
  messages.push(`Selected ${selectedSkills.length} skill${selectedSkills.length === 1 ? "" : "s"} for the share profile.`);

  return {
    remoteUrl,
    branch,
    targetPath,
    checkoutRoot: sameRepository.localGit.root,
    committed,
    pushed,
    sameRepository: true,
    delivery: "directPush",
    commitHash,
    access: sameRepositoryAccess(remoteUrl, sameRepository.remote, messages),
    manualCommands: sameRepositoryCommands(sameRepository.localGit.root, sameRepository.remote.name, branch, targetPath, options.message),
    errorStage,
    messages
  };
}

async function commitPathIfChanged(root: string, targetPath: string, message: string | undefined, messages: string[]): Promise<boolean> {
  const changed = (await runGit(root, ["status", "--porcelain", "--", targetPath], messages)).trim().length > 0;
  if (!changed) {
    messages.push("No file changes to commit in the skill project path.");
    return false;
  }
  const stagedFiles = (await runGit(root, ["diff", "--cached", "--name-only", "--", targetPath], messages)).trim();
  if (!stagedFiles) {
    messages.push("No staged file changes in the skill project path.");
    return false;
  }
  await runGit(root, ["commit", "-m", message?.trim() || "Share SkillOps project", "--", targetPath], messages);
  return true;
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

function resolveSameRepository(snapshot: WorkspaceSnapshot, remoteName?: string): { localGit: LocalGitSource; remote: LocalGitRemote } {
  const localGit = snapshot.localGit;
  if (!localGit) throw new Error("Current SkillOps project is not inside a Git repository.");
  if (localGit.remotes.length === 0) throw new Error("Current Git repository has no remotes configured.");
  const requested = remoteName?.trim();
  const remote = requested
    ? localGit.remotes.find((item) => item.name === requested)
    : localGit.remotes[0];
  if (!remote) {
    throw new Error(`Git remote ${requested} was not found in the local repository.`);
  }
  return { localGit, remote };
}

function sameRepositoryAccess(remoteUrl: string, remote: LocalGitRemote, messages: string[]): GitHubAccessResult {
  const target = safeParseGitHubRepo(remoteUrl);
  return {
    remoteUrl,
    cloneUrl: target?.cloneUrl ?? remoteUrl,
    repository: target?.nameWithOwner,
    viewerPermission: `local remote: ${remote.name}`,
    authenticated: true,
    ghAvailable: false,
    canPush: true,
    canCreatePullRequest: false,
    canFork: false,
    recommendedDelivery: "directPush",
    availableDelivery: ["directPush"],
    unavailableReasons: [`Same-repository sharing pushes through the local Git remote "${remote.name}".`],
    messages
  };
}

function safeParseGitHubRepo(remoteUrl: string): ReturnType<typeof parseGitHubRepo> {
  try {
    return parseGitHubRepo(remoteUrl);
  } catch {
    return undefined;
  }
}

function slug(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "project";
}

function defaultShareBranch(projectName: string): string {
  return `skillops/share/${slug(projectName)}`;
}

function normalizeDelivery(value: ShareDeliveryMethod | undefined, recommended: ShareDeliveryMethod, available: ShareDeliveryMethod[]): ShareDeliveryMethod {
  const delivery = value ?? recommended;
  if (!available.includes(delivery)) {
    throw new Error(`Delivery method ${delivery} is not available. Available methods: ${available.join(", ")}`);
  }
  return delivery;
}

function shareCommands(options: {
  root: string;
  remoteUrl: string;
  visibility: "private" | "public";
  targetMode: ShareTargetMode;
  projectName?: string;
  profileName?: string;
  message?: string;
  delivery: ShareDeliveryMethod;
  branch: string;
  confirm: boolean;
}): string[] {
  const base = [
    "skillops",
    "share",
    "run",
    "--root",
    shellArg(options.root),
    "--repo",
    shellArg(options.remoteUrl),
    "--visibility",
    options.visibility,
    "--target-mode",
    options.targetMode,
    "--delivery",
    options.delivery,
    "--branch",
    shellArg(options.branch)
  ];
  if (options.projectName) base.push("--project-name", shellArg(options.projectName));
  if (options.profileName) base.push("--profile", shellArg(options.profileName));
  if (options.message?.trim()) base.push("--message", shellArg(options.message.trim()));
  if (options.confirm) base.push("--confirm");
  return [
    base.join(" "),
    `${base.join(" ")} --confirm`
  ];
}

function manualShareCommands(delivery: ShareDeliveryMethod, branch: string, baseBranch: string, repository?: string): string[] {
  const commands = [
    `git checkout ${shellArg(branch)}`
  ];
  if (delivery !== "localBranch") commands.push(`git push -u origin ${shellArg(branch)}`);
  if (delivery === "targetPullRequest" && repository) {
    commands.push(`gh pr create --repo ${shellArg(repository)} --head ${shellArg(branch)} --base ${shellArg(baseBranch)}`);
  }
  if (delivery === "forkPullRequest" && repository) {
    commands.push(`gh pr create --repo ${shellArg(repository)} --head <your-github-login>:${shellArg(branch)} --base ${shellArg(baseBranch)}`);
  }
  return commands;
}

function sameRepositoryCommands(root: string, remoteName: string, branch: string, targetPath: string, message?: string): string[] {
  const commitMessage = message?.trim() || "Share SkillOps project";
  return [
    `git -C ${shellArg(root)} add -- ${shellArg(targetPath)}`,
    `git -C ${shellArg(root)} commit -m ${shellArg(commitMessage)} -- ${shellArg(targetPath)}`,
    `git -C ${shellArg(root)} push -u ${shellArg(remoteName)} ${shellArg(branch)}`
  ];
}

function prTitle(projectName: string): string {
  return `Share SkillOps project ${projectName}`;
}

function prBody(projectName: string, visibility: "private" | "public", targetPath: string, skillCount: number, profiles: string[]): string {
  return [
    `Shares the SkillOps project \`${projectName}\`.`,
    "",
    `- Visibility: \`${visibility}\``,
    `- Target path: \`${targetPath}\``,
    `- Skills: ${skillCount}`,
    `- Profiles: ${profiles.map((item) => `\`${item}\``).join(", ") || "none"}`,
    "",
    "Review the generated README SkillOps section and audit checklist before merging."
  ].join("\n");
}

function shellArg(value: string): string {
  if (/^[\w./:@-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}
