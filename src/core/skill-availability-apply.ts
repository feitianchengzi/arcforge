import path from "node:path";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import type {
  AppliedSourceRecord,
  ApplyProfileResult,
  SkillAvailabilityDestinationKind,
  SkillAvailabilityPlan,
  UserSkillCatalogEntry,
  WorkspaceSnapshot
} from "../shared/types.js";
import { copyDirectory, pathExists } from "./fs.js";
import {
  catalogDirectoryDigest,
  catalogQualifiedName,
  loadUserSkillCatalog,
  readUserSkillCatalogIndex,
  restoreUserSkillCatalogIndex,
  saveUserSkillCatalog,
} from "./skill-catalog.js";

export type AvailabilityApplyFailurePoint = "after-directories" | "after-catalog" | "after-record";

export interface ExecuteSkillAvailabilityPlanOptions {
  source: WorkspaceSnapshot;
  plan: SkillAvailabilityPlan;
  cleanupPaths?: string[];
  catalogRoot: string;
  loaderSourcePath?: string;
  recordCandidate?: AppliedSourceRecord;
  commitRecord?: () => Promise<AppliedSourceRecord>;
  rollbackRecord?: () => Promise<void>;
  now?: Date;
  faultInjector?: (point: AvailabilityApplyFailurePoint) => void | Promise<void>;
}

export interface ExecuteSkillAvailabilityPlanResult {
  result: ApplyProfileResult;
  record?: AppliedSourceRecord;
}

interface DirectoryReplacement {
  skill: string;
  kind: SkillAvailabilityDestinationKind | "loader";
  source: string;
  target: string;
  temporary: string;
  backup: string;
  expectedDigest?: string;
  plannedTargetStatus?: SkillAvailabilityPlan["loaderTargets"][number]["status"];
  plannedTargetDigest?: string;
  hadTarget: boolean;
  targetMoved: boolean;
  committed: boolean;
}

interface StagedCleanup {
  path: string;
  backup: string;
  moved: boolean;
}

export class AvailabilityApplyError extends Error {
  constructor(public readonly code: "APPLY_CONFIRM_REQUIRED" | "APPLY_PLAN_INVALID" | "CLEANUP_NOT_IN_PLAN" | "TARGET_WRITE_FAILED" | "CATALOG_WRITE_FAILED", message: string) {
    super(message);
    this.name = "AvailabilityApplyError";
  }
}

