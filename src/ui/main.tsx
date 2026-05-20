import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, CheckCircle2, Download, ExternalLink, FolderOpen, GitBranch, HardDrive, PackageCheck, Play, RefreshCw, Rocket, Settings, ShieldCheck, Trash2 } from "lucide-react";
import type { ApplyProfileResult, DriftReport, PublishPlan, ShareResult, ShareTargetMode, SkillOpsConfig, SkillOpsProfile, WorkspaceSnapshot } from "../shared/types";
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
      downloadSource: (remoteUrl: string) => Promise<string>;
      createPublishPlan: (root: string, visibility: "private" | "public") => Promise<PublishPlan>;
      shareProject: (root: string, remoteUrl: string, visibility: "private" | "public", message: string, targetMode: ShareTargetMode, projectName: string) => Promise<ShareResult>;
      applyProfile: (root: string, profile: string, targetDir: string) => Promise<ApplyProfileResult>;
      driftReport: (root: string, profile: string, targetDir: string) => Promise<DriftReport>;
      openDriftDiff: (report: DriftReport) => Promise<void>;
    };
  }
}

type Tab = "overview" | "skills" | "profiles" | "destinations" | "share" | "audit";
type DestinationMode = "agent" | "project" | "custom";

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
  destinationMode?: DestinationMode;
  selectedAgentTarget?: string;
  targetDir?: string;
  customTargetDir?: string;
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
  const [targetDir, setTargetDir] = useState(".skillops/skills");
  const [profile, setProfile] = useState("default");
  const [publishPlan, setPublishPlan] = useState<PublishPlan | undefined>();
  const [shareResult, setShareResult] = useState<ShareResult | undefined>();
  const [drift, setDrift] = useState<DriftReport | undefined>();
  const [applyResult, setApplyResult] = useState<ApplyProfileResult | undefined>();
  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspace[]>(loadJson<RecentWorkspace[]>(RECENT_WORKSPACES_KEY, []));
  const [targetHistory, setTargetHistory] = useState<TargetRecord[]>(loadJson<TargetRecord[]>(TARGET_HISTORY_KEY, []));
  const [projectStates, setProjectStates] = useState<Record<string, ProjectUiState>>(loadJson<Record<string, ProjectUiState>>(PROJECT_STATE_KEY, {}));
  const [defaultTargets, setDefaultTargets] = useState<DefaultTarget[]>([]);
  const [destinationMode, setDestinationMode] = useState<DestinationMode>("agent");
  const [selectedAgentTarget, setSelectedAgentTarget] = useState("codex");
  const [customTargetDir, setCustomTargetDir] = useState("");
  const [sharedSourceUrl, setSharedSourceUrl] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const activeProject = recentWorkspaces.find((item) => item.path === root);
  const isPendingProject = activeProject?.status === "downloading" || activeProject?.status === "error";

  const criticalCount = snapshot?.audit.findings.filter((item) => item.severity === "critical").length ?? 0;
  const warningCount = snapshot?.audit.findings.filter((item) => item.severity === "warning").length ?? 0;
  const profileOptions = snapshot?.config.profiles.map((item) => item.name) ?? ["default"];
  const selectedSkillsCount = useMemo(() => {
    if (!snapshot) return 0;
    const activeProfile = snapshot.config.profiles.find((item) => item.name === profile);
    if (!activeProfile) return 0;
    if (activeProfile.skills.includes("*")) return snapshot.skills.length;
    return snapshot.skills.filter((skill) => activeProfile.skills.includes(skill.name)).length;
  }, [profile, snapshot]);
  const activeAgentTarget = defaultTargets.find((item) => item.id === selectedAgentTarget) ?? defaultTargets[0];
  const resolvedTargetDir = destinationMode === "agent" ? activeAgentTarget?.path ?? "" : destinationMode === "project" ? targetDir : customTargetDir;
  const resolvedTargetName = destinationMode === "agent" ? activeAgentTarget?.name ?? "Agent" : destinationMode === "project" ? t.projectTarget : t.customTarget;
  const projectTargetHistory = useMemo(() => targetHistory.filter((item) => item.sourcePath === root), [root, targetHistory]);

  useEffect(() => {
    if (!window.skillops) return;
    void window.skillops.getDefaultTargets().then((targets) => {
      setDefaultTargets(targets);
      setSelectedAgentTarget((current) => current || (targets[0]?.id ?? "codex"));
    }).catch((error) => setStatus(t.errorStatus(errorMessage(error))));
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

  function setProjectDestinationMode(next: DestinationMode) {
    setDestinationMode(next);
    if (root) rememberProjectState(root, { destinationMode: next });
  }

  function setProjectSelectedAgentTarget(next: string) {
    setSelectedAgentTarget(next);
    if (root) rememberProjectState(root, { selectedAgentTarget: next });
  }

  function setProjectTargetDir(next: string) {
    setTargetDir(next);
    if (root) rememberProjectState(root, { targetDir: next });
  }

  function setProjectCustomTargetDir(next: string) {
    setCustomTargetDir(next);
    if (root) rememberProjectState(root, { customTargetDir: next });
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
      await openWorkspace(selected);
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

  const saveShareSettings = useCallback(async (settings: { remoteUrl?: string; targetMode?: ShareTargetMode | ""; projectName?: string }) => {
    if (!root || !snapshot || !window.skillops) return;
    try {
      const result = await window.skillops.saveConfig(root, {
        ...snapshot.config,
        teamRepo: settings.remoteUrl !== undefined ? settings.remoteUrl.trim() || undefined : snapshot.config.teamRepo,
        shareTargetMode: settings.targetMode !== undefined ? settings.targetMode || undefined : snapshot.config.shareTargetMode,
        shareProjectName: settings.projectName !== undefined ? settings.projectName.trim() || undefined : snapshot.config.shareProjectName
      });
      setSnapshot(result);
      rememberWorkspace(result, { moveToTop: false });
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }, [root, snapshot, t]);

  async function planPublish(visibility: "private" | "public") {
    if (!root) return;
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      setPublishPlan(await window.skillops.createPublishPlan(root, visibility));
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function shareProject(remoteUrl: string, visibility: "private" | "public", message: string, targetMode: ShareTargetMode, projectName: string) {
    if (!root) return;
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      if (snapshot) {
        const saved = await window.skillops.saveConfig(root, {
          ...snapshot.config,
          teamRepo: remoteUrl.trim() || undefined,
          shareTargetMode: targetMode,
          shareProjectName: projectName.trim() || undefined
        });
        applySnapshot(saved, profile);
      }
      setStatus(t.sharing);
      const result = await window.skillops.shareProject(root, remoteUrl, visibility, message, targetMode, projectName);
      setShareResult(result);
      setStatus(t.shareComplete(result.branch));
      await scan(root);
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function runDrift() {
    if (!root) return;
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      setDrift(await window.skillops.driftReport(root, profile, targetDir));
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function applySelectedProfile() {
    if (!root) return;
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      setApplyResult(await window.skillops.applyProfile(root, profile, targetDir));
      await runDrift();
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
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

  async function chooseProjectTarget() {
    if (!window.skillops) {
      setStatus(t.desktopRequired);
      return;
    }
    const selected = await window.skillops.chooseWorkspace();
    if (selected) {
      setProjectDestinationMode("project");
      setProjectTargetDir(selected);
    }
  }

  async function applyToResolvedTarget() {
    if (!root || !resolvedTargetDir) return;
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      const result = await window.skillops.applyProfile(root, profile, resolvedTargetDir);
      setApplyResult(result);
      const report = await window.skillops.driftReport(root, profile, resolvedTargetDir);
      setDrift(report);
      rememberTarget(resolvedTargetDir, resolvedTargetName);
      setStatus(t.copiedSkipped(result.copied.length, result.skipped.length, result.copiedAssets?.length, result.skippedAssets?.length));
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function checkResolvedDrift() {
    if (!root || !resolvedTargetDir) return;
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      setDrift(await window.skillops.driftReport(root, profile, resolvedTargetDir));
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
    setDestinationMode(savedState?.destinationMode ?? "agent");
    setSelectedAgentTarget(savedState?.selectedAgentTarget ?? defaultTargets[0]?.id ?? "codex");
    setTargetDir(savedState?.targetDir ?? ".skillops/skills");
    setCustomTargetDir(savedState?.customTargetDir ?? "");
    setPublishPlan(undefined);
    setDrift(undefined);
    setApplyResult(undefined);
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

  function rememberTarget(destinationPath: string, destinationName: string) {
    const sourceName = basename(root);
    const record: TargetRecord = {
      id: `${root}::${profile}::${destinationPath}`,
      sourcePath: root,
      sourceName,
      profile,
      destinationName,
      destinationPath,
      lastAppliedAt: new Date().toISOString()
    };
    const otherProjects = targetHistory.filter((item) => item.sourcePath !== root);
    const currentProject = [record, ...targetHistory.filter((item) => item.sourcePath === root && item.id !== record.id)].slice(0, 10);
    const next = [...currentProject, ...otherProjects];
    setTargetHistory(next);
    window.localStorage.setItem(TARGET_HISTORY_KEY, JSON.stringify(next));
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
                setProfile={setProjectProfile}
                profileOptions={profileOptions}
                selectedSkillsCount={selectedSkillsCount}
                defaultTargets={defaultTargets}
                selectedAgentTarget={selectedAgentTarget}
                setSelectedAgentTarget={setProjectSelectedAgentTarget}
                destinationMode={destinationMode}
                setDestinationMode={setProjectDestinationMode}
                targetDir={targetDir}
                setTargetDir={setProjectTargetDir}
                customTargetDir={customTargetDir}
                setCustomTargetDir={setProjectCustomTargetDir}
                chooseProjectTarget={chooseProjectTarget}
                resolvedTargetDir={resolvedTargetDir}
                drift={drift}
                applyResult={applyResult}
                targetHistory={projectTargetHistory}
                checkResolvedDrift={checkResolvedDrift}
                applyToResolvedTarget={applyToResolvedTarget}
                openDriftDiff={openDriftDiff}
              />
            )}
            {tab === "share" && (
              <Publish
                t={t}
                snapshot={snapshot}
                plan={publishPlan}
                shareResult={shareResult}
                planPublish={planPublish}
                shareProject={shareProject}
                saveShareSettings={saveShareSettings}
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
  setProfile: (value: string) => void;
  profileOptions: string[];
  selectedSkillsCount: number;
  defaultTargets: DefaultTarget[];
  selectedAgentTarget: string;
  setSelectedAgentTarget: (value: string) => void;
  destinationMode: DestinationMode;
  setDestinationMode: (value: DestinationMode) => void;
  targetDir: string;
  setTargetDir: (value: string) => void;
  customTargetDir: string;
  setCustomTargetDir: (value: string) => void;
  chooseProjectTarget: () => void;
  resolvedTargetDir: string;
  drift?: DriftReport;
  applyResult?: ApplyProfileResult;
  targetHistory: TargetRecord[];
  checkResolvedDrift: () => void;
  applyToResolvedTarget: () => void;
  openDriftDiff: (report: DriftReport) => void;
}) {
  const { t } = props;
  return (
    <div className="grid two">
      <section className="panel">
        <h3>{t.applySkills}</h3>
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

        <h4>{t.drift}</h4>
        {!props.drift ? <p className="muted">{t.driftEmpty}</p> : (
          <>
            <div className="drift-toolbar">
              <button onClick={() => props.openDriftDiff(props.drift!)}><ExternalLink size={16} /> {t.viewDiff}</button>
            </div>
            <div className="list">
              {props.drift.items.map((item) => (
                <article key={`${item.kind ?? "skill"}:${item.skill}`} className="row">
                  <div>
                    <strong>{item.skill}</strong>
                    <p>{item.kind ?? "skill"} · {item.summary ? `${item.summary.missing} missing / ${item.summary.changed} changed / ${item.summary.extra} extra` : item.sourcePath}</p>
                  </div>
                  <span className={item.status === "same" ? "badge good" : "badge warn"}>{item.status}</span>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <h3>{t.destination}</h3>
        <p className="muted">{t.applyHelp}</p>
        <label>{t.source}</label>
        <div className="source-summary">
          <HardDrive size={16} />
          <div>
            <strong>{basename(props.snapshot.root)}</strong>
            <span>{props.snapshot.root}</span>
          </div>
        </div>
        <label>{t.profile}</label>
        <select value={props.profile} onChange={(event) => props.setProfile(event.target.value)}>
          {props.profileOptions.map((name) => <option key={name}>{name}</option>)}
        </select>
        <p className="muted">{t.installPreview(props.selectedSkillsCount, props.profile)}</p>

        <label>{t.destination}</label>
        <div className="segmented">
          <button className={props.destinationMode === "agent" ? "active" : ""} onClick={() => props.setDestinationMode("agent")}>{t.agentTargets}</button>
          <button className={props.destinationMode === "project" ? "active" : ""} onClick={() => props.setDestinationMode("project")}>{t.projectTarget}</button>
          <button className={props.destinationMode === "custom" ? "active" : ""} onClick={() => props.setDestinationMode("custom")}>{t.customTarget}</button>
        </div>

        {props.destinationMode === "agent" && (
          <>
            <label>{t.agentTargets}</label>
            <select value={props.selectedAgentTarget} onChange={(event) => props.setSelectedAgentTarget(event.target.value)}>
              {props.defaultTargets.map((target) => <option key={target.id} value={target.id}>{target.name} - {target.path}</option>)}
            </select>
          </>
        )}

        {props.destinationMode === "project" && (
          <>
            <label>{t.projectTarget}</label>
            <div className="inline-field">
              <input value={props.targetDir} onChange={(event) => props.setTargetDir(event.target.value)} />
              <button onClick={props.chooseProjectTarget}><FolderOpen size={16} /> {t.selectProject}</button>
            </div>
          </>
        )}

        {props.destinationMode === "custom" && (
          <>
            <label>{t.customTarget}</label>
            <input value={props.customTargetDir} onChange={(event) => props.setCustomTargetDir(event.target.value)} />
          </>
        )}

        <label>{t.targetDirectory}</label>
        <div className="pathbox light">{props.resolvedTargetDir || t.noWorkspace}</div>
        <div className="actions">
          <button onClick={props.checkResolvedDrift} disabled={!props.resolvedTargetDir}>{t.checkDrift}</button>
          <button className="primary" onClick={props.applyToResolvedTarget} disabled={!props.resolvedTargetDir}>{t.apply}</button>
        </div>
        {props.applyResult && (
          <p className="muted">
            {t.copiedSkipped(
              props.applyResult.copied.length,
              props.applyResult.skipped.length,
              props.applyResult.copiedAssets?.length,
              props.applyResult.skippedAssets?.length
            )}
          </p>
        )}
      </section>
    </div>
  );
}

function Publish(props: {
  t: Dictionary;
  snapshot: WorkspaceSnapshot;
  plan?: PublishPlan;
  shareResult?: ShareResult;
  planPublish: (visibility: "private" | "public") => void;
  shareProject: (remoteUrl: string, visibility: "private" | "public", message: string, targetMode: ShareTargetMode, projectName: string) => void;
  saveShareSettings: (settings: { remoteUrl?: string; targetMode?: ShareTargetMode | ""; projectName?: string }) => void;
}) {
  const { t } = props;
  const [remoteUrl, setRemoteUrl] = useState(props.snapshot.config.teamRepo ?? "");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [message, setMessage] = useState("Share SkillOps project");
  const [targetMode, setTargetMode] = useState<ShareTargetMode | "">(props.snapshot.config.shareTargetMode ?? "");
  const [projectName, setProjectName] = useState(props.snapshot.config.shareProjectName ?? basename(props.snapshot.root));

  useEffect(() => {
    setRemoteUrl(props.snapshot.config.teamRepo ?? "");
    setTargetMode(props.snapshot.config.shareTargetMode ?? "");
    setProjectName(props.snapshot.config.shareProjectName ?? basename(props.snapshot.root));
  }, [props.snapshot.root, props.snapshot.config.teamRepo, props.snapshot.config.shareTargetMode, props.snapshot.config.shareProjectName]);

  useEffect(() => {
    const trimmed = remoteUrl.trim();
    const trimmedProjectName = projectName.trim();
    if (
      trimmed === (props.snapshot.config.teamRepo ?? "") &&
      trimmedProjectName === (props.snapshot.config.shareProjectName ?? "")
    ) return;
    const timer = window.setTimeout(() => props.saveShareSettings({ remoteUrl: trimmed, projectName: trimmedProjectName }), 600);
    return () => window.clearTimeout(timer);
  }, [remoteUrl, projectName, props.snapshot.config.teamRepo, props.snapshot.config.shareProjectName, props.saveShareSettings]);

  function chooseTargetMode(next: ShareTargetMode) {
    setTargetMode(next);
    props.saveShareSettings({ remoteUrl: remoteUrl.trim(), targetMode: next, projectName: projectName.trim() });
  }

  return (
    <div className="grid two">
      <section className="panel">
        <h3>{t.publishPlan}</h3>
        <p className="muted">{t.publishHelp}</p>
        <label>{t.remoteRepository}</label>
        <input value={remoteUrl} placeholder="owner/repo or github.com/owner/repo/tree/main/path" onChange={(event) => setRemoteUrl(event.target.value)} />
        <label>{t.shareTargetMode}</label>
        <div className="segmented two">
          <button className={targetMode === "direct" ? "active" : ""} onClick={() => chooseTargetMode("direct")}>{t.shareDirectPath}</button>
          <button className={targetMode === "namedProject" ? "active" : ""} onClick={() => chooseTargetMode("namedProject")}>{t.shareNamedProject}</button>
        </div>
        {targetMode === "namedProject" && (
          <>
            <label>{t.shareProjectName}</label>
            <input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
          </>
        )}
        <p className="muted">{targetMode === "namedProject" ? t.shareNamedProjectHelp : targetMode === "direct" ? t.shareDirectPathHelp : t.shareTargetModeEmpty}</p>
        <label>{t.commitMessage}</label>
        <input value={message} onChange={(event) => setMessage(event.target.value)} />
        <div className="actions">
          <button className={visibility === "private" ? "active" : ""} onClick={() => {
            setVisibility("private");
            props.planPublish("private");
          }}>{t.privateTeamRepo}</button>
          <button className={visibility === "public" ? "active" : ""} onClick={() => {
            setVisibility("public");
            props.planPublish("public");
          }}>{t.publicRelease}</button>
          <button className="primary" onClick={() => {
            if (!targetMode) return;
            props.shareProject(remoteUrl, visibility, message, targetMode, projectName);
          }} disabled={!remoteUrl.trim() || !targetMode || (targetMode === "namedProject" && !projectName.trim())}>{t.shareNow}</button>
        </div>
      </section>
      <section className="panel">
        <h3>{t.planOutput}</h3>
        {!props.plan ? <p className="muted">{t.noPublishPlan}</p> : (
          <>
            <h4>{t.desktopUseFlow}</h4>
            <ol>
              {t.useFlowSteps.map((item) => <li key={item}>{item}</li>)}
            </ol>
            <h4>{t.installCommands}</h4>
            {props.plan.installCommands.map((command) => <pre key={command}>{command}</pre>)}
            <h4>{t.checklist}</h4>
            <ul>
              {props.plan.checklist.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </>
        )}
        {props.shareResult && (
          <>
            <h4>{t.shareOutput}</h4>
            <pre>{props.shareResult.messages.join("\n\n")}</pre>
          </>
        )}
      </section>
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
