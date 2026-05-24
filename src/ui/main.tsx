import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Download, GitBranch, HardDrive, PackageCheck, Play, RefreshCw, Rocket, Settings, ShieldCheck, Trash2 } from "lucide-react";
import type { AppState, ApplyProfileResult, ApplyTargetGroup, DriftReport, EnvironmentStatus, ProjectUiState, RecentWorkspace, SharePlanResult, ShareResult, ShareTargetGroup, SkillOpsConfig, TargetRecord, WorkspaceSnapshot } from "../shared/types";
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
  const [isSharing, setIsSharing] = useState(false);
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
  const [showAddProject, setShowAddProject] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isCliRepairing, setIsCliRepairing] = useState(false);
  const [cliRepairNotice, setCliRepairNotice] = useState<CliRepairNotice | undefined>();
  const activeProject = recentWorkspaces.find((item) => item.path === root);
  const isPendingProject = activeProject?.status === "downloading" || activeProject?.status === "error";

  const criticalCount = snapshot?.audit.findings.filter((item) => item.severity === "critical").length ?? 0;
  const warningCount = snapshot?.audit.findings.filter((item) => item.severity === "warning").length ?? 0;
  const profileOptions = snapshot?.config.profiles.map((item) => item.name) ?? ["default"];
  const applyTargetGroups = snapshot?.config.applyTargets ?? [];
  const shareTargetGroups = snapshot?.config.shareTargets ?? [];
  const activeApplyTargetGroup = applyTargetGroups.find((item) => item.id === applyTargetGroupId) ?? applyTargetGroups[0];
  const activeShareTargetGroup = shareTargetGroups.find((item) => item.id === shareTargetGroupId) ?? shareTargetGroups[0];
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

  function rememberProjectState(projectRoot: string, patch: ProjectUiState) {
    setProjectStates((current) => {
      const next = { ...current, [projectRoot]: { ...current[projectRoot], ...patch } };
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
    setApplyTargetGroupId(next);
    setDriftReports([]);
    setApplyResults([]);
    if (root) rememberProjectState(root, { applyTargetGroupId: next });
  }

  function setProjectShareTargetGroupId(next: string) {
    setShareTargetGroupId(next);
    setShareResult(undefined);
    setSharePlan(undefined);
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
      await openWorkspace(normalizeLocalProjectRoot(selected));
      setShowAddProject(false);
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
      sourceUrl
    };
    const nextRecent = [pendingRecord, ...recentWorkspaces.filter((item) => item.path !== pendingId)].slice(0, MAX_RECENT_WORKSPACES);
    setRecentWorkspaces(nextRecent);
    void saveAppState({ recentWorkspaces: nextRecent });
    setRoot(pendingId);
    setSnapshot(undefined);
    setShowAddProject(false);
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
      await openWorkspace(sourcePath);
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
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      setStatus(t.scanning);
      const result = await window.skillops.scanWorkspace(nextRoot);
      applySnapshot(result);
      setStatus(t.foundStatus(result.skills.length, result.audit.score));
    } catch (error) {
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
        const saved = await window.skillops.saveConfig(root, {
          ...snapshot.config,
          teamRepo: group.remoteUrl.trim() || undefined,
          shareTargetMode: group.targetMode,
          shareProjectName: group.projectName?.trim() || undefined
        });
        applySnapshot(saved, group.profile);
      }
      setStatus(t.sharing);
      const plan = await window.skillops.createSharePlan(root, group.remoteUrl, "private", group.targetMode, group.projectName ?? "", group.profile);
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
      const result = await window.skillops.shareProject(root, group.remoteUrl, "private", message, group.targetMode, group.projectName ?? "", group.profile, plan.delivery, plan.branch, true);
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

  async function openWorkspace(nextRoot: string, options: { restore?: boolean; moveToTop?: boolean; projectStates?: Record<string, ProjectUiState> } = {}) {
    if (!window.skillops) {
      setStatus(t.desktopRequired);
      return;
    }
    setRoot(nextRoot);
    setStatus(t.scanning);
    try {
      const result = await window.skillops.scanWorkspace(nextRoot);
      applySnapshot(result, undefined, options.projectStates);
      rememberWorkspace(result, { moveToTop: options.moveToTop ?? true });
      void saveAppState({ activeWorkspace: nextRoot });
      setStatus(t.foundStatus(result.skills.length, result.audit.score));
    } catch (error) {
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
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
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
    setApplyTargetGroupId(applyGroups.some((item) => item.id === savedState?.applyTargetGroupId) ? savedState!.applyTargetGroupId! : applyGroups[0]?.id ?? "");
    setShareTargetGroupId(shareGroups.some((item) => item.id === savedState?.shareTargetGroupId) ? savedState!.shareTargetGroupId! : shareGroups[0]?.id ?? "");
    setDriftReports([]);
    setApplyResults([]);
  }

  function rememberWorkspace(result: WorkspaceSnapshot, options: { moveToTop?: boolean } = { moveToTop: true }) {
    const record: RecentWorkspace = {
      path: result.root,
      name: basename(result.root),
      lastOpenedAt: new Date().toISOString(),
      skillCount: result.skills.length,
      auditScore: result.audit.score
    };
    setRecentWorkspaces((current) => {
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
          <button className="primary" onClick={() => setShowAddProject(true)}><Download size={16} /> {t.addSkillProject}</button>
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
                isSharing={isSharing}
                shareProgress={shareProgress}
                profileOptions={profileOptions}
                targetGroups={shareTargetGroups}
                activeTargetGroup={activeShareTargetGroup}
                setActiveTargetGroupId={setProjectShareTargetGroupId}
                saveTargetGroups={saveShareTargetGroups}
                shareProject={shareProject}
                confirmShareProject={confirmShareProject}
                cancelSharePlan={() => setSharePlan(undefined)}
              />
            )}
            {tab === "audit" && <Audit t={t} snapshot={snapshot} criticalCount={criticalCount} warningCount={warningCount} />}
          </>
          )}
        </div>
      </section>

      {showAddProject && (
        <AddProjectDialog
          t={t}
          sharedSourceUrl={sharedSourceUrl}
          setSharedSourceUrl={setSharedSourceUrl}
          chooseWorkspace={chooseWorkspace}
          downloadSharedSource={downloadSharedSource}
          onClose={() => setShowAddProject(false)}
        />
      )}

      {showSettings && (
        <SettingsDialog
          t={t}
          language={language}
          setLanguage={setLanguage}
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
