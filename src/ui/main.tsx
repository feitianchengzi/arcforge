import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, CheckCircle2, Download, ExternalLink, FolderOpen, GitBranch, HardDrive, PackageCheck, Pencil, Play, Plus, RefreshCw, Rocket, Settings, ShieldCheck, Trash2 } from "lucide-react";
import type { ApplyProfileResult, ApplyTargetGroup, CliInstallStatus, DriftReport, EnvironmentStatus, PublishPlan, ShareResult, ShareTargetGroup, ShareTargetMode, SkillOpsConfig, SkillOpsProfile, WorkspaceSnapshot } from "../shared/types";
import { dictionaries, type Dictionary, type Language } from "./i18n";
import "./styles.css";

declare global {
  interface Window {
    skillops: {
      chooseWorkspace: () => Promise<string | undefined>;
      scanWorkspace: (root: string) => Promise<WorkspaceSnapshot>;
      initWorkspace: (root: string) => Promise<unknown>;
      saveConfig: (root: string, config: SkillOpsConfig) => Promise<WorkspaceSnapshot>;
      getDefaultTargets: () => Promise<DefaultTarget[]>;
      getEnvironmentStatus: () => Promise<EnvironmentStatus>;
      installCli: () => Promise<CliInstallStatus>;
      downloadSource: (remoteUrl: string) => Promise<string>;
      createPublishPlan: (root: string, visibility: "private" | "public") => Promise<PublishPlan>;
      shareProject: (root: string, remoteUrl: string, visibility: "private" | "public", message: string, targetMode: ShareTargetMode, projectName: string, profileName: string) => Promise<ShareResult>;
      applyProfile: (root: string, profile: string, targetDir: string) => Promise<ApplyProfileResult>;
      driftReport: (root: string, profile: string, targetDir: string) => Promise<DriftReport>;
      openDriftDiff: (report: DriftReport) => Promise<void>;
    };
  }
}

type Tab = "overview" | "skills" | "profiles" | "destinations" | "share" | "audit";

interface DefaultTarget {
  id: string;
  name: string;
  path: string;
}

interface RecentWorkspace {
  path: string;
  name: string;
  lastOpenedAt: string;
  skillCount: number;
  auditScore: number;
  status?: "ready" | "downloading" | "error";
  sourceUrl?: string;
  error?: string;
}

interface TargetRecord {
  id: string;
  sourcePath: string;
  sourceName: string;
  profile: string;
  destinationName: string;
  destinationPath: string;
  lastAppliedAt: string;
}

interface ProjectUiState {
  tab?: Tab;
  profile?: string;
  applyTargetGroupId?: string;
  shareTargetGroupId?: string;
}

const RECENT_WORKSPACES_KEY = "skillops.recentWorkspaces";
const ACTIVE_WORKSPACE_KEY = "skillops.activeWorkspace";
const TARGET_HISTORY_KEY = "skillops.targetHistory";
const PROJECT_STATE_KEY = "skillops.projectState";
const MAX_RECENT_WORKSPACES = 8;

