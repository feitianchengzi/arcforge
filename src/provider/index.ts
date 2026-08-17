import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import type {
  AppliedSourceRecord,
  ApplyFromSourceResult,
  CatalogSourceSelection,
  DriftFileDiff,
  DriftReport,
  SkillAvailabilityOverride,
  SkillAvailabilityPlan,
  SkillProjectApplicabilityAssessment,
  SkillSourceProvenance,
  UserSkillCatalogEntry
} from "../shared/types.js";
import {
  applyAvailabilityFromSource,
  createAvailabilityPlanFromSource,
  driftAvailabilityFromSource,
  listAppliedSources
} from "../core/sources.js";
import { catalogDirectoryDigest, loadUserSkillCatalog, readUserSkillCatalogIndex, restoreUserSkillCatalogIndex, saveUserSkillCatalog } from "../core/skill-catalog.js";
import { saveLocalProjectAppliedSources } from "../core/project-store.js";
import { pathExists } from "../core/fs.js";
import { compareDirectory } from "../core/profiles.js";

export const ARCFORGE_EMBEDDED_PROVIDER_API_VERSION = "arcforge-embedded-provider/v1";
export const ARCFORGE_EMBEDDED_PROVIDER_CAPABILITIES = ["declared-shared-assets/v1", "source-upgrade-recovery/v1", "conflict-reinstall-recovery/v1"] as const;

export type ProvisioningUpgradeDisposition =
  | "managed-repair"
  | "managed-migration"
  | "local-content-conflict"
  | "unverified-managed"
  | "unmanaged-conflict";

export interface ProvisioningUpgradeItem {
  disposition: ProvisioningUpgradeDisposition;
  name: string;
  kind: "skill" | "asset" | "loader" | "policy";
  path: string;
  sourcePath?: string;
  observedStatus: "missing" | "changed";
  expectedDigest?: string;
  observedDigest?: string;
  files?: DriftFileDiff[];
  reason: string;
}

export interface ProvisioningUpgradeAssessment {
  apiVersion: typeof ARCFORGE_EMBEDDED_PROVIDER_API_VERSION;
  assessmentDigest: string;
  sourceRoot: string;
  relationIds: string[];
  items: ProvisioningUpgradeItem[];
  canProceed: boolean;
  canBackupAndRestore: boolean;
  canBackupAndReinstall: boolean;
  writeState: "not_started";
}

export interface RecoverProvisioningUpgradeOptions extends ProvisioningOptions {
  expectedAssessmentDigest: string;
  action: "backup-and-restore" | "backup-and-reinstall";
  backupRoot: string;
  confirm: true;
}

export interface RecoverProvisioningUpgradeResult {
  assessment: ProvisioningUpgradeAssessment;
  backupPath: string;
  restoredPaths: string[];
}

export interface ProvisioningOptions {
  sourceRoot: string;
  consumerRoot: string;
  stateRoot: string;
  homeDir: string;
  profile?: string;
  skills?: string[];
  agentTargetIds: string[];
  projectTargetDirs?: string[];
  availabilityOverrides?: SkillAvailabilityOverride[];
  projectAssessments?: SkillProjectApplicabilityAssessment[];
  sourceProvenance?: SkillSourceProvenance;
  catalogSourceSelections?: CatalogSourceSelection[];
}

export interface ProvisioningPlanEnvelope {
  apiVersion: typeof ARCFORGE_EMBEDDED_PROVIDER_API_VERSION;
  planDigest: string;
  plan: SkillAvailabilityPlan;
  sharedAssets: ProvisionedSharedAsset[];
  targetEvidence: ManagedPathEvidence[];
}

export interface ProvisionedSharedAsset {
  name: string;
  sourcePath: string;
  contentDigest: string;
  destinations: string[];
}

export interface ApplyProvisioningOptions extends ProvisioningOptions {
  expectedPlanDigest: string;
  cleanupPaths?: string[];
  confirm: true;
}

export interface ListProvisioningRelationsOptions {
  consumerRoot: string;
  stateRoot: string;
  sourceRoot?: string;
}

export interface RemoveManagedProvisioningOptions extends ListProvisioningRelationsOptions {
  managedPaths: string[];
  confirmationDigest?: string;
  confirm?: boolean;
}

