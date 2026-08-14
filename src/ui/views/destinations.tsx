import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FolderOpen, HardDrive, Pencil, Plus, Trash2 } from "lucide-react";
import type { AppliedSourceRecord, ApplyDriftCheckRecord, ApplyProfileResult, ApplyTargetGroup, CatalogSourceSelection, DriftReport, SkillAvailabilityPlan, SkillProjectApplicabilityAssessment, TargetRecord, WorkspaceSnapshot } from "../../shared/types";
import type { Dictionary } from "../i18n";
import type { DefaultTarget } from "../types";
import { basename, createApplyTargetGroup, formatDate, formatTimeAgo, hasMixedApplyTargetModes, resolveApplyTargetEntries, selectedSkillCount, summarizeApplyResults, usesAvailabilityPlanning } from "../utils";

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
  availabilityPreview?: { group: ApplyTargetGroup; plan: SkillAvailabilityPlan };
  isPlanningAvailability: boolean;
  isApplyingAvailability: boolean;
  appliedSources: AppliedSourceRecord[];
  appliedSourceDriftReports: DriftReport[];
  targetHistory: TargetRecord[];
  checkTargetGroupDrift: (group: ApplyTargetGroup) => void;
  applyTargetGroup: (group: ApplyTargetGroup) => void;
  confirmAvailabilityApply: (cleanupPaths: string[], save: boolean, projectAssessments: SkillProjectApplicabilityAssessment[], catalogSourceSelections: CatalogSourceSelection[]) => void;
  cancelAvailabilityPlan: () => void;
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
  const availabilityAware = Boolean(activeGroup && usesAvailabilityPlanning(activeGroup));
  const mixedTargetModes = Boolean(activeGroup && hasMixedApplyTargetModes(activeGroup));
  const canApply = Boolean(activeGroup && selectedTargets.length > 0 && !props.isCheckingDrift && !mixedTargetModes && (availabilityAware ? props.driftReports.length > 0 : hasDriftChanges));
  const displayedAtMs = useMemo(() => Date.now(), [props.snapshot.root, activeGroup?.id, props.driftCheck?.checkedAt]);

  useEffect(() => {
    if (!props.autoCheckReady) return;
    if (!activeGroup || hasMixedApplyTargetModes(activeGroup) || props.isCheckingDrift || selectedTargets.length === 0) return;
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
                  <span>{appliedTargetSummary(record, t)}</span>
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
              <button onClick={() => props.checkTargetGroupDrift(activeGroup)} disabled={selectedTargets.length === 0 || props.isCheckingDrift || mixedTargetModes}>{props.isCheckingDrift ? t.checkingDrift : t.checkDrift}</button>
              <button className={canApply ? "primary" : undefined} onClick={() => props.applyTargetGroup(activeGroup)} disabled={!canApply || props.isPlanningAvailability}>
                {props.isPlanningAvailability ? t.planningAvailability : availabilityAware ? t.reviewAvailabilityPlan : t.apply}
              </button>
            </div>
            {availabilityAware && <p className="muted">{t.availabilityPlanningHelp}</p>}
            {mixedTargetModes && <p className="field-hint">{t.mixedTargetModesHelp}</p>}
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
                  {extraSummary(report, t) && <span>{extraSummary(report, t)}</span>}
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
                    {extraSummary(report, t) && <span>{extraSummary(report, t)}</span>}
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
      {props.availabilityPreview && (
        <AvailabilityPlanDialog
          t={t}
          group={props.availabilityPreview.group}
          plan={props.availabilityPreview.plan}
          isApplying={props.isApplyingAvailability}
          onConfirm={props.confirmAvailabilityApply}
          onClose={props.cancelAvailabilityPlan}
        />
      )}
    </div>
  );
}

function appliedTargetSummary(record: AppliedSourceRecord, t: Dictionary): string {
  if (record.targetDir) return record.targetDir;
  const paths = [...new Set(record.availabilityItems?.flatMap((item) => item.destinations) ?? [])];
  return paths.length > 0 ? t.availabilityDestinationCount(paths.length) : t.noSelectedTargets;
}

function isStaleCheck(record: ApplyDriftCheckRecord | undefined, signature: string): boolean {
  if (!record?.checkedAt) return true;
  if (record.signature !== signature) return true;
  const time = Date.parse(record.checkedAt);
  return !Number.isFinite(time) || Date.now() - time > AUTO_CHECK_INTERVAL_MS;
}

