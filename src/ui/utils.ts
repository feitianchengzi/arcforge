import type { ApplyProfileResult, ApplyTargetGroup, CliInstallStatus, ShareTargetGroup, SkillOpsProfile, WorkspaceSnapshot } from "../shared/types";
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
    "SkillOps CLI repair",
    `Status: ${cli.message ?? t.cliNeedsRepair}`,
    cli.shimPath ? `Shim path: ${cli.shimPath}` : undefined,
    cli.shimDir ? `Shim directory: ${cli.shimDir}` : undefined,
    cli.executablePath ? `Desktop executable: ${cli.executablePath}` : undefined,
    cli.shellProfilePath ? `Shell profile: ${cli.shellProfilePath}` : undefined,
    cli.shimDirInPath ? undefined : pathCommand ? `Temporary PATH command:\n${pathCommand}` : undefined,
    "Check command:\nskillops doctor"
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

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function emptyProfile(name: string): SkillOpsProfile {
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
    remoteUrl: snapshot.config.teamRepo ?? "",
    targetMode: snapshot.config.shareTargetMode ?? "direct",
    projectName: snapshot.config.shareProjectName ?? basename(snapshot.root)
  };
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
