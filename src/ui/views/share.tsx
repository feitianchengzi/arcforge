import { useEffect, useState } from "react";
import { GitPullRequest, Pencil, Plus, Terminal, Trash2 } from "lucide-react";
import type { ShareDeliveryMethod, SharePlanResult, ShareResult, ShareTargetGroup, WorkspaceSnapshot } from "../../shared/types";
import type { Dictionary } from "../i18n";
import { createShareTargetGroup, selectedSkillCount } from "../utils";

export function Publish(props: {
  t: Dictionary;
  snapshot: WorkspaceSnapshot;
  shareResult?: ShareResult;
  sharePlan?: SharePlanResult;
  isSharing: boolean;
  shareProgress?: string;
  profileOptions: string[];
  targetGroups: ShareTargetGroup[];
  activeTargetGroup?: ShareTargetGroup;
  setActiveTargetGroupId: (value: string) => void;
  saveTargetGroups: (groups: ShareTargetGroup[], selectedId: string) => void;
  shareProject: (group: ShareTargetGroup, message: string) => void;
  confirmShareProject: (group: ShareTargetGroup, message: string, plan: SharePlanResult) => void;
  cancelSharePlan: () => void;
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
          profileOptions={props.profileOptions}
          onSave={upsertGroup}
          onClose={() => setEditingGroup(undefined)}
        />
      )}
    </div>
  );
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
