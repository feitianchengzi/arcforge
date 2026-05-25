import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Download, Edit3, GitBranch, HardDrive, PackageCheck, Play, RefreshCw, Rocket, Settings, ShieldCheck, Trash2 } from "lucide-react";
import type { AppState, ApplyDriftCheckRecord, ApplyProfileResult, ApplyTargetGroup, DriftReport, EnvironmentStatus, ProjectUiState, RecentWorkspace, ShareDriftCheckRecord, SharePlanResult, ShareResult, ShareTargetGroup, SkillOpsConfig, SourceUpdateCheckRecord, TargetRecord, WorkspaceSnapshot } from "../shared/types";
import { GITHUB_ISSUE_URL } from "../shared/links";
import { MAX_RECENT_WORKSPACES, readLegacyAppState } from "./app-state";
import { AddProjectDialog, CliRepairDialog, EmptyState, EnvironmentNotice, PendingProject, ProjectHeader, SettingsDialog } from "./components/shell";
import { dictionaries, type Language } from "./i18n";
import type { CliRepairNotice, DefaultTarget, Tab } from "./types";
import { basename, buildCliRepairNotice, errorMessage, initialLanguage, normalizeLocalProjectRoot, projectNameFromSource, resolveApplyTargetEntries } from "./utils";
import { Audit, Overview, SkillsList } from "./views/dashboard";
import { ApplySkills } from "./views/destinations";
import { Profiles } from "./views/profiles";
import { Publish } from "./views/share";
import "./styles.css";

type ProjectSourceMetadata =
  | { sourceKind: "local"; localSourcePath: string }
  | { sourceKind: "github"; githubSourceUrl: string };

function projectSourceForRecord(root: string, source?: ProjectSourceMetadata, existing?: RecentWorkspace): Pick<RecentWorkspace, "sourceKind" | "localSourcePath" | "githubSourceUrl"> {
  if (source?.sourceKind === "github") {
    return { sourceKind: "github", githubSourceUrl: source.githubSourceUrl };
  }
  if (source?.sourceKind === "local") {
    return { sourceKind: "local", localSourcePath: source.localSourcePath };
  }
  if (existing?.sourceKind === "github" && existing.githubSourceUrl) {
    return { sourceKind: "github", githubSourceUrl: existing.githubSourceUrl };
  }
  return { sourceKind: "local", localSourcePath: existing?.localSourcePath ?? root };
}

function shareRemoteUrlForGroup(snapshot: WorkspaceSnapshot | undefined, group: ShareTargetGroup): string {
  if (!group.sameRepository) return group.remoteUrl.trim();
  const remote = group.sameRepositoryRemote
    ? snapshot?.localGit?.remotes.find((item) => item.name === group.sameRepositoryRemote)
    : snapshot?.localGit?.remotes[0];
  return (remote?.pushUrl || remote?.fetchUrl || group.remoteUrl).trim();
}