function initialLanguage(): Language {
  const stored = window.localStorage.getItem("skillops.language");
  if (stored === "en" || stored === "zh-CN") return stored;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
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
  const [isSharing, setIsSharing] = useState(false);
  const [shareProgress, setShareProgress] = useState<string | undefined>();
  const [driftReports, setDriftReports] = useState<DriftReport[]>([]);
  const [applyResults, setApplyResults] = useState<ApplyProfileResult[]>([]);
  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspace[]>(loadJson<RecentWorkspace[]>(RECENT_WORKSPACES_KEY, []));
  const [targetHistory, setTargetHistory] = useState<TargetRecord[]>(loadJson<TargetRecord[]>(TARGET_HISTORY_KEY, []));
  const [projectStates, setProjectStates] = useState<Record<string, ProjectUiState>>(loadJson<Record<string, ProjectUiState>>(PROJECT_STATE_KEY, {}));
  const [defaultTargets, setDefaultTargets] = useState<DefaultTarget[]>([]);
  const [applyTargetGroupId, setApplyTargetGroupId] = useState("");
  const [shareTargetGroupId, setShareTargetGroupId] = useState("");
  const [sharedSourceUrl, setSharedSourceUrl] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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

  useEffect(() => {
    if (!window.skillops) return;
    void window.skillops.getDefaultTargets().then((targets) => {
      setDefaultTargets(targets);
    }).catch((error) => setStatus(t.errorStatus(errorMessage(error))));
    void refreshEnvironment();
  }, []);

  useEffect(() => {
    const active = window.localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    if (!active || !window.skillops) return;
    void openWorkspace(active, { restore: true, moveToTop: false });
  }, []);

  function setLanguage(next: Language) {
    setLanguageState(next);
    window.localStorage.setItem("skillops.language", next);
    if (!snapshot) setStatus(dictionaries[next].chooseStatus);
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
    try {
      const cli = await window.skillops.installCli();
      const next = await window.skillops.getEnvironmentStatus();
      setEnvironment({ ...next, cli });
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  function rememberProjectState(projectRoot: string, patch: ProjectUiState) {
    setProjectStates((current) => {
      const next = { ...current, [projectRoot]: { ...current[projectRoot], ...patch } };
      window.localStorage.setItem(PROJECT_STATE_KEY, JSON.stringify(next));
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
    if (root) rememberProjectState(root, { applyTargetGroupId: next });
  }

  function setProjectShareTargetGroupId(next: string) {
    setShareTargetGroupId(next);
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
    window.localStorage.setItem(RECENT_WORKSPACES_KEY, JSON.stringify(nextRecent));
    setRoot(pendingId);
    setSnapshot(undefined);
    setShowAddProject(false);
    window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, pendingId);
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
        window.localStorage.setItem(RECENT_WORKSPACES_KEY, JSON.stringify(next));
        return next;
      });
      await openWorkspace(sourcePath);
    } catch (error) {
      const message = errorMessage(error);
      setRecentWorkspaces((current) => {
        const next = current.map((item) => item.path === pendingId ? { ...item, status: "error" as const, error: message } : item);
        window.localStorage.setItem(RECENT_WORKSPACES_KEY, JSON.stringify(next));
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
      const result = await window.skillops.shareProject(root, group.remoteUrl, "private", message, group.targetMode, group.projectName ?? "", group.profile);
      setShareResult(result);
      const complete = t.shareComplete(result.branch);
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

  async function openWorkspace(nextRoot: string, options: { restore?: boolean; moveToTop?: boolean } = {}) {
    if (!window.skillops) {
      setStatus(t.desktopRequired);
      return;
    }
    setRoot(nextRoot);
    setStatus(t.scanning);
    try {
      const result = await window.skillops.scanWorkspace(nextRoot);
      applySnapshot(result);
      rememberWorkspace(result, { moveToTop: options.moveToTop ?? true });
      window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, nextRoot);
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
    if (targets.length === 0) return;
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
    if (targets.length === 0) return;
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

  function applySnapshot(result: WorkspaceSnapshot, preferredProfile?: string) {
    setSnapshot(result);
    const savedState = projectStates[result.root];
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
    const exists = recentWorkspaces.some((item) => item.path === result.root);
    const next = options.moveToTop || !exists
      ? [record, ...recentWorkspaces.filter((item) => item.path !== result.root)].slice(0, MAX_RECENT_WORKSPACES)
      : recentWorkspaces.map((item) => item.path === result.root ? record : item);
    setRecentWorkspaces(next);
    window.localStorage.setItem(RECENT_WORKSPACES_KEY, JSON.stringify(next));
  }

  function removeRecentWorkspace(path: string) {
    const next = recentWorkspaces.filter((item) => item.path !== path);
    setRecentWorkspaces(next);
    window.localStorage.setItem(RECENT_WORKSPACES_KEY, JSON.stringify(next));
    if (root === path) {
      setRoot("");
      setSnapshot(undefined);
      window.localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
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
      window.localStorage.setItem(TARGET_HISTORY_KEY, JSON.stringify(next));
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
                  <button className="icon-button" title={t.removeWorkspace} onClick={() => removeRecentWorkspace(item.path)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <button className="settings-button" onClick={() => setShowSettings(true)}><Settings size={16} /> {t.settings}</button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <h2>{snapshot ? basename(snapshot.root) : activeProject?.name ?? t.addSkillProject}</h2>
            <p>{status}</p>
            {environment && <EnvironmentNotice t={t} environment={environment} onInstallCli={repairCliInstall} />}
          </div>
          <div className="actions">
            <button onClick={() => scan()} disabled={!root || isPendingProject}><RefreshCw size={16} /> {t.rescan}</button>
            <button onClick={init} disabled={!root || isPendingProject}><Play size={16} /> {t.initConfig}</button>
          </div>
        </header>

        {!snapshot ? (
          isPendingProject && activeProject ? <PendingProject t={t} project={activeProject} /> : <EmptyState t={t} />
        ) : (
          <>
            <ProjectHeader
              t={t}
              snapshot={snapshot}
              tabs={tabs}
              tab={tab}
              setTab={setProjectTab}
              criticalCount={criticalCount}
              warningCount={warningCount}
            />
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
            {tab === "skills" && <SkillsList t={t} snapshot={snapshot} />}
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
                isSharing={isSharing}
                shareProgress={shareProgress}
                profileOptions={profileOptions}
                targetGroups={shareTargetGroups}
                activeTargetGroup={activeShareTargetGroup}
                setActiveTargetGroupId={setProjectShareTargetGroupId}
                saveTargetGroups={saveShareTargetGroups}
                shareProject={shareProject}
              />
            )}
            {tab === "audit" && <Audit t={t} snapshot={snapshot} criticalCount={criticalCount} warningCount={warningCount} />}
          </>
        )}
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
    </main>
  );
}

function EmptyState({ t }: { t: Dictionary }) {
  return (
    <section className="empty">
      <PackageCheck size={36} />
      <h3>{t.emptyTitle}</h3>
      <p>{t.emptyBody}</p>
    </section>
  );
}

function PendingProject({ t, project }: { t: Dictionary; project: RecentWorkspace }) {
  const failed = project.status === "error";
  return (
    <section className="empty">
      <Download size={36} />
      <h3>{project.name}</h3>
      <p>{failed ? t.projectDownloadFailed : t.projectDownloading}</p>
      {project.sourceUrl && <pre>{project.sourceUrl}</pre>}
      {failed && project.error && <pre>{project.error}</pre>}
    </section>
  );
}

function EnvironmentNotice({ t, environment, onInstallCli }: { t: Dictionary; environment: EnvironmentStatus; onInstallCli: () => void }) {
  const gitVersion = environment.git.version ?? "git";
  const cli = environment.cli;
  const title = environment.git.available ? t.environmentReady(gitVersion) : t.environmentGitMissing;
  const cliReady = cli?.available ?? false;
  const cliTitle = cliReady ? t.cliReady : t.cliNeedsRepair;
  return (
    <div className={`environment-status ${environment.git.available && cliReady ? "good" : "warn"}`} title={`${environment.platform} ${environment.arch}${cli?.message ? ` · ${cli.message}` : ""}`}>
      {environment.git.available && cliReady ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
      <span>{title} {cli ? cliTitle : ""}</span>
      {cli && !cliReady && <button className="inline-link" onClick={onInstallCli}>{t.repairCli}</button>}
    </div>
  );
}

function AddProjectDialog(props: {
  t: Dictionary;
  sharedSourceUrl: string;
  setSharedSourceUrl: (value: string) => void;
  chooseWorkspace: () => void;
  downloadSharedSource: () => void;
  onClose: () => void;
}) {
  const { t } = props;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={props.onClose}>
      <section className="modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{t.addSkillProject}</h3>
            <p>{t.emptyBody}</p>
          </div>
          <button className="icon-button light" onClick={props.onClose}>x</button>
        </div>
        <div className="add-project-options">
          <article className="add-option">
            <div>
              <FolderOpen size={20} />
              <h4>{t.addLocalProject}</h4>
              <p>{t.localProjectHelp}</p>
            </div>
            <button className="primary" onClick={props.chooseWorkspace}>{t.addLocalProject}</button>
          </article>
          <article className="add-option">
            <div>
              <Download size={20} />
              <h4>{t.addSharedSource}</h4>
              <p>{t.githubProjectHelp}</p>
            </div>
            <div className="download-source light">
              <input value={props.sharedSourceUrl} placeholder={t.sharedSourcePlaceholder} onChange={(event) => props.setSharedSourceUrl(event.target.value)} />
              <button onClick={props.downloadSharedSource} disabled={!props.sharedSourceUrl.trim()}>{t.downloadSource}</button>
            </div>
          </article>
        </div>
        <pre>{t.emptyExample}</pre>
      </section>
    </div>
  );
}

function SettingsDialog(props: {
  t: Dictionary;
  language: Language;
  setLanguage: (value: Language) => void;
  onClose: () => void;
}) {
  const { t } = props;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={props.onClose}>
      <section className="modal small" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{t.settings}</h3>
          </div>
          <button className="icon-button light" onClick={props.onClose}>x</button>
        </div>
        <label>{t.language}</label>
        <select value={props.language} onChange={(event) => props.setLanguage(event.target.value as Language)}>
          <option value="en">{t.english}</option>
          <option value="zh-CN">{t.simplifiedChinese}</option>
        </select>
      </section>
    </div>
  );
}

function ProjectHeader(props: {
  t: Dictionary;
  snapshot: WorkspaceSnapshot;
  tabs: ReadonlyArray<readonly [Tab, string, React.ComponentType<{ size?: number }>]>;
  tab: Tab;
  setTab: (value: Tab) => void;
  criticalCount: number;
  warningCount: number;
}) {
  return (
    <section className="project-header">
      <div className="project-summary">
        <div>
          <span>{props.t.projectPath}</span>
          <p>{props.snapshot.root}</p>
        </div>
        <div className="summary-metrics">
          <div>
            <strong>{props.snapshot.skills.length}</strong>
            <span>{props.t.metrics.skills}</span>
          </div>
          <div>
            <strong>{props.snapshot.audit.score}/100</strong>
            <span>{props.t.metrics.auditScore}</span>
          </div>
          <div className={props.criticalCount ? "bad" : "good"}>
            <strong>{props.criticalCount}</strong>
            <span>{props.t.metrics.critical}</span>
          </div>
          <div className={props.warningCount ? "warn" : "good"}>
            <strong>{props.warningCount}</strong>
            <span>{props.t.metrics.warnings}</span>
          </div>
        </div>
      </div>
      <nav className="project-tabs">
        {props.tabs.map(([id, label, Icon]) => (
          <button key={id} className={props.tab === id ? "active" : ""} onClick={() => props.setTab(id)}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>
    </section>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function basename(filePath: string): string {
  return filePath.split(/[\\/]/).filter(Boolean).pop() ?? filePath;
}

function dirname(filePath: string): string {
  const trimmed = filePath.replace(/[\\/]+$/, "");
  const index = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return index > 0 ? trimmed.slice(0, index) : filePath;
}

function normalizeLocalProjectRoot(filePath: string): string {
  return basename(filePath) === "skills" ? dirname(filePath) : filePath;
}

function projectNameFromSource(sourceUrl: string): string {
  const cleaned = sourceUrl.replace(/\.git$/, "").replace(/\/$/, "");
  const parts = cleaned.split(/[/:]/).filter(Boolean);
  const treeIndex = parts.findIndex((part) => part === "tree" || part === "blob");
  if (treeIndex !== -1 && parts.length > treeIndex + 2) return parts[parts.length - 1];
  return parts[parts.length - 1] ?? "GitHub source";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function Overview(props: {
  t: Dictionary;
  snapshot: WorkspaceSnapshot;
  criticalCount: number;
  warningCount: number;
  targetHistory: TargetRecord[];
  setTab: (value: Tab) => void;
}) {
  const { t, snapshot, criticalCount, warningCount } = props;
  const projectTargets = props.targetHistory.filter((item) => item.sourcePath === snapshot.root);
  return (
    <div className="grid two">
      <section className="panel">
        <h3>{t.projectSummary}</h3>
        <div className="dashboard-metrics">
          <Metric label={t.metrics.skills} value={snapshot.skills.length} />
          <Metric label={t.sharedAssetsTitle} value={snapshot.assets.length} />
          <Metric label={t.metrics.auditScore} value={`${snapshot.audit.score}/100`} />
          <Metric label={t.metrics.critical} value={criticalCount} tone={criticalCount ? "bad" : "good"} />
          <Metric label={t.metrics.warnings} value={warningCount} tone={warningCount ? "warn" : "good"} />
        </div>
      </section>
      <section className="panel">
        <h3>{t.nextSteps}</h3>
        <div className="action-list">
          <button onClick={() => props.setTab("audit")}>{t.reviewAudit}</button>
          <button onClick={() => props.setTab("profiles")}>{t.configureProfiles}</button>
          <button onClick={() => props.setTab("destinations")}>{t.manageDestinations}</button>
          <button onClick={() => props.setTab("share")}>{t.prepareSharing}</button>
        </div>
      </section>
      <section className="panel wide">
        <h3>{t.targetHistory}</h3>
        {projectTargets.length === 0 ? <p className="muted">{t.noTargetHistory}</p> : (
          <div className="list">
            {projectTargets.slice(0, 4).map((item) => (
              <article key={item.id} className="row stacked">
                <div>
                  <strong>{item.destinationName}</strong>
                  <p>{item.profile}</p>
                  <span>{item.destinationPath}</span>
                </div>
                <span>{t.lastApplied}: {formatDate(item.lastAppliedAt)}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SkillsList({ t, snapshot }: { t: Dictionary; snapshot: WorkspaceSnapshot }) {
  return (
    <div className="grid two">
      <section className="panel">
        <h3>{t.skillsTitle}</h3>
        <div className="list">
          {snapshot.skills.map((skill) => (
            <article key={skill.path} className="row">
                <div>
                  <strong>{skill.name}</strong>
                  <p>{skill.description || t.noDescription}</p>
                </div>
                <span>{skill.relativePath}</span>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <h3>{t.sharedAssetsTitle}</h3>
        <p className="muted">{t.sharedAssetsHelp}</p>
        {snapshot.assets.length === 0 ? <p className="muted">{t.noSharedAssets}</p> : (
          <div className="list">
            {snapshot.assets.map((asset) => (
              <article key={asset.path} className="row">
                <strong>{asset.name}</strong>
                <span>{asset.relativePath}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Audit({ t, snapshot, criticalCount, warningCount }: { t: Dictionary; snapshot: WorkspaceSnapshot; criticalCount: number; warningCount: number }) {
  return (
    <div className="grid">
      <Metric label={t.metrics.score} value={`${snapshot.audit.score}/100`} />
      <Metric label={t.metrics.criticalFindings} value={criticalCount} tone={criticalCount ? "bad" : "good"} />
      <Metric label={t.metrics.warnings} value={warningCount} tone={warningCount ? "warn" : "good"} />
      <section className="panel wide">
        <h3>{t.findingsTitle}</h3>
        {snapshot.audit.findings.length === 0 ? <p className="muted">{t.noFindings}</p> : (
          <div className="list">
            {snapshot.audit.findings.map((finding, index) => (
              <article key={`${finding.code}-${index}`} className={`finding ${finding.severity}`}>
                {finding.severity === "critical" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                <div>
                  <strong>{finding.code}</strong>
                  <p>{finding.message}</p>
                  <span>{finding.file}{finding.line ? `:${finding.line}` : ""}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Profiles(props: {
  t: Dictionary;
  snapshot: WorkspaceSnapshot;
  profile: string;
  setProfile: (value: string) => void;
  saveProfiles: (config: SkillOpsConfig, nextProfile: string) => void;
}) {
  const { t } = props;
  const sourceProfiles = props.snapshot.config.profiles.length > 0 ? props.snapshot.config.profiles : [emptyProfile("default")];
  const [draftProfiles, setDraftProfiles] = useState<SkillOpsProfile[]>(sourceProfiles);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const nextProfiles = props.snapshot.config.profiles.length > 0 ? props.snapshot.config.profiles : [emptyProfile("default")];
    const nextIndex = Math.max(0, nextProfiles.findIndex((item) => item.name === props.profile));
    setDraftProfiles(nextProfiles);
    setActiveIndex(nextIndex === -1 ? 0 : nextIndex);
  }, [props.snapshot, props.profile]);

  const activeProfile = draftProfiles[activeIndex] ?? draftProfiles[0] ?? emptyProfile("default");

  function updateActiveProfile(patch: Partial<SkillOpsProfile>) {
    setDraftProfiles((current) => current.map((item, index) => index === activeIndex ? { ...item, ...patch } : item));
  }

  function addProfile() {
    const base = "new-profile";
    const existing = new Set(draftProfiles.map((item) => item.name));
    let name = base;
    let index = 2;
    while (existing.has(name)) {
      name = `${base}-${index}`;
      index += 1;
    }
    const nextProfile = emptyProfile(name);
    setDraftProfiles((current) => [...current, nextProfile]);
    setActiveIndex(draftProfiles.length);
  }

  function deleteProfile() {
    if (draftProfiles.length <= 1) return;
    const nextProfiles = draftProfiles.filter((_item, index) => index !== activeIndex);
    setDraftProfiles(nextProfiles);
    setActiveIndex(Math.max(0, activeIndex - 1));
  }

  function toggleSkill(skillName: string) {
    const current = activeProfile.skills.includes("*") ? props.snapshot.skills.map((skill) => skill.name) : activeProfile.skills;
    const next = current.includes(skillName) ? current.filter((item) => item !== skillName) : [...current, skillName];
    updateActiveProfile({ skills: next.length === props.snapshot.skills.length ? ["*"] : next });
  }

  function toggleAllSkills() {
    updateActiveProfile({ skills: activeProfile.skills.includes("*") ? [] : ["*"] });
  }

  function toggleTarget(target: string) {
    const next = activeProfile.targets.includes(target)
      ? activeProfile.targets.filter((item) => item !== target)
      : [...activeProfile.targets, target];
    updateActiveProfile({ targets: next });
  }

  const selectedSkillNames = activeProfile.skills.includes("*")
    ? new Set(props.snapshot.skills.map((skill) => skill.name))
    : new Set(activeProfile.skills);

  function saveDraft() {
    props.saveProfiles({ ...props.snapshot.config, profiles: draftProfiles }, activeProfile.name);
    props.setProfile(activeProfile.name);
  }

  function cancelDraft() {
    setDraftProfiles(sourceProfiles);
    const nextIndex = Math.max(0, sourceProfiles.findIndex((item) => item.name === props.profile));
    setActiveIndex(nextIndex === -1 ? 0 : nextIndex);
  }

  return (
    <div className="grid two">
      <section className="panel">
        <h3>{t.manageProfiles}</h3>
        <p className="muted">{t.profileHelp}</p>
        <div className="profile-list">
          {draftProfiles.map((item, index) => (
            <button key={`${index}-${item.name}`} className={index === activeIndex ? "active" : ""} onClick={() => setActiveIndex(index)}>
              <strong>{item.name || t.unnamedProfile}</strong>
              <span>{item.skills.includes("*") ? t.allSkills : `${item.skills.length} skills`}</span>
            </button>
          ))}
        </div>
        <div className="actions">
          <button onClick={addProfile}>{t.newProfile}</button>
          <button onClick={deleteProfile} disabled={draftProfiles.length <= 1}><Trash2 size={16} /> {t.deleteProfile}</button>
        </div>
      </section>
      <section className="panel">
        <h3>{activeProfile.name || t.unnamedProfile}</h3>
        <label>{t.profileName}</label>
        <input value={activeProfile.name} onChange={(event) => updateActiveProfile({ name: event.target.value })} />
        <label>{t.profileDescription}</label>
        <input value={activeProfile.description ?? ""} onChange={(event) => updateActiveProfile({ description: event.target.value })} />

        <label>{t.includedSkills}</label>
        <label className="check-row">
          <input type="checkbox" checked={activeProfile.skills.includes("*")} onChange={toggleAllSkills} />
          <span>{t.allSkills}</span>
        </label>
        <div className="check-list">
          {props.snapshot.skills.map((skill) => (
            <label key={skill.name} className="check-row">
              <input type="checkbox" checked={selectedSkillNames.has(skill.name)} onChange={() => toggleSkill(skill.name)} disabled={activeProfile.skills.includes("*")} />
              <span>{skill.name}</span>
            </label>
          ))}
        </div>

        <label>{t.profileTargets}</label>
        <div className="check-list inline">
          {["codex", "claude", "cursor"].map((target) => (
            <label key={target} className="check-row">
              <input type="checkbox" checked={activeProfile.targets.includes(target)} onChange={() => toggleTarget(target)} />
              <span>{target}</span>
            </label>
          ))}
        </div>
        <div className="actions">
          <button onClick={cancelDraft}>{t.cancel}</button>
          <button className="primary" onClick={saveDraft}>{t.saveProfiles}</button>
        </div>
      </section>
    </div>
  );
}

function emptyProfile(name: string): SkillOpsProfile {
  return {
    name,
    description: "",
    skills: ["*"],
    targets: ["codex", "claude", "cursor"]
  };
}

function ApplySkills(props: {
  t: Dictionary;
  snapshot: WorkspaceSnapshot;
  profile: string;
  profileOptions: string[];
  defaultTargets: DefaultTarget[];
  targetGroups: ApplyTargetGroup[];
  activeTargetGroup?: ApplyTargetGroup;
  setActiveTargetGroupId: (value: string) => void;
  saveTargetGroups: (groups: ApplyTargetGroup[], selectedId: string) => void;
  chooseProjectTarget: () => Promise<string | undefined>;
  driftReports: DriftReport[];
  applyResults: ApplyProfileResult[];
  targetHistory: TargetRecord[];
  checkTargetGroupDrift: (group: ApplyTargetGroup) => void;
  applyTargetGroup: (group: ApplyTargetGroup) => void;
  openDriftDiff: (report: DriftReport) => void;
}) {
  const { t } = props;
  const [editingGroup, setEditingGroup] = useState<ApplyTargetGroup | undefined>();
  const activeGroup = props.activeTargetGroup;
  const selectedTargets = activeGroup ? resolveApplyTargetEntries(activeGroup, props.defaultTargets) : [];
  const selectedSkills = activeGroup ? selectedSkillCount(props.snapshot, activeGroup.profile) : 0;
  const latestApplySummary = summarizeApplyResults(props.applyResults);

  function upsertGroup(group: ApplyTargetGroup) {
    const existing = props.targetGroups.some((item) => item.id === group.id);
    const next = existing ? props.targetGroups.map((item) => item.id === group.id ? group : item) : [...props.targetGroups, group];
    props.saveTargetGroups(next, group.id);
    setEditingGroup(undefined);
  }

  function deleteGroup(groupId: string) {
    const next = props.targetGroups.filter((item) => item.id !== groupId);
    props.saveTargetGroups(next, next[0]?.id ?? "");
  }

  return (
    <div className="grid two">
      <section className="panel">
        <h3>{t.applySkills}</h3>
        <p className="muted">{t.applyHelp}</p>
        <div className="actions">
          <button className="primary" onClick={() => setEditingGroup(createApplyTargetGroup(props.profile, props.defaultTargets[0]?.id))}><Plus size={16} /> {t.newTargetGroup}</button>
        </div>
        {props.targetGroups.length === 0 ? <p className="muted">{t.noTargetGroups}</p> : (
          <div className="profile-list">
            {props.targetGroups.map((group) => {
              const targets = resolveApplyTargetEntries(group, props.defaultTargets);
              return (
                <button key={group.id} className={activeGroup?.id === group.id ? "active" : ""} onClick={() => props.setActiveTargetGroupId(group.id)}>
                  <strong>{group.name}</strong>
                  <span>{group.profile} / {targets.length} targets</span>
                </button>
              );
            })}
          </div>
        )}

        <h4>{t.targetHistory}</h4>
        {props.targetHistory.length === 0 ? <p className="muted">{t.noTargetHistory}</p> : (
          <div className="list">
            {props.targetHistory.map((item) => (
              <article key={item.id} className="row stacked">
                <div>
                  <strong>{item.destinationName}</strong>
                  <p>{item.sourceName} / {item.profile}</p>
                  <span>{item.destinationPath}</span>
                </div>
                <span>{t.lastApplied}: {formatDate(item.lastAppliedAt)}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h3>{t.destination}</h3>
        <label>{t.source}</label>
        <div className="source-summary">
          <HardDrive size={16} />
          <div>
            <strong>{basename(props.snapshot.root)}</strong>
            <span>{props.snapshot.root}</span>
          </div>
        </div>
        {!activeGroup ? (
          <p className="muted">{t.noTargetGroups}</p>
        ) : (
          <>
            <div className="target-group-header">
              <div>
                <strong>{activeGroup.name}</strong>
                <p className="muted">{t.installPreview(selectedSkills, activeGroup.profile)}</p>
              </div>
              <div className="actions">
                <button onClick={() => setEditingGroup(activeGroup)}><Pencil size={16} /> {t.edit}</button>
                <button onClick={() => deleteGroup(activeGroup.id)}><Trash2 size={16} /> {t.deleteTargetGroup}</button>
              </div>
            </div>
            <label>{t.selectedTargets}</label>
            {selectedTargets.length === 0 ? <p className="muted">{t.noSelectedTargets}</p> : (
              <div className="list compact">
                {selectedTargets.map((target) => (
                  <article key={`${target.kind}:${target.id}`} className="row stacked">
                    <div>
                      <strong>{target.name}</strong>
                      <span>{target.path}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="actions">
              <button onClick={() => props.checkTargetGroupDrift(activeGroup)} disabled={selectedTargets.length === 0}>{t.checkDrift}</button>
              <button className="primary" onClick={() => props.applyTargetGroup(activeGroup)} disabled={selectedTargets.length === 0}>{t.apply}</button>
            </div>
            {latestApplySummary && <p className="muted">{t.copiedSkipped(latestApplySummary.copied, latestApplySummary.skipped, latestApplySummary.copiedAssets, latestApplySummary.skippedAssets)}</p>}
          </>
        )}

        <h4>{t.drift}</h4>
        {props.driftReports.length === 0 ? <p className="muted">{t.driftEmpty}</p> : (
          <div className="list">
            {props.driftReports.map((report) => (
              <article key={report.targetDir} className="row stacked">
                <div>
                  <strong>{report.targetDir}</strong>
                  <p>{report.items.filter((item) => item.status !== "same").length} changed / {report.items.length} checked</p>
                </div>
                <button onClick={() => props.openDriftDiff(report)}><ExternalLink size={16} /> {t.viewDiff}</button>
              </article>
            ))}
          </div>
        )}
      </section>
      {editingGroup && (
        <ApplyTargetDialog
          t={t}
          group={editingGroup}
          profileOptions={props.profileOptions}
          defaultTargets={props.defaultTargets}
          chooseProjectTarget={props.chooseProjectTarget}
          onSave={upsertGroup}
          onClose={() => setEditingGroup(undefined)}
        />
      )}
    </div>
  );
}

interface ResolvedApplyTarget {
  kind: "agent" | "project";
  id: string;
  name: string;
  path: string;
}

function ApplyTargetDialog(props: {
  t: Dictionary;
  group: ApplyTargetGroup;
  profileOptions: string[];
  defaultTargets: DefaultTarget[];
  chooseProjectTarget: () => Promise<string | undefined>;
  onSave: (group: ApplyTargetGroup) => void;
  onClose: () => void;
}) {
  const { t } = props;
  const [draft, setDraft] = useState(props.group);

  useEffect(() => setDraft(props.group), [props.group]);

  function toggleAgent(targetId: string) {
    const agentTargetIds = draft.agentTargetIds.includes(targetId)
      ? draft.agentTargetIds.filter((item) => item !== targetId)
      : [...draft.agentTargetIds, targetId];
    setDraft({ ...draft, agentTargetIds });
  }

  async function addProjectTarget() {
    const selected = await props.chooseProjectTarget();
    if (!selected || draft.projectTargetDirs.includes(selected)) return;
    setDraft({ ...draft, projectTargetDirs: [...draft.projectTargetDirs, selected] });
  }

  function removeProjectTarget(targetDir: string) {
    setDraft({ ...draft, projectTargetDirs: draft.projectTargetDirs.filter((item) => item !== targetDir) });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={props.onClose}>
      <section className="modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{t.editTargetGroup}</h3>
            <p>{t.applyHelp}</p>
          </div>
          <button className="icon-button light" onClick={props.onClose}>x</button>
        </div>
        <label>{t.groupName}</label>
        <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        <label>{t.profile}</label>
        <select value={draft.profile} onChange={(event) => setDraft({ ...draft, profile: event.target.value })}>
          {props.profileOptions.map((name) => <option key={name}>{name}</option>)}
        </select>
        <label>{t.agentTargets}</label>
        <div className="check-list">
          {props.defaultTargets.map((target) => (
            <label key={target.id} className="check-row">
              <input type="checkbox" checked={draft.agentTargetIds.includes(target.id)} onChange={() => toggleAgent(target.id)} />
              <span>{target.name}</span>
            </label>
          ))}
        </div>
        <label>{t.projectTargets}</label>
        <div className="actions">
          <button onClick={addProjectTarget}><FolderOpen size={16} /> {t.addProjectTarget}</button>
        </div>
        {draft.projectTargetDirs.length === 0 ? <p className="muted">{t.noSelectedTargets}</p> : (
          <div className="list compact">
            {draft.projectTargetDirs.map((targetDir) => (
              <article key={targetDir} className="row">
                <span>{targetDir}</span>
                <button onClick={() => removeProjectTarget(targetDir)}><Trash2 size={16} /> {t.remove}</button>
              </article>
            ))}
          </div>
        )}
        <div className="actions modal-actions">
          <button onClick={props.onClose}>{t.cancel}</button>
          <button className="primary" onClick={() => props.onSave({ ...draft, name: draft.name.trim() || t.unnamedProfile })}>{t.saveTargetGroup}</button>
        </div>
      </section>
    </div>
  );
}

function ShareTargetDialog(props: {
  t: Dictionary;
  group: ShareTargetGroup;
  profileOptions: string[];
  onSave: (group: ShareTargetGroup) => void;
  onClose: () => void;
}) {
  const { t } = props;
  const [draft, setDraft] = useState(props.group);

  useEffect(() => setDraft(props.group), [props.group]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={props.onClose}>
      <section className="modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{t.editShareTarget}</h3>
            <p>{t.publishHelp}</p>
          </div>
          <button className="icon-button light" onClick={props.onClose}>x</button>
        </div>
        <label>{t.groupName}</label>
        <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        <label>{t.profile}</label>
        <select value={draft.profile} onChange={(event) => setDraft({ ...draft, profile: event.target.value })}>
          {props.profileOptions.map((name) => <option key={name}>{name}</option>)}
        </select>
        <label>{t.remoteRepository}</label>
        <input value={draft.remoteUrl} placeholder="owner/repo or github.com/owner/repo/tree/main/path" onChange={(event) => setDraft({ ...draft, remoteUrl: event.target.value })} />
        <label>{t.shareTargetMode}</label>
        <div className="segmented two">
          <button className={draft.targetMode === "direct" ? "active" : ""} onClick={() => setDraft({ ...draft, targetMode: "direct" })}>{t.shareDirectPath}</button>
          <button className={draft.targetMode === "namedProject" ? "active" : ""} onClick={() => setDraft({ ...draft, targetMode: "namedProject" })}>{t.shareNamedProject}</button>
        </div>
        {draft.targetMode === "namedProject" && (
          <>
            <label>{t.shareProjectName}</label>
            <input value={draft.projectName ?? ""} onChange={(event) => setDraft({ ...draft, projectName: event.target.value })} />
          </>
        )}
        <p className="muted">{draft.targetMode === "namedProject" ? t.shareNamedProjectHelp : t.shareDirectPathHelp}</p>
        <div className="actions modal-actions">
          <button onClick={props.onClose}>{t.cancel}</button>
          <button className="primary" onClick={() => props.onSave({
            ...draft,
            name: draft.name.trim() || t.unnamedProfile,
            remoteUrl: draft.remoteUrl.trim(),
            projectName: draft.projectName?.trim() || undefined
          })}>{t.saveShareTarget}</button>
        </div>
      </section>
    </div>
  );
}

function createApplyTargetGroup(profile: string, agentTargetId?: string): ApplyTargetGroup {
  return {
    id: createId("apply"),
    name: "Target group",
    profile,
    agentTargetIds: agentTargetId ? [agentTargetId] : [],
    projectTargetDirs: []
  };
}

function createShareTargetGroup(snapshot: WorkspaceSnapshot, profile: string): ShareTargetGroup {
  return {
    id: createId("share"),
    name: basename(snapshot.root),
    profile,
    remoteUrl: snapshot.config.teamRepo ?? "",
    targetMode: snapshot.config.shareTargetMode ?? "direct",
    projectName: snapshot.config.shareProjectName ?? basename(snapshot.root)
  };
}

function resolveApplyTargetEntries(group: ApplyTargetGroup, defaultTargets: DefaultTarget[]): ResolvedApplyTarget[] {
  const agentTargets = group.agentTargetIds
    .map((id) => defaultTargets.find((target) => target.id === id))
    .filter((target): target is DefaultTarget => Boolean(target))
    .map((target) => ({ kind: "agent" as const, id: target.id, name: target.name, path: target.path }));
  const projectTargets = group.projectTargetDirs
    .filter(Boolean)
    .map((targetDir) => ({ kind: "project" as const, id: targetDir, name: basename(targetDir), path: targetDir }));
  const seen = new Set<string>();
  return [...agentTargets, ...projectTargets].filter((target) => {
    const key = target.path;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function selectedSkillCount(snapshot: WorkspaceSnapshot, profileName: string): number {
  const activeProfile = snapshot.config.profiles.find((item) => item.name === profileName);
  if (!activeProfile) return 0;
  if (activeProfile.skills.includes("*")) return snapshot.skills.length;
  return snapshot.skills.filter((skill) => activeProfile.skills.includes(skill.name)).length;
}

function summarizeApplyResults(results: ApplyProfileResult[]) {
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

function Publish(props: {
  t: Dictionary;
  snapshot: WorkspaceSnapshot;
  shareResult?: ShareResult;
  isSharing: boolean;
  shareProgress?: string;
  profileOptions: string[];
  targetGroups: ShareTargetGroup[];
  activeTargetGroup?: ShareTargetGroup;
  setActiveTargetGroupId: (value: string) => void;
  saveTargetGroups: (groups: ShareTargetGroup[], selectedId: string) => void;
  shareProject: (group: ShareTargetGroup, message: string) => void;
}) {
  const { t } = props;
  const [message, setMessage] = useState("Share SkillOps project");
  const [editingGroup, setEditingGroup] = useState<ShareTargetGroup | undefined>();
  const activeGroup = props.activeTargetGroup;
  const selectedSkills = activeGroup ? selectedSkillCount(props.snapshot, activeGroup.profile) : 0;

  function upsertGroup(group: ShareTargetGroup) {
    const existing = props.targetGroups.some((item) => item.id === group.id);
    const next = existing ? props.targetGroups.map((item) => item.id === group.id ? group : item) : [...props.targetGroups, group];
    props.saveTargetGroups(next, group.id);
    setEditingGroup(undefined);
  }

  function deleteGroup(groupId: string) {
    const next = props.targetGroups.filter((item) => item.id !== groupId);
    props.saveTargetGroups(next, next[0]?.id ?? "");
  }

  return (
    <div className="grid two">
      <section className="panel">
        <h3>{t.shareTargets}</h3>
        <p className="muted">{t.publishHelp}</p>
        <div className="actions">
          <button className="primary" onClick={() => setEditingGroup(createShareTargetGroup(props.snapshot, props.profileOptions[0] ?? "default"))}><Plus size={16} /> {t.newShareTarget}</button>
        </div>
        {props.targetGroups.length === 0 ? <p className="muted">{t.noShareTargets}</p> : (
          <div className="profile-list">
            {props.targetGroups.map((group) => (
              <button key={group.id} className={activeGroup?.id === group.id ? "active" : ""} onClick={() => props.setActiveTargetGroupId(group.id)}>
                <strong>{group.name}</strong>
                <span>{group.profile} / {group.remoteUrl}</span>
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="panel">
        <h3>{t.shareOutput}</h3>
        {!activeGroup ? (
          <p className="muted">{t.noShareTargets}</p>
        ) : (
          <>
            <div className="target-group-header">
              <div>
                <strong>{activeGroup.name}</strong>
                <p className="muted">{t.installPreview(selectedSkills, activeGroup.profile)}</p>
              </div>
              <div className="actions">
                <button onClick={() => setEditingGroup(activeGroup)}><Pencil size={16} /> {t.edit}</button>
                <button onClick={() => deleteGroup(activeGroup.id)}><Trash2 size={16} /> {t.deleteShareTarget}</button>
              </div>
            </div>
            <label>{t.remoteRepository}</label>
            <div className="pathbox light">{activeGroup.remoteUrl}</div>
            <label>{t.shareTargetMode}</label>
            <div className="pathbox light">{activeGroup.targetMode === "namedProject" ? `${t.shareNamedProject}: ${activeGroup.projectName ?? ""}` : t.shareDirectPath}</div>
          </>
        )}
        <label>{t.commitMessage}</label>
        <input value={message} onChange={(event) => setMessage(event.target.value)} />
        <div className="actions">
          <button className="primary" onClick={() => activeGroup && props.shareProject(activeGroup, message)} disabled={props.isSharing || !activeGroup || !activeGroup.remoteUrl.trim() || (activeGroup.targetMode === "namedProject" && !activeGroup.projectName?.trim())}>{props.isSharing ? t.sharing : t.shareNow}</button>
        </div>
        {props.shareProgress && <p className="muted">{props.shareProgress}</p>}
        {props.shareResult && (
          <>
            <pre>{props.shareResult.messages.join("\n\n")}</pre>
          </>
        )}
      </section>
      {editingGroup && (
        <ShareTargetDialog
          t={t}
          group={editingGroup}
          profileOptions={props.profileOptions}
          onSave={upsertGroup}
          onClose={() => setEditingGroup(undefined)}
        />
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: "good" | "warn" | "bad" }) {
  return (
    <section className={`metric ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
