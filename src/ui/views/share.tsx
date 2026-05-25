import { useEffect, useMemo, useState } from "react";
import { ExternalLink, GitBranch, GitPullRequest, Pencil, Plus, Terminal, Trash2 } from "lucide-react";
import type { DriftReport, LocalGitRemote, ShareDeliveryMethod, ShareDriftCheckRecord, SharePlanResult, ShareResult, ShareTargetGroup, WorkspaceSnapshot } from "../../shared/types";
import type { Dictionary } from "../i18n";
import { createShareTargetGroup, formatDate, formatTimeAgo, selectedSkillCount } from "../utils";

const AUTO_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function Publish(props: {
  t: Dictionary;
  snapshot: WorkspaceSnapshot;
  shareResult?: ShareResult;
  sharePlan?: SharePlanResult;
  shareDriftReport?: DriftReport;
  shareDriftCheck?: ShareDriftCheckRecord;
  shareDriftSignature: string;
  isSharing: boolean;
  isCheckingShareDrift: boolean;
  shareProgress?: string;
  profileOptions: string[];
  targetGroups: ShareTargetGroup[];
  activeTargetGroup?: ShareTargetGroup;
  setActiveTargetGroupId: (value: string) => void;
  saveTargetGroups: (groups: ShareTargetGroup[], selectedId: string) => void;
  checkShareTargetDrift: (group: ShareTargetGroup) => void;
  shareProject: (group: ShareTargetGroup, message: string) => void;
  confirmShareProject: (group: ShareTargetGroup, message: string, plan: SharePlanResult) => void;
  openDriftDiff: (report: DriftReport) => void;
  cancelSharePlan: () => void;
}) {
  const { t } = props;
  const [message, setMessage] = useState("Share SkillOps project");
  const [editingGroup, setEditingGroup] = useState<ShareTargetGroup | undefined>();
  const activeGroup = props.activeTargetGroup;
  const selectedSkills = activeGroup ? selectedSkillCount(props.snapshot, activeGroup.profile) : 0;
  const activeReady = activeGroup ? shareTargetReady(props.snapshot, activeGroup) : false;
  const hasDriftChanges = Boolean(props.shareDriftReport?.items.some((item) => item.status !== "same"));
  const canShare = Boolean(activeGroup && activeReady && hasDriftChanges && !props.isCheckingShareDrift && !props.isSharing);
  const displayedAtMs = useMemo(() => Date.now(), [props.snapshot.root, activeGroup?.id, props.shareDriftCheck?.checkedAt]);

  useEffect(() => {
    if (!activeGroup || !activeReady || props.isCheckingShareDrift) return;
    if (!isStaleCheck(props.shareDriftCheck, props.shareDriftSignature)) return;
    props.checkShareTargetDrift(activeGroup);
  }, [activeGroup?.id, activeReady, props.isCheckingShareDrift, props.shareDriftCheck?.checkedAt, props.shareDriftCheck?.signature, props.shareDriftSignature]);

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
                <span>{group.profile} / {shareTargetRemoteLabel(props.snapshot, group)}</span>
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
            <div className="pathbox light">{shareTargetRemoteLabel(props.snapshot, activeGroup)}</div>
            <label>{t.shareTargetMode}</label>
            <div className="pathbox light">{activeGroup.sameRepository ? `${t.sameRepositoryPath}: ${props.snapshot.localGit?.relativePath ?? "."}` : activeGroup.targetMode === "namedProject" ? `${t.shareNamedProject}: ${activeGroup.projectName ?? ""}` : t.shareDirectPath}</div>
          </>
        )}
        <label>{t.commitMessage}</label>
        <input value={message} onChange={(event) => setMessage(event.target.value)} />
        <div className="actions">
          <button onClick={() => activeGroup && props.checkShareTargetDrift(activeGroup)} disabled={props.isCheckingShareDrift || !activeGroup || !activeReady}>{props.isCheckingShareDrift ? t.checkingDrift : t.checkDrift}</button>
          <button className={canShare ? "primary" : undefined} onClick={() => activeGroup && props.shareProject(activeGroup, message)} disabled={!canShare}>{props.isSharing ? t.sharing : t.shareNow}</button>
        </div>
        {props.shareProgress && <p className="muted">{props.shareProgress}</p>}
        <h4>{t.drift}</h4>
        {props.shareDriftCheck?.checkedAt && (
          <>
            <p className="muted">{t.sourceCheckedAgo(formatTimeAgo(props.shareDriftCheck.checkedAt, displayedAtMs))}</p>
            <p className="muted">{t.sourceCheckedAt(formatDate(props.shareDriftCheck.checkedAt))}</p>
          </>
        )}
        {props.shareDriftCheck?.error && <p className="muted">{t.errorStatus(props.shareDriftCheck.error)}</p>}
        {!props.shareDriftReport ? <p className="muted">{t.driftEmpty}</p> : (
          <div className="list">
            <article className="row stacked">
              <div>
                <strong>{props.shareDriftReport.sameRepository ? t.sameRepository : props.shareDriftReport.targetDir}</strong>
                <p>{props.shareDriftReport.items.filter((item) => item.status !== "same").length} changed / {props.shareDriftReport.items.length} checked</p>
                {props.shareDriftReport.targetPath && <span>{props.shareDriftReport.targetPath}</span>}
              </div>
              <button onClick={() => props.shareDriftReport && props.openDriftDiff(props.shareDriftReport)}><ExternalLink size={16} /> {t.viewDiff}</button>
            </article>
          </div>
        )}
        {props.sharePlan && (
          <div className="target-subsection">
            <div className="section-header">
              <div>
                <strong>{t.githubAccess}</strong>
                <p className="muted">{props.sharePlan.access.repository ?? props.sharePlan.access.cloneUrl}</p>
              </div>
              <span className={props.sharePlan.access.canPush ? "badge good" : "badge warn"}>{props.sharePlan.access.viewerPermission ?? (props.sharePlan.access.authenticated ? "authenticated" : "not signed in")}</span>
            </div>
            <div className="list compact">
              <div className="row">
                <div>
                  <strong>{t.deliveryMethod}: {deliveryLabel(t, props.sharePlan.delivery)}</strong>
                  <p>{props.sharePlan.access.availableDelivery.map((item) => deliveryLabel(t, item)).join(" / ")}</p>
                </div>
                <span>{props.sharePlan.branch}</span>
              </div>
              <div className="row stacked">
                <Terminal size={16} />
                <div>
                  <strong>{t.cliPreview}</strong>
                  <p>{props.sharePlan.commands.join("  ")}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {props.shareResult && (
          <>
            {props.shareResult.pullRequestUrl && (
              <div className="source-summary">
                <GitPullRequest size={18} />
                <div>
                  <strong>{t.pullRequest}</strong>
                  <span>{props.shareResult.pullRequestUrl}</span>
                </div>
              </div>
            )}
            {props.shareResult.manualCommands && props.shareResult.manualCommands.length > 0 && (
              <>
                <label>{t.manualCommands}</label>
                <div className="pathbox light">{[props.shareResult.checkoutRoot ? `cd ${props.shareResult.checkoutRoot}` : "", ...props.shareResult.manualCommands].filter(Boolean).join("\n")}</div>
              </>
            )}
            <pre>{props.shareResult.messages.join("\n\n")}</pre>
          </>
        )}
      </section>
      {props.sharePlan && activeGroup && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal small" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <h3>{t.confirmShare}</h3>
                <p>{deliveryLabel(t, props.sharePlan.delivery)} / {props.sharePlan.branch}</p>
              </div>
            </div>
            <div className="target-subsection">
              <div className="row stacked">
                <GitPullRequest size={16} />
                <div>
                  <strong>{props.sharePlan.access.repository ?? props.sharePlan.access.cloneUrl}</strong>
                  <p>{props.sharePlan.targetPath}</p>
                </div>
              </div>
            </div>
            <div className="actions modal-actions">
              <button onClick={props.cancelSharePlan}>{t.cancelShare}</button>
              <button className="primary" onClick={() => props.sharePlan && props.confirmShareProject(activeGroup, message, props.sharePlan)} disabled={props.isSharing}>{props.isSharing ? t.sharing : t.confirmShare}</button>
            </div>
          </section>
        </div>
      )}
      {editingGroup && (
        <ShareTargetDialog
          t={t}
          group={editingGroup}
          snapshot={props.snapshot}
          profileOptions={props.profileOptions}
          onSave={upsertGroup}
          onClose={() => setEditingGroup(undefined)}
        />
      )}
    </div>
  );
}

