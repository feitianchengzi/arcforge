import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FolderOpen, HardDrive, Pencil, Plus, Trash2 } from "lucide-react";
import type { AppliedSourceRecord, ApplyDriftCheckRecord, ApplyProfileResult, ApplyTargetGroup, DriftReport, TargetRecord, WorkspaceSnapshot } from "../../shared/types";
import type { Dictionary } from "../i18n";
import type { DefaultTarget } from "../types";
import { basename, createApplyTargetGroup, formatDate, formatTimeAgo, resolveApplyTargetEntries, selectedSkillCount, summarizeApplyResults } from "../utils";

const AUTO_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function ApplySkills(props: {
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
  driftCheck?: ApplyDriftCheckRecord;
  driftSignature: string;
  autoCheckReady: boolean;
  isCheckingDrift: boolean;
  applyResults: ApplyProfileResult[];
  appliedSources: AppliedSourceRecord[];
  appliedSourceDriftReports: DriftReport[];
  targetHistory: TargetRecord[];
  checkTargetGroupDrift: (group: ApplyTargetGroup) => void;
  applyTargetGroup: (group: ApplyTargetGroup) => void;
  checkAppliedSourceDrift: (id?: string) => void;
  runAppliedSource: (id?: string) => void;
  openDriftDiff: (report: DriftReport) => void;
}) {
  const { t } = props;
  const [editingGroup, setEditingGroup] = useState<ApplyTargetGroup | undefined>();
  const activeGroup = props.activeTargetGroup;
  const selectedTargets = activeGroup ? resolveApplyTargetEntries(activeGroup, props.defaultTargets) : [];
  const selectedSkills = activeGroup ? selectedSkillCount(props.snapshot, activeGroup.profile) : 0;
  const latestApplySummary = summarizeApplyResults(props.applyResults);
  const hasDriftChanges = props.driftReports.some((report) => report.items.some((item) => item.status !== "same"));
  const canApply = Boolean(activeGroup && selectedTargets.length > 0 && hasDriftChanges && !props.isCheckingDrift);
  const displayedAtMs = useMemo(() => Date.now(), [props.snapshot.root, activeGroup?.id, props.driftCheck?.checkedAt]);

  useEffect(() => {
    if (!props.autoCheckReady) return;
    if (!activeGroup || props.isCheckingDrift || selectedTargets.length === 0) return;
    if (!isStaleCheck(props.driftCheck, props.driftSignature)) return;
    props.checkTargetGroupDrift(activeGroup);
  }, [props.autoCheckReady, activeGroup?.id, props.driftCheck?.checkedAt, props.driftCheck?.signature, props.driftSignature, props.isCheckingDrift, selectedTargets.length]);

  function upsertGroup(group: ApplyTargetGroup) {
    const existing = props.targetGroups.some((item) => item.id === group.id);
    const next = existing ? props.targetGroups.map((item) => item.id === group.id ? group : item) : [...props.targetGroups, group];
    props.saveTargetGroups(next, group.id);
    setEditingGroup(undefined);
  }

  function deleteGroup(groupId: string) {
    const group = props.targetGroups.find((item) => item.id === groupId);
    if (!window.confirm(t.confirmDeleteTargetGroup(group?.name || t.unnamedProfile))) return;
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
                  <span>{group.profile} / {t.targetGroupSummary(group.agentTargetIds.length, targets.length)}</span>
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
        <h4>{t.appliedSources}</h4>
        {props.appliedSources.length === 0 ? <p className="muted">{t.noAppliedSources}</p> : (
          <div className="list">
            {props.appliedSources.map((record) => (
              <article key={record.id} className="row stacked">
                <div>
                  <strong>{record.sourceName ?? record.sourceRoot}</strong>
                  <span className="badge">{t.appliedRelationKind(record.relationKind)}</span>
                  <p>{t.appliedSourceSummary(record.skills.length, record.profile)}</p>
                  <span>{record.targetDir}</span>
                </div>
                <div className="actions">
                  <button onClick={() => props.checkAppliedSourceDrift(record.id)} disabled={props.isCheckingDrift}>{props.isCheckingDrift ? t.checkingDrift : t.checkDrift}</button>
                  <button onClick={() => props.runAppliedSource(record.id)}>{t.reapplyRelation(record.relationKind)}</button>
                </div>
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
              <button onClick={() => props.checkTargetGroupDrift(activeGroup)} disabled={selectedTargets.length === 0 || props.isCheckingDrift}>{props.isCheckingDrift ? t.checkingDrift : t.checkDrift}</button>
              <button className={canApply ? "primary" : undefined} onClick={() => props.applyTargetGroup(activeGroup)} disabled={!canApply}>{t.apply}</button>
            </div>
            {selectedTargets.length === 0 && <p className="muted">{activeGroup.projectTargetDirs.length > 0 ? t.agentRequired : t.targetRequired}</p>}
            {latestApplySummary && <p className="muted">{t.copiedSkipped(latestApplySummary.copied, latestApplySummary.skipped, latestApplySummary.copiedAssets, latestApplySummary.skippedAssets)}</p>}
          </>
        )}

        <h4>{t.drift}</h4>
        {props.driftCheck?.checkedAt && (
          <>
            <p className="muted">{t.sourceCheckedAgo(formatTimeAgo(props.driftCheck.checkedAt, displayedAtMs))}</p>
            <p className="muted">{t.sourceCheckedAt(formatDate(props.driftCheck.checkedAt))}</p>
          </>
        )}
        {props.driftCheck?.error && <p className="muted">{t.errorStatus(props.driftCheck.error)}</p>}
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
        {props.appliedSourceDriftReports.length > 0 && (
          <>
            <h4>{t.appliedSources}</h4>
            <div className="list">
              {props.appliedSourceDriftReports.map((report) => (
                <article key={`applied-${report.targetDir}`} className="row stacked">
                  <div>
                    <strong>{report.targetDir}</strong>
                    <p>{report.items.filter((item) => item.status !== "same").length} changed / {report.items.length} checked</p>
                  </div>
                  <button onClick={() => props.openDriftDiff(report)}><ExternalLink size={16} /> {t.viewDiff}</button>
                </article>
              ))}
            </div>
          </>
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

function isStaleCheck(record: ApplyDriftCheckRecord | undefined, signature: string): boolean {
  if (!record?.checkedAt) return true;
  if (record.signature !== signature) return true;
  const time = Date.parse(record.checkedAt);
  return !Number.isFinite(time) || Date.now() - time > AUTO_CHECK_INTERVAL_MS;
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

  async function addCustomTarget() {
    const selected = await props.chooseProjectTarget();
    const customTargetDirs = draft.customTargetDirs ?? [];
    if (!selected || customTargetDirs.includes(selected)) return;
    setDraft({ ...draft, customTargetDirs: [...customTargetDirs, selected] });
  }

  function removeProjectTarget(targetDir: string) {
    if (!window.confirm(t.confirmRemoveTarget(targetDir))) return;
    setDraft({ ...draft, projectTargetDirs: draft.projectTargetDirs.filter((item) => item !== targetDir) });
  }

  function removeCustomTarget(targetDir: string) {
    if (!window.confirm(t.confirmRemoveTarget(targetDir))) return;
    setDraft({ ...draft, customTargetDirs: (draft.customTargetDirs ?? []).filter((item) => item !== targetDir) });
  }

  const customTargetCount = (draft.customTargetDirs ?? []).length;
  const needsAgentForProjectTargets = draft.projectTargetDirs.length > 0 && draft.agentTargetIds.length === 0;
  const canSave = draft.agentTargetIds.length > 0 || customTargetCount > 0;

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
        <p className="muted">{t.targetRoutingHelp}</p>
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
        {needsAgentForProjectTargets && <p className="field-hint">{t.agentRequired}</p>}
        <div className="target-subsection">
          <div className="section-header">
            <div>
              <strong>{t.agentProjectFolders}</strong>
              <p className="muted">{t.agentProjectFolderHelp}</p>
            </div>
            <button onClick={addProjectTarget}><FolderOpen size={16} /> {t.addAgentProjectFolder}</button>
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
        </div>
        <label>{t.customTargets}</label>
        <div className="actions">
          <button onClick={addCustomTarget}><FolderOpen size={16} /> {t.addCustomTarget}</button>
        </div>
        {(draft.customTargetDirs ?? []).length === 0 ? <p className="muted">{t.noSelectedTargets}</p> : (
          <div className="list compact">
            {(draft.customTargetDirs ?? []).map((targetDir) => (
              <article key={targetDir} className="row">
                <span>{targetDir}</span>
                <button onClick={() => removeCustomTarget(targetDir)}><Trash2 size={16} /> {t.remove}</button>
              </article>
            ))}
          </div>
        )}
        {!canSave && <p className="field-hint">{t.targetRequired}</p>}
        <div className="actions modal-actions">
          <button onClick={props.onClose}>{t.cancel}</button>
          <button className="primary" onClick={() => props.onSave({ ...draft, name: draft.name.trim() || t.unnamedProfile, customTargetDirs: draft.customTargetDirs ?? [] })} disabled={!canSave}>{t.saveTargetGroup}</button>
        </div>
      </section>
    </div>
  );
}