export interface ManagedRemovalPlan {
  apiVersion: typeof ARCFORGE_EMBEDDED_PROVIDER_API_VERSION;
  confirmationDigest: string;
  consumerRoot: string;
  sourceRoot?: string;
  relationIds: string[];
  managedPaths: string[];
  pathEvidence: ManagedPathEvidence[];
  requiresConfirm: true;
}

export interface ManagedPathEvidence {
  path: string;
  exists: boolean;
  digest?: string;
}

export interface ManagedRemovalResult {
  plan: ManagedRemovalPlan;
  removedPaths: string[];
  retainedSharedPaths: string[];
  updatedRelationIds: string[];
}

export async function inspectProvider(): Promise<{
  apiVersion: typeof ARCFORGE_EMBEDDED_PROVIDER_API_VERSION;
  providerVersion: string;
  buildCommit: string;
  loaderDigest: string;
  capabilities: string[];
}> {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const manifest = await readJsonIfPresent(path.join(packageRoot, "arcforge-provider.manifest.json"));
  const packageJson = await readJsonIfPresent(path.join(packageRoot, "package.json"));
  return {
    apiVersion: ARCFORGE_EMBEDDED_PROVIDER_API_VERSION,
    providerVersion: stringValue(manifest?.providerVersion) || stringValue(packageJson?.version) || "0.0.0-development",
    buildCommit: stringValue(manifest?.buildCommit) || "development",
    loaderDigest: await catalogDirectoryDigest(path.join(packageRoot, "skills", "arcforge-on-demand")),
    capabilities: [...ARCFORGE_EMBEDDED_PROVIDER_CAPABILITIES]
  };
}

export async function createProvisioningPlan(options: ProvisioningOptions): Promise<ProvisioningPlanEnvelope> {
  assertProvisioningRoots(options);
  const availabilityOptions = await toAvailabilityOptions(options);
  const plan = await createAvailabilityPlanFromSource(availabilityOptions);
  const sharedAssets = plan.assets.map((asset) => ({
    name: asset.name,
    sourcePath: asset.sourcePath,
    contentDigest: asset.contentDigest,
    destinations: asset.destinations.map((destination) => destination.path)
  }));
  return envelope(plan, sharedAssets, await inspectPaths([
    ...plan.items.flatMap((item) => item.destinations.map((destination) => destination.path)),
    ...sharedAssets.flatMap((asset) => asset.destinations)
  ]));
}

export async function driftProvisioningPlan(options: ProvisioningOptions): Promise<DriftReport> {
  assertProvisioningRoots(options);
  return driftAvailabilityFromSource(await toAvailabilityOptions(options));
}

export async function applyProvisioningPlan(options: ApplyProvisioningOptions): Promise<ApplyFromSourceResult> {
  assertProvisioningRoots(options);
  if (!options.confirm) throw new Error("Embedded provider apply requires confirm=true.");
  const fresh = await createProvisioningPlan(options);
  if (!safeDigestEqual(fresh.planDigest, options.expectedPlanDigest)) {
    throw new Error("Embedded provider plan changed after confirmation; create and review a fresh plan.");
  }
  return applyAvailabilityFromSource({
    ...await toAvailabilityOptions(options),
    confirm: true,
    save: true,
    cleanupPaths: options.cleanupPaths,
    allowUnrelatedRoot: true,
    providerCapabilities: [...ARCFORGE_EMBEDDED_PROVIDER_CAPABILITIES]
  });
}

export async function listProvisioningRelations(options: ListProvisioningRelationsOptions): Promise<AppliedSourceRecord[]> {
  assertAbsoluteDirectoryInput("consumerRoot", options.consumerRoot);
  assertAbsoluteDirectoryInput("stateRoot", options.stateRoot);
  const sourceRoot = options.sourceRoot ? path.resolve(options.sourceRoot) : undefined;
  const records = await listAppliedSources(path.resolve(options.consumerRoot), path.resolve(options.stateRoot));
  return sourceRoot ? records.filter((record) => localPathIdentity(record.sourceRoot) === localPathIdentity(sourceRoot)) : records;
}