function App() {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const t = dictionaries[language];
  const [root, setRoot] = useState("");
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | undefined>();
  const [tab, setTab] = useState<Tab>("overview");
  const [status, setStatus] = useState<string>(t.chooseStatus);
  const [environment, setEnvironment] = useState<EnvironmentStatus | undefined>();
  const [profile, setProfile] = useState("default");
  const [shareResult, setShareResult] = useState<ShareResult | undefined>();
  const [sharePlan, setSharePlan] = useState<SharePlanResult | undefined>();
  const [shareDriftReport, setShareDriftReport] = useState<DriftReport | undefined>();
  const [isSharing, setIsSharing] = useState(false);
  const [isCheckingShareDrift, setIsCheckingShareDrift] = useState(false);
  const [isCheckingApplyDrift, setIsCheckingApplyDrift] = useState(false);
  const [shareProgress, setShareProgress] = useState<string | undefined>();
  const [driftReports, setDriftReports] = useState<DriftReport[]>([]);
  const [applyResults, setApplyResults] = useState<ApplyProfileResult[]>([]);
  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspace[]>([]);
  const [targetHistory, setTargetHistory] = useState<TargetRecord[]>([]);
  const [projectStates, setProjectStates] = useState<Record<string, ProjectUiState>>({});
  const [defaultTargets, setDefaultTargets] = useState<DefaultTarget[]>([]);
  const [applyTargetGroupId, setApplyTargetGroupId] = useState("");
  const [shareTargetGroupId, setShareTargetGroupId] = useState("");
  const [sharedSourceUrl, setSharedSourceUrl] = useState("");
  const [sourceMode, setSourceMode] = useState<"local" | "github">("local");
  const [showAddProject, setShowAddProject] = useState(false);
  const [showEditProjectSource, setShowEditProjectSource] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isCliRepairing, setIsCliRepairing] = useState(false);
  const [cliRepairNotice, setCliRepairNotice] = useState<CliRepairNotice | undefined>();
  const workspaceRequestRef = useRef(0);
  const activeProject = recentWorkspaces.find((item) => item.path === root);
  const isPendingProject = activeProject?.status === "downloading" || activeProject?.status === "error";

  const criticalCount = snapshot?.audit.findings.filter((item) => item.severity === "critical").length ?? 0;
  const warningCount = snapshot?.audit.findings.filter((item) => item.severity === "warning").length ?? 0;
  const profileOptions = snapshot?.config.profiles.map((item) => item.name) ?? ["default"];
  const applyTargetGroups = snapshot?.config.applyTargets ?? [];
  const shareTargetGroups = snapshot?.config.shareTargets ?? [];
  const activeApplyTargetGroup = applyTargetGroups.find((item) => item.id === applyTargetGroupId) ?? applyTargetGroups[0];
  const activeShareTargetGroup = shareTargetGroups.find((item) => item.id === shareTargetGroupId) ?? shareTargetGroups[0];
  const activeProjectState = root ? projectStates[root] : undefined;
  const activeApplyDriftSignature = activeApplyTargetGroup ? applyDriftSignature(activeApplyTargetGroup, defaultTargets) : "";
  const activeShareDriftSignature = activeShareTargetGroup ? shareDriftSignature(snapshot, activeShareTargetGroup) : "";
  const sourceUpdateCheck = activeProjectState?.sourceUpdateCheck;
  const savedApplyDriftCheck = activeApplyTargetGroup ? activeProjectState?.applyDriftChecks?.[activeApplyTargetGroup.id] : undefined;
  const savedShareDriftCheck = activeShareTargetGroup ? activeProjectState?.shareDriftChecks?.[activeShareTargetGroup.id] : undefined;
  const activeApplyDriftCheck = savedApplyDriftCheck?.signature === activeApplyDriftSignature ? savedApplyDriftCheck : undefined;
  const activeShareDriftCheck = savedShareDriftCheck?.signature === activeShareDriftSignature ? savedShareDriftCheck : undefined;
  const projectTargetHistory = useMemo(() => targetHistory.filter((item) => item.sourcePath === root), [root, targetHistory]);
  const activeWorkspaceCanBeRemoved = Boolean(root && activeProject);

  useEffect(() => {
    if (!window.skillops) return;
    void hydrateAppState();
    void window.skillops.getDefaultTargets().then((targets) => {
      setDefaultTargets(targets);
    }).catch((error) => setStatus(t.errorStatus(errorMessage(error))));
    void refreshEnvironment();
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    setDriftReports(activeApplyDriftCheck?.reports ?? []);
  }, [snapshot?.root, activeApplyTargetGroup?.id, activeApplyDriftCheck?.checkedAt, activeApplyDriftCheck?.signature]);

  useEffect(() => {
    if (!snapshot) return;
    setShareDriftReport(activeShareDriftCheck?.report);
  }, [snapshot?.root, activeShareTargetGroup?.id, activeShareDriftCheck?.checkedAt, activeShareDriftCheck?.signature]);

  function applyDriftSignature(group: ApplyTargetGroup, targets: DefaultTarget[]): string {
    const resolvedTargets = resolveApplyTargetEntries(group, targets).map((target) => `${target.kind}:${target.id}:${target.path}`).sort();
    return JSON.stringify({
      profile: group.profile,
      agentTargetIds: [...group.agentTargetIds].sort(),
      projectTargetDirs: [...group.projectTargetDirs].sort(),
      customTargetDirs: [...(group.customTargetDirs ?? [])].sort(),
      resolvedTargets
    });
  }

  function shareDriftSignature(currentSnapshot: WorkspaceSnapshot | undefined, group: ShareTargetGroup): string {
    return JSON.stringify({
      profile: group.profile,
      remoteUrl: shareRemoteUrlForGroup(currentSnapshot, group),
      targetMode: group.targetMode,
      projectName: group.projectName ?? "",
      sameRepository: Boolean(group.sameRepository),
      sameRepositoryRemote: group.sameRepositoryRemote ?? "",
      localGitPath: group.sameRepository ? currentSnapshot?.localGit?.relativePath ?? "." : ""
    });
  }

  function setLanguage(next: Language) {
    setLanguageState(next);
    void saveAppState({ language: next });
    if (!snapshot) setStatus(dictionaries[next].chooseStatus);
  }

  async function hydrateAppState() {
    if (!window.skillops) return;
    try {
      const state = await window.skillops.migrateAppState(readLegacyAppState(), window.location.origin || "file://");
      applyAppState(state);
      if (state.activeWorkspace) {
        await openWorkspace(state.activeWorkspace, { restore: true, moveToTop: false, projectStates: state.projectState });
      }
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  function applyAppState(state: AppState) {
    if (state.language === "en" || state.language === "zh-CN") {
      setLanguageState(state.language);
      if (!snapshot) setStatus(dictionaries[state.language].chooseStatus);
    }
    setRecentWorkspaces(state.recentWorkspaces.slice(0, MAX_RECENT_WORKSPACES));
    setTargetHistory(state.targetHistory);
    setProjectStates(state.projectState);
  }

  async function saveAppState(patch: Partial<AppState>) {
    if (!window.skillops) return;
    try {
      await window.skillops.saveAppState(patch);
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function refreshEnvironment() {
    if (!window.skillops) return;
    try {
      setEnvironment(await window.skillops.getEnvironmentStatus());
    } catch {
      setEnvironment({
        platform: "unknown",
        arch: "unknown",
        git: {
          available: false,
          error: "Environment check failed."
        }
      });
    }
  }

  async function repairCliInstall() {
    if (!window.skillops) return;
    setIsCliRepairing(true);
    setStatus(t.cliRepairing);
    try {
      const cli = await window.skillops.installCli();
      const next = await window.skillops.getEnvironmentStatus();
      setEnvironment({ ...next, cli });
      if (cli.available) {
        setStatus(t.cliRepairAvailable);
        setCliRepairNotice(undefined);
      } else {
        const message = cli.shellProfileUpdated ? t.cliRepairNeedsTerminal : t.cliNeedsRepair;
        setStatus(message);
        setCliRepairNotice(buildCliRepairNotice(t, next.platform, cli));
      }
    } catch (error) {
      const message = errorMessage(error);
      setStatus(t.errorStatus(message));
      setCliRepairNotice({
        title: t.cliRepairManualTitle,
        body: t.cliRepairManualBody,
        details: message,
        copied: false
      });
    } finally {
      setIsCliRepairing(false);
    }
  }

  async function copyCliRepairDetails(details: string) {
    try {
      if (!navigator.clipboard) {
        setStatus(t.cliRepairManualBody);
        return;
      }
      await navigator.clipboard.writeText(details);
      setCliRepairNotice((current) => current ? { ...current, copied: true } : current);
      setStatus(t.cliRepairCopied);
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function openFeedbackIssue(url: unknown = GITHUB_ISSUE_URL) {
    const feedbackUrl = typeof url === "string" ? url : GITHUB_ISSUE_URL;
    try {
      if (window.skillops) {
        await window.skillops.openExternal(feedbackUrl);
        return;
      }
      window.open(feedbackUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  function rememberProjectState(projectRoot: string, patch: ProjectUiState) {
    updateProjectState(projectRoot, (current) => ({ ...current, ...patch }));
  }

  function updateProjectState(projectRoot: string, updater: (current: ProjectUiState) => ProjectUiState) {
    setProjectStates((current) => {
      const next = { ...current, [projectRoot]: updater(current[projectRoot] ?? {}) };
      void saveAppState({ projectState: next });
      return next;
    });
  }

  function setProjectTab(next: Tab) {
    setTab(next);
    if (root) rememberProjectState(root, { tab: next });
  }

  function setProjectProfile(next: string) {
    setProfile(next);
    if (root) rememberProjectState(root, { profile: next });
  }

  function setProjectApplyTargetGroupId(next: string) {
    const group = applyTargetGroups.find((item) => item.id === next);
    const signature = group ? applyDriftSignature(group, defaultTargets) : "";
    const record = root ? projectStates[root]?.applyDriftChecks?.[next] : undefined;
    setApplyTargetGroupId(next);
    setDriftReports(record?.signature === signature ? record.reports : []);
    setApplyResults([]);
    if (root) rememberProjectState(root, { applyTargetGroupId: next });
  }

  function setProjectShareTargetGroupId(next: string) {
    const group = shareTargetGroups.find((item) => item.id === next);
    const signature = group ? shareDriftSignature(snapshot, group) : "";
    const record = root ? projectStates[root]?.shareDriftChecks?.[next] : undefined;
    setShareTargetGroupId(next);
    setShareResult(undefined);
    setSharePlan(undefined);
    setShareDriftReport(record?.signature === signature ? record.report : undefined);
    setShareProgress(undefined);
    if (root) rememberProjectState(root, { shareTargetGroupId: next });
  }

  async function chooseWorkspace() {
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      setStatus(t.choosingWorkspace);
      const selected = await window.skillops.chooseWorkspace();
      if (!selected) {
        setStatus(t.chooseCanceled);
        return;
      }
      await openWorkspace(normalizeLocalProjectRoot(selected), {
        source: {
          sourceKind: "local",
          localSourcePath: selected
        }
      });
      setShowAddProject(false);
      setShowEditProjectSource(false);
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function downloadSharedSource() {
    const sourceUrl = sharedSourceUrl.trim();
    if (!sourceUrl) return;
    const pendingId = `pending:${encodeURIComponent(sourceUrl)}`;
    const pendingRecord: RecentWorkspace = {
      path: pendingId,
      name: projectNameFromSource(sourceUrl),
      lastOpenedAt: new Date().toISOString(),
      skillCount: 0,
      auditScore: 0,
      status: "downloading",
      sourceKind: "github",
      githubSourceUrl: sourceUrl
    };
    const nextRecent = [pendingRecord, ...recentWorkspaces.filter((item) => item.path !== pendingId)].slice(0, MAX_RECENT_WORKSPACES);
    setRecentWorkspaces(nextRecent);
    void saveAppState({ recentWorkspaces: nextRecent });
    setRoot(pendingId);
    setSnapshot(undefined);
    setShowAddProject(false);
    setShowEditProjectSource(false);
    void saveAppState({ activeWorkspace: pendingId });
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      setStatus(t.downloadingSource);
      const sourcePath = await window.skillops.downloadSource(sourceUrl);
      setSharedSourceUrl("");
      setRecentWorkspaces((current) => {
        const next = current.filter((item) => item.path !== pendingId);
        void saveAppState({ recentWorkspaces: next });
        return next;
      });
      await openWorkspace(sourcePath, {
        source: {
          sourceKind: "github",
          githubSourceUrl: sourceUrl
        }
      });
    } catch (error) {
      const message = errorMessage(error);
      setRecentWorkspaces((current) => {
        const next = current.map((item) => item.path === pendingId ? { ...item, status: "error" as const, error: message } : item);
        void saveAppState({ recentWorkspaces: next });
        return next;
      });
      setStatus(t.errorStatus(message));
    }
  }

  async function scan(nextRoot = root) {
    if (!nextRoot) return;
    const requestId = ++workspaceRequestRef.current;
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      setStatus(t.scanning);
      const result = await window.skillops.scanWorkspace(nextRoot);
      if (requestId !== workspaceRequestRef.current) return;
      applySnapshot(result);
      setStatus(t.foundStatus(result.skills.length, result.audit.score));
    } catch (error) {
      if (requestId !== workspaceRequestRef.current) return;
      setSnapshot(undefined);
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function init() {
    if (!root) return;
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      await window.skillops.initWorkspace(root);
      await scan(root);
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function saveProfiles(config: SkillOpsConfig, nextProfile: string) {
    if (!root) return;
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      const result = await window.skillops.saveConfig(root, config);
      applySnapshot(result, nextProfile);
      rememberWorkspace(result, { moveToTop: !recentWorkspaces.some((item) => item.path === result.root) });
      setStatus(t.configSaved);
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function saveApplyTargetGroups(groups: ApplyTargetGroup[], selectedId: string) {
    if (!snapshot) return;
    await saveProfiles({ ...snapshot.config, applyTargets: groups }, snapshot.config.profiles.some((item) => item.name === profile) ? profile : groups[0]?.profile ?? "default");
    setProjectApplyTargetGroupId(selectedId);
  }

  async function saveShareTargetGroups(groups: ShareTargetGroup[], selectedId: string) {
    if (!snapshot) return;
    await saveProfiles({ ...snapshot.config, shareTargets: groups }, snapshot.config.profiles.some((item) => item.name === profile) ? profile : groups[0]?.profile ?? "default");
    setProjectShareTargetGroupId(selectedId);
  }

  async function shareProject(group: ShareTargetGroup, message: string) {
    if (!root) return;
    setIsSharing(true);
    setShareResult(undefined);
    setSharePlan(undefined);
    setShareProgress(t.sharing);
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        setShareProgress(t.desktopRequired);
        return;
      }
      if (snapshot) {
        const remoteUrl = shareRemoteUrlForGroup(snapshot, group);
        const saved = await window.skillops.saveConfig(root, {
          ...snapshot.config,
          teamRepo: remoteUrl || undefined,
          shareTargetMode: group.sameRepository ? "direct" : group.targetMode,
          shareProjectName: group.sameRepository ? undefined : group.projectName?.trim() || undefined
        });
        applySnapshot(saved, group.profile);
      }
      setStatus(t.sharing);
      const plan = await window.skillops.createSharePlan(root, shareRemoteUrlForGroup(snapshot, group), "private", group.targetMode, group.projectName ?? "", group.profile, undefined, undefined, group.sameRepository, group.sameRepositoryRemote);
      setSharePlan(plan);
      const nextStatus = plan.requiresConfirm ? t.shareReady(plan.branch) : t.shareReadyLocal(plan.branch);
      setShareProgress(nextStatus);
      setStatus(nextStatus);
    } catch (error) {
      const message = t.errorStatus(errorMessage(error));
      setShareProgress(message);
      setStatus(message);
    } finally {
      setIsSharing(false);
    }
  }

  async function checkShareTargetDrift(group: ShareTargetGroup) {
    if (!root) return;
    setIsCheckingShareDrift(true);
    setShareDriftReport(undefined);
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      const report = await window.skillops.shareDriftReport(root, shareRemoteUrlForGroup(snapshot, group), group.targetMode, group.projectName ?? "", group.profile, group.sameRepository, group.sameRepositoryRemote);
      setShareDriftReport(report);
      rememberShareDriftCheck(group.id, { checkedAt: new Date().toISOString(), signature: shareDriftSignature(snapshot, group), report });
      const changed = report.items.filter((item) => item.status !== "same").length;
      setStatus(`${changed} changed / ${report.items.length} checked`);
    } catch (error) {
      const message = errorMessage(error);
      rememberShareDriftCheck(group.id, { checkedAt: new Date().toISOString(), signature: shareDriftSignature(snapshot, group), error: message });
      setStatus(t.errorStatus(message));
    } finally {
      setIsCheckingShareDrift(false);
    }
  }

  async function confirmShareProject(group: ShareTargetGroup, message: string, plan: SharePlanResult) {
    if (!root) return;
    setIsSharing(true);
    setShareProgress(t.sharing);
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        setShareProgress(t.desktopRequired);
        return;
      }
      const result = await window.skillops.shareProject(root, shareRemoteUrlForGroup(snapshot, group), "private", message, group.targetMode, group.projectName ?? "", group.profile, plan.delivery, plan.branch, true, group.sameRepository, group.sameRepositoryRemote);
      setShareResult(result);
      setSharePlan(undefined);
      const complete = result.pullRequestUrl ? t.sharePrComplete(result.pullRequestUrl) : t.shareComplete(result.branch);
      setShareProgress(complete);
      setStatus(complete);
      await scan(root);
    } catch (error) {
      const message = t.errorStatus(errorMessage(error));
      setShareProgress(message);
      setStatus(message);
    } finally {
      setIsSharing(false);
    }
  }

  async function openWorkspace(nextRoot: string, options: { restore?: boolean; moveToTop?: boolean; projectStates?: Record<string, ProjectUiState>; source?: ProjectSourceMetadata } = {}) {
    if (!window.skillops) {
      setStatus(t.desktopRequired);
      return;
    }
    const requestId = ++workspaceRequestRef.current;
    setRoot(nextRoot);
    setSnapshot(undefined);
    setDriftReports([]);
    setApplyResults([]);
    setShareResult(undefined);
    setSharePlan(undefined);
    setShareProgress(undefined);
    setStatus(t.scanning);
    void saveAppState({ activeWorkspace: nextRoot });
    try {
      const result = await window.skillops.scanWorkspace(nextRoot);
      if (requestId !== workspaceRequestRef.current) return;
      applySnapshot(result, undefined, options.projectStates);
      rememberWorkspace(result, { moveToTop: options.moveToTop ?? true, source: options.source });
      setStatus(t.foundStatus(result.skills.length, result.audit.score));
    } catch (error) {
      if (requestId !== workspaceRequestRef.current) return;
      setSnapshot(undefined);
      if (!options.restore) setStatus(t.errorStatus(errorMessage(error)));
      else setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function chooseProjectTarget(): Promise<string | undefined> {
    if (!window.skillops) {
      setStatus(t.desktopRequired);
      return undefined;
    }
    const selected = await window.skillops.chooseWorkspace();
    return selected;
  }

  async function applyTargetGroup(group: ApplyTargetGroup) {
    if (!root) return;
    const targets = resolveApplyTargetEntries(group, defaultTargets);
    if (targets.length === 0) {
      setStatus(group.projectTargetDirs.length > 0 ? t.agentRequired : t.targetRequired);
      return;
    }
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      const results: ApplyProfileResult[] = [];
      const reports: DriftReport[] = [];
      for (const target of targets) {
        const result = await window.skillops.applyProfile(root, group.profile, target.path);
        results.push(result);
        reports.push(await window.skillops.driftReport(root, group.profile, target.path));
        rememberTarget(target.path, `${group.name} / ${target.name}`, group.profile);
      }
      setApplyResults(results);
      setDriftReports(reports);
      rememberApplyDriftCheck(group.id, { checkedAt: new Date().toISOString(), signature: applyDriftSignature(group, defaultTargets), reports });
      const copied = results.reduce((sum, item) => sum + item.copied.length, 0);
      const skipped = results.reduce((sum, item) => sum + item.skipped.length, 0);
      const copiedAssets = results.reduce((sum, item) => sum + (item.copiedAssets?.length ?? 0), 0);
      const skippedAssets = results.reduce((sum, item) => sum + (item.skippedAssets?.length ?? 0), 0);
      setStatus(t.copiedSkipped(copied, skipped, copiedAssets, skippedAssets));
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function checkTargetGroupDrift(group: ApplyTargetGroup) {
    if (!root) return;
    const targets = resolveApplyTargetEntries(group, defaultTargets);
    if (targets.length === 0) {
      setStatus(group.projectTargetDirs.length > 0 ? t.agentRequired : t.targetRequired);
      return;
    }
    setIsCheckingApplyDrift(true);
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      const reports: DriftReport[] = [];
      for (const target of targets) {
        reports.push(await window.skillops.driftReport(root, group.profile, target.path));
      }
      setDriftReports(reports);
      rememberApplyDriftCheck(group.id, { checkedAt: new Date().toISOString(), signature: applyDriftSignature(group, defaultTargets), reports });
      const changed = reports.reduce((sum, report) => sum + report.items.filter((item) => item.status !== "same").length, 0);
      const checked = reports.reduce((sum, report) => sum + report.items.length, 0);
      setStatus(`${changed} changed / ${checked} checked`);
    } catch (error) {
      const message = errorMessage(error);
      rememberApplyDriftCheck(group.id, { checkedAt: new Date().toISOString(), signature: applyDriftSignature(group, defaultTargets), reports: [], error: message });
      setStatus(t.errorStatus(message));
    } finally {
      setIsCheckingApplyDrift(false);
    }
  }

  async function openDriftDiff(report: DriftReport) {
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      await window.skillops.openDriftDiff(report);
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function openSourceDiff(status: SourceUpdateCheckRecord["status"]) {
    if (!status) return;
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      await window.skillops.openSourceDiff(status);
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  function rememberSourceUpdateCheck(record: SourceUpdateCheckRecord) {
    if (!root) return;
    updateProjectState(root, (current) => ({ ...current, sourceUpdateCheck: record }));
  }

  function rememberApplyDriftCheck(groupId: string, record: ApplyDriftCheckRecord) {
    if (!root) return;
    updateProjectState(root, (current) => ({
      ...current,
      applyDriftChecks: { ...(current.applyDriftChecks ?? {}), [groupId]: record }
    }));
  }

  function rememberShareDriftCheck(groupId: string, record: ShareDriftCheckRecord) {
    if (!root) return;
    updateProjectState(root, (current) => ({
      ...current,
      shareDriftChecks: { ...(current.shareDriftChecks ?? {}), [groupId]: record }
    }));
  }

  function applySnapshot(result: WorkspaceSnapshot, preferredProfile?: string, stateOverride = projectStates) {
    setSnapshot(result);
    const savedState = stateOverride[result.root];
    const nextProfile = preferredProfile !== undefined && result.config.profiles.some((item) => item.name === preferredProfile)
      ? preferredProfile
      : savedState?.profile !== undefined && result.config.profiles.some((item) => item.name === savedState.profile)
        ? savedState.profile
      : result.config.profiles[0]?.name ?? "default";
    setProfile(nextProfile);
    setTab(savedState?.tab ?? "overview");
    const applyGroups = result.config.applyTargets ?? [];
    const shareGroups = result.config.shareTargets ?? [];
    const nextApplyGroupId = applyGroups.some((item) => item.id === savedState?.applyTargetGroupId) ? savedState!.applyTargetGroupId! : applyGroups[0]?.id ?? "";
    const nextShareGroupId = shareGroups.some((item) => item.id === savedState?.shareTargetGroupId) ? savedState!.shareTargetGroupId! : shareGroups[0]?.id ?? "";
    const nextApplyGroup = applyGroups.find((item) => item.id === nextApplyGroupId);
    const nextShareGroup = shareGroups.find((item) => item.id === nextShareGroupId);
    const applyRecord = savedState?.applyDriftChecks?.[nextApplyGroupId];
    const shareRecord = savedState?.shareDriftChecks?.[nextShareGroupId];
    const applySignature = nextApplyGroup ? applyDriftSignature(nextApplyGroup, defaultTargets) : "";
    const shareSignature = nextShareGroup ? shareDriftSignature(result, nextShareGroup) : "";
    setApplyTargetGroupId(nextApplyGroupId);
    setShareTargetGroupId(nextShareGroupId);
    setDriftReports(applyRecord?.signature === applySignature ? applyRecord.reports : []);
    setShareDriftReport(shareRecord?.signature === shareSignature ? shareRecord.report : undefined);
    setApplyResults([]);
  }

  function rememberWorkspace(result: WorkspaceSnapshot, options: { moveToTop?: boolean; source?: ProjectSourceMetadata } = { moveToTop: true }) {
    setRecentWorkspaces((current) => {
      const existing = current.find((item) => item.path === result.root);
      const record: RecentWorkspace = {
        path: result.root,
        name: basename(result.root),
        lastOpenedAt: new Date().toISOString(),
        skillCount: result.skills.length,
        auditScore: result.audit.score,
        ...projectSourceForRecord(result.root, options.source, existing)
      };
      const exists = current.some((item) => item.path === result.root);
      const next = options.moveToTop || !exists
        ? [record, ...current.filter((item) => item.path !== result.root)].slice(0, MAX_RECENT_WORKSPACES)
        : current.map((item) => item.path === result.root ? record : item);
      void saveAppState({ recentWorkspaces: next });
      return next;
    });
  }

  function removeRecentWorkspace(path: string) {
    const next = recentWorkspaces.filter((item) => item.path !== path);
    setRecentWorkspaces(next);
    void saveAppState({ recentWorkspaces: next });
    if (root === path) {
      setRoot("");
      setSnapshot(undefined);
      void saveAppState({ activeWorkspace: undefined });
      setStatus(t.chooseStatus);
    }
  }

  function openAddProjectDialog() {
    setSourceMode("local");
    setSharedSourceUrl("");
    setShowAddProject(true);
  }

  function openEditProjectSourceDialog() {
    const githubUrl = activeProject?.githubSourceUrl;
    setSourceMode(githubUrl ? "github" : "local");
    setSharedSourceUrl(githubUrl ?? "");
    setShowEditProjectSource(true);
  }

  function rememberTarget(destinationPath: string, destinationName: string, profileName = profile) {
    const sourceName = basename(root);
    const record: TargetRecord = {
      id: `${root}::${profileName}::${destinationPath}`,
      sourcePath: root,
      sourceName,
      profile: profileName,
      destinationName,
      destinationPath,
      lastAppliedAt: new Date().toISOString()
    };
    setTargetHistory((current) => {
      const otherProjects = current.filter((item) => item.sourcePath !== root);
      const currentProject = [record, ...current.filter((item) => item.sourcePath === root && item.id !== record.id)].slice(0, 10);
      const next = [...currentProject, ...otherProjects];
      void saveAppState({ targetHistory: next });
      return next;
    });
  }

  const tabs = useMemo(() => [
    ["overview", t.tabs.overview, PackageCheck] as const,
    ["skills", t.tabs.skills, HardDrive] as const,
    ["profiles", t.tabs.profiles, GitBranch] as const,
    ["destinations", t.tabs.destinations, Download] as const,
    ["share", t.tabs.share, Rocket] as const,
    ["audit", t.tabs.audit, ShieldCheck] as const
  ], [t]);

  return (
    <main>
      <aside className="sidebar">
        <div className="sidebar-main">
          <div className="brand">
            <div className="logo">SO</div>
            <div>
              <h1>SkillOps</h1>
              <p>{t.appSubtitle}</p>
            </div>
          </div>
          <button className="primary" onClick={openAddProjectDialog}><Download size={16} /> {t.addSkillProject}</button>
          <div>
            <h4>{t.recentWorkspaces}</h4>
            <div className="workspace-list">
              {recentWorkspaces.length === 0 ? <p>{t.noRecentWorkspaces}</p> : recentWorkspaces.map((item) => (
                <div key={item.path} className={`workspace-item ${root === item.path ? "active" : ""}`}>
                  <button onClick={() => {
                    setShowAddProject(false);
                    if (item.status === "downloading" || item.status === "error") {
                      setRoot(item.path);
                      setSnapshot(undefined);
                      setStatus(item.status === "downloading" ? t.downloadingSource : t.errorStatus(item.error ?? t.projectDownloadFailed));
                      return;
                    }
                    void openWorkspace(item.path, { moveToTop: false });
                  }}>
                    <strong>{item.name}</strong>
                    <span>{item.status === "downloading" ? t.downloadingSource : item.status === "error" ? t.projectDownloadFailed : `${item.skillCount} skills / ${item.auditScore}/100`}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <button className="settings-button" onClick={() => setShowSettings(true)}><Settings size={16} /> {t.settings}</button>
      </aside>

      <section className="content">
        <div className="window-drag-strip" aria-hidden="true" />
        <header className="topbar">
          <div>
            <h2>{snapshot ? basename(snapshot.root) : activeProject?.name ?? t.addSkillProject}</h2>
            <p>{status}</p>
            {environment && <EnvironmentNotice t={t} environment={environment} isRepairing={isCliRepairing} onInstallCli={repairCliInstall} />}
          </div>
          <div className="actions">
            <button onClick={() => scan()} disabled={!root || isPendingProject}><RefreshCw size={16} /> {t.rescan}</button>
            <button onClick={init} disabled={!root || isPendingProject}><Play size={16} /> {t.initConfig}</button>
            {snapshot && <button onClick={openEditProjectSourceDialog}><Edit3 size={16} /> {t.editProjectSource}</button>}
            {activeWorkspaceCanBeRemoved && <button className="icon-button light" title={t.removeWorkspace} onClick={() => removeRecentWorkspace(root)}><Trash2 size={16} /></button>}
          </div>
        </header>

        {snapshot && (
          <ProjectHeader
            t={t}
            snapshot={snapshot}
            tabs={tabs}
            tab={tab}
            setTab={setProjectTab}
            criticalCount={criticalCount}
            warningCount={warningCount}
          />
        )}

        <div className="stage-scroll">
          {!snapshot ? (
            isPendingProject && activeProject ? <PendingProject t={t} project={activeProject} /> : <EmptyState t={t} />
          ) : (
          <>
            {tab === "overview" && (
              <Overview
                t={t}
                snapshot={snapshot}
                criticalCount={criticalCount}
                warningCount={warningCount}
                targetHistory={projectTargetHistory}
                setTab={setProjectTab}
                setStatus={setStatus}
                onSourceUpdated={() => scan(root)}
                isGithubSource={activeProject?.sourceKind === "github"}
                sourceUpdateCheck={sourceUpdateCheck}
                saveSourceUpdateCheck={rememberSourceUpdateCheck}
                openSourceDiff={openSourceDiff}
              />
            )}
            {tab === "skills" && <SkillsList t={t} snapshot={snapshot} profile={profile} setProfile={setProjectProfile} />}
            {tab === "profiles" && (
              <Profiles
                t={t}
                snapshot={snapshot}
                profile={profile}
                setProfile={setProjectProfile}
                saveProfiles={saveProfiles}
              />
            )}
            {tab === "destinations" && (
              <ApplySkills
                t={t}
                snapshot={snapshot}
                profile={profile}
                profileOptions={profileOptions}
                defaultTargets={defaultTargets}
                targetGroups={applyTargetGroups}
                activeTargetGroup={activeApplyTargetGroup}
                setActiveTargetGroupId={setProjectApplyTargetGroupId}
                saveTargetGroups={saveApplyTargetGroups}
                chooseProjectTarget={chooseProjectTarget}
                driftReports={driftReports}
                driftCheck={activeApplyDriftCheck}
                driftSignature={activeApplyDriftSignature}
                isCheckingDrift={isCheckingApplyDrift}
                applyResults={applyResults}
                targetHistory={projectTargetHistory}
                checkTargetGroupDrift={checkTargetGroupDrift}
                applyTargetGroup={applyTargetGroup}
                openDriftDiff={openDriftDiff}
              />
            )}
            {tab === "share" && (
              <Publish
                t={t}
                snapshot={snapshot}
                shareResult={shareResult}
                sharePlan={sharePlan}
                shareDriftReport={shareDriftReport}
                shareDriftCheck={activeShareDriftCheck}
                shareDriftSignature={activeShareDriftSignature}
                isSharing={isSharing}
                isCheckingShareDrift={isCheckingShareDrift}
                shareProgress={shareProgress}
                profileOptions={profileOptions}
                targetGroups={shareTargetGroups}
                activeTargetGroup={activeShareTargetGroup}
                setActiveTargetGroupId={setProjectShareTargetGroupId}
                saveTargetGroups={saveShareTargetGroups}
                checkShareTargetDrift={checkShareTargetDrift}
                shareProject={shareProject}
                confirmShareProject={confirmShareProject}
                openDriftDiff={openDriftDiff}
                cancelSharePlan={() => setSharePlan(undefined)}
              />
            )}
            {tab === "audit" && <Audit t={t} snapshot={snapshot} criticalCount={criticalCount} warningCount={warningCount} openFeedback={() => openFeedbackIssue(snapshot.audit.feedbackUrl)} />}
          </>
          )}
        </div>
      </section>

      {showAddProject && (
        <AddProjectDialog
          t={t}
          sourceMode={sourceMode}
          setSourceMode={setSourceMode}
          sharedSourceUrl={sharedSourceUrl}
          setSharedSourceUrl={setSharedSourceUrl}
          chooseWorkspace={chooseWorkspace}
          downloadSharedSource={downloadSharedSource}
          onClose={() => setShowAddProject(false)}
        />
      )}
      {showEditProjectSource && (
        <AddProjectDialog
          t={t}
          title={t.editProjectSource}
          sourceMode={sourceMode}
          setSourceMode={setSourceMode}
          sharedSourceUrl={sharedSourceUrl}
          setSharedSourceUrl={setSharedSourceUrl}
          chooseWorkspace={chooseWorkspace}
          downloadSharedSource={downloadSharedSource}
          currentSourceKind={activeProject?.sourceKind}
          currentSourceValue={activeProject?.sourceKind === "github" ? activeProject.githubSourceUrl : activeProject?.localSourcePath ?? root}
          onClose={() => setShowEditProjectSource(false)}
        />
      )}

      {showSettings && (
        <SettingsDialog
          t={t}
          language={language}
          setLanguage={setLanguage}
          openFeedback={openFeedbackIssue}
          onClose={() => setShowSettings(false)}
        />
      )}

      {cliRepairNotice && (
        <CliRepairDialog
          t={t}
          notice={cliRepairNotice}
          onCopy={() => copyCliRepairDetails(cliRepairNotice.details)}
          onClose={() => setCliRepairNotice(undefined)}
        />
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
