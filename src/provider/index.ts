import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import type {
  AppliedSourceRecord,
  ApplyFromSourceResult,
  DriftReport,
  SkillAvailabilityOverride,
  SkillAvailabilityPlan,
  SkillProjectApplicabilityAssessment,
  UserSkillCatalogEntry
} from "../shared/types.js";
import {
  applyAvailabilityFromSource,
  createAvailabilityPlanFromSource,
  driftAvailabilityFromSource,
  listAppliedSources
} from "../core/sources.js";
import { catalogDirectoryDigest, loadUserSkillCatalog, saveUserSkillCatalog } from "../core/skill-catalog.js";
import { saveLocalProjectAppliedSources } from "../core/project-store.js";
import { pathExists } from "../core/fs.js";

export const ARCFORGE_EMBEDDED_PROVIDER_API_VERSION = "arcforge-embedded-provider/v1";

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
}

export interface ProvisioningPlanEnvelope {
  apiVersion: typeof ARCFORGE_EMBEDDED_PROVIDER_API_VERSION;
  planDigest: string;
  plan: SkillAvailabilityPlan;
  targetEvidence: ManagedPathEvidence[];
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
}> {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const manifest = await readJsonIfPresent(path.join(packageRoot, "arcforge-provider.manifest.json"));
  const packageJson = await readJsonIfPresent(path.join(packageRoot, "package.json"));
  return {
    apiVersion: ARCFORGE_EMBEDDED_PROVIDER_API_VERSION,
    providerVersion: stringValue(manifest?.providerVersion) || stringValue(packageJson?.version) || "0.0.0-development",
    buildCommit: stringValue(manifest?.buildCommit) || "development",
    loaderDigest: await catalogDirectoryDigest(path.join(packageRoot, "skills", "arcforge-on-demand"))
  };
}

export async function createProvisioningPlan(options: ProvisioningOptions): Promise<ProvisioningPlanEnvelope> {
  assertProvisioningRoots(options);
  const plan = await createAvailabilityPlanFromSource(toAvailabilityOptions(options));
  return envelope(plan, await inspectPaths(plan.items.flatMap((item) => item.destinations.map((destination) => destination.path))));
}

export async function driftProvisioningPlan(options: ProvisioningOptions): Promise<DriftReport> {
  assertProvisioningRoots(options);
  return driftAvailabilityFromSource(toAvailabilityOptions(options));
}

export async function applyProvisioningPlan(options: ApplyProvisioningOptions): Promise<ApplyFromSourceResult> {
  assertProvisioningRoots(options);
  if (!options.confirm) throw new Error("Embedded provider apply requires confirm=true.");
  const fresh = await createProvisioningPlan(options);
  if (!safeDigestEqual(fresh.planDigest, options.expectedPlanDigest)) {
    throw new Error("Embedded provider plan changed after confirmation; create and review a fresh plan.");
  }
  return applyAvailabilityFromSource({
    ...toAvailabilityOptions(options),
    confirm: true,
    save: true,
    cleanupPaths: options.cleanupPaths,
    allowUnrelatedRoot: true
  });
}

export async function listProvisioningRelations(options: ListProvisioningRelationsOptions): Promise<AppliedSourceRecord[]> {
  assertAbsoluteDirectoryInput("consumerRoot", options.consumerRoot);
  assertAbsoluteDirectoryInput("stateRoot", options.stateRoot);
  const sourceRoot = options.sourceRoot ? path.resolve(options.sourceRoot) : undefined;
  const records = await listAppliedSources(path.resolve(options.consumerRoot), path.resolve(options.stateRoot));
  return sourceRoot ? records.filter((record) => path.resolve(record.sourceRoot) === sourceRoot) : records;
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
  const selectedPaths = new Set(plan.managedPaths);
  const nextRecords = previousRecords.map((record) => selectedIds.has(record.id) ? withoutManagedPaths(record, selectedPaths) : record);
  const previousCatalog = await loadUserSkillCatalog({ catalogRoot });
  const nextCatalogEntries = updateCatalogEntries(previousCatalog.entries, selectedIds, selectedPaths);
  const catalogChanged = stableJson(previousCatalog.entries) !== stableJson(nextCatalogEntries);
  const retainedSharedPaths = new Set(nextCatalogEntries.map((entry) => path.resolve(entry.installedPath)));
  const removablePaths = plan.managedPaths.filter((managedPath) => !retainedSharedPaths.has(managedPath));
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
    if (catalogWritten) await saveUserSkillCatalog(previousCatalog.entries, { catalogRoot, now: new Date(previousCatalog.updatedAt) }).catch((item) => rollbackErrors.push(item));
    for (const item of staged.reverse()) {
      if (await pathExists(item.backup)) await fs.rename(item.backup, item.target).catch((rollbackError) => rollbackErrors.push(rollbackError));
    }
    if (rollbackErrors.length) throw new AggregateError([error, ...rollbackErrors], "Managed removal failed and rollback was incomplete.");
    throw error;
  }
  return {
    plan,
    removedPaths: staged.map((item) => item.target).sort(),
    retainedSharedPaths: plan.managedPaths.filter((item) => retainedSharedPaths.has(item)).sort(),
    updatedRelationIds: plan.relationIds
  };
}

async function createManagedRemovalPlan(options: RemoveManagedProvisioningOptions): Promise<ManagedRemovalPlan> {
  const records = await listProvisioningRelations(options);
  const allowed = new Set(records.flatMap((record) => record.availabilityItems?.flatMap((item) => item.destinations.map((destination) => path.resolve(destination))) ?? []));
  const managedPaths = [...new Set(options.managedPaths.map((item) => path.resolve(item)))].sort();
  if (!managedPaths.length) throw new Error("Managed removal requires at least one explicit managed path.");
  for (const managedPath of managedPaths) {
    if (!allowed.has(managedPath)) throw new Error(`Managed removal path is not proven by the selected relation: ${managedPath}`);
    if (path.dirname(managedPath) === managedPath) throw new Error(`Refusing to remove a filesystem root: ${managedPath}`);
  }
  const relationIds = records
    .filter((record) => record.availabilityItems?.some((item) => item.destinations.some((destination) => managedPaths.includes(path.resolve(destination)))))
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
    destinations: item.destinations.filter((destination) => !removed.has(path.resolve(destination)))
  })).filter((item) => item.destinations.length > 0);
  const retainedSkills = new Set(availabilityItems?.map((item) => item.skill) ?? record.skills);
  return {
    ...record,
    skills: record.skills.filter((skill) => retainedSkills.has(skill)),
    managedSkillNames: (record.managedSkillNames ?? []).filter((skill) => retainedSkills.has(skill)),
    availabilityItems,
    updatedAt: new Date().toISOString()
  };
}

function updateCatalogEntries(entries: UserSkillCatalogEntry[], relationIds: Set<string>, removed: Set<string>): UserSkillCatalogEntry[] {
  return entries.flatMap((entry) => {
    if (!removed.has(path.resolve(entry.installedPath))) return [entry];
    const appliedRecordIds = entry.appliedRecordIds.filter((id) => !relationIds.has(id));
    return appliedRecordIds.length ? [{ ...entry, appliedRecordIds }] : [];
  });
}

function toAvailabilityOptions(options: ProvisioningOptions) {
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
    stateRoot: path.resolve(options.stateRoot)
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

function envelope(plan: SkillAvailabilityPlan, targetEvidence: ManagedPathEvidence[]): ProvisioningPlanEnvelope {
  return { apiVersion: ARCFORGE_EMBEDDED_PROVIDER_API_VERSION, planDigest: digest({ plan, targetEvidence }), plan, targetEvidence };
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