export async function assessProvisioningUpgrade(options: ProvisioningOptions): Promise<ProvisioningUpgradeAssessment> {
  assertProvisioningRoots(options);
  const envelope = await createProvisioningPlan(options);
  const relations = await listProvisioningRelations({
    consumerRoot: options.consumerRoot,
    stateRoot: options.stateRoot,
    sourceRoot: options.sourceRoot
  });
  const relationIds = relations.map((record) => record.id).sort();
  const ownedPaths = managedRelationPaths(relations);
  const evidenceByPath = new Map(relations.flatMap((record) => record.provisioningEvidence?.targets ?? [])
    .map((item) => [localPathIdentity(item.path), item] as const));
  const blocking = envelope.plan.diagnostics.filter((item) => item.severity === "error");
  const items: ProvisioningUpgradeItem[] = blocking.map((diagnostic) => ({
    disposition: "unmanaged-conflict",
    name: diagnostic.code,
    kind: diagnostic.code === "ON_DEMAND_LOADER_CONFLICT" ? "loader" : "policy",
    path: diagnostic.path ? path.resolve(diagnostic.path) : path.resolve(options.sourceRoot),
    observedStatus: "changed",
    reason: diagnostic.message
  }));

  if (!blocking.length) {
    const drift = await driftProvisioningPlan(options);
    const policyBySkill = new Map((drift.policyDrift ?? []).map((item) => [item.skill, item]));
    for (const item of drift.items) {
      if (item.status === "same") continue;
      const targetPath = path.resolve(item.targetPath);
      const targetIdentity = localPathIdentity(targetPath);
      const evidence = evidenceByPath.get(targetIdentity);
      const owned = ownedPaths.has(targetIdentity);
      const policy = policyBySkill.get(item.skill);
      const policyProvesMigration = policy?.status === "changed"
        && item.status === "missing"
        && policy.currentPaths.some((value) => localPathIdentity(value) === targetIdentity)
        && (policy.recordedPaths ?? []).some((value) => ownedPaths.has(localPathIdentity(value)));
      let observedDigest: string | undefined;
      if (item.status === "changed") {
        observedDigest = (await inspectPaths([targetPath]))[0]?.digest;
      }
      let disposition: ProvisioningUpgradeDisposition;
      let reason: string;
      if (!owned && policyProvesMigration) {
        disposition = "managed-migration";
        reason = "The saved relationship owns the recorded destination and the provider policy moved it to this new target.";
      } else if (item.status === "missing") {
        disposition = "managed-repair";
        reason = owned
          ? "The saved relationship owns this missing target; a confirmed apply may recreate it."
          : "The target is absent, so a confirmed apply may install it without overwriting local content.";
      } else if (!owned) {
        disposition = "unmanaged-conflict";
        reason = "The target is not owned by the saved provisioning relationship.";
      } else if (item.kind === "loader" && envelope.plan.loaderTargets.some((loader) => localPathIdentity(loader.path) === targetIdentity && loader.status === "managed-update")) {
        disposition = "managed-migration";
        reason = "The saved target context proves this loader is provider-managed and eligible for migration.";
      } else if (!evidence) {
        disposition = "unverified-managed";
        reason = "The saved relationship owns this target but predates last-applied content evidence.";
      } else if (observedDigest === evidence.contentDigest) {
        disposition = "managed-migration";
        reason = "The target still matches the last-applied digest and differs only from the current provider source.";
      } else {
        disposition = "local-content-conflict";
        reason = "The target differs from its recorded last-applied digest; preserve it before restoring managed content.";
      }
      items.push({
        disposition,
        name: item.skill,
        kind: item.kind ?? "skill",
        path: targetPath,
        sourcePath: path.resolve(item.sourcePath),
        observedStatus: item.status,
        expectedDigest: evidence?.contentDigest,
        observedDigest,
        files: item.files,
        reason
      });
    }
    for (const policy of drift.policyDrift ?? []) {
      if (policy.status === "same") continue;
      const recordedPaths = policy.recordedPaths ?? [];
      if (!recordedPaths.length) {
        if (!relations.length) continue;
        items.push({ disposition: "unverified-managed", name: policy.skill, kind: "policy", path: policy.currentPaths[0] ?? path.resolve(options.sourceRoot), observedStatus: "changed", reason: policy.reason });
        continue;
      }
      for (const recordedPath of recordedPaths) {
        const resolved = path.resolve(recordedPath);
        const observed = (await inspectPaths([resolved]))[0];
        const planned = envelope.plan.items.find((item) => item.skill === policy.skill);
        const evidence = evidenceByPath.get(localPathIdentity(resolved));
        const sourcePath = planned ? path.resolve(options.sourceRoot, planned.sourcePath) : undefined;
        const expectedDigest = evidence?.contentDigest ?? planned?.contentDigest;
        const matchesExpected = Boolean(observed?.exists && observed.digest && expectedDigest && observed.digest === expectedDigest);
        const comparison = observed?.exists && sourcePath ? await compareDirectory(sourcePath, resolved) : undefined;
        const disposition: ProvisioningUpgradeDisposition = !observed?.exists
          ? "managed-repair"
          : matchesExpected
            ? "managed-migration"
            : evidence
              ? "local-content-conflict"
              : "unverified-managed";
        items.push({
          disposition,
          name: policy.skill,
          kind: "policy",
          path: resolved,
          sourcePath,
          observedStatus: observed?.exists ? "changed" : "missing",
          expectedDigest,
          observedDigest: observed?.digest,
          files: comparison?.files,
          reason: !observed?.exists
            ? `The relationship-owned recorded destination is missing while the provider policy moves it: ${policy.reason}`
            : matchesExpected
              ? `The provider policy moved this unchanged relationship-owned destination: ${policy.reason}`
              : evidence
                ? `The recorded destination changed after its last applied digest and must be preserved before migration: ${policy.reason}`
                : `The recorded destination predates last-applied digest evidence and must be preserved before migration: ${policy.reason}`
        });
      }
    }
    for (const extra of drift.targetExtras ?? []) {
      if (extra.classification !== "managed-stale") continue;
      items.push({
        disposition: ownedPaths.has(localPathIdentity(extra.targetPath)) ? "managed-migration" : "unmanaged-conflict",
        name: extra.name,
        kind: "skill",
        path: path.resolve(extra.targetPath),
        observedStatus: "changed",
        reason: extra.reason
      });
    }
  }

  const normalizedItems = dedupeUpgradeItems(items);
  const blockingItems = normalizedItems.filter((item) => ["local-content-conflict", "unverified-managed", "unmanaged-conflict"].includes(item.disposition));
  const canBackupAndReinstall = blockingItems.length > 0 && blockingItems.every((item) => (
    item.observedStatus === "changed"
    && Boolean(item.sourcePath)
    && path.dirname(path.resolve(item.path)) !== path.resolve(item.path)
    && localPathIdentity(item.path) !== localPathIdentity(item.sourcePath as string)
  ));
  const assessmentBase = {
    apiVersion: ARCFORGE_EMBEDDED_PROVIDER_API_VERSION as typeof ARCFORGE_EMBEDDED_PROVIDER_API_VERSION,
    sourceRoot: path.resolve(options.sourceRoot),
    relationIds,
    items: normalizedItems,
    canProceed: blockingItems.length === 0,
    canBackupAndRestore: blockingItems.length > 0 && blockingItems.every((item) => ["local-content-conflict", "unverified-managed"].includes(item.disposition)),
    canBackupAndReinstall,
    writeState: "not_started" as const
  };
  return { ...assessmentBase, assessmentDigest: digest(assessmentBase) };
}

