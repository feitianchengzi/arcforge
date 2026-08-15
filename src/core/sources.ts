import crypto, { randomUUID } from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import type { AppliedSourceRecord, ApplyFromSourceResult, CatalogSourceSelection, CleanupLocalSkillPlan, CleanupLocalSkillResult, DriftReport, ImportSkillsPlan, ImportSkillsResult, LocalSkillWorkflowPlan, MergePlan, MergeResult, ProjectResolveCandidate, ProjectResolveResult, ArcForgeConfig, SkillAvailabilityOverride, SkillAvailabilityPlan, SkillProjectApplicabilityAssessment, SkillSourceProvenance, SkillSummary, WorkspaceSnapshot } from "../shared/types.js";
import { defaultConfigForRoot, loadConfig, saveConfig } from "./config.js";
import { copyDirectory, pathExists } from "./fs.js";
import { applyProfile, compareDirectory, driftReport } from "./profiles.js";
import { arcForgeHome, listLocalProjectStates, loadLocalProjectState, saveLocalProjectAppliedSources } from "./project-store.js";
import { downloadSource } from "./share.js";
import { selectProfileSkills } from "./share-sync.js";
import { currentCommit } from "./share-git.js";
import { scanWorkspace } from "./workspace.js";
import { detectLocalGitSource } from "./local-git.js";
import { createSkillAvailabilityPlan, skillAvailabilitySourcePolicyDigest } from "./skill-availability.js";
import { AvailabilityApplyError, executeSkillAvailabilityPlan, type AvailabilityApplyFailurePoint } from "./skill-availability-apply.js";
import { createSkillAvailabilityDriftReport } from "./skill-availability-drift.js";

const execFileAsync = promisify(execFile);

export interface MergeOptions {
  root: string;
  sourceDir?: string;
  to: string;
  targetPath: string;
  profile?: string;
  skills?: string[];
  targetDir?: string;
  confirm?: boolean;
  cacheDir?: string;
}

export interface AppliedSourceOptions {
  root: string;
  id?: string;
  from?: string;
  profile?: string;
  targetDir?: string;
  skills?: string[];
  cacheDir?: string;
  allowUnrelatedRoot?: boolean;
}

export interface ImportSkillsOptions {
  root: string;
  from: string;
  profile?: string;
  skills?: string[];
  targetDir?: string;
  targetProfile?: string;
  confirm?: boolean;
  cacheDir?: string;
}

export interface ProjectResolveOptions {
  cwd: string;
  name: string;
}

export interface LocalSkillWorkflowPlanOptions {
  root: string;
  sourceDir?: string;
  skill: string;
  to: string;
  install?: string;
  share?: string;
  cacheDir?: string;
}

export interface CleanupLocalSkillOptions {
  root: string;
  sourceDir?: string;
  skills: string[];
  confirm?: boolean;
}

export interface AvailabilityPlanFromSourceOptions {
  root: string;
  from?: string;
  profile?: string;
  skills?: string[];
  agentTargetIds: string[];
  projectTargetDirs?: string[];
  availabilityOverrides?: SkillAvailabilityOverride[];
  projectAssessments?: SkillProjectApplicabilityAssessment[];
  cacheDir?: string;
  homeDir?: string;
  stateRoot?: string;
  sourceProvenance?: SkillSourceProvenance;
  catalogSourceSelections?: CatalogSourceSelection[];
  declaredSharedAssetPaths?: string[];
}

export interface AvailabilityApplyFromSourceOptions extends AvailabilityPlanFromSourceOptions {
  confirm?: boolean;
  save?: boolean;
  cleanupPaths?: string[];
  allowUnrelatedRoot?: boolean;
  faultInjector?: (point: AvailabilityApplyFailurePoint) => void | Promise<void>;
  providerCapabilities?: string[];
}

export type AvailabilityDriftFromSourceOptions = AvailabilityPlanFromSourceOptions;

export async function resolveSkillProjectRoot(input: string, cacheDir: string): Promise<string> {
  const value = input.trim();
  if (!value) throw new Error("Skill project path or URL is required.");
  if (isRemoteInput(value)) return path.resolve(await downloadSource({ remoteUrl: value, cacheDir }));
  const root = path.resolve(value);
  const stats = await fs.stat(root);
  if (!stats.isDirectory()) throw new Error("Skill project path is not a directory.");
  await defaultConfigForRoot(root);
  return root;
}

export async function createAvailabilityPlanFromSource(options: AvailabilityPlanFromSourceOptions): Promise<SkillAvailabilityPlan> {
  const consumerRoot = path.resolve(options.root);
  const sourceRoot = options.from
    ? await resolveSkillProjectRoot(options.from, cacheDirForInput(options.from, options.cacheDir))
    : consumerRoot;
  const source = await scanAvailabilitySource(sourceRoot, options);
  const records = await listAppliedSources(consumerRoot, options.stateRoot);
  const loaderSourcePath = await bundledOnDemandSkillPath();
  return createSkillAvailabilityPlan({
    source,
    consumerRoot,
    profileName: options.profile ?? "default",
    skills: options.skills,
    agentTargetIds: options.agentTargetIds,
    projectTargetDirs: options.projectTargetDirs,
    invocationOverrides: options.availabilityOverrides,
    projectAssessments: options.projectAssessments ?? reusableProjectAssessments(records, sourceRoot, consumerRoot, options.profile ?? "default", options.agentTargetIds, options.projectTargetDirs ?? [], skillAvailabilitySourcePolicyDigest(source.sourceManifest)),
    appliedRecords: records,
    homeDir: options.homeDir,
    catalogRoot: path.join(arcForgeHome(options.stateRoot), "catalog"),
    loaderSourcePath,
    sourceProvenance: options.sourceProvenance,
    catalogSourceSelections: options.catalogSourceSelections
  });
}

