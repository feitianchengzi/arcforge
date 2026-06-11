import type { ApplyProfileResult, ApplyTargetGroup, CliInstallStatus, ShareTargetGroup, ArcForgeProfile, WorkspaceSnapshot } from "../shared/types";
import type { Dictionary, Language } from "./i18n";
import type { DefaultTarget, ResolvedApplyTarget } from "./types";

export function initialLanguage(): Language {
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function buildCliRepairNotice(t: Dictionary, platform: string, cli: CliInstallStatus) {
  const escapedWindowsShimDir = cli.shimDir?.replace(/'/g, "''");
  const pathCommand = cli.shimDir
    ? platform === "win32"
      ? `[Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', 'User') + ';${escapedWindowsShimDir}', 'User')`
      : `export PATH="${cli.shimDir.replace(/"/g, '\\"')}:$PATH"`
    : "";
  const details = [
    "ArcForge CLI repair",
    `Status: ${cli.message ?? t.cliNeedsRepair}`,
    cli.shimPath ? `Shim path: ${cli.shimPath}` : undefined,
    cli.shimDir ? `Shim directory: ${cli.shimDir}` : undefined,
    cli.executablePath ? `Desktop executable: ${cli.executablePath}` : undefined,
    cli.shellProfilePath ? `Shell profile: ${cli.shellProfilePath}` : undefined,
    cli.shimDirInPath ? undefined : pathCommand ? `Temporary PATH command:\n${pathCommand}` : undefined,
    "Check command:\narcforge doctor"
  ].filter(Boolean).join("\n\n");
  return {
    title: t.cliRepairManualTitle,
    body: cli.shellProfileUpdated ? t.cliRepairNeedsTerminal : t.cliRepairManualBody,
    details,
    copied: false
  };
}

export function basename(filePath: string): string {
  return filePath.split(/[\\/]/).filter(Boolean).pop() ?? filePath;
}

function dirname(filePath: string): string {
  const trimmed = filePath.replace(/[\\/]+$/, "");
  const index = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return index > 0 ? trimmed.slice(0, index) : filePath;
}

export function normalizeLocalProjectRoot(filePath: string): string {
  return basename(filePath) === "skills" ? dirname(filePath) : filePath;
}

export function projectNameFromSource(sourceUrl: string): string {
  const cleaned = sourceUrl.replace(/\.git$/, "").replace(/\/$/, "");
  const parts = cleaned.split(/[/:]/).filter(Boolean);
  const treeIndex = parts.findIndex((part) => part === "tree" || part === "blob");
  if (treeIndex !== -1 && parts.length > treeIndex + 2) return parts[parts.length - 1];
  return parts[parts.length - 1] ?? "GitHub source";
}

function canonicalRemoteKey(value: string): string {
  const trimmed = value.trim().replace(/\/$/, "").replace(/\.git$/, "");
  if (!trimmed) return "";
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/(.+)$/i);
  if (sshMatch) return `github.com/${sshMatch[1].toLowerCase()}/${sshMatch[2].toLowerCase()}`;
  const sshUrlMatch = trimmed.match(/^ssh:\/\/git@github\.com\/([^/]+)\/(.+)$/i);
  if (sshUrlMatch) return `github.com/${sshUrlMatch[1].toLowerCase()}/${sshUrlMatch[2].toLowerCase()}`;
  const githubPathMatch = trimmed.match(/^(?:https?:\/\/)?github\.com\/([^/]+)\/([^/]+)(?:\/.*)?$/i);
  if (githubPathMatch) return `github.com/${githubPathMatch[1].toLowerCase()}/${githubPathMatch[2].toLowerCase()}`;
  const ownerRepoMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (ownerRepoMatch) return `github.com/${ownerRepoMatch[1].toLowerCase()}/${ownerRepoMatch[2].toLowerCase()}`;
  return trimmed.toLowerCase();
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function formatDuration(valueMs: number): string {
  const seconds = Math.max(0, Math.floor(valueMs / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function formatTimeAgo(value: string, nowMs = Date.now()): string {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "unknown";
  return formatDuration(nowMs - time);
}

export function emptyProfile(name: string): ArcForgeProfile {
  return {
    name,
    description: "",
    skills: ["*"],
    targets: ["codex", "claude", "cursor"]
  };
}

export function createApplyTargetGroup(profile: string, agentTargetId?: string): ApplyTargetGroup {
  return {
    id: createId("apply"),
    name: "Target group",
    profile,
    agentTargetIds: agentTargetId ? [agentTargetId] : [],
    projectTargetDirs: [],
    customTargetDirs: []
  };
}

export function createShareTargetGroup(snapshot: WorkspaceSnapshot, profile: string): ShareTargetGroup {
  return {
    id: createId("share"),
    name: basename(snapshot.root),
    profile,
    remoteUrl: defaultShareRemoteUrl(snapshot),
    targetMode: snapshot.config.shareTargetMode ?? "direct",
    projectName: snapshot.config.shareProjectName ?? basename(snapshot.root)
  };
}

function defaultShareRemoteUrl(snapshot: WorkspaceSnapshot): string {
  const configured = snapshot.config.teamRepo?.trim() ?? "";
  if (!configured) return "";
  const configuredKey = canonicalRemoteKey(configured);
  const isCurrentRepository = snapshot.localGit?.remotes.some((remote) => configuredKey && configuredKey === remote.canonicalKey);
  return isCurrentRepository ? "" : configured;
}

export function resolveApplyTargetEntries(group: ApplyTargetGroup, defaultTargets: DefaultTarget[]): ResolvedApplyTarget[] {
  const selectedAgents = (group.agentTargetIds ?? [])
    .map((id) => defaultTargets.find((target) => target.id === id))
    .filter((target): target is DefaultTarget => Boolean(target));
  const projectTargetDirs = (group.projectTargetDirs ?? []).filter(Boolean);
  const agentTargets = projectTargetDirs.length > 0
    ? projectTargetDirs.flatMap((projectDir) => selectedAgents.map((agent) => ({
      kind: "project" as const,
      id: `${projectDir}:${agent.id}`,
      name: `${basename(projectDir)} / ${agent.name}`,
      path: projectAgentTargetPath(projectDir, agent)
    })))
    : selectedAgents.map((target) => ({ kind: "agent" as const, id: target.id, name: target.name, path: target.path }));
  const customTargets = (group.customTargetDirs ?? [])
    .filter(Boolean)
    .map((targetDir) => ({ kind: "custom" as const, id: targetDir, name: basename(targetDir), path: targetDir }));
  const seen = new Set<string>();
  return [...agentTargets, ...customTargets].filter((target) => {
    const key = target.path;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function projectAgentTargetPath(projectDir: string, agent: DefaultTarget): string {
  return joinLocalPath(projectDir, `.${agent.id}`, "skills");
}

function joinLocalPath(base: string, ...parts: string[]): string {
  const separator = base.includes("\\") ? "\\" : "/";
  return [base.replace(/[\\/]+$/, ""), ...parts.map((part) => part.replace(/^[\\/]+|[\\/]+$/g, ""))]
    .filter(Boolean)
    .join(separator);
}

export function selectedSkillCount(snapshot: WorkspaceSnapshot, profileName: string): number {
  const activeProfile = snapshot.config.profiles.find((item) => item.name === profileName);
  if (!activeProfile) return 0;
  if (activeProfile.skills.includes("*")) return snapshot.skills.length;
  return snapshot.skills.filter((skill) => activeProfile.skills.includes(skill.name)).length;
}

export function summarizeApplyResults(results: ApplyProfileResult[]) {
  if (results.length === 0) return undefined;
  return {
    copied: results.reduce((sum, item) => sum + item.copied.length, 0),
    skipped: results.reduce((sum, item) => sum + item.skipped.length, 0),
    copiedAssets: results.reduce((sum, item) => sum + (item.copiedAssets?.length ?? 0), 0),
    skippedAssets: results.reduce((sum, item) => sum + (item.skippedAssets?.length ?? 0), 0)
  };
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
