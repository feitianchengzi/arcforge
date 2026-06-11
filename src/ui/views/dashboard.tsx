import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, FileText, Folder, RefreshCw, Save } from "lucide-react";
import type { ImportSkillsPlan, SkillFileDocument, SkillFileEntry, SkillSummary, SourceUpdateStatus, TargetRecord, WorkspaceSnapshot } from "../../shared/types";
import type { Dictionary } from "../i18n";
import type { Tab } from "../types";
import { basename, formatDate, formatTimeAgo } from "../utils";
import { Metric } from "../components/shell";

const AUTO_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const NEW_IMPORT_PROFILE_VALUE = "__new_import_profile__";

export function Overview(props: {
  t: Dictionary;
  snapshot: WorkspaceSnapshot;
  criticalCount: number;
  warningCount: number;
  targetHistory: TargetRecord[];
  setTab: (value: Tab) => void;
  setStatus: (value: string) => void;
  sourceUpdateCheck?: {
    checkedAt: string;
    status?: SourceUpdateStatus;
    error?: string;
  };
  autoCheckReady: boolean;
  saveSourceUpdateCheck: (record: { checkedAt: string; status?: SourceUpdateStatus; error?: string }) => void;
  onSourceUpdated: () => Promise<void>;
}) {
  const { t, snapshot, criticalCount, warningCount } = props;
  const projectTargets = props.targetHistory.filter((item) => item.sourcePath === snapshot.root);
  const [sourceStatus, setSourceStatus] = useState<SourceUpdateStatus>();
  const [sourceError, setSourceError] = useState("");
  const [isCheckingSource, setIsCheckingSource] = useState(false);
  const [isUpdatingSource, setIsUpdatingSource] = useState(false);
  const canCheckSource = Boolean(snapshot.localGit?.remotes.length);
  const displayedAtMs = useMemo(() => Date.now(), [snapshot.root, sourceStatus?.checkedAt]);

  useEffect(() => {
    setSourceStatus(props.sourceUpdateCheck?.status);
    setSourceError(props.sourceUpdateCheck?.error ?? "");
  }, [props.sourceUpdateCheck?.checkedAt, snapshot.root]);

  useEffect(() => {
    if (!props.autoCheckReady) return;
    if (!canCheckSource || isCheckingSource || isUpdatingSource) return;
    if (!isStaleCheck(props.sourceUpdateCheck?.checkedAt)) return;
    void checkSourceUpdates({ silent: true });
  }, [props.autoCheckReady, canCheckSource, props.sourceUpdateCheck?.checkedAt, snapshot.root]);

  async function checkSourceUpdates(options: { silent?: boolean } = {}) {
    if (!window.arcforge) return;
    setIsCheckingSource(true);
    setSourceError("");
    if (!options.silent) props.setStatus(t.checkingSourceUpdates);
    try {
      const nextStatus = await window.arcforge.sourceUpdateStatus(snapshot.root);
      setSourceStatus(nextStatus);
      props.saveSourceUpdateCheck({ checkedAt: nextStatus.checkedAt, status: nextStatus });
      if (!options.silent) props.setStatus(sourceStatusMessage(t, nextStatus));
    } catch (error) {
      const message = errorMessage(error);
      setSourceError(message);
      props.saveSourceUpdateCheck({ checkedAt: new Date().toISOString(), error: message });
      if (!options.silent) props.setStatus(t.errorStatus(message));
    } finally {
      setIsCheckingSource(false);
    }
  }

  async function updateSource() {
    if (!window.arcforge || !sourceStatus?.canUpdate) return;
    if (!window.confirm(t.confirmSourceUpdate(sourceStatus.behind))) return;
    setIsUpdatingSource(true);
    setSourceError("");
    props.setStatus(t.updatingSource);
    try {
      const result = await window.arcforge.updateSource(snapshot.root, true);
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
      <section className="panel wide source-status-panel">
        <div className="panel-heading">
          <div>
            <h3>{t.sourceStatusTitle}</h3>
            <p className="muted">{canCheckSource ? t.sourceStatusHelp : t.sourceStatusUnavailable}</p>
          </div>
          <div className="actions">
            <button onClick={() => checkSourceUpdates()} disabled={!canCheckSource || isCheckingSource || isUpdatingSource}>
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
              {sourceStatus.previousFetchAt ? (
                <>
                  <span>{t.sourceLastFetch(formatTimeAgo(sourceStatus.previousFetchAt, displayedAtMs))}</span>
                  <span>{t.sourceLastFetchAt(formatDate(sourceStatus.previousFetchAt))}</span>
                </>
              ) : (
                <span>{t.sourceNeverFetched}</span>
              )}
              <span>{t.sourceCheckedAgo(formatTimeAgo(sourceStatus.checkedAt, displayedAtMs))}</span>
              <span>{t.sourceCheckedAt(formatDate(sourceStatus.checkedAt))}</span>
              {!sourceStatus.canUpdate && (sourceStatus.ahead > 0 || sourceStatus.dirty) && <span>{t.sourceCannotUpdate}</span>}
            </div>
          </div>
        ) : (
          <p className="muted">{t.sourceStatusIdle}</p>
        )}
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

function isStaleCheck(checkedAt?: string): boolean {
  if (!checkedAt) return true;
  const time = Date.parse(checkedAt);
  return !Number.isFinite(time) || Date.now() - time > AUTO_CHECK_INTERVAL_MS;
}

function sourceStatusMessage(t: Dictionary, status: SourceUpdateStatus): string {
  if (status.canUpdate) return t.sourceCanUpdate(status.behind);
  if (status.behind === 0 && status.ahead === 0 && !status.dirty) return t.sourceUpToDate;
  return t.sourceCannotUpdate;
}

export function SkillsList({ t, snapshot, profile, setProfile, onMerged }: {
  t: Dictionary;
  snapshot: WorkspaceSnapshot;
  profile: string;
  setProfile: (value: string) => void;
  onMerged?: () => void | Promise<void>;
}) {
  const [files, setFiles] = useState<SkillFileEntry[]>([]);
  const [activeFilePath, setActiveFilePath] = useState("");
  const [document, setDocument] = useState<SkillFileDocument>();
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState(t.selectSkillFile);
  const [isBusy, setIsBusy] = useState(false);
  const [showMergePanel, setShowMergePanel] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set());
  const treeRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const sourceRootPath = useMemo(() => joinLocalPath(snapshot.root, snapshot.config.sourceDir), [snapshot.config.sourceDir, snapshot.root]);
  const activeProfile = useMemo(() => snapshot.config.profiles.find((item) => item.name === profile) ?? snapshot.config.profiles[0], [profile, snapshot.config.profiles]);
  const filteredFiles = useMemo(() => filterFilesByProfile(files, snapshot, activeProfile?.name), [activeProfile?.name, files, snapshot]);
  const activeSkill = useMemo(() => findOwningSkill(snapshot.skills, activeFilePath), [activeFilePath, snapshot.skills]);
  const isDirty = Boolean(document && draft !== document.content);

  useEffect(() => {
    if (!window.arcforge) return;
    setIsBusy(true);
    setStatus(t.selectSkillFile);
    void window.arcforge.listWorkspaceFiles(snapshot.root, snapshot.config.sourceDir)
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
    if (!activeFilePath || !window.arcforge) {
      setDocument(undefined);
      setDraft("");
      return;
    }
    setIsBusy(true);
    void window.arcforge.readSkillFile(snapshot.root, activeFilePath)
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
    if (!document || !window.arcforge) return;
    setIsBusy(true);
    try {
      const nextDocument = await window.arcforge.writeSkillFile(snapshot.root, document.path, draft);
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
    if (!activeFilePath || !window.arcforge) return;
    setIsBusy(true);
    try {
      const nextDocument = await window.arcforge.readSkillFile(snapshot.root, activeFilePath);
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
    if (!window.arcforge) return;
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
      await window.arcforge.openWorkspaceFileWindow(snapshot.root, sourceRootPath, (filePath ?? activeFilePath) || undefined, context);
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
    <div className="skills-layout editor">
      <section className="panel file-tree-panel">
        <div className="panel-heading file-tree-heading">
          <div className="file-tree-title-row">
            <h3 className="file-tree-title"><span>{snapshot.config.sourceDir}</span><span>{t.skillFilesTitle}</span></h3>
            <button className="file-tree-merge-button" onClick={() => setShowMergePanel(true)}>{t.mergeSkills}</button>
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
      {showMergePanel && (
        <MergeSkillsDialog
          t={t}
          snapshot={snapshot}
          currentProfile={activeProfile?.name ?? profile}
          onClose={() => setShowMergePanel(false)}
          onMerged={() => {
            setShowMergePanel(false);
            void onMerged?.();
          }}
        />
      )}
    </div>
  );
}

function MergeSkillsDialog(props: {
  t: Dictionary;
  snapshot: WorkspaceSnapshot;
  currentProfile: string;
  onClose: () => void;
  onMerged: () => void;
}) {
  const { t, snapshot } = props;
  const [remoteInput, setRemoteInput] = useState("");
  const [sourceSnapshot, setSourceSnapshot] = useState<WorkspaceSnapshot>();
  const [sourceProjectRoot, setSourceProjectRoot] = useState("");
  const [sourceProfile, setSourceProfile] = useState("default");
  const [targetProfile, setTargetProfile] = useState(props.currentProfile);
  const [newTargetProfile, setNewTargetProfile] = useState("");
  const [targetDir, setTargetDir] = useState(snapshot.config.sourceDir);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [plan, setPlan] = useState<ImportSkillsPlan>();
  const [status, setStatus] = useState(t.mergeHelp);
  const [isBusy, setIsBusy] = useState(false);
  const resolvedTargetProfile = targetProfile === NEW_IMPORT_PROFILE_VALUE ? newTargetProfile.trim() : targetProfile;
  const fullTargetPath = resolveLocalPath(snapshot.root, targetDir);
  const exampleSkillName = selectedSkills[0] || sourceSnapshot?.skills[0]?.name || "skill-name";
  const exampleTargetPath = joinLocalPath(fullTargetPath, exampleSkillName);

  async function loadSourceProject(input: string, remote = false) {
    if (!window.arcforge || !input.trim()) return;
    setIsBusy(true);
    try {
      const root = remote ? await window.arcforge.addRemoteWorkspace(input.trim()) : input.trim();
      const nextSnapshot = await window.arcforge.scanWorkspace(root);
      setSourceSnapshot(nextSnapshot);
      setSourceProjectRoot(nextSnapshot.root);
      setPlan(undefined);
      setRemoteInput("");
      const nextProfile = nextSnapshot.config.profiles[0]?.name ?? "default";
      setSourceProfile(nextProfile);
      setSelectedSkills(skillNamesForProfile(nextSnapshot, nextProfile));
      setStatus(t.foundStatus(nextSnapshot.skills.length, nextSnapshot.audit.score));
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    } finally {
      setIsBusy(false);
    }
  }

  async function chooseLocalSourceProject() {
    if (!window.arcforge) return;
    const selected = await window.arcforge.chooseWorkspace();
    if (!selected) return;
    setIsBusy(true);
    try {
      const nextSnapshot = await window.arcforge.scanWorkspace(selected);
      setSourceSnapshot(nextSnapshot);
      setSourceProjectRoot(nextSnapshot.root);
      setPlan(undefined);
      const nextProfile = nextSnapshot.config.profiles[0]?.name ?? "default";
      setSourceProfile(nextProfile);
      setSelectedSkills(skillNamesForProfile(nextSnapshot, nextProfile));
      setStatus(t.foundStatus(nextSnapshot.skills.length, nextSnapshot.audit.score));
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    } finally {
      setIsBusy(false);
    }
  }

  function toggleSkill(skillName: string) {
    setSelectedSkills((current) => current.includes(skillName) ? current.filter((item) => item !== skillName) : [...current, skillName]);
    setPlan(undefined);
  }

  async function chooseWriteDirectory() {
    if (!window.arcforge) return;
    try {
      let selected: string | { path: string; relativePath: string; isInside: boolean } | undefined;
      try {
        selected = window.arcforge.chooseDirectory
          ? await window.arcforge.chooseDirectory(snapshot.root, snapshot.root)
          : await window.arcforge.chooseWorkspace();
      } catch {
        selected = await window.arcforge.chooseWorkspace();
      }
      if (!selected) return;
      const selectedPath = typeof selected === "string" ? selected : selected.path;
      const nextTargetDir = typeof selected === "string" ? relativeLocalPath(snapshot.root, selected) : selected.relativePath;
      setTargetDir(nextTargetDir);
      setPlan(undefined);
      const isInside = typeof selected === "string" ? isSameOrDescendantLocalPath(selected, snapshot.root) : selected.isInside;
      if (!isInside) {
        setStatus(t.importTargetOutsideProject);
        return;
      }
      setStatus(t.importWriteDirectorySelected(selectedPath));
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function createPlan() {
    if (!window.arcforge || !sourceProjectRoot) return;
    if (!isSameOrDescendantLocalPath(fullTargetPath, snapshot.root)) {
      setStatus(t.importTargetOutsideProject);
      return;
    }
    setIsBusy(true);
    try {
      const nextPlan = await window.arcforge.createImportSkillsPlan({
        root: snapshot.root,
        from: sourceProjectRoot,
        profile: sourceProfile,
        skills: selectedSkills,
        targetDir,
        targetProfile: resolvedTargetProfile
      });
      setPlan(nextPlan);
      setStatus(nextPlan.hasConflicts ? t.mergeConflict : t.mergeReady);
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    } finally {
      setIsBusy(false);
    }
  }

  async function runMerge() {
    if (!window.arcforge || !plan || plan.hasConflicts) return;
    setIsBusy(true);
    try {
      const result = await window.arcforge.importSkillsIntoProject({
        root: snapshot.root,
        from: sourceProjectRoot,
        profile: sourceProfile,
        skills: selectedSkills,
        targetDir,
        targetProfile: resolvedTargetProfile,
        confirm: true
      });
      setStatus(t.mergeComplete(result.copied.length, result.skipped.length));
      props.onMerged();
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={props.onClose}>
      <section className="modal merge-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{t.mergeSkills}</h3>
            <p>{status}</p>
          </div>
          <button className="icon-button light" onClick={props.onClose}>x</button>
        </div>
        <div className="grid two compact-grid">
          <section>
            <label>{t.importSourceProject}</label>
            <p className="muted">{t.importSourceHelp}</p>
            {sourceProjectRoot ? (
              <div className="source-summary">
                <Folder size={16} />
                <div>
                  <strong>{basename(sourceProjectRoot)}</strong>
                  <span>{sourceProjectRoot}</span>
                </div>
              </div>
            ) : (
              <p className="muted">{t.selectSkillFile}</p>
            )}
            <button onClick={chooseLocalSourceProject} disabled={isBusy}>{t.importLocalSource}</button>
            <div className="download-source light">
              <input value={remoteInput} placeholder="github.com/owner/repo" onChange={(event) => setRemoteInput(event.target.value)} />
              <button onClick={() => loadSourceProject(remoteInput, true)} disabled={isBusy || !remoteInput.trim()}>{t.importRemoteSource}</button>
            </div>
            {sourceSnapshot && (
              <>
                <label>{t.profile}</label>
                <select value={sourceProfile} onChange={(event) => {
                  const nextProfile = event.target.value;
                  setSourceProfile(nextProfile);
                  setSelectedSkills(skillNamesForProfile(sourceSnapshot, nextProfile));
                  setPlan(undefined);
                }}>
                  {sourceSnapshot.config.profiles.map((item) => <option key={item.name}>{item.name}</option>)}
                </select>
              </>
            )}
            <label>{t.importIntoCurrentProject}</label>
            <p className="muted">{t.importTargetHelp}</p>
            <label>{t.importTargetProfile}</label>
            <p className="muted">{t.importTargetProfileHelp}</p>
            <select value={targetProfile} onChange={(event) => { setTargetProfile(event.target.value); setPlan(undefined); }}>
              {snapshot.config.profiles.map((item) => <option key={item.name}>{item.name}</option>)}
              <option value={NEW_IMPORT_PROFILE_VALUE}>{t.importNewTargetProfile}</option>
            </select>
            {targetProfile === NEW_IMPORT_PROFILE_VALUE && (
              <input value={newTargetProfile} placeholder={t.importNewTargetProfilePlaceholder} onChange={(event) => { setNewTargetProfile(event.target.value); setPlan(undefined); }} />
            )}
            <label>{t.importWriteDirectory}</label>
            <div className="download-source light">
              <input value={targetDir} onChange={(event) => { setTargetDir(event.target.value); setPlan(undefined); }} />
              <button onClick={chooseWriteDirectory} disabled={isBusy}>{t.chooseWriteDirectory}</button>
            </div>
            <p className="muted">{t.importExampleTargetPath(exampleTargetPath)}</p>
          </section>
          <section>
            <label>{t.importSelectedSkills}</label>
            <div className="check-list merge-skill-list">
              {(sourceSnapshot?.skills ?? []).map((skill) => (
                <label key={skill.name} className="check-row">
                  <input type="checkbox" checked={selectedSkills.includes(skill.name)} onChange={() => toggleSkill(skill.name)} />
                  <span>{skill.name}</span>
                </label>
              ))}
              {!sourceSnapshot && <p className="muted">{t.importSourceHelp}</p>}
            </div>
            {plan && (
              <div className="target-subsection">
                <strong>{t.mergePlan}</strong>
                <div className="list compact">
                  {plan.skills.map((item) => (
                    <article key={item.name} className="row">
                      <span>{item.name}</span>
                      <span className={`badge ${item.status === "conflict" ? "warn" : item.status === "new" ? "good" : ""}`}>{item.status}</span>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
        <div className="actions modal-actions">
          <button onClick={props.onClose}>{t.cancel}</button>
          <button onClick={createPlan} disabled={isBusy || !sourceProjectRoot || selectedSkills.length === 0 || !resolvedTargetProfile}>{t.importPreviewChanges}</button>
          <button className="primary" onClick={runMerge} disabled={isBusy || !plan || plan.hasConflicts}>{t.runMerge}</button>
        </div>
      </section>
    </div>
  );
}

function skillNamesForProfile(snapshot: WorkspaceSnapshot, profileName: string): string[] {
  const profile = snapshot.config.profiles.find((item) => item.name === profileName);
  if (!profile || profile.skills.includes("*")) return snapshot.skills.map((skill) => skill.name);
  const selected = new Set(profile.skills);
  return snapshot.skills.filter((skill) => selected.has(skill.name)).map((skill) => skill.name);
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

function resolveLocalPath(base: string, target: string): string {
  if (/^(?:[A-Za-z]:[\\/]|[\\/])/.test(target)) return target;
  return joinLocalPath(base, target);
}

function relativeLocalPath(base: string, target: string): string {
  const normalizedBase = normalizeLocalPath(base);
  const normalizedTarget = normalizeLocalPath(target);
  if (normalizedTarget === normalizedBase) return ".";
  if (normalizedTarget.startsWith(`${normalizedBase}/`)) return normalizedTarget.slice(normalizedBase.length + 1);
  return target;
}

function isSameOrDescendantLocalPath(candidate: string, parent: string): boolean {
  const normalizedCandidate = normalizeLocalPath(candidate);
  const normalizedParent = normalizeLocalPath(parent);
  return normalizedCandidate === normalizedParent || normalizedCandidate.startsWith(`${normalizedParent}/`);
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

function normalizeLocalPath(filePath: string): string {
  const withoutFileScheme = filePath.trim().replace(/^file:\/\//, "");
  let decoded = withoutFileScheme;
  try {
    decoded = decodeURIComponent(withoutFileScheme);
  } catch {
    decoded = withoutFileScheme;
  }
  const normalized = decoded
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/\/+$/, "");
  const isAbsolute = normalized.startsWith("/");
  const parts: string[] = [];
  for (const part of normalized.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  const joined = `${isAbsolute ? "/" : ""}${parts.join("/")}`;
  return /darwin/i.test(navigator.platform) ? joined.toLocaleLowerCase() : joined;
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