function extraSummary(report: DriftReport, t: Dictionary): string {
  const extras = report.targetExtras ?? [];
  if (extras.length === 0) return "";
  const managedStale = extras.filter((item) => item.classification === "managed-stale").length;
  const uncertain = extras.filter((item) => item.classification === "uncertain").length;
  const unrelated = extras.filter((item) => item.classification === "unrelated").length;
  return t.targetExtrasSummary(managedStale, uncertain, unrelated);
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
  const mixedTargetModes = draft.agentTargetIds.length > 0 && customTargetCount > 0;
  const needsAgentForProjectTargets = draft.projectTargetDirs.length > 0 && draft.agentTargetIds.length === 0;
  const canSave = !mixedTargetModes && (draft.agentTargetIds.length > 0 || customTargetCount > 0);

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
        {mixedTargetModes && <p className="field-hint">{t.mixedTargetModesHelp}</p>}
        {!canSave && !mixedTargetModes && <p className="field-hint">{t.targetRequired}</p>}
        <div className="actions modal-actions">
          <button onClick={props.onClose}>{t.cancel}</button>
          <button className="primary" onClick={() => props.onSave({ ...draft, name: draft.name.trim() || t.unnamedProfile, customTargetDirs: draft.customTargetDirs ?? [] })} disabled={!canSave}>{t.saveTargetGroup}</button>
        </div>
      </section>
    </div>
  );
}