function isStaleCheck(record: ShareDriftCheckRecord | undefined, signature: string): boolean {
  if (!record?.checkedAt) return true;
  if (record.signature !== signature) return true;
  const time = Date.parse(record.checkedAt);
  return !Number.isFinite(time) || Date.now() - time > AUTO_CHECK_INTERVAL_MS;
}

function deliveryLabel(t: Dictionary, value: ShareDeliveryMethod): string {
  if (value === "targetPullRequest") return t.targetPullRequest;
  if (value === "forkPullRequest") return t.forkPullRequest;
  if (value === "directPush") return t.directPush;
  return t.localBranch;
}

function ShareTargetDialog(props: {
  t: Dictionary;
  group: ShareTargetGroup;
  snapshot: WorkspaceSnapshot;
  profileOptions: string[];
  onSave: (group: ShareTargetGroup) => void;
  onClose: () => void;
}) {
  const { t } = props;
  const [draft, setDraft] = useState(props.group);
  const localGit = props.snapshot.localGit;
  const remotes = localGit?.remotes ?? [];
  const sameRepositoryAvailable = remotes.length > 0;
  const selectedRemote = selectSameRepositoryRemote(remotes, draft.sameRepositoryRemote);
  const selectedRemoteUrl = selectedRemote?.pushUrl || selectedRemote?.fetchUrl || "";
  const sameRepositoryEnabled = Boolean(draft.sameRepository && sameRepositoryAvailable);

  useEffect(() => setDraft(props.group), [props.group]);

  function setSameRepository(enabled: boolean) {
    if (!enabled) {
      setDraft({ ...draft, sameRepository: false, sameRepositoryRemote: undefined });
      return;
    }
    const remote = selectedRemote ?? remotes[0];
    if (!remote) return;
    setDraft({
      ...draft,
      sameRepository: true,
      sameRepositoryRemote: remote.name,
      remoteUrl: "",
      targetMode: "direct",
      projectName: undefined
    });
  }

  function setSameRepositoryRemote(remoteName: string) {
    const remote = selectSameRepositoryRemote(remotes, remoteName);
    setDraft({
      ...draft,
      sameRepositoryRemote: remoteName,
      remoteUrl: draft.sameRepository && remote ? "" : draft.remoteUrl
    });
  }

  function setRemoteUrl(value: string) {
    const matchedRemote = remotes.find((remote) => remoteMatchesInput(remote, value));
    if (matchedRemote) {
      setDraft({
        ...draft,
        remoteUrl: "",
        sameRepository: true,
        sameRepositoryRemote: matchedRemote.name,
        targetMode: "direct",
        projectName: undefined
      });
      return;
    }
    setDraft({ ...draft, remoteUrl: value, sameRepository: false, sameRepositoryRemote: undefined });
  }

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
        <input value={sameRepositoryEnabled ? "" : draft.remoteUrl} disabled={sameRepositoryEnabled} placeholder={sameRepositoryEnabled && selectedRemoteUrl ? selectedRemoteUrl : "owner/repo or github.com/owner/repo/tree/main/path"} onChange={(event) => setRemoteUrl(event.target.value)} />
        {sameRepositoryAvailable && (
          <div className="target-subsection">
            <label className="check-row">
              <input type="checkbox" checked={sameRepositoryEnabled} onChange={(event) => setSameRepository(event.target.checked)} />
              <span>{t.sameRepository}</span>
            </label>
            <p className="muted">{t.sameRepositoryHelp}</p>
            {remotes.length > 1 && (
              <>
                <label>{t.sameRepositoryRemote}</label>
                <select value={selectedRemote?.name ?? remotes[0]?.name ?? ""} onChange={(event) => setSameRepositoryRemote(event.target.value)}>
                  {remotes.map((remote) => <option key={remote.name} value={remote.name}>{remote.name} - {remote.pushUrl || remote.fetchUrl}</option>)}
                </select>
              </>
            )}
            {sameRepositoryEnabled && <div className="source-summary"><GitBranch size={16} /><div><strong>{selectedRemoteUrl}</strong><span>{t.sameRepositoryPath}: {localGit?.relativePath ?? "."}</span></div></div>}
          </div>
        )}
        {!sameRepositoryEnabled && (
          <>
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
          </>
        )}
        <div className="actions modal-actions">
          <button onClick={props.onClose}>{t.cancel}</button>
          <button className="primary" onClick={() => props.onSave({
            ...draft,
            name: draft.name.trim() || t.unnamedProfile,
            remoteUrl: sameRepositoryEnabled ? "" : draft.remoteUrl.trim(),
            targetMode: sameRepositoryEnabled ? "direct" : draft.targetMode,
            projectName: sameRepositoryEnabled ? undefined : draft.projectName?.trim() || undefined,
            sameRepository: sameRepositoryEnabled,
            sameRepositoryRemote: sameRepositoryEnabled ? selectedRemote?.name : undefined
          })}>{t.saveShareTarget}</button>
        </div>
      </section>
    </div>
  );
}