export async function driftAvailabilityFromSource(options: AvailabilityDriftFromSourceOptions): Promise<DriftReport> {
  const consumerRoot = path.resolve(options.root);
  const sourceRoot = options.from
    ? await resolveSkillProjectRoot(options.from, cacheDirForInput(options.from, options.cacheDir))
    : consumerRoot;
  const source = await scanAvailabilitySource(sourceRoot, options);
  const records = await listAppliedSources(consumerRoot, options.stateRoot);
  const loaderSourcePath = await bundledOnDemandSkillPath();
  const plan = await createSkillAvailabilityPlan({
    source,
    consumerRoot,
    profileName: options.profile ?? "default",
    skills: options.skills,
    agentTargetIds: options.agentTargetIds,
    projectTargetDirs: options.projectTargetDirs,
    invocationOverrides: options.availabilityOverrides,
    projectAssessments: options.projectAssessments ?? reusableProjectAssessments(records, sourceRoot, consumerRoot, options.profile ?? "default", options.agentTargetIds, options.projectTargetDirs ?? [], skillAvailabilitySourcePolicyDigest(source.sourceManifest)),
    appliedRecords: records,
    homeDir: options.homeDir,
    catalogRoot: path.join(arcForgeHome(options.stateRoot), "catalog"),
    loaderSourcePath,
    sourceProvenance: options.sourceProvenance,
    catalogSourceSelections: options.catalogSourceSelections
  });
  const record = availabilityRecordFor(records, sourceRoot, plan);
  return createSkillAvailabilityDriftReport({
    source,
    plan,
    record,
    loaderSourcePath: plan.loaderTargets.length > 0 ? loaderSourcePath : undefined
  });
}

export async function applyAvailabilityFromSource(options: AvailabilityApplyFromSourceOptions): Promise<ApplyFromSourceResult> {
  const consumerRoot = path.resolve(options.root);
  const sourceRoot = options.from
    ? await resolveSkillProjectRoot(options.from, cacheDirForInput(options.from, options.cacheDir))
    : consumerRoot;
  const source = await scanAvailabilitySource(sourceRoot, options);
  const previousRecords = await listAppliedSources(consumerRoot, options.stateRoot);
  const loaderSourcePath = await bundledOnDemandSkillPath();
  const plan = await createSkillAvailabilityPlan({
    source,
    consumerRoot,
    profileName: options.profile ?? "default",
    skills: options.skills,
    agentTargetIds: options.agentTargetIds,
    projectTargetDirs: options.projectTargetDirs,
    invocationOverrides: options.availabilityOverrides,
    projectAssessments: options.projectAssessments ?? reusableProjectAssessments(previousRecords, sourceRoot, consumerRoot, options.profile ?? "default", options.agentTargetIds, options.projectTargetDirs ?? [], skillAvailabilitySourcePolicyDigest(source.sourceManifest)),
    appliedRecords: previousRecords,
    homeDir: options.homeDir,
    catalogRoot: path.join(arcForgeHome(options.stateRoot), "catalog"),
    loaderSourcePath,
    sourceProvenance: options.sourceProvenance,
    catalogSourceSelections: options.catalogSourceSelections
  });
  if (!options.confirm) {
    throw new AvailabilityApplyError("APPLY_CONFIRM_REQUIRED", "Availability-aware apply requires --confirm after reviewing a fresh plan.");
  }
  const recordCandidate = options.save && options.from
    ? await availabilityAppliedRecordFor(consumerRoot, source, plan, previousRecords, options.from, options)
    : undefined;
  if (recordCandidate) assertAvailabilityRelationRoot(consumerRoot, sourceRoot, plan, Boolean(options.allowUnrelatedRoot));
  if (recordCandidate && plan.cleanup.length > 0) {
    const confirmedCleanup = new Set((options.cleanupPaths ?? []).map((item) => path.resolve(item)));
    const unconfirmed = plan.cleanup.filter((item) => !confirmedCleanup.has(path.resolve(item.path)));
    if (unconfirmed.length > 0) {
      throw new AvailabilityApplyError(
        "APPLY_CONFIRM_REQUIRED",
        `Saving this availability relationship requires explicit confirmation of every planned stale destination: ${unconfirmed.map((item) => item.path).join(", ")}`
      );
    }
  }
  const catalogRoot = path.join(arcForgeHome(options.stateRoot), "catalog");
  const execution = await executeSkillAvailabilityPlan({
    source,
    plan,
    cleanupPaths: options.cleanupPaths,
    catalogRoot,
    loaderSourcePath: plan.loaderTargets.length > 0 ? loaderSourcePath : undefined,
    recordCandidate,
    commitRecord: recordCandidate ? () => upsertAppliedSource(consumerRoot, recordCandidate, options.stateRoot) : undefined,
    rollbackRecord: recordCandidate ? async () => { await saveLocalProjectAppliedSources(consumerRoot, previousRecords, { stateRoot: options.stateRoot }); } : undefined,
    faultInjector: options.faultInjector
  });
  return {
    result: execution.result,
    record: execution.record,
    copiedThisRun: execution.result.copied,
    selectedSkillsThisRun: plan.items.map((item) => item.skill),
    managedSkillNamesHistorical: execution.record?.managedSkillNames ?? []
  };
}

