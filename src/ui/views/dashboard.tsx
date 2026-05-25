import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, FileText, Folder, RefreshCw, Save } from "lucide-react";
import type { SkillFileDocument, SkillFileEntry, SkillSummary, SourceUpdateStatus, TargetRecord, WorkspaceSnapshot } from "../../shared/types";
import type { Dictionary } from "../i18n";
import type { Tab } from "../types";
import { formatDate, formatDuration } from "../utils";
import { Metric } from "../components/shell";

export function Overview(props: {
  t: Dictionary;
  snapshot: WorkspaceSnapshot;
  criticalCount: number;
  warningCount: number;
  targetHistory: TargetRecord[];
  setTab: (value: Tab) => void;
  setStatus: (value: string) => void;
  onSourceUpdated: () => Promise<void>;
  isGithubSource: boolean;
}) {
  const { t, snapshot, criticalCount, warningCount } = props;
  const projectTargets = props.targetHistory.filter((item) => item.sourcePath === snapshot.root);
  const [sourceStatus, setSourceStatus] = useState<SourceUpdateStatus>();
  const [sourceError, setSourceError] = useState("");
  const [isCheckingSource, setIsCheckingSource] = useState(false);
  const [isUpdatingSource, setIsUpdatingSource] = useState(false);
  const canCheckSource = props.isGithubSource && Boolean(snapshot.localGit?.remotes.length);

  async function checkSourceUpdates() {
    if (!window.skillops) return;
    setIsCheckingSource(true);
    setSourceError("");
    props.setStatus(t.checkingSourceUpdates);
    try {
      const nextStatus = await window.skillops.sourceUpdateStatus(snapshot.root);
      setSourceStatus(nextStatus);
      const message = sourceStatusMessage(t, nextStatus);
      props.setStatus(message);
    } catch (error) {
      const message = errorMessage(error);
      setSourceError(message);
      props.setStatus(t.errorStatus(message));
    } finally {
      setIsCheckingSource(false);
    }
  }

  async function updateSource() {
    if (!window.skillops || !sourceStatus?.canUpdate) return;
    if (!window.confirm(t.confirmSourceUpdate(sourceStatus.behind))) return;
    setIsUpdatingSource(true);
    setSourceError("");
    props.setStatus(t.updatingSource);
    try {
      const result = await window.skillops.updateSource(snapshot.root, true);
      setSourceStatus(result.after);
      await props.onSourceUpdated();
      props.setStatus(t.sourceUpdated);
    } catch (error) {
      const message = errorMessage(error);
      setSourceError(message);
      props.setStatus(t.errorStatus(message));
    } finally {
      setIsUpdatingSource(false);
    }
  }

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
      {props.isGithubSource && <section className="panel wide source-status-panel">
        <div className="panel-heading">
          <div>
            <h3>{t.sourceStatusTitle}</h3>
            <p className="muted">{canCheckSource ? t.sourceStatusHelp : t.sourceStatusUnavailable}</p>
          </div>
          <div className="actions">
            <button onClick={checkSourceUpdates} disabled={!canCheckSource || isCheckingSource || isUpdatingSource}>
              <RefreshCw size={16} /> {isCheckingSource ? t.checkingSourceUpdates : t.checkSourceUpdates}
            </button>
            {sourceStatus?.canUpdate && (
              <button className="primary" onClick={updateSource} disabled={isCheckingSource || isUpdatingSource}>
                <CheckCircle2 size={16} /> {isUpdatingSource ? t.updatingSource : t.updateSource}
              </button>
            )}
          </div>
        </div>
        {!canCheckSource ? null : sourceError ? (
          <p className="muted">{t.errorStatus(sourceError)}</p>
        ) : sourceStatus ? (
          <div className="source-status-grid">
            <Metric label={t.sourceAheadBehind(sourceStatus.ahead, sourceStatus.behind)} value={sourceStatus.behind > 0 ? sourceStatus.behind : "0"} tone={sourceStatus.canUpdate ? "warn" : sourceStatus.behind === 0 && sourceStatus.ahead === 0 ? "good" : undefined} />
            <div className="source-status-details">
              <strong>{sourceStatusMessage(t, sourceStatus)}</strong>
              <p>{sourceStatus.branch && sourceStatus.upstream ? t.sourceBranch(sourceStatus.branch, sourceStatus.upstream) : sourceStatus.remoteUrl ?? snapshot.localGit?.remotes[0]?.fetchUrl}</p>
              <span>{sourceStatus.previousFetchAgeMs !== undefined ? t.sourceLastFetch(formatDuration(sourceStatus.previousFetchAgeMs)) : t.sourceNeverFetched}</span>
              <span>{t.sourceCheckedAt(formatDate(sourceStatus.checkedAt))}</span>
              {!sourceStatus.canUpdate && (sourceStatus.ahead > 0 || sourceStatus.dirty) && <span>{t.sourceCannotUpdate}</span>}
            </div>
          </div>
        ) : (
          <p className="muted">{t.sourceStatusIdle}</p>
        )}
      </section>}
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

function sourceStatusMessage(t: Dictionary, status: SourceUpdateStatus): string {
  if (status.canUpdate) return t.sourceCanUpdate(status.behind);
  if (status.behind === 0 && status.ahead === 0 && !status.dirty) return t.sourceUpToDate;
  return t.sourceCannotUpdate;
}

export function SkillsList({ t, snapshot, profile, setProfile }: {
  t: Dictionary;
  snapshot: WorkspaceSnapshot;
  profile: string;
  setProfile: (value: string) => void;
}) {
  const hasAssets = snapshot.assets.length > 0;
  const [files, setFiles] = useState<SkillFileEntry[]>([]);
  const [activeFilePath, setActiveFilePath] = useState("");
  const [document, setDocument] = useState<SkillFileDocument>();
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState(t.selectSkillFile);
  const [isBusy, setIsBusy] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set());
  const treeRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const sourceRootPath = useMemo(() => joinLocalPath(snapshot.root, snapshot.config.sourceDir), [snapshot.config.sourceDir, snapshot.root]);
  const activeProfile = useMemo(() => snapshot.config.profiles.find((item) => item.name === profile) ?? snapshot.config.profiles[0], [profile, snapshot.config.profiles]);
  const filteredFiles = useMemo(() => filterFilesByProfile(files, snapshot, activeProfile?.name), [activeProfile?.name, files, snapshot]);
  const activeSkill = useMemo(() => findOwningSkill(snapshot.skills, activeFilePath), [activeFilePath, snapshot.skills]);
  const isDirty = Boolean(document && draft !== document.content);

  useEffect(() => {
    if (!window.skillops) return;
    setIsBusy(true);
    setStatus(t.selectSkillFile);
    void window.skillops.listWorkspaceFiles(snapshot.root, snapshot.config.sourceDir)
      .then((entries) => {
        setFiles(entries);
      })
      .catch((error: unknown) => {
        setFiles([]);
        setDocument(undefined);
        setDraft("");
        setStatus(t.errorStatus(errorMessage(error)));
      })
      .finally(() => setIsBusy(false));
  }, [snapshot.config.sourceDir, snapshot.root, t]);

  useEffect(() => {
    const nextFiles = flattenFileEntries(filteredFiles);
    const preferred = nextFiles.find((item) => item.name.toLowerCase() === "skill.md") ?? nextFiles[0];
    if (nextFiles.length === 0) {
      setActiveFilePath("");
      setDocument(undefined);
      setDraft("");
      setStatus(t.noSkillFiles);
      return;
    }
    setActiveFilePath((current) => nextFiles.some((item) => item.path === current) ? current : preferred.path);
  }, [filteredFiles, t]);

  useEffect(() => {
    if (!activeFilePath || !window.skillops) {
      setDocument(undefined);
      setDraft("");
      return;
    }
    setIsBusy(true);
    void window.skillops.readSkillFile(snapshot.root, activeFilePath)
      .then((nextDocument) => {
        setDocument(nextDocument);
        setDraft(nextDocument.content);
        setStatus(t.fileLoaded);
      })
      .catch((error: unknown) => {
        setDocument(undefined);
        setDraft("");
        setStatus(t.errorStatus(errorMessage(error)));
      })
      .finally(() => setIsBusy(false));
  }, [activeFilePath, snapshot.root, t]);

  async function saveActiveFile() {
    if (!document || !window.skillops) return;
    setIsBusy(true);
    try {
      const nextDocument = await window.skillops.writeSkillFile(snapshot.root, document.path, draft);
      setDocument(nextDocument);
      setDraft(nextDocument.content);
      setStatus(t.fileSaved);
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    } finally {
      setIsBusy(false);
    }
  }

  async function reloadActiveFile() {
    if (!activeFilePath || !window.skillops) return;
    setIsBusy(true);
    try {
      const nextDocument = await window.skillops.readSkillFile(snapshot.root, activeFilePath);
      setDocument(nextDocument);
      setDraft(nextDocument.content);
      setStatus(t.fileLoaded);
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    } finally {
      setIsBusy(false);
    }
  }

  async function openDetachedWindow(filePath?: string) {
    if (!window.skillops) return;
    const context = {
      sourceDir: snapshot.config.sourceDir,
      profileName: activeProfile?.name,
      profiles: snapshot.config.profiles,
      skills: snapshot.skills,
      assets: snapshot.assets,
      collapsedFolders: Array.from(collapsedFolders),
      treeScrollTop: treeRef.current?.scrollTop ?? 0,
      editorScrollTop: editorRef.current?.scrollTop ?? 0,
      labels: {
        files: t.skillFilesTitle,
        profile: t.profile,
        reload: t.reloadFile,
        save: t.saveFile,
        noFileSelected: t.selectSkillFile,
        selectFile: t.selectSkillFile,
        loading: t.loadingFile,
        loaded: t.fileLoaded,
        saving: t.savingFile,
        saved: t.fileSaved,
        cannotOpenFile: t.cannotOpenFile
      }
    };
    try {
      await window.skillops.openWorkspaceFileWindow(snapshot.root, sourceRootPath, (filePath ?? activeFilePath) || undefined, context);
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  function toggleFolder(path: string) {
    setCollapsedFolders((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  return (
    <div className={`skills-layout editor ${hasAssets ? "with-assets" : ""}`}>
      <section className="panel file-tree-panel">
        <div className="panel-heading file-tree-heading">
          <div>
            <h3 className="file-tree-title"><span>{snapshot.config.sourceDir}</span><span>{t.skillFilesTitle}</span></h3>
          </div>
          <div className="file-tree-controls">
            <label className="compact-select">
              <span>{t.profile}</span>
              <select value={activeProfile?.name ?? ""} onChange={(event) => setProfile(event.target.value)}>
                {snapshot.config.profiles.map((item) => (
                  <option key={item.name} value={item.name}>{item.name}</option>
                ))}
              </select>
            </label>
            <button className="icon-button light" title={t.openSkillWindow} onClick={() => openDetachedWindow()} disabled={!activeSkill && !activeFilePath}>
              <ExternalLink size={15} />
            </button>
          </div>
        </div>
        {filteredFiles.length === 0 ? <p className="muted">{isBusy ? t.scanning : t.noSkillFiles}</p> : (
          <div className="file-tree" ref={treeRef}>
            <FileTree
              entries={filteredFiles}
              activeFilePath={activeFilePath}
              collapsedFolders={collapsedFolders}
              setActiveFilePath={setActiveFilePath}
              toggleFolder={toggleFolder}
            />
          </div>
        )}
      </section>
      <section className="panel skill-editor-panel">
        <div className="editor-header">
          <div>
            <h3>{document?.relativePath ?? snapshot.config.sourceDir}</h3>
            <p className="muted">{isDirty ? t.unsavedChanges : status}</p>
          </div>
          <div className="actions">
            <button onClick={reloadActiveFile} disabled={!document || isBusy}><RefreshCw size={15} /> {t.reloadFile}</button>
            <button onClick={() => openDetachedWindow(document?.path)} disabled={!document}><ExternalLink size={15} /> {t.openFileWindow}</button>
            <button className="primary" onClick={saveActiveFile} disabled={!isDirty || isBusy}><Save size={15} /> {t.saveFile}</button>
          </div>
        </div>
        {document ? (
          <textarea
            ref={editorRef}
            className="skill-editor"
            spellCheck={false}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        ) : (
          <div className="editor-empty">
            <FileText size={24} />
            <p>{status}</p>
          </div>
        )}
      </section>
      {hasAssets && (
        <section className="panel shared-assets-panel">
          <h3>{t.sharedAssetsTitle}</h3>
          <p className="muted">{t.sharedAssetsHelp}</p>
          <div className="list">
            {snapshot.assets.map((asset) => (
              <article key={asset.path} className="row">
                <strong>{asset.name}</strong>
                <span>{asset.relativePath}</span>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FileTree({ entries, activeFilePath, collapsedFolders, setActiveFilePath, toggleFolder, depth = 0 }: {
  entries: SkillFileEntry[];
  activeFilePath: string;
  collapsedFolders: Set<string>;
  setActiveFilePath: (path: string) => void;
  toggleFolder: (path: string) => void;
  depth?: number;
}) {
  return (
    <div className="file-tree-level">
      {entries.map((entry) => {
        if (entry.type === "directory") {
          const isCollapsed = collapsedFolders.has(entry.path);
          return (
            <div key={entry.path} className="file-tree-directory">
              <button className="file-tree-folder" style={{ paddingLeft: `${depth * 12}px` }} onClick={() => toggleFolder(entry.path)}>
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <Folder size={14} />
                <span>{entry.name}</span>
              </button>
              {!isCollapsed && entry.children && entry.children.length > 0 && (
                <FileTree
                  entries={entry.children}
                  activeFilePath={activeFilePath}
                  collapsedFolders={collapsedFolders}
                  setActiveFilePath={setActiveFilePath}
                  toggleFolder={toggleFolder}
                  depth={depth + 1}
                />
              )}
            </div>
          );
        }
        return (
          <button
            key={entry.path}
            className={`file-tree-file ${entry.path === activeFilePath ? "active" : ""}`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => setActiveFilePath(entry.path)}
          >
            <FileText size={14} />
            <span>{entry.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function flattenFileEntries(entries: SkillFileEntry[]): SkillFileEntry[] {
  return entries.flatMap((entry) => entry.type === "directory" ? flattenFileEntries(entry.children ?? []) : [entry]);
}

function filterFilesByProfile(entries: SkillFileEntry[], snapshot: WorkspaceSnapshot, profileName?: string): SkillFileEntry[] {
  const activeProfile = snapshot.config.profiles.find((item) => item.name === profileName) ?? snapshot.config.profiles[0];
  if (!activeProfile || activeProfile.skills.includes("*")) return entries;

  const selectedNames = new Set(activeProfile.skills);
  const includedRoots = [
    ...snapshot.skills.filter((skill) => selectedNames.has(skill.name)).map((skill) => skill.path),
    ...snapshot.assets.map((asset) => asset.path)
  ];
  if (includedRoots.length === 0) return [];
  return filterEntriesByRoots(entries, includedRoots);
}

function filterEntriesByRoots(entries: SkillFileEntry[], includedRoots: string[]): SkillFileEntry[] {
  return entries.flatMap((entry) => {
    if (includedRoots.some((root) => samePath(entry.path, root) || isDescendantPath(entry.path, root))) return [entry];
    if (entry.type !== "directory") return [];
    const children = filterEntriesByRoots(entry.children ?? [], includedRoots);
    return children.length > 0 ? [{ ...entry, children }] : [];
  });
}

function findOwningSkill(skills: SkillSummary[], filePath: string): SkillSummary | undefined {
  if (!filePath) return undefined;
  return [...skills]
    .sort((a, b) => b.path.length - a.path.length)
    .find((skill) => filePath === skill.path || filePath.startsWith(`${skill.path}${pathSeparator(skill.path)}`));
}

function joinLocalPath(base: string, ...parts: string[]): string {
  const separator = pathSeparator(base);
  return [base.replace(/[\\/]+$/, ""), ...parts.map((part) => part.replace(/^[\\/]+|[\\/]+$/g, ""))]
    .filter(Boolean)
    .join(separator);
}

function pathSeparator(filePath: string): string {
  return filePath.includes("\\") ? "\\" : "/";
}

function samePath(a: string, b: string): boolean {
  return normalizePath(a) === normalizePath(b);
}

function isDescendantPath(candidate: string, parent: string): boolean {
  const normalizedCandidate = normalizePath(candidate);
  const normalizedParent = normalizePath(parent);
  return normalizedCandidate.startsWith(`${normalizedParent}/`);
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/\/+$/, "");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function Audit({ t, snapshot, criticalCount, warningCount, openFeedback }: { t: Dictionary; snapshot: WorkspaceSnapshot; criticalCount: number; warningCount: number; openFeedback: () => void }) {
  return (
    <div className="grid">
      <Metric label={t.metrics.score} value={`${snapshot.audit.score}/100`} />
      <Metric label={t.metrics.criticalFindings} value={criticalCount} tone={criticalCount ? "bad" : "good"} />
      <Metric label={t.metrics.warnings} value={warningCount} tone={warningCount ? "warn" : "good"} />
      <section className="panel wide audit-disclaimer">
        <h3>{t.auditTransparencyTitle}</h3>
        <p>{t.auditTransparencyBody}</p>
        <button className="primary" onClick={openFeedback}><ExternalLink size={16} /> {t.auditOpenIssue}</button>
      </section>
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