export async function executeSkillAvailabilityPlan(options: ExecuteSkillAvailabilityPlanOptions): Promise<ExecuteSkillAvailabilityPlanResult> {
  const blocking = options.plan.diagnostics.filter((item) => item.severity === "error");
  if (blocking.length > 0) {
    throw new AvailabilityApplyError("APPLY_PLAN_INVALID", `Availability plan contains ${blocking.length} blocking diagnostic(s).`);
  }
  const cleanupPaths = validateCleanupPaths(options.plan, options.cleanupPaths ?? []);
  const skillByPath = new Map(options.source.skills.map((skill) => [toPosixPath(skill.relativePath), skill]));
  const replacements = createReplacements(options.source, options.plan, skillByPath, options.loaderSourcePath);
  const previousCatalogRaw = await readUserSkillCatalogIndex({ catalogRoot: options.catalogRoot });
  const previousCatalog = await loadUserSkillCatalog({ catalogRoot: options.catalogRoot });
  const nextEntries = createCatalogEntries(options, previousCatalog.entries, cleanupPaths, skillByPath);
  const retainedCatalogPaths = new Set(nextEntries.map((entry) => path.resolve(entry.installedPath)));
  const cleanups = cleanupPaths.filter((cleanupPath) => !retainedCatalogPaths.has(cleanupPath)).map((cleanupPath) => ({
    path: cleanupPath,
    backup: path.join(path.dirname(cleanupPath), `.${path.basename(cleanupPath)}.cleanup-${randomUUID()}`),
    moved: false
  }));
  let catalogChanged = false;
  let recordCommitAttempted = false;
  let committedRecord: AppliedSourceRecord | undefined;

  try {
    for (const replacement of replacements) await prepareReplacement(replacement);
    for (const replacement of replacements) await validateLoaderTargetState(replacement);
    for (const replacement of replacements) await commitReplacement(replacement);
    await options.faultInjector?.("after-directories");

    for (const cleanup of cleanups) {
      if (!(await pathExists(cleanup.path))) continue;
      await fs.rename(cleanup.path, cleanup.backup);
      cleanup.moved = true;
    }

    catalogChanged = catalogEntriesChanged(previousCatalog.entries, nextEntries);
    if (catalogChanged) {
      try {
        await saveUserSkillCatalog(nextEntries, { catalogRoot: options.catalogRoot, now: options.now });
      } catch (error) {
        throw new AvailabilityApplyError("CATALOG_WRITE_FAILED", `Catalog index update failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    await options.faultInjector?.("after-catalog");

    if (options.commitRecord) {
      recordCommitAttempted = true;
      committedRecord = await options.commitRecord();
    }
    await options.faultInjector?.("after-record");

    await finalizeReplacements(replacements);
    await finalizeCleanups(cleanups);
    return {
      result: buildApplyResult(options, replacements, cleanups, catalogChanged),
      record: committedRecord
    };
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    if (recordCommitAttempted && options.rollbackRecord) {
      await options.rollbackRecord().catch((rollbackError) => rollbackErrors.push(rollbackError));
    }
    if (catalogChanged) {
      await restoreUserSkillCatalogIndex(previousCatalogRaw, { catalogRoot: options.catalogRoot })
        .catch((rollbackError) => rollbackErrors.push(rollbackError));
    }
    await rollbackCleanups(cleanups).catch((rollbackError) => rollbackErrors.push(rollbackError));
    await rollbackReplacements(replacements).catch((rollbackError) => rollbackErrors.push(rollbackError));
    if (rollbackErrors.length > 0) throw new AggregateError([error, ...rollbackErrors], "Availability apply failed and rollback was incomplete.");
    throw error;
  } finally {
    await cleanupTemporaryPaths(replacements);
  }
}

function createReplacements(
  source: WorkspaceSnapshot,
  plan: SkillAvailabilityPlan,
  skillByPath: Map<string, WorkspaceSnapshot["skills"][number]>,
  loaderSourcePath: string | undefined
): DirectoryReplacement[] {
  const replacements: DirectoryReplacement[] = [];
  const targets = new Set<string>();
  for (const item of plan.items) {
    const skill = skillByPath.get(item.sourcePath);
    if (!skill) throw new AvailabilityApplyError("APPLY_PLAN_INVALID", `Plan skill is absent from the fresh source snapshot: ${item.sourcePath}`);
    for (const destination of item.destinations) {
      addReplacement(replacements, targets, item.skill, destination.kind, skill.path, destination.path, item.contentDigest);
    }
  }

  const ambientRoots = new Map<string, SkillAvailabilityDestinationKind>();
  for (const item of plan.items) {
    for (const destination of item.destinations) {
      if (destination.kind === "user-catalog") continue;
      ambientRoots.set(path.dirname(destination.path), destination.kind);
    }
  }
  for (const asset of source.assets) {
    for (const [root, kind] of ambientRoots) {
      addReplacement(replacements, targets, asset.name, kind, asset.path, path.join(root, asset.name));
    }
  }
  if (plan.loaderTargets.length > 0 && !loaderSourcePath) {
    throw new AvailabilityApplyError("APPLY_PLAN_INVALID", "On-demand loader source is unavailable.");
  }
  for (const loader of plan.loaderTargets) {
    addReplacement(
      replacements,
      targets,
      "arcforge-on-demand",
      "loader",
      loaderSourcePath as string,
      loader.path,
      loader.expectedDigest,
      loader.status,
      loader.existingDigest
    );
  }
  return replacements;
}

function addReplacement(
  replacements: DirectoryReplacement[],
  targets: Set<string>,
  skill: string,
  kind: SkillAvailabilityDestinationKind | "loader",
  source: string,
  target: string,
  expectedDigest?: string,
  plannedTargetStatus?: SkillAvailabilityPlan["loaderTargets"][number]["status"],
  plannedTargetDigest?: string
): void {
  const resolvedTarget = path.resolve(target);
  if (targets.has(resolvedTarget)) throw new AvailabilityApplyError("APPLY_PLAN_INVALID", `Multiple availability items target the same directory: ${resolvedTarget}`);
  targets.add(resolvedTarget);
  replacements.push({
    skill,
    kind,
    source: path.resolve(source),
    target: resolvedTarget,
    temporary: path.join(path.dirname(resolvedTarget), `.${path.basename(resolvedTarget)}.tmp-${randomUUID()}`),
    backup: path.join(path.dirname(resolvedTarget), `.${path.basename(resolvedTarget)}.backup-${randomUUID()}`),
    expectedDigest,
    plannedTargetStatus,
    plannedTargetDigest,
    hadTarget: false,
    targetMoved: false,
    committed: false
  });
}

async function validateLoaderTargetState(replacement: DirectoryReplacement): Promise<void> {
  if (replacement.kind !== "loader" || !replacement.plannedTargetStatus) return;
  const exists = await pathExists(replacement.target);
  if (replacement.plannedTargetStatus === "conflict") {
    throw new AvailabilityApplyError("APPLY_PLAN_INVALID", `On-demand loader target has an unresolved conflict: ${replacement.target}`);
  }
  if (replacement.plannedTargetStatus === "missing") {
    if (exists) throw new AvailabilityApplyError("APPLY_PLAN_INVALID", `On-demand loader target changed after planning: ${replacement.target}`);
    return;
  }
  if (!exists || !replacement.plannedTargetDigest) {
    throw new AvailabilityApplyError("APPLY_PLAN_INVALID", `On-demand loader target changed after planning: ${replacement.target}`);
  }
  let digest: string;
  try {
    digest = await catalogDirectoryDigest(replacement.target);
  } catch {
    throw new AvailabilityApplyError("APPLY_PLAN_INVALID", `On-demand loader target changed after planning: ${replacement.target}`);
  }
  if (digest !== replacement.plannedTargetDigest) {
    throw new AvailabilityApplyError("APPLY_PLAN_INVALID", `On-demand loader target changed after planning: ${replacement.target}`);
  }
}

async function prepareReplacement(replacement: DirectoryReplacement): Promise<void> {
  if (replacement.source === replacement.target) throw new AvailabilityApplyError("TARGET_WRITE_FAILED", `Refusing to replace source directory: ${replacement.source}`);
  await fs.mkdir(path.dirname(replacement.target), { recursive: true });
  await copyDirectory(replacement.source, replacement.temporary);
  if (replacement.expectedDigest) {
    const stagedDigest = await catalogDirectoryDigest(replacement.temporary);
    if (stagedDigest !== replacement.expectedDigest) {
      throw new AvailabilityApplyError("TARGET_WRITE_FAILED", `Staged skill digest differs from the fresh plan: ${replacement.skill}`);
    }
  }
}

async function commitReplacement(replacement: DirectoryReplacement): Promise<void> {
  replacement.hadTarget = await pathExists(replacement.target);
  if (replacement.hadTarget) {
    await fs.rename(replacement.target, replacement.backup);
    replacement.targetMoved = true;
  }
  await fs.rename(replacement.temporary, replacement.target);
  replacement.committed = true;
}

function createCatalogEntries(
  options: ExecuteSkillAvailabilityPlanOptions,
  previousEntries: UserSkillCatalogEntry[],
  cleanupPaths: string[],
  skillByPath: Map<string, WorkspaceSnapshot["skills"][number]>
): UserSkillCatalogEntry[] {
  const recordId = options.recordCandidate?.id;
  const confirmedCleanup = new Set(cleanupPaths.map((item) => path.resolve(item)));
  const entries = previousEntries
    .map((entry) => recordId ? removeCatalogRecordClaim(entry, recordId) : entry)
    .filter((entry) => entry.appliedRecordIds.length > 0 || !confirmedCleanup.has(path.resolve(entry.installedPath)));
  const byName = new Map(entries.map((entry) => [normalizeCatalogName(entry.skillName), entry]));
  const manifestByPath = new Map(options.source.sourceManifest?.availability.skills.map((item) => [item.path, item]) ?? []);
  const now = (options.now ?? new Date()).toISOString();

  for (const item of options.plan.items.filter((candidate) => candidate.effectiveMode === "user-on-demand")) {
    const destination = item.destinations.find((candidate) => candidate.kind === "user-catalog");
    const skill = skillByPath.get(item.sourcePath);
    if (!destination || !skill) throw new AvailabilityApplyError("APPLY_PLAN_INVALID", `On-demand catalog destination is incomplete: ${item.skill}`);
    const decision = item.catalogDecision;
    if (!decision || decision.action === "conflict" || decision.action === "downgrade-blocked") {
      throw new AvailabilityApplyError("APPLY_PLAN_INVALID", `On-demand catalog decision is not executable: ${item.skill}`);
    }
    const key = normalizeCatalogName(item.skill);
    const existing = byName.get(key);
    const existingClaim = existing?.sourceClaims.find((claim) => claim.sourceKey === options.plan.sourceKey && claim.skillPath === item.sourcePath);
    const claimRecordIds = [...new Set([...(existingClaim?.appliedRecordIds ?? []), ...(recordId ? [recordId] : [])])].sort();
    const sourceClaim = {
      sourceKey: options.plan.sourceKey,
      sourceRoot: path.resolve(options.source.root),
      sourceRemoteUrl: options.plan.sourceProvenance?.sourceRemoteUrl ?? options.recordCandidate?.sourceRemoteUrl,
      sourceCommit: options.plan.sourceProvenance?.sourceCommit ?? options.recordCandidate?.sourceCommit,
      skillPath: item.sourcePath,
      version: item.version,
      contentDigest: item.contentDigest,
      appliedRecordIds: claimRecordIds,
      observedAt: now
    };
    const sourceClaims = [
      ...(existing?.sourceClaims.filter((claim) => !(claim.sourceKey === sourceClaim.sourceKey && claim.skillPath === sourceClaim.skillPath)) ?? []),
      sourceClaim
    ];
    const incomingBecomesActive = !existing || decision.action === "install" || decision.action === "upgrade" || decision.action === "source-selected";
    const activeSourceKey = incomingBecomesActive ? options.plan.sourceKey : existing.activeSourceKey;
    const activeClaim = incomingBecomesActive
      ? sourceClaim
      : sourceClaims.find((claim) => claim.sourceKey === activeSourceKey && claim.contentDigest === existing?.contentDigest) ?? sourceClaim;
    const appliedRecordIds = [...new Set(sourceClaims.flatMap((claim) => claim.appliedRecordIds))].sort();
    byName.set(key, {
      qualifiedName: catalogQualifiedName(item.skill),
      skillName: item.skill,
      version: activeClaim.version,
      status: "ready",
      activeSourceKey,
      aliases: [...new Set([...(existing?.aliases ?? []), ...(manifestByPath.get(item.sourcePath)?.aliases ?? [])])].sort(),
      summary: incomingBecomesActive ? skill.description || undefined : existing?.summary,
      installedPath: path.resolve(destination.path),
      contentDigest: incomingBecomesActive ? item.contentDigest : existing?.contentDigest ?? item.contentDigest,
      sourceClaims,
      appliedRecordIds,
      installedAt: incomingBecomesActive ? now : existing?.installedAt ?? now
    });
  }
  return [...byName.values()].sort((left, right) => left.qualifiedName.localeCompare(right.qualifiedName));
}

function removeCatalogRecordClaim(entry: UserSkillCatalogEntry, recordId: string): UserSkillCatalogEntry {
  const sourceClaims = entry.sourceClaims.map((claim) => ({
    ...claim,
    appliedRecordIds: claim.appliedRecordIds.filter((id) => id !== recordId)
  }));
  return {
    ...entry,
    sourceClaims,
    appliedRecordIds: [...new Set(sourceClaims.flatMap((claim) => claim.appliedRecordIds))].sort()
  };
}

function normalizeCatalogName(value: string): string {
  return value.trim().toLowerCase();
}

function validateCleanupPaths(plan: SkillAvailabilityPlan, requested: string[]): string[] {
  const allowed = new Set(plan.cleanup.map((item) => path.resolve(item.path)));
  const normalized = [...new Set(requested.map((item) => path.resolve(item)))].sort();
  for (const cleanupPath of normalized) {
    if (!allowed.has(cleanupPath)) throw new AvailabilityApplyError("CLEANUP_NOT_IN_PLAN", `Cleanup path is absent from the fresh availability plan: ${cleanupPath}`);
  }
  return normalized;
}

function catalogEntriesChanged(left: UserSkillCatalogEntry[], right: UserSkillCatalogEntry[]): boolean {
  return JSON.stringify(left) !== JSON.stringify(right);
}

function buildApplyResult(
  options: ExecuteSkillAvailabilityPlanOptions,
  replacements: DirectoryReplacement[],
  cleanups: StagedCleanup[],
  catalogUpdated: boolean
): ApplyProfileResult {
  const skillNames = new Set(options.plan.items.map((item) => item.skill));
  const copiedAssets = [...new Set(replacements.filter((item) => item.kind !== "loader" && !skillNames.has(item.skill)).map((item) => item.skill))].sort();
  const skippedAssets = options.source.assets.filter((asset) => !copiedAssets.includes(asset.name)).map((asset) => asset.name).sort();
  return {
    profile: options.plan.profile,
    targetDir: null,
    copied: [...skillNames].sort(),
    skipped: [],
    copiedAssets,
    skippedAssets,
    availabilityPlan: options.plan,
    destinations: [
      ...replacements.filter((item) => skillNames.has(item.skill) || item.kind === "loader").map((item) => ({
        skill: item.skill,
        kind: item.kind,
        path: item.target,
        status: item.hadTarget ? "replaced" as const : "copied" as const
      }))
    ],
    catalogUpdated,
    cleanedPaths: cleanups.filter((item) => item.moved).map((item) => item.path).sort()
  };
}

async function finalizeReplacements(replacements: DirectoryReplacement[]): Promise<void> {
  for (const replacement of replacements) await fs.rm(replacement.backup, { recursive: true, force: true }).catch(() => undefined);
}

async function finalizeCleanups(cleanups: StagedCleanup[]): Promise<void> {
  for (const cleanup of cleanups) await fs.rm(cleanup.backup, { recursive: true, force: true }).catch(() => undefined);
}

async function rollbackReplacements(replacements: DirectoryReplacement[]): Promise<void> {
  for (const replacement of [...replacements].reverse()) {
    if (replacement.committed) await fs.rm(replacement.target, { recursive: true, force: true });
    if (replacement.targetMoved && await pathExists(replacement.backup)) await fs.rename(replacement.backup, replacement.target);
  }
}

async function rollbackCleanups(cleanups: StagedCleanup[]): Promise<void> {
  for (const cleanup of [...cleanups].reverse()) {
    if (!cleanup.moved || !(await pathExists(cleanup.backup))) continue;
    await fs.rename(cleanup.backup, cleanup.path);
  }
}

async function cleanupTemporaryPaths(replacements: DirectoryReplacement[]): Promise<void> {
  for (const replacement of replacements) {
    await fs.rm(replacement.temporary, { recursive: true, force: true }).catch(() => undefined);
  }
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function isNodeError(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === code;
}