async function scanAvailabilitySource(sourceRoot: string, options: AvailabilityPlanFromSourceOptions): Promise<WorkspaceSnapshot> {
  const source = await scanWorkspace(sourceRoot, { stateRoot: options.stateRoot, readOnlyConfig: Boolean(options.stateRoot) });
  if (!options.declaredSharedAssetPaths?.length) return source;
  const assetsByPath = new Map(source.assets.map((asset) => [path.resolve(asset.path), asset]));
  for (const declaredPath of options.declaredSharedAssetPaths) {
    const normalized = declaredPath.trim().replaceAll("\\", "/").replace(/^\.\//, "");
    if (!normalized || path.posix.isAbsolute(normalized) || normalized.split("/").includes("..")) {
      throw new Error(`Declared shared asset path must stay inside the source root: ${declaredPath}`);
    }
    const assetPath = path.resolve(sourceRoot, ...normalized.split("/"));
    const relative = path.relative(sourceRoot, assetPath);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Declared shared asset path must resolve below the source root: ${declaredPath}`);
    }
    const stats = await fs.lstat(assetPath);
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new Error(`Declared shared asset path must be a physical directory: ${declaredPath}`);
    }
    assetsByPath.set(assetPath, {
      name: path.basename(assetPath),
      path: assetPath,
      relativePath: relative
    });
  }
  return {
    ...source,
    assets: [...assetsByPath.values()].sort((left, right) => left.name.localeCompare(right.name) || left.relativePath.localeCompare(right.relativePath))
  };
}

async function bundledOnDemandSkillPath(): Promise<string> {
  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
  const candidate = path.resolve(moduleDirectory, "..", "..", "skills", "arcforge-on-demand");
  if (await pathExists(path.join(candidate, "SKILL.md"))) return candidate;
  throw new Error(`Bundled on-demand entry skill is missing: ${candidate}`);
}

export async function createMergePlan(options: MergeOptions): Promise<MergePlan> {
  const root = path.resolve(options.root);
  const targetProjectRoot = await resolveSkillProjectRoot(options.to, requiredCacheDir(options.cacheDir));
  const current = await scanWorkspace(root, { sourceDir: options.sourceDir });
  const targetSnapshot = await scanWorkspace(targetProjectRoot);
  const profile = options.profile?.trim() || "default";
  const targetPath = cleanRelativePath(options.targetPath);
  if (!targetPath) throw new Error("Merge target path is required.");
  const targetDir = options.targetDir?.trim() || ".arcforge/skills";
  const selected = selectedSkills(current.skills, current.config, profile, options.skills);
  if (selected.length === 0) throw new Error("No skills selected for merge.");
  const targetRoot = path.resolve(targetProjectRoot, targetPath);
  assertInside(targetRoot, targetProjectRoot, "merge");
  const skills = await Promise.all(selected.map(async (skill) => {
    const target = path.join(targetRoot, skill.name);
    const comparison = await compareDirectory(skill.path, target);
    return {
      name: skill.name,
      sourcePath: skill.path,
      targetPath: target,
      status: comparison.status === "missing" ? "new" as const : comparison.status === "same" ? "same" as const : "conflict" as const,
      files: comparison.files
    };
  }));
  const appliedRecord = await appliedRecordFor(root, targetProjectRoot, path.basename(targetProjectRoot), profile, targetDir, selected.map((skill) => skill.name), "profileApply");
  return {
    root,
    targetProjectRoot,
    targetProjectName: path.basename(targetSnapshot.root),
    targetPath,
    profile,
    targetDir,
    skills,
    appliedRecord,
    hasConflicts: skills.some((item) => item.status === "conflict")
  };
}

export async function mergeIntoProject(options: MergeOptions): Promise<MergeResult> {
  const plan = await createMergePlan(options);
  if (!options.confirm) throw new Error("Merge requires --confirm after reviewing the plan.");
  if (plan.hasConflicts) throw new Error(`Merge has conflicts: ${plan.skills.filter((item) => item.status === "conflict").map((item) => item.name).join(", ")}`);
  const copied: string[] = [];
  const skipped: string[] = [];
  for (const item of plan.skills) {
    if (item.status === "same") {
      skipped.push(item.name);
      continue;
    }
    await replaceDirectory(item.sourcePath, item.targetPath);
    copied.push(item.name);
  }
  await mergeSourceProfile(plan.targetProjectRoot, plan.profile, plan.skills.map((item) => item.name));
  const appliedRecord = await upsertAppliedSource(plan.root, plan.appliedRecord);
  return {
    plan: { ...plan, appliedRecord },
    copied,
    skipped,
    appliedRecord,
    messages: [`Merged ${copied.length} skills to ${plan.targetProjectName}.`, `Updated applied source ${appliedRecord.id}.`]
  };
}

export async function createImportSkillsPlan(options: ImportSkillsOptions): Promise<ImportSkillsPlan> {
  const root = path.resolve(options.root);
  const sourceProjectRoot = await resolveSkillProjectRoot(options.from, requiredCacheDir(options.cacheDir));
  const current = await scanWorkspace(root);
  const sourceSnapshot = await scanWorkspace(sourceProjectRoot);
  const sourceProfile = options.profile?.trim() || sourceSnapshot.config.profiles[0]?.name || "default";
  const targetProfile = options.targetProfile?.trim() || current.config.profiles[0]?.name || "default";
  const targetDir = options.targetDir?.trim() || current.config.sourceDir || "skills";
  const selected = selectedSkills(sourceSnapshot.skills, sourceSnapshot.config, sourceProfile, options.skills);
  if (selected.length === 0) throw new Error("No skills selected for import.");
  const targetRoot = path.resolve(root, targetDir);
  assertInside(targetRoot, root, "import");
  const skills = await Promise.all(selected.map(async (skill) => {
    const target = path.join(targetRoot, skill.name);
    const comparison = await compareDirectory(skill.path, target);
    return {
      name: skill.name,
      sourcePath: skill.path,
      targetPath: target,
      status: comparison.status === "missing" ? "new" as const : comparison.status === "same" ? "same" as const : "conflict" as const,
      files: comparison.files
    };
  }));
  const appliedRecord = await appliedRecordFor(root, sourceProjectRoot, path.basename(sourceProjectRoot), sourceProfile, targetDir, selected.map((skill) => skill.name), "maintenanceImport");
  return {
    root,
    sourceProjectRoot,
    sourceProjectName: path.basename(sourceSnapshot.root),
    sourceProfile,
    targetDir,
    targetProfile,
    skills,
    appliedRecord,
    hasConflicts: skills.some((item) => item.status === "conflict")
  };
}

export async function importSkillsIntoProject(options: ImportSkillsOptions): Promise<ImportSkillsResult> {
  const plan = await createImportSkillsPlan(options);
  if (!options.confirm) throw new Error("Import requires confirm after reviewing the plan.");
  if (plan.hasConflicts) throw new Error(`Import has conflicts: ${plan.skills.filter((item) => item.status === "conflict").map((item) => item.name).join(", ")}`);
  const copied: string[] = [];
  const skipped: string[] = [];
  for (const item of plan.skills) {
    if (item.status === "same") {
      skipped.push(item.name);
      continue;
    }
    await replaceDirectory(item.sourcePath, item.targetPath);
    copied.push(item.name);
  }
  await mergeSourceProfile(plan.root, plan.targetProfile, plan.skills.map((item) => item.name));
  const appliedRecord = await upsertAppliedSource(plan.root, plan.appliedRecord);
  return {
    plan: { ...plan, appliedRecord },
    copied,
    skipped,
    appliedRecord,
    messages: [`Imported ${copied.length} skills from ${plan.sourceProjectName}.`, `Updated maintenance import relation ${appliedRecord.id}.`]
  };
}

export async function resolveSkillProject(options: ProjectResolveOptions): Promise<ProjectResolveResult> {
  const cwd = path.resolve(options.cwd);
  const query = options.name.trim();
  if (!query) throw new Error("Project name is required.");
  const candidatePaths = await projectCandidatePaths(cwd, query);
  const candidates = await Promise.all(candidatePaths.map((candidatePath) => inspectProjectCandidate(candidatePath, query)));
  const sorted = candidates.sort(compareProjectCandidates);
  const selected = isExplicitProjectPath(query)
    ? sorted.find((item) => item.match === "exact-path" && item.isSkillProject)
    : undefined;
  return {
    query,
    cwd,
    candidates: sorted,
    selected,
    messages: selected
      ? [`Explicit Skill project path resolved: ${selected.path}`]
      : ["Candidate evidence is read-only. Supply an explicit Skill project path before merge/apply/share writes."]
  };
}

export async function createLocalSkillWorkflowPlan(options: LocalSkillWorkflowPlanOptions): Promise<LocalSkillWorkflowPlan> {
  const root = path.resolve(options.root);
  const skill = options.skill.trim();
  if (!skill) throw new Error("Skill name is required.");
  const rootSnapshot = await scanWorkspace(root, { sourceDir: options.sourceDir });
  const sourceDir = rootSnapshot.config.sourceDir;
  const sourceSkillPath = path.join(root, sourceDir, skill);
  const sourceExists = await pathExists(path.join(sourceSkillPath, "SKILL.md"));
  const maintenance = await resolveSkillProject({ cwd: root, name: options.to });
  const selected = maintenance.selected;
  const targetPath = selected?.sourceDir || "skills";
  const install = options.install ? resolveInstallTarget(options.install, selected?.path) : undefined;
  const share = options.share ? resolveShareTarget(options.share, selected) : undefined;
  const blocking = [];
  const warnings = [];
  if (!sourceExists) blocking.push(`Source skill not found: ${sourceSkillPath}`);
  if (!selected) blocking.push(`No explicit Skill project path was selected for: ${options.to}`);
  if (install && !selected) warnings.push("Install stage needs an explicit maintenance source path before drift/apply can be exact.");
  if (share && !share.remoteUrl) warnings.push(`Share target '${options.share}' did not match a Git remote on the maintenance source.`);

  const maintenanceRoot = selected?.path || `<explicit-skill-project-path>`;
  const stages: LocalSkillWorkflowPlan["stages"] = [
    {
      name: "resolve-maintenance-source",
      writes: false,
      requiresConfirmation: false,
      command: `arcforge project resolve --name ${shellValue(options.to)}`,
      description: "Find and inspect the real Skill project maintenance source before writing."
    },
    {
      name: "merge-plan",
      writes: false,
      requiresConfirmation: false,
      command: `arcforge merge plan --root ${shellValue(root)} --source-dir ${shellValue(sourceDir)} --to ${shellValue(maintenanceRoot)} --skills ${shellValue(skill)} --target-path ${shellValue(targetPath)}`,
      description: "Plan formalizing the current project skill into the maintenance source."
    },
    {
      name: "merge-run",
      writes: true,
      requiresConfirmation: true,
      command: `arcforge merge run --root ${shellValue(root)} --source-dir ${shellValue(sourceDir)} --to ${shellValue(maintenanceRoot)} --skills ${shellValue(skill)} --target-path ${shellValue(targetPath)} --confirm`,
      description: "Write the skill into the maintenance source after reviewing the merge plan."
    }
  ];

  if (install) {
    stages.push(
      {
        name: "apply-drift",
        writes: false,
        requiresConfirmation: false,
        command: `arcforge drift --root ${shellValue(install.relationRecordRoot || maintenanceRoot)} --from ${shellValue(maintenanceRoot)} --profile default --target ${shellValue(install.targetDir)} --skills ${shellValue(skill)}`,
        description: "Compare the maintenance source skill with the application target before installing."
      },
      {
        name: "apply-run",
        writes: true,
        requiresConfirmation: true,
        command: `arcforge apply --root ${shellValue(install.relationRecordRoot || maintenanceRoot)} --from ${shellValue(maintenanceRoot)} --profile default --target ${shellValue(install.targetDir)} --skills ${shellValue(skill)} --save --confirm`,
        description: "Install the skill into the application target and save the applied relation."
      }
    );
  }

  if (share) {
    stages.push({
      name: "share-plan",
      writes: false,
      requiresConfirmation: false,
      command: share.remoteName
        ? `arcforge share plan --root ${shellValue(maintenanceRoot)} --same-repository --same-repository-remote ${shellValue(share.remoteName)} --skills ${shellValue(skill)}`
        : `arcforge share plan --root ${shellValue(maintenanceRoot)} --repo ${shellValue(options.share || "")} --skills ${shellValue(skill)}`,
      description: "Plan sharing the maintenance source through Git without pushing yet."
    });
  }

  return {
    root,
    skill,
    sourceDir,
    sourceSkillPath,
    sourceExists,
    maintenance: {
      query: options.to,
      selected,
      candidates: maintenance.candidates
    },
    install,
    share,
    stages,
    blocking,
    warnings,
    recommendedNextAction: blocking.length
      ? "Resolve blocking endpoint issues before any write step."
      : stages.find((item) => !item.writes)?.command || "Review the plan, then run the write stages one by one with explicit confirmation."
  };
}

export async function cleanupLocalSkills(options: CleanupLocalSkillOptions): Promise<CleanupLocalSkillResult | CleanupLocalSkillPlan> {
  const plan = await createCleanupLocalSkillPlan(options);
  if (!options.confirm) return plan;
  const deleted: string[] = [];
  const skipped: string[] = [];
  for (const item of plan.skills) {
    if (item.action !== "delete") {
      skipped.push(item.name);
      continue;
    }
    await fs.rm(item.path, { recursive: true, force: false });
    deleted.push(item.name);
  }
  return {
    plan: { ...plan, requiresConfirm: false },
    deleted,
    skipped,
    messages: [`Deleted ${deleted.length} explicitly selected local skill directories from ${plan.sourceDir}. No provenance or temporary-copy status was inferred.`, ...skipped.map((name) => `Skipped ${name}.`)]
  };
}

export async function listAppliedSources(root: string, stateRoot?: string): Promise<AppliedSourceRecord[]> {
  return [...((await loadLocalProjectState(root, { stateRoot }))?.appliedSources ?? [])].sort(compareAppliedRecord);
}

export async function addAppliedSource(options: AppliedSourceOptions): Promise<AppliedSourceRecord> {
  if (!options.from) throw new Error("Applied source requires --from.");
  if (!options.profile) throw new Error("Applied source requires --profile.");
  if (!options.targetDir) throw new Error("Applied source requires --target.");
  const sourceRoot = await resolveSkillProjectRoot(options.from, requiredCacheDir(options.cacheDir));
  assertAppliedRelationRoot(options.root, sourceRoot, options.targetDir, options.allowUnrelatedRoot);
  const snapshot = await scanWorkspace(sourceRoot);
  const skills = selectedSkills(snapshot.skills, snapshot.config, options.profile, options.skills).map((skill) => skill.name);
  const record = await appliedRecordFor(options.root, sourceRoot, path.basename(snapshot.root), options.profile, options.targetDir, skills, "profileApply");
  return upsertAppliedSource(options.root, record);
}

export async function removeAppliedSource(root: string, id: string): Promise<AppliedSourceRecord> {
  const records = await listAppliedSources(root);
  const record = records.find((item) => item.id === id);
  if (!record) throw new Error(`Applied source not found: ${id}`);
  await saveLocalProjectAppliedSources(root, records.filter((item) => item.id !== id));
  return record;
}

export async function driftAppliedSources(root: string, id?: string): Promise<DriftReport[]> {
  const records = selectAppliedRecords(await listAppliedSources(root), id);
  const reports: DriftReport[] = [];
  for (const record of records) {
    if (record.availabilityItems?.length) {
      const context = requiredAvailabilityContext(record);
      reports.push(await driftAvailabilityFromSource({
        root,
        from: record.sourceRoot,
        profile: record.profile,
        skills: record.skills,
        agentTargetIds: context.agentTargetIds,
        projectTargetDirs: context.projectTargetDirs,
        availabilityOverrides: context.availabilityOverrides,
        projectAssessments: context.projectAssessments,
        homeDir: context.homeDir
      }));
      continue;
    }
    const snapshot = await scanWorkspace(record.sourceRoot);
    const config = configForAppliedRecord(snapshot.config, record);
    reports.push(await driftReport(record.sourceRoot, config, snapshot.skills, snapshot.assets, record.profile, path.resolve(root, record.targetDir), {
      managedSkillNames: record.managedSkillNames ?? record.skills
    }));
  }
  return reports;
}

export async function runAppliedSources(root: string, id: string | undefined, confirm: boolean, cleanupPaths: string[] = []) {
  if (!confirm) throw new Error("Applied source run requires --confirm after reviewing drift.");
  if (cleanupPaths.length > 0 && !id) throw new Error("Applied source cleanup paths require one explicit --id.");
  const records = selectAppliedRecords(await listAppliedSources(root), id);
  const results = [];
  for (const record of records) {
    if (record.availabilityItems?.length) {
      const context = requiredAvailabilityContext(record);
      const execution = await applyAvailabilityFromSource({
        root,
        from: record.sourceRoot,
        profile: record.profile,
        skills: record.skills,
        agentTargetIds: context.agentTargetIds,
        projectTargetDirs: context.projectTargetDirs,
        availabilityOverrides: context.availabilityOverrides,
        projectAssessments: context.projectAssessments,
        homeDir: context.homeDir,
        cleanupPaths,
        confirm: true,
        save: true
      });
      results.push({ record: execution.record as AppliedSourceRecord, result: execution.result });
      continue;
    }
    const snapshot = await scanWorkspace(record.sourceRoot);
    const config = configForAppliedRecord(snapshot.config, record);
    const result = await applyProfile(record.sourceRoot, config, snapshot.skills, snapshot.assets, record.profile, path.resolve(root, record.targetDir));
    const next = await upsertAppliedSource(root, {
      ...record,
      sourceCommit: await sourceCommit(record.sourceRoot),
      managedSkillNames: mergeNames(record.managedSkillNames ?? record.skills, result.copied),
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    results.push({ record: next, result });
  }
  return results;
}

export async function applyFromSource(root: string, from: string | undefined, profile: string, targetDir: string, save: boolean, skills?: string[], cacheDir?: string, allowUnrelatedRoot = false): Promise<ApplyFromSourceResult> {
  const sourceRoot = from ? await resolveSkillProjectRoot(from, requiredCacheDir(cacheDir)) : path.resolve(root);
  if (save && from) assertAppliedRelationRoot(root, sourceRoot, targetDir, allowUnrelatedRoot);
  const resolvedTargetDir = from ? path.resolve(root, targetDir) : targetDir;
  const snapshot = await scanWorkspace(sourceRoot);
  const config = skills?.length ? configWithSkillSelection(snapshot.config, profile, skills) : snapshot.config;
  const selectedSkillsThisRun = selectedSkills(snapshot.skills, config, profile).map((skill) => skill.name);
  const result = await applyProfile(sourceRoot, config, snapshot.skills, snapshot.assets, profile, resolvedTargetDir);
  const record = save && from ? await upsertAppliedSource(root, await appliedRecordFor(root, sourceRoot, path.basename(sourceRoot), profile, targetDir, result.copied, "profileApply")) : undefined;
  return {
    result,
    record,
    copiedThisRun: result.copied,
    selectedSkillsThisRun,
    managedSkillNamesHistorical: record?.managedSkillNames ?? []
  };
}

export async function driftFromSource(root: string, from: string | undefined, profile: string, targetDir: string, skills?: string[], cacheDir?: string) {
  const sourceRoot = from ? await resolveSkillProjectRoot(from, requiredCacheDir(cacheDir)) : path.resolve(root);
  const resolvedTargetDir = from ? path.resolve(root, targetDir) : targetDir;
  const snapshot = await scanWorkspace(sourceRoot);
  const config = skills?.length ? configWithSkillSelection(snapshot.config, profile, skills) : snapshot.config;
  return driftReport(sourceRoot, config, snapshot.skills, snapshot.assets, profile, resolvedTargetDir);
}

function requiredCacheDir(cacheDir?: string): string {
  if (!cacheDir) throw new Error("Cache directory is required for remote Skill projects.");
  return cacheDir;
}

function cacheDirForInput(input: string, cacheDir?: string): string {
  return isRemoteInput(input) ? requiredCacheDir(cacheDir) : cacheDir ?? "";
}

function assertAppliedRelationRoot(root: string, sourceRoot: string, targetDir: string, allowUnrelatedRoot = false): void {
  const normalizedRoot = path.resolve(root);
  const normalizedSourceRoot = path.resolve(sourceRoot);
  const normalizedTargetDir = path.resolve(normalizedRoot, targetDir);
  if (isSameOrParent(normalizedRoot, normalizedSourceRoot) || isSameOrParent(normalizedRoot, normalizedTargetDir)) return;
  if (allowUnrelatedRoot) return;

  throw new Error([
    "Applied source relation root is unrelated to both source and target.",
    `--root: ${normalizedRoot}`,
    `--from: ${normalizedSourceRoot}`,
    `--target: ${normalizedTargetDir}`,
    "Use the maintenance source root as --root for user-level agent installs, or pass --allow-unrelated-root if this relation intentionally belongs to another workspace."
  ].join("\n"));
}

function isSameOrParent(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function selectedSkills(skills: SkillSummary[], config: ArcForgeConfig, profileName: string, skillNames?: string[]): SkillSummary[] {
  if (skillNames?.length) return selectProfileSkills(skills, skillNames, true);
  const profile = config.profiles.find((item) => item.name === profileName);
  if (!profile) throw new Error(`Profile not found: ${profileName}`);
  return selectProfileSkills(skills, profile.skills);
}

type AppliedRelationKind = NonNullable<AppliedSourceRecord["relationKind"]>;

async function appliedRecordFor(root: string, sourceRoot: string, sourceName: string | undefined, profile: string, targetDir: string, skills: string[], relationKind: AppliedRelationKind): Promise<AppliedSourceRecord> {
  const now = new Date().toISOString();
  const normalizedSourceRoot = path.resolve(sourceRoot);
  const existing = (await listAppliedSources(root)).find((item) => path.resolve(item.sourceRoot) === normalizedSourceRoot && item.profile === profile && item.targetDir === targetDir && recordRelationKind(item) === relationKind);
  return {
    id: existing?.id || `${slug(sourceName || path.basename(normalizedSourceRoot) || "source")}-${slug(profile)}-${crypto.createHash("sha256").update(`${relationKind}:${normalizedSourceRoot}:${targetDir}`).digest("hex").slice(0, 8)}`,
    relationKind,
    sourceRoot: normalizedSourceRoot,
    sourceName,
    profile,
    targetDir,
    skills: currentSkillSelection(skills),
    managedSkillNames: mergeNames(existing?.managedSkillNames ?? existing?.skills ?? [], skills),
    sourceCommit: await sourceCommit(normalizedSourceRoot),
    appliedAt: existing?.appliedAt,
    updatedAt: now
  };
}

async function availabilityAppliedRecordFor(
  root: string,
  source: WorkspaceSnapshot,
  plan: SkillAvailabilityPlan,
  records: AppliedSourceRecord[],
  from: string,
  context: AvailabilityApplyFromSourceOptions
): Promise<AppliedSourceRecord> {
  const now = new Date().toISOString();
  const normalizedSourceRoot = path.resolve(source.root);
  const existing = records.find((item) =>
    path.resolve(item.sourceRoot) === normalizedSourceRoot
    && item.profile === plan.profile
    && recordRelationKind(item) === "profileApply"
    && (item.sourceKey === plan.sourceKey || item.targetDir === "")
  );
  const id = existing?.id || `${slug(path.basename(normalizedSourceRoot) || "source")}-${slug(plan.profile)}-${crypto.createHash("sha256").update(`availability:${normalizedSourceRoot}:${plan.profile}`).digest("hex").slice(0, 8)}`;
  return {
    id,
    relationKind: "profileApply",
    sourceRoot: normalizedSourceRoot,
    sourceName: path.basename(normalizedSourceRoot),
    sourceRemoteUrl: context.sourceProvenance?.sourceRemoteUrl ?? (isRemoteInput(from) ? from : existing?.sourceRemoteUrl),
    sourceKey: plan.sourceKey,
    sourcePolicyDigest: plan.sourcePolicyDigest,
    profile: plan.profile,
    targetDir: "",
    skills: plan.items.map((item) => item.skill),
    managedSkillNames: mergeNames(existing?.managedSkillNames ?? existing?.skills ?? [], [
      ...plan.items.map((item) => item.skill),
      ...plan.assets.map((item) => item.name)
    ]),
    availabilityItems: plan.items.map((item) => ({
      skill: item.skill,
      mode: requiredEffectiveMode(item),
      policyOrigin: item.policyOrigin,
      destinations: item.destinations.map((destination) => path.resolve(destination.path))
    })),
    availabilityAssets: plan.assets.map((item) => ({
      name: item.name,
      sourcePath: item.sourcePath,
      destinations: item.destinations.map((destination) => path.resolve(destination.path))
    })),
    availabilityContext: {
      agentTargetIds: [...new Set(context.agentTargetIds.map((item) => item.trim().toLowerCase()).filter(Boolean))].sort(),
      projectTargetDirs: [...new Set((context.projectTargetDirs ?? []).map((item) => path.resolve(root, item)))].sort(),
      availabilityOverrides: context.availabilityOverrides?.map((item) => ({ skill: item.skill, mode: item.mode })),
      projectAssessments: plan.items.flatMap((item) => item.projectAssessment ? [{
        ...item.projectAssessment,
        projectRoots: [...item.projectAssessment.projectRoots],
        conditionResults: item.projectAssessment.conditionResults.map((result) => ({ ...result, evidence: [...result.evidence] })),
        evidence: [...item.projectAssessment.evidence],
        unknowns: [...item.projectAssessment.unknowns]
      }] : []),
      homeDir: path.resolve(context.homeDir ?? os.homedir())
    },
    ...(context.providerCapabilities ? {
      provisioningEvidence: {
        providerCapabilities: [...new Set(context.providerCapabilities)].sort(),
        targets: [
          ...plan.items.flatMap((item) => item.destinations.map((destination) => ({
            name: item.skill,
            kind: "skill" as const,
            path: path.resolve(destination.path),
            contentDigest: item.contentDigest
          }))),
          ...plan.assets.flatMap((item) => item.destinations.map((destination) => ({
            name: item.name,
            kind: "asset" as const,
            path: path.resolve(destination.path),
            contentDigest: item.contentDigest
          }))),
          ...plan.loaderTargets.map((item) => ({
            name: "arcforge-on-demand",
            kind: "loader" as const,
            path: path.resolve(item.path),
            contentDigest: item.expectedDigest
          }))
        ].sort((left, right) => left.path.localeCompare(right.path) || left.name.localeCompare(right.name))
      }
    } : {}),
    sourceCommit: context.sourceProvenance?.sourceCommit ?? await sourceCommit(normalizedSourceRoot),
    appliedAt: now,
    updatedAt: now
  };
}

function requiredEffectiveMode(item: SkillAvailabilityPlan["items"][number]) {
  if (!item.effectiveMode) throw new Error(`Availability plan item is unclassified: ${item.skill}`);
  return item.effectiveMode;
}

function availabilityRecordFor(records: AppliedSourceRecord[], sourceRoot: string, plan: SkillAvailabilityPlan): AppliedSourceRecord | undefined {
  const normalizedSourceRoot = path.resolve(sourceRoot);
  return records.find((record) =>
    record.profile === plan.profile
    && recordRelationKind(record) === "profileApply"
    && (record.sourceKey === plan.sourceKey || path.resolve(record.sourceRoot) === normalizedSourceRoot)
  );
}

function requiredAvailabilityContext(record: AppliedSourceRecord): NonNullable<AppliedSourceRecord["availabilityContext"]> {
  if (record.availabilityContext) return record.availabilityContext;
  throw new Error(`Applied availability source '${record.id}' predates saved target context. Re-run an explicit availability apply before using applied drift or reapply.`);
}

function assertAvailabilityRelationRoot(root: string, sourceRoot: string, plan: SkillAvailabilityPlan, allowUnrelatedRoot: boolean): void {
  const normalizedRoot = path.resolve(root);
  if (isSameOrParent(normalizedRoot, path.resolve(sourceRoot))) return;
  if (plan.items.some((item) => item.destinations.some((destination) => isSameOrParent(normalizedRoot, path.resolve(destination.path))))) return;
  if (allowUnrelatedRoot) return;
  throw new Error([
    "Applied availability relation root is unrelated to both source and planned destinations.",
    `--root: ${normalizedRoot}`,
    `--from: ${path.resolve(sourceRoot)}`,
    "Use a consumer or maintenance project root, or pass --allow-unrelated-root for an intentional user-only relation."
  ].join("\n"));
}

function recordRelationKind(record: AppliedSourceRecord): AppliedRelationKind {
  return record.relationKind === "maintenanceImport" ? "maintenanceImport" : "profileApply";
}

async function upsertAppliedSource(root: string, record: AppliedSourceRecord, stateRoot?: string): Promise<AppliedSourceRecord> {
  const records = await listAppliedSources(root, stateRoot);
  const next = [
    ...records.filter((item) => item.id !== record.id),
    { ...record, updatedAt: new Date().toISOString() }
  ].sort(compareAppliedRecord);
  await saveLocalProjectAppliedSources(root, next, { stateRoot });
  return next.find((item) => item.id === record.id) ?? record;
}

async function mergeSourceProfile(root: string, profileName: string, skills: string[]): Promise<void> {
  const config = await loadConfig(root);
  const existing = config.profiles.find((item) => item.name === profileName);
  const profiles = existing
    ? config.profiles.map((item) => item.name === profileName ? { ...item, skills: mergeNames(item.skills, skills) } : item)
    : [...config.profiles, { name: profileName, description: `Skills maintained for ${profileName}.`, skills, targets: ["claude", "codex", "cursor"] }];
  await saveConfig(root, { ...config, profiles });
}

function configForAppliedRecord(config: ArcForgeConfig, record: AppliedSourceRecord): ArcForgeConfig {
  if (record.skills.length === 0) return config;
  return configWithSkillSelection(config, record.profile, record.skills);
}

function configWithSkillSelection(config: ArcForgeConfig, profileName: string, skills: string[]): ArcForgeConfig {
  return {
    ...config,
    profiles: config.profiles.some((item) => item.name === profileName)
      ? config.profiles.map((item) => item.name === profileName ? { ...item, skills } : item)
      : [...config.profiles, { name: profileName, skills, targets: ["claude", "codex", "cursor"] }]
  };
}

function selectAppliedRecords(records: AppliedSourceRecord[], id?: string): AppliedSourceRecord[] {
  if (!id) return records;
  const record = records.find((item) => item.id === id);
  if (!record) throw new Error(`Applied source not found: ${id}`);
  return [record];
}

async function replaceDirectory(source: string, target: string): Promise<void> {
  if (path.resolve(source) === path.resolve(target)) throw new Error(`Refusing to replace source directory: ${source}`);
  const parent = path.dirname(target);
  const temp = path.join(parent, `.${path.basename(target)}.tmp-${randomUUID()}`);
  const backup = path.join(parent, `.${path.basename(target)}.backup-${randomUUID()}`);
  await fs.mkdir(parent, { recursive: true });
  await fs.rm(temp, { recursive: true, force: true });
  await copyDirectory(source, temp);
  const hadTarget = await pathExists(target);
  if (hadTarget) await fs.rename(target, backup);
  try {
    await fs.rename(temp, target);
    if (hadTarget) await fs.rm(backup, { recursive: true, force: true });
  } catch (error) {
    await fs.rm(temp, { recursive: true, force: true });
    if (hadTarget && !(await pathExists(target))) await fs.rename(backup, target);
    throw error;
  }
}

async function sourceCommit(root: string): Promise<string | undefined> {
  return currentCommit(root, []).catch(() => undefined);
}

function isRemoteInput(value: string): boolean {
  return /^https?:\/\//.test(value) || /^git@/.test(value) || /^ssh:\/\//.test(value) || /^github\.com\//.test(value) || /^[\w.-]+\/[\w.-]+(?:\.git)?(?:\/.*)?$/.test(value);
}

function cleanRelativePath(value: string): string {
  return value.replace(/\\/g, "/").split("/").filter((part) => part && part !== "." && part !== "..").join("/");
}

function assertInside(target: string, root: string, action: string): void {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    const boundary = action === "import" ? "current project" : "target project";
    throw new Error(`Refusing to ${action} outside ${boundary}: ${target}`);
  }
}

function mergeNames(left: string[], right: string[]): string[] {
  const names = [...new Set([...left, ...right].filter(Boolean))];
  if (names.includes("*")) return ["*"];
  return names.sort((a, b) => a.localeCompare(b));
}

function currentSkillSelection(skills: string[]): string[] {
  if (skills.includes("*")) return ["*"];
  return [...new Set(skills.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function compareAppliedRecord(left: AppliedSourceRecord, right: AppliedSourceRecord): number {
  return (left.sourceName || left.sourceRoot).localeCompare(right.sourceName || right.sourceRoot) || left.targetDir.localeCompare(right.targetDir);
}

function reusableProjectAssessments(
  records: AppliedSourceRecord[],
  sourceRoot: string,
  consumerRoot: string,
  profile: string,
  agentTargetIds: string[],
  projectTargetDirs: string[],
  currentPolicyDigest: string | undefined
): SkillProjectApplicabilityAssessment[] | undefined {
  const expectedAgents = normalizedStringSet(agentTargetIds);
  const expectedProjects = normalizedPathSet(projectTargetDirs.map((item) => path.resolve(consumerRoot, item)));
  const matching = records
    .filter((record) => path.resolve(record.sourceRoot) === path.resolve(sourceRoot)
      && record.profile === profile
      && Boolean(currentPolicyDigest)
      && record.sourcePolicyDigest === currentPolicyDigest
      && sameStringSet(record.availabilityContext?.agentTargetIds ?? [], expectedAgents)
      && sameStringSet(normalizedPathSet(record.availabilityContext?.projectTargetDirs ?? []), expectedProjects)
      && (record.availabilityContext?.projectAssessments?.length ?? 0) > 0)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  return matching[0]?.availabilityContext?.projectAssessments;
}

function normalizedStringSet(values: string[]): string[] {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))].sort();
}

function normalizedPathSet(values: string[]): string[] {
  return [...new Set(values.map((item) => {
    const resolved = path.resolve(item);
    return process.platform === "win32" || process.platform === "darwin" ? resolved.toLowerCase() : resolved;
  }))].sort();
}

function sameStringSet(left: string[], right: string[]): boolean {
  const normalizedLeft = normalizedStringSet(left);
  return normalizedLeft.length === right.length && normalizedLeft.every((item, index) => item === right[index]);
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

async function projectCandidatePaths(cwd: string, query: string): Promise<string[]> {
  const paths = new Set<string>();
  const add = (value?: string) => {
    if (!value) return;
    paths.add(path.resolve(value));
  };
  if (path.isAbsolute(query) || query.includes("/") || query.includes("\\")) {
    add(path.isAbsolute(query) ? query : path.resolve(cwd, query));
  } else {
    add(path.join(cwd, query));
    add(path.join(path.dirname(cwd), query));
    add(path.join(path.dirname(path.dirname(cwd)), query));
    for (const state of await listLocalProjectStates()) {
      const localSourcePath = state.list?.localSourcePath;
      if (path.basename(state.root) === query || Boolean(localSourcePath && path.basename(localSourcePath) === query)) {
        add(state.root);
        add(localSourcePath);
      }
    }
  }
  return [...paths];
}

async function inspectProjectCandidate(candidatePath: string, query: string): Promise<ProjectResolveCandidate> {
  const exists = await isDirectory(candidatePath);
  const candidate: ProjectResolveCandidate = {
    path: candidatePath,
    name: path.basename(candidatePath),
    exists,
    isSkillProject: false,
    profiles: [],
    skillCount: 0,
    match: "not-skill-project",
    reasons: []
  };
  if (!exists) {
    candidate.scan = { ok: false, error: "Path does not exist or is not a directory." };
    candidate.reasons.push("Path is not a directory.");
    return candidate;
  }
  try {
    const snapshot = await scanWorkspace(candidatePath);
    const isSkillProject = snapshot.skills.length > 0;
    const git = await detectLocalGitSource(candidatePath);
    candidate.isSkillProject = isSkillProject;
    candidate.sourceDir = snapshot.config.sourceDir;
    candidate.profiles = snapshot.config.profiles.map((profile) => profile.name);
    candidate.skillCount = snapshot.skills.length;
    candidate.git = git ? { ...git, dirty: await isGitDirty(git.root) } : undefined;
    candidate.scan = { ok: true };
    if (!isSkillProject) {
      candidate.reasons.push("No skills were discovered.");
    } else {
      candidate.match = isExplicitProjectPath(query)
        ? "exact-path"
        : path.basename(candidatePath) === query
          ? "name"
          : "candidate";
      candidate.reasons.push("Skill project scan succeeded.");
      if (candidate.git?.remotes.length) candidate.reasons.push("Git remote is available for sharing/versioning.");
      if (candidate.git?.dirty) candidate.reasons.push("Git checkout has uncommitted changes.");
    }
  } catch (error) {
    candidate.scan = { ok: false, error: error instanceof Error ? error.message : String(error) };
    candidate.reasons.push("Scan failed.");
  }
  return candidate;
}

function compareProjectCandidates(left: ProjectResolveCandidate, right: ProjectResolveCandidate): number {
  return projectCandidateRank(left) - projectCandidateRank(right) || left.path.localeCompare(right.path);
}

function projectCandidateRank(candidate: ProjectResolveCandidate): number {
  if (candidate.match === "exact-path") return 0;
  if (candidate.match === "name") return 1;
  if (candidate.match === "candidate") return 2;
  return 3;
}

function isExplicitProjectPath(query: string): boolean {
  return path.isAbsolute(query) || query.includes("/") || query.includes("\\");
}

async function isGitDirty(gitRoot: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain"], { cwd: gitRoot });
    return String(stdout).trim().length > 0;
  } catch {
    return false;
  }
}

function resolveInstallTarget(input: string, relationRecordRoot?: string): LocalSkillWorkflowPlan["install"] {
  if (input === "codex:user") return { target: input, targetDir: path.join(os.homedir(), ".codex", "skills"), relationRecordRoot };
  if (input === "claude:user") return { target: input, targetDir: path.join(os.homedir(), ".claude", "skills"), relationRecordRoot };
  if (input === "cursor:user") return { target: input, targetDir: path.join(os.homedir(), ".cursor", "skills"), relationRecordRoot };
  return { target: input, targetDir: input, relationRecordRoot };
}

function resolveShareTarget(input: string, maintenance?: ProjectResolveCandidate): LocalSkillWorkflowPlan["share"] {
  const remote = maintenance?.git?.remotes.find((item) => item.name === input);
  return {
    target: input,
    remoteName: remote?.name,
    remoteUrl: remote?.pushUrl || remote?.fetchUrl
  };
}

async function createCleanupLocalSkillPlan(options: CleanupLocalSkillOptions): Promise<CleanupLocalSkillPlan> {
  const root = path.resolve(options.root);
  const snapshot = await scanWorkspace(root, { sourceDir: options.sourceDir });
  const sourceDir = snapshot.config.sourceDir;
  if (!options.skills.length) throw new Error("Cleanup requires --skills <a,b>.");
  const sourceRoot = path.resolve(root, sourceDir);
  assertInside(sourceRoot, root, "cleanup");
  const skills = await Promise.all(options.skills.map(async (skill) => {
    const name = skill.trim();
    const skillPath = path.join(sourceRoot, name);
    const exists = await pathExists(skillPath);
    const isSkillDirectory = exists && await pathExists(path.join(skillPath, "SKILL.md"));
    const inside = isSameOrParent(root, skillPath);
    const action = exists && isSkillDirectory && inside ? "delete" as const : "skip" as const;
    const reason = !exists
      ? "Local skill copy does not exist."
      : !inside
        ? "Resolved path is outside the project root."
        : !isSkillDirectory
          ? "Directory does not contain SKILL.md."
          : "Selected local skill directory is eligible for explicit deletion.";
    return { name, path: skillPath, exists, isSkillDirectory, action, reason };
  }));
  return {
    root,
    sourceDir,
    skills,
    requiresConfirm: true,
    messages: ["This command only deletes explicitly selected skill directories under the current project sourceDir. It does not infer that they are temporary, and it does not delete maintenance sources or user-level agent installs."]
  };
}

async function isDirectory(filePath: string): Promise<boolean> {
  try {
    return (await fs.stat(filePath)).isDirectory();
  } catch {
    return false;
  }
}

function shellValue(value: string): string {
  if (/^[A-Za-z0-9_./:@~=-]+$/.test(value)) return value;
  return JSON.stringify(value);
}