function shareTargetReady(snapshot: WorkspaceSnapshot, group: ShareTargetGroup): boolean {
  if (group.sameRepository) return Boolean(selectSameRepositoryRemote(snapshot.localGit?.remotes ?? [], group.sameRepositoryRemote));
  return Boolean(group.remoteUrl.trim()) && (group.targetMode !== "namedProject" || Boolean(group.projectName?.trim()));
}

function shareTargetRemoteLabel(snapshot: WorkspaceSnapshot, group: ShareTargetGroup): string {
  if (!group.sameRepository) return group.remoteUrl;
  const remote = selectSameRepositoryRemote(snapshot.localGit?.remotes ?? [], group.sameRepositoryRemote);
  return remote ? `${remote.name}: ${remote.pushUrl || remote.fetchUrl}` : group.remoteUrl;
}

function selectSameRepositoryRemote(remotes: LocalGitRemote[], remoteName?: string): LocalGitRemote | undefined {
  if (remoteName) {
    const remote = remotes.find((item) => item.name === remoteName);
    if (remote) return remote;
  }
  return remotes[0];
}

function remoteMatchesInput(remote: LocalGitRemote, value: string): boolean {
  const key = canonicalRemoteKey(value);
  return Boolean(key) && (key === remote.canonicalKey || key === canonicalRemoteKey(remote.fetchUrl ?? "") || key === canonicalRemoteKey(remote.pushUrl ?? ""));
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