function AvailabilityPlanDialog(props: {
  t: Dictionary;
  group: ApplyTargetGroup;
  plan: SkillAvailabilityPlan;
  isApplying: boolean;
  onConfirm: (cleanupPaths: string[], save: boolean, projectAssessments: SkillProjectApplicabilityAssessment[], catalogSourceSelections: CatalogSourceSelection[]) => void;
  onClose: () => void;
}) {
  const { t, plan } = props;
  const [cleanupPaths, setCleanupPaths] = useState<string[]>([]);
  const [saveRelationship, setSaveRelationship] = useState(true);
  const [projectOverrides, setProjectOverrides] = useState<string[]>([]);
  const [catalogSourceSelections, setCatalogSourceSelections] = useState<CatalogSourceSelection[]>([]);

  useEffect(() => {
    setCleanupPaths([]);
    setSaveRelationship(true);
    setProjectOverrides([]);
    setCatalogSourceSelections([]);
  }, [plan.sourceKey, plan.profile, plan.sourcePolicyDigest]);

  const overridableAssessmentCodes = new Set([
    "PROJECT_ASSESSMENT_REQUIRED",
    "PROJECT_NOT_SUITABLE",
    "PROJECT_ASSESSMENT_NEEDS_INPUT",
    "PROJECT_ASSESSMENT_TARGET_MISMATCH"
  ]);
  const projectAssessmentSkills = plan.items.filter((item) => item.effectiveMode === "project-ambient"
    && plan.diagnostics.some((diagnostic) => diagnostic.severity === "error"
      && diagnostic.path === item.skill
      && overridableAssessmentCodes.has(diagnostic.code))).map((item) => item.skill);
  const selectedCatalogSkills = new Set(catalogSourceSelections.map((item) => item.skill));
  const overridableCatalogCodes = new Set(["CATALOG_DOWNGRADE_BLOCKED", "CATALOG_VERSION_CONFLICT"]);
  const visibleDiagnostics = plan.diagnostics.filter((item) => !((overridableAssessmentCodes.has(item.code)
    && item.path
    && projectOverrides.includes(item.path))
    || (overridableCatalogCodes.has(item.code) && item.path && selectedCatalogSkills.has(item.path))));
  const blockingDiagnostics = visibleDiagnostics.filter((item) => item.severity === "error");
  const allCleanupSelected = plan.cleanup.every((item) => cleanupPaths.includes(item.path));
  const allProjectOverridesSelected = projectAssessmentSkills.every((skill) => projectOverrides.includes(skill));
  const canConfirm = plan.items.length > 0
    && blockingDiagnostics.length === 0
    && allProjectOverridesSelected
    && (!saveRelationship || allCleanupSelected)
    && !props.isApplying;

  function toggleCleanup(targetPath: string) {
    setCleanupPaths((current) => current.includes(targetPath)
      ? current.filter((item) => item !== targetPath)
      : [...current, targetPath]);
  }

  function toggleProjectOverride(skill: string) {
    setProjectOverrides((current) => current.includes(skill)
      ? current.filter((item) => item !== skill)
      : [...current, skill]);
  }

  function toggleCatalogSourceSelection(item: SkillAvailabilityPlan["items"][number]) {
    const decision = item.catalogDecision;
    if (!decision?.incomingSourceKey || !decision.currentDigest) return;
    setCatalogSourceSelections((current) => current.some((selection) => selection.skill === item.skill)
      ? current.filter((selection) => selection.skill !== item.skill)
      : [...current, {
        skill: item.skill,
        sourceKey: decision.incomingSourceKey as string,
        contentDigest: decision.incomingDigest,
        expectedCurrentDigest: decision.currentDigest as string
      }]);
  }

  function projectAssessments(): SkillProjectApplicabilityAssessment[] {
    return plan.items.flatMap((item) => {
      if (projectOverrides.includes(item.skill)) return [{
        skill: item.skill,
        projectRoots: projectRootsForItem(item, props.group.projectTargetDirs),
        status: "overridden",
        decidedBy: "user",
        summary: "User explicitly confirmed applicability for the selected project targets.",
        conditionResults: (item.projectApplicability?.conditions ?? []).map((condition) => ({
          conditionId: condition.id,
          outcome: "unknown",
          evidence: ["Explicit Desktop user override; no semantic inference was performed by ArcForge core."]
        })),
        evidence: ["Explicit confirmation in the ArcForge application plan."],
        unknowns: (item.projectApplicability?.conditions ?? []).map((condition) => condition.description)
      } satisfies SkillProjectApplicabilityAssessment];
      if (item.projectAssessment) return [{ ...item.projectAssessment, projectRoots: [...item.projectAssessment.projectRoots] }];
      return [];
    });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal availability-plan-modal" role="dialog" aria-modal="true" aria-labelledby="availability-plan-title">
        <div className="modal-header">
          <div>
            <h3 id="availability-plan-title">{t.availabilityPlan}</h3>
            <p>{t.availabilityPlanSummary(plan.items.length, props.group.profile)}</p>
          </div>
          <button className="icon-button light" onClick={props.onClose} disabled={props.isApplying}>x</button>
        </div>

        {visibleDiagnostics.length > 0 && (
          <section className="availability-plan-section">
            <h4>{t.planDiagnostics}</h4>
            <div className="list compact">
              {visibleDiagnostics.map((diagnostic, index) => (
                <article key={`${diagnostic.code}:${diagnostic.path ?? index}`} className="row stacked">
                  <div>
                    <span className={`badge ${diagnostic.severity === "error" ? "danger" : ""}`}>{diagnostic.code}</span>
                    <p>{diagnostic.message}</p>
                    {diagnostic.path && <span>{diagnostic.path}</span>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="availability-plan-section">
          <h4>{t.skillAvailabilityDestinations}</h4>
          <div className="list">
            {plan.items.map((item) => (
              <article key={`${item.skill}:${item.sourcePath}`} className="row stacked availability-plan-item">
                <div className="availability-plan-heading">
                  <strong>{item.skill}</strong>
                  <div className="availability-badges">
                    <span className={`badge ${item.effectiveMode ? "good" : "danger"}`}>{item.effectiveMode ? t.availabilityMode(item.effectiveMode) : t.availabilityPolicyOrigin(item.policyOrigin)}</span>
                    <span className="badge">{t.availabilityPolicyOrigin(item.policyOrigin)}</span>
                  </div>
                </div>
                <p>{t.sourceRecommendation}: {item.sourceRecommendation ? t.availabilityMode(item.sourceRecommendation) : t.noSourceRecommendation}</p>
                {item.catalogDecision && (
                  <div className="availability-applicability">
                    <strong>{t.catalogDecision}: <span className={`badge ${["conflict", "downgrade-blocked"].includes(item.catalogDecision.action) ? "danger" : "good"}`}>{t.catalogDecisionAction(item.catalogDecision.action)}</span></strong>
                    <p>{t.catalogVersionPair(item.catalogDecision.currentVersion ?? "unknown", item.catalogDecision.incomingVersion ?? "unknown")}</p>
                    <p>{t.catalogSourceEvidence(item.catalogDecision.currentSourceKey ?? "unknown", item.catalogDecision.currentDigest ?? "unknown", item.catalogDecision.currentSourceCommit ?? "unknown")}</p>
                    <p>{t.catalogSourceEvidence(item.catalogDecision.incomingSourceKey ?? "unknown", item.catalogDecision.incomingDigest, item.catalogDecision.incomingSourceCommit ?? "unknown")}</p>
                    <p>{item.catalogDecision.reason}</p>
                    {["conflict", "downgrade-blocked"].includes(item.catalogDecision.action) && item.catalogDecision.incomingSourceKey && item.catalogDecision.currentDigest && (
                      <label className="check-row">
                        <input type="checkbox" checked={selectedCatalogSkills.has(item.skill)} onChange={() => toggleCatalogSourceSelection(item)} />
                        <span><strong>{t.explicitCatalogSourceSelection}</strong><small>{t.explicitCatalogSourceSelectionHelp}</small></span>
                      </label>
                    )}
                  </div>
                )}
                {item.projectApplicability && (
                  <div className="availability-applicability">
                    <strong>{t.projectApplicability}</strong>
                    <p>{item.projectApplicability.summary}</p>
                    <ul>{item.projectApplicability.conditions.map((condition) => <li key={condition.id}>{condition.description}</li>)}</ul>
                    {(item.projectApplicability.evidenceGuidance ?? []).length > 0 && <p>{t.applicabilityEvidenceGuidance}: {(item.projectApplicability.evidenceGuidance ?? []).join(" · ")}</p>}
                    {(item.projectApplicability.clarifyingQuestions ?? []).length > 0 && <p>{t.applicabilityClarifyingQuestions}: {(item.projectApplicability.clarifyingQuestions ?? []).join(" · ")}</p>}
                  </div>
                )}
                {item.projectAssessment && (
                  <div className="availability-applicability">
                    <strong>{t.projectAssessment}</strong>
                    <p><span className="badge">{item.projectAssessment.status}</span> {t.projectAssessmentBy}: {item.projectAssessment.decidedBy}</p>
                    <p>{item.projectAssessment.summary}</p>
                    {item.projectAssessment.conditionResults.length > 0 && (
                      <ul>{item.projectAssessment.conditionResults.map((result) => (
                        <li key={result.conditionId}>{result.conditionId}: {result.outcome} — {result.evidence.join(" · ")}</li>
                      ))}</ul>
                    )}
                    {item.projectAssessment.evidence.length > 0 && <p>{t.publishEvidence}: {item.projectAssessment.evidence.join(" · ")}</p>}
                    {item.projectAssessment.unknowns.length > 0 && <p>{t.publishUnknowns}: {item.projectAssessment.unknowns.join(" · ")}</p>}
                  </div>
                )}
                {item.effectiveMode === "project-ambient" && projectAssessmentSkills.includes(item.skill) && (
                  <label className="check-row">
                    <input type="checkbox" checked={projectOverrides.includes(item.skill)} onChange={() => toggleProjectOverride(item.skill)} />
                    <span><strong>{t.explicitProjectOverride}</strong><small>{t.explicitProjectOverrideHelp}</small></span>
                  </label>
                )}
                <div className="availability-paths">
                  {item.destinations.length === 0
                    ? <span>{t.noAvailabilityDestinations}</span>
                    : item.destinations.map((destination) => <span key={`${destination.kind}:${destination.path}`}>{destination.path}</span>)}
                </div>
              </article>
            ))}
          </div>
        </section>

        {plan.loaderTargets.length > 0 && (
          <section className="availability-plan-section">
            <h4>{t.onDemandLoaderTargets}</h4>
            <p className="muted">{t.onDemandLoaderHelp}</p>
            <div className="availability-paths">
              {plan.loaderTargets.map((target) => (
                <span key={`${target.agentId}:${target.path}`}>
                  {target.agentId}: {target.path} · {t.loaderTargetStatus(target.status)}
                </span>
              ))}
            </div>
          </section>
        )}

        {plan.cleanup.length > 0 && (
          <section className="availability-plan-section cleanup-plan">
            <h4>{t.cleanupCandidates}</h4>
            <p className="muted">{t.cleanupConfirmationHelp}</p>
            <div className="check-list">
              {plan.cleanup.map((item) => (
                <label key={item.path} className="check-row">
                  <input type="checkbox" checked={cleanupPaths.includes(item.path)} onChange={() => toggleCleanup(item.path)} />
                  <span><strong>{item.skill}</strong><small>{item.path}</small></span>
                </label>
              ))}
            </div>
          </section>
        )}

        <label className="check-row availability-save-relation">
          <input type="checkbox" checked={saveRelationship} onChange={(event) => setSaveRelationship(event.target.checked)} />
          <span><strong>{t.saveAvailabilityRelationship}</strong><small>{t.saveAvailabilityRelationshipHelp}</small></span>
        </label>
        {saveRelationship && plan.cleanup.length > 0 && !allCleanupSelected && <p className="field-hint">{t.cleanupRequiredForSavedRelationship}</p>}

        <div className="actions modal-actions">
          <button onClick={props.onClose} disabled={props.isApplying}>{t.cancel}</button>
          <button className="primary" onClick={() => props.onConfirm(cleanupPaths, saveRelationship, projectAssessments(), catalogSourceSelections)} disabled={!canConfirm}>
            {props.isApplying ? t.applyingAvailability : t.confirmAvailabilityApply}
          </button>
        </div>
      </section>
    </div>
  );
}

function projectRootsForItem(item: SkillAvailabilityPlan["items"][number], fallback: string[]): string[] {
  const roots = item.destinations.flatMap((destination) => destination.kind === "project-agent" && destination.projectRoot
    ? [destination.projectRoot]
    : []);
  return [...new Set(roots.length > 0 ? roots : fallback)];
}