export async function recoverProvisioningUpgrade(options: RecoverProvisioningUpgradeOptions): Promise<RecoverProvisioningUpgradeResult> {
  assertProvisioningRoots(options);
  assertAbsoluteDirectoryInput("backupRoot", options.backupRoot);
  if (!options.confirm || !["backup-and-restore", "backup-and-reinstall"].includes(options.action)) {
    throw new Error("Provisioning recovery requires an explicit supported recovery confirmation.");
  }
  const assessment = await assessProvisioningUpgrade(options);
  if (!safeDigestEqual(assessment.assessmentDigest, options.expectedAssessmentDigest)) {
    throw new Error("Provisioning recovery assessment changed after confirmation; inspect a fresh assessment.");
  }
  const managedRestore = options.action === "backup-and-restore";
  if (managedRestore && !assessment.canBackupAndRestore) throw new Error("Provisioning assessment is not eligible for managed backup-and-restore.");
  if (!managedRestore && !assessment.canBackupAndReinstall) throw new Error("Provisioning assessment is not eligible for backup-and-reinstall.");
  const recoverable = dedupeRecoveryItems(assessment.items.filter((item) => (
    managedRestore
      ? ["local-content-conflict", "unverified-managed"].includes(item.disposition)
      : ["local-content-conflict", "unverified-managed", "unmanaged-conflict"].includes(item.disposition)
  )));
  if (recoverable.some((item) => !item.sourcePath)) throw new Error("Provisioning recovery is missing a provider source path.");

  const recoveryId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID()}`;
  const staging = path.join(path.resolve(options.backupRoot), `.stage-${recoveryId}`);
  const backupPath = path.join(path.resolve(options.backupRoot), recoveryId);
  const replacements: Array<{ target: string; source: string; temporary: string; rollback: string; committed: boolean }> = [];
  let backupCommitted = false;
  await fs.mkdir(path.join(staging, "items"), { recursive: true });
  try {
    for (const [index, item] of recoverable.entries()) {
      const target = path.resolve(item.path);
      const source = path.resolve(item.sourcePath as string);
      if (path.dirname(target) === target || target === source) throw new Error(`Refusing unsafe source-upgrade recovery target: ${target}`);
      const label = `${String(index + 1).padStart(3, "0")}-${safePathSegment(item.name)}`;
      await fs.cp(target, path.join(staging, "items", label), { recursive: true, errorOnExist: true });
      const temporary = path.join(path.dirname(target), `.${path.basename(target)}.restore-${crypto.randomUUID()}`);
      const rollback = path.join(path.dirname(target), `.${path.basename(target)}.rollback-${crypto.randomUUID()}`);
      await fs.cp(source, temporary, { recursive: true, errorOnExist: true });
      replacements.push({ target, source, temporary, rollback, committed: false });
    }
    await fs.writeFile(path.join(staging, "recovery.json"), `${JSON.stringify({ assessment, action: options.action, createdAt: new Date().toISOString() }, null, 2)}\n`);
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.rename(staging, backupPath);
    backupCommitted = true;
    for (const replacement of replacements) {
      await fs.rename(replacement.target, replacement.rollback);
      try {
        await fs.rename(replacement.temporary, replacement.target);
        replacement.committed = true;
      } catch (error) {
        await fs.rename(replacement.rollback, replacement.target);
        throw error;
      }
    }
    if (!managedRestore) {
      const fresh = await createProvisioningPlan(options);
      await applyProvisioningPlan({ ...options, expectedPlanDigest: fresh.planDigest, confirm: true });
    }
    for (const replacement of replacements) await fs.rm(replacement.rollback, { recursive: true, force: true }).catch(() => undefined);
    return { assessment, backupPath, restoredPaths: replacements.map((item) => item.target).sort() };
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    for (const replacement of replacements.reverse()) {
      if (replacement.committed) {
        await fs.rm(replacement.target, { recursive: true, force: true }).catch((item) => rollbackErrors.push(item));
        await fs.rename(replacement.rollback, replacement.target).catch((item) => rollbackErrors.push(item));
      }
      await fs.rm(replacement.temporary, { recursive: true, force: true }).catch((item) => rollbackErrors.push(item));
    }
    if (!backupCommitted) await fs.rm(staging, { recursive: true, force: true }).catch((item) => rollbackErrors.push(item));
    if (rollbackErrors.length) throw new AggregateError([error, ...rollbackErrors], "Source-upgrade recovery failed and rollback was incomplete.");
    throw error;
  }
}

export async function removeManagedProvisioning(options: RemoveManagedProvisioningOptions): Promise<ManagedRemovalPlan | ManagedRemovalResult> {
  const plan = await createManagedRemovalPlan(options);
  if (!options.confirm) return plan;
  if (!options.confirmationDigest || !safeDigestEqual(plan.confirmationDigest, options.confirmationDigest)) {
    throw new Error("Managed removal changed after confirmation; create and review a fresh removal plan.");
  }

  const stateRoot = path.resolve(options.stateRoot);
  const consumerRoot = path.resolve(options.consumerRoot);
  const catalogRoot = path.join(stateRoot, "catalog");
  const previousRecords = await listAppliedSources(consumerRoot, stateRoot);
  const selectedIds = new Set(plan.relationIds);
  const selectedPaths = new Set(plan.managedPaths.map(localPathIdentity));
  const nextRecords = previousRecords.map((record) => selectedIds.has(record.id) ? withoutManagedPaths(record, selectedPaths) : record);
  const previousCatalogRaw = await readUserSkillCatalogIndex({ catalogRoot });
  const previousCatalog = await loadUserSkillCatalog({ catalogRoot });
  const nextCatalogEntries = updateCatalogEntries(previousCatalog.entries, selectedIds, selectedPaths, catalogRoot);
  const catalogChanged = stableJson(previousCatalog.entries) !== stableJson(nextCatalogEntries);
  const retainedSharedPaths = new Set(nextCatalogEntries.map((entry) => localPathIdentity(entry.installedPath)));
  const removablePaths = plan.managedPaths.filter((managedPath) => !retainedSharedPaths.has(localPathIdentity(managedPath)));
  const staged: Array<{ target: string; backup: string }> = [];
  let catalogWritten = false;
  let recordsWritten = false;
  try {
    for (const target of removablePaths) {
      if (!(await pathExists(target))) continue;
      const backup = path.join(path.dirname(target), `.${path.basename(target)}.remove-${crypto.randomUUID()}`);
      await fs.rename(target, backup);
      staged.push({ target, backup });
    }
    if (catalogChanged) {
      await saveUserSkillCatalog(nextCatalogEntries, { catalogRoot });
      catalogWritten = true;
    }
    await saveLocalProjectAppliedSources(consumerRoot, nextRecords, { stateRoot });
    recordsWritten = true;
    for (const item of staged) await fs.rm(item.backup, { recursive: true, force: true }).catch(() => undefined);
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    if (recordsWritten) await saveLocalProjectAppliedSources(consumerRoot, previousRecords, { stateRoot }).catch((item) => rollbackErrors.push(item));
    if (catalogWritten) await restoreUserSkillCatalogIndex(previousCatalogRaw, { catalogRoot }).catch((item) => rollbackErrors.push(item));
    for (const item of staged.reverse()) {
      if (await pathExists(item.backup)) await fs.rename(item.backup, item.target).catch((rollbackError) => rollbackErrors.push(rollbackError));
    }
    if (rollbackErrors.length) throw new AggregateError([error, ...rollbackErrors], "Managed removal failed and rollback was incomplete.");
    throw error;
  }
  return {
    plan,
    removedPaths: staged.map((item) => item.target).sort(),
    retainedSharedPaths: plan.managedPaths.filter((item) => retainedSharedPaths.has(localPathIdentity(item))).sort(),
    updatedRelationIds: plan.relationIds
  };
}

async function createManagedRemovalPlan(options: RemoveManagedProvisioningOptions): Promise<ManagedRemovalPlan> {
  const records = await listProvisioningRelations(options);
  const allowed = new Set(records.flatMap((record) => [
    ...(record.availabilityItems?.flatMap((item) => item.destinations) ?? []),
    ...(record.availabilityAssets?.flatMap((item) => item.destinations) ?? [])
  ].map(localPathIdentity)));
  const managedPathByIdentity = new Map(options.managedPaths.map((item) => {
    const resolved = path.resolve(item);
    return [localPathIdentity(resolved), resolved] as const;
  }));
  const managedPaths = [...managedPathByIdentity.values()].sort();
  const managedPathIdentities = new Set(managedPathByIdentity.keys());
  if (!managedPaths.length) throw new Error("Managed removal requires at least one explicit managed path.");
  for (const managedPath of managedPaths) {
    if (!allowed.has(localPathIdentity(managedPath))) throw new Error(`Managed removal path is not proven by the selected relation: ${managedPath}`);
    if (path.dirname(managedPath) === managedPath) throw new Error(`Refusing to remove a filesystem root: ${managedPath}`);
  }
  const relationIds = records
    .filter((record) => [
      ...(record.availabilityItems?.flatMap((item) => item.destinations) ?? []),
      ...(record.availabilityAssets?.flatMap((item) => item.destinations) ?? [])
    ].some((destination) => managedPathIdentities.has(localPathIdentity(destination))))
    .map((record) => record.id)
    .sort();
  const pathEvidence = await inspectPaths(managedPaths);
  const normalized: Omit<ManagedRemovalPlan, "confirmationDigest" | "requiresConfirm"> = {
    apiVersion: ARCFORGE_EMBEDDED_PROVIDER_API_VERSION,
    consumerRoot: path.resolve(options.consumerRoot),
    sourceRoot: options.sourceRoot ? path.resolve(options.sourceRoot) : undefined,
    relationIds,
    managedPaths,
    pathEvidence
  };
  return { ...normalized, confirmationDigest: digest(normalized), requiresConfirm: true };
}

function withoutManagedPaths(record: AppliedSourceRecord, removed: Set<string>): AppliedSourceRecord {
  const availabilityItems = record.availabilityItems?.map((item) => ({
    ...item,
    destinations: item.destinations.filter((destination) => !removed.has(localPathIdentity(destination)))
  })).filter((item) => item.destinations.length > 0);
  const availabilityAssets = record.availabilityAssets?.map((item) => ({
    ...item,
    destinations: item.destinations.filter((destination) => !removed.has(localPathIdentity(destination)))
  })).filter((item) => item.destinations.length > 0);
  const retainedSkills = new Set(availabilityItems?.map((item) => item.skill) ?? record.skills);
  const retainedManagedNames = new Set([
    ...retainedSkills,
    ...(availabilityAssets?.map((item) => item.name) ?? [])
  ]);
  return {
    ...record,
    skills: record.skills.filter((skill) => retainedSkills.has(skill)),
    managedSkillNames: (record.managedSkillNames ?? []).filter((name) => retainedManagedNames.has(name)),
    availabilityItems,
    availabilityAssets,
    updatedAt: new Date().toISOString()
  };
}

function updateCatalogEntries(entries: UserSkillCatalogEntry[], relationIds: Set<string>, removed: Set<string>, catalogRoot: string): UserSkillCatalogEntry[] {
  return entries.flatMap((entry) => {
    const associatedPaths = [
      path.resolve(entry.installedPath),
      ...entry.sourceClaims.map((claim) => path.resolve(catalogRoot, claim.sourceKey, entry.skillName))
    ];
    if (!associatedPaths.some((candidate) => removed.has(localPathIdentity(candidate)))) return [entry];
    const sourceClaims = entry.sourceClaims.map((claim) => ({
      ...claim,
      appliedRecordIds: claim.appliedRecordIds.filter((id) => !relationIds.has(id))
    }));
    const appliedRecordIds = [...new Set(sourceClaims.flatMap((claim) => claim.appliedRecordIds))].sort();
    return appliedRecordIds.length ? [{ ...entry, sourceClaims, appliedRecordIds }] : [];
  });
}

function managedRelationPaths(records: AppliedSourceRecord[]): Set<string> {
  const result = new Set<string>();
  const agentSkillDirs: Record<string, string[]> = {
    codex: [".codex", "skills"],
    claude: [".claude", "skills"],
    cursor: [".cursor", "skills"]
  };
  for (const record of records) {
    for (const destination of record.availabilityItems?.flatMap((item) => item.destinations) ?? []) result.add(localPathIdentity(destination));
    for (const destination of record.availabilityAssets?.flatMap((item) => item.destinations) ?? []) result.add(localPathIdentity(destination));
    if (record.availabilityItems?.some((item) => item.mode === "user-on-demand") && record.availabilityContext) {
      for (const agentId of record.availabilityContext.agentTargetIds) {
        const segments = agentSkillDirs[agentId.trim().toLowerCase()];
        if (segments) result.add(localPathIdentity(path.join(path.resolve(record.availabilityContext.homeDir), ...segments, "arcforge-on-demand")));
      }
    }
    for (const evidence of record.provisioningEvidence?.targets ?? []) result.add(localPathIdentity(evidence.path));
  }
  return result;
}

function dedupeUpgradeItems(items: ProvisioningUpgradeItem[]): ProvisioningUpgradeItem[] {
  const priority: Record<ProvisioningUpgradeDisposition, number> = {
    "unmanaged-conflict": 5,
    "local-content-conflict": 4,
    "unverified-managed": 3,
    "managed-migration": 2,
    "managed-repair": 1
  };
  const unique = new Map<string, ProvisioningUpgradeItem>();
  for (const item of items) {
    const key = `${item.kind}:${localPathIdentity(item.path)}`;
    const existing = unique.get(key);
    if (!existing || priority[item.disposition] > priority[existing.disposition]) unique.set(key, item);
  }
  return [...unique.values()].sort((left, right) => left.disposition.localeCompare(right.disposition) || left.path.localeCompare(right.path));
}

function dedupeRecoveryItems(items: ProvisioningUpgradeItem[]): ProvisioningUpgradeItem[] {
  const unique = new Map<string, ProvisioningUpgradeItem>();
  for (const item of items) {
    const key = localPathIdentity(item.path);
    const existing = unique.get(key);
    if (existing?.sourcePath && item.sourcePath && localPathIdentity(existing.sourcePath) !== localPathIdentity(item.sourcePath)) {
      throw new Error(`Provisioning recovery has conflicting sources for target: ${item.path}`);
    }
    if (!existing || (!existing.sourcePath && item.sourcePath)) unique.set(key, item);
  }
  return [...unique.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function localPathIdentity(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === "win32" || process.platform === "darwin" ? resolved.toLowerCase() : resolved;
}

function safePathSegment(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "target";
}

async function toAvailabilityOptions(options: ProvisioningOptions) {
  const payloadManifest = await readJsonIfPresent(path.join(options.sourceRoot, "payload.manifest.json"));
  const sourceCommit = options.sourceProvenance?.sourceCommit ?? (stringValue(payloadManifest?.sourceCommit) || undefined);
  const sourceManifestDigest = stringValue(payloadManifest?.sourceManifestDigest);
  const schemaVersion = stringValue(payloadManifest?.schemaVersion);
  const inferredIdentity = sourceCommit && sourceManifestDigest
    ? `payload:${schemaVersion || "unknown"}:${sourceCommit}:${sourceManifestDigest}`
    : undefined;
  const sourceIdentity = options.sourceProvenance?.sourceIdentity ?? inferredIdentity;
  const sourceRemoteUrl = options.sourceProvenance?.sourceRemoteUrl ?? (stringValue(payloadManifest?.sourceRemoteUrl) || undefined);
  const payloadVersion = options.sourceProvenance?.payloadVersion ?? (stringValue(payloadManifest?.payloadVersion ?? payloadManifest?.version) || undefined);
  const sourceProvenance: SkillSourceProvenance | undefined = options.sourceProvenance || payloadManifest ? {
    ...(sourceIdentity ? { sourceIdentity } : {}),
    ...(sourceRemoteUrl ? { sourceRemoteUrl } : {}),
    ...(sourceCommit ? { sourceCommit } : {}),
    ...(payloadVersion ? { payloadVersion } : {})
  } : undefined;
  return {
    root: path.resolve(options.consumerRoot),
    from: path.resolve(options.sourceRoot),
    profile: options.profile,
    skills: options.skills,
    agentTargetIds: options.agentTargetIds,
    projectTargetDirs: options.projectTargetDirs,
    availabilityOverrides: options.availabilityOverrides,
    projectAssessments: options.projectAssessments,
    homeDir: path.resolve(options.homeDir),
    stateRoot: path.resolve(options.stateRoot),
    sourceProvenance,
    catalogSourceSelections: options.catalogSourceSelections,
    declaredSharedAssetPaths: stringArray(payloadManifest?.sharedAssetPaths)
  };
}

function assertProvisioningRoots(options: ProvisioningOptions): void {
  assertAbsoluteDirectoryInput("sourceRoot", options.sourceRoot);
  assertAbsoluteDirectoryInput("consumerRoot", options.consumerRoot);
  assertAbsoluteDirectoryInput("stateRoot", options.stateRoot);
  assertAbsoluteDirectoryInput("homeDir", options.homeDir);
}

function assertAbsoluteDirectoryInput(name: string, value: string): void {
  if (!value || !path.isAbsolute(value)) throw new Error(`${name} must be an explicit absolute path.`);
}

function envelope(plan: SkillAvailabilityPlan, sharedAssets: ProvisionedSharedAsset[], targetEvidence: ManagedPathEvidence[]): ProvisioningPlanEnvelope {
  return { apiVersion: ARCFORGE_EMBEDDED_PROVIDER_API_VERSION, planDigest: digest({ plan, targetEvidence }), plan, sharedAssets, targetEvidence };
}

async function inspectPaths(values: string[]): Promise<ManagedPathEvidence[]> {
  const paths = [...new Set(values.map((item) => path.resolve(item)))].sort();
  return Promise.all(paths.map(async (targetPath) => {
    if (!(await pathExists(targetPath))) return { path: targetPath, exists: false };
    return { path: targetPath, exists: true, digest: await catalogDirectoryDigest(targetPath) };
  }));
}

function digest(value: unknown): string {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).filter((key) => record[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function safeDigestEqual(left: string, right: string): boolean {
  return /^[a-f0-9]{64}$/.test(left) && /^[a-f0-9]{64}$/.test(right) && crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

async function readJsonIfPresent(filePath: string): Promise<Record<string, unknown> | undefined> {
  try {
    const value = JSON.parse(await fs.readFile(filePath, "utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());
}
