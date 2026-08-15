import path from "node:path";
import type {
  AppliedSourceRecord,
  DriftItem,
  DriftPolicyItem,
  DriftReport,
  DriftTargetExtra,
  SkillAvailabilityPlan,
  WorkspaceSnapshot
} from "../shared/types.js";
import { compareDirectory, targetRootExtras } from "./profiles.js";

export interface CreateSkillAvailabilityDriftOptions {
  source: WorkspaceSnapshot;
  plan: SkillAvailabilityPlan;
  record?: AppliedSourceRecord;
  loaderSourcePath?: string;
}

export async function createSkillAvailabilityDriftReport(options: CreateSkillAvailabilityDriftOptions): Promise<DriftReport> {
  const blocking = options.plan.diagnostics.filter((item) => item.severity === "error");
  if (blocking.length > 0) throw new Error(`Availability plan contains ${blocking.length} blocking diagnostic(s).`);
  if (options.plan.loaderTargets.length > 0 && !options.loaderSourcePath) throw new Error("On-demand loader source is unavailable for drift.");

  const skillByPath = new Map(options.source.skills.map((skill) => [toPosixPath(skill.relativePath), skill]));
  const assetByPath = new Map(options.source.assets.map((asset) => [toPosixPath(asset.relativePath), asset]));
  const items: DriftItem[] = [];
  const expectedByRoot = new Map<string, Set<string>>();

  for (const item of options.plan.items) {
    const skill = skillByPath.get(item.sourcePath);
    if (!skill) throw new Error(`Plan skill is absent from the fresh source snapshot: ${item.sourcePath}`);
    for (const destination of item.destinations) {
      items.push(await driftItem(item.skill, "skill", skill.path, destination.path));
      expectTarget(expectedByRoot, destination.path);
    }
  }

  for (const item of options.plan.assets ?? []) {
    const asset = assetByPath.get(item.sourcePath);
    if (!asset || asset.name !== item.name) throw new Error(`Plan asset is absent from the fresh source snapshot: ${item.sourcePath}`);
    for (const destination of item.destinations) {
      if (destination.kind === "user-catalog") throw new Error(`Shared asset cannot target the user catalog: ${item.name}`);
      items.push(await driftItem(item.name, "asset", asset.path, destination.path));
      expectTarget(expectedByRoot, destination.path);
    }
  }

  for (const loader of options.plan.loaderTargets) {
    const sourcePath = options.loaderSourcePath as string;
    items.push(await driftItem("arcforge-on-demand", "loader", sourcePath, loader.path));
    expectTarget(expectedByRoot, loader.path);
  }

  const targetExtras: DriftTargetExtra[] = [];
  for (const [root, expectedNames] of [...expectedByRoot.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    targetExtras.push(...await targetRootExtras(root, expectedNames, options.record?.managedSkillNames ?? options.record?.skills ?? []));
  }

  return {
    profile: options.plan.profile,
    targetDir: options.record?.targetDir ?? "",
    items: items.sort((left, right) => left.targetPath.localeCompare(right.targetPath) || left.skill.localeCompare(right.skill)),
    targetExtras: dedupeTargetExtras(targetExtras),
    policyDrift: policyDrift(options.plan, options.record),
    availabilityPlan: options.plan
  };
}

async function driftItem(skill: string, kind: DriftItem["kind"], sourcePath: string, targetPath: string): Promise<DriftItem> {
  const comparison = await compareDirectory(sourcePath, targetPath);
  return {
    skill,
    kind,
    status: comparison.status,
    sourcePath,
    targetPath,
    files: comparison.files,
    summary: comparison.summary
  };
}

function expectTarget(expectedByRoot: Map<string, Set<string>>, targetPath: string): void {
  const resolved = path.resolve(targetPath);
  const root = path.dirname(resolved);
  const names = expectedByRoot.get(root) ?? new Set<string>();
  names.add(path.basename(resolved));
  expectedByRoot.set(root, names);
}

function policyDrift(plan: SkillAvailabilityPlan, record?: AppliedSourceRecord): DriftPolicyItem[] {
  const recordedBySkill = new Map(record?.availabilityItems?.map((item) => [item.skill, item]) ?? []);
  return plan.items.map((item) => {
    const recorded = recordedBySkill.get(item.skill);
    const currentMode = requiredEffectiveMode(item);
    const currentPaths = normalizedPaths(item.destinations.map((destination) => destination.path));
    const recordedPaths = recorded ? normalizedPaths(recorded.destinations) : undefined;
    if (!recorded) {
      return {
        skill: item.skill,
        status: "changed" as const,
        currentMode,
        currentPaths,
        reason: "The current availability plan has no matching saved relationship item."
      };
    }
    if (recorded.mode !== currentMode || !samePathValues(recordedPaths ?? [], currentPaths)) {
      return {
        skill: item.skill,
        status: "changed" as const,
        recordedMode: recorded.mode,
        currentMode,
        recordedPaths,
        currentPaths,
        reason: recorded.mode !== currentMode
          ? "The effective availability mode differs from the saved relationship."
          : "The resolved destination set differs from the saved relationship."
      };
    }
    return {
      skill: item.skill,
      status: "same" as const,
      recordedMode: recorded.mode,
      currentMode,
      recordedPaths,
      currentPaths,
      reason: "The effective mode and destination set match the saved relationship."
    };
  }).sort((left, right) => left.skill.localeCompare(right.skill));
}

function requiredEffectiveMode(item: SkillAvailabilityPlan["items"][number]) {
  if (!item.effectiveMode) throw new Error(`Availability plan item is unclassified: ${item.skill}`);
  return item.effectiveMode;
}

function normalizedPaths(values: string[]): string[] {
  const unique = new Map<string, string>();
  for (const value of values) {
    const resolved = path.resolve(value);
    unique.set(localPathIdentity(resolved), resolved);
  }
  return [...unique.values()].sort((left, right) => localPathIdentity(left).localeCompare(localPathIdentity(right)));
}

function samePathValues(left: string[], right: string[]): boolean {
  const leftIdentities = left.map(localPathIdentity).sort();
  const rightIdentities = right.map(localPathIdentity).sort();
  return leftIdentities.length === rightIdentities.length && leftIdentities.every((value, index) => value === rightIdentities[index]);
}

function dedupeTargetExtras(values: DriftTargetExtra[]): DriftTargetExtra[] {
  const unique = new Map(values.map((item) => [localPathIdentity(item.targetPath), item]));
  return [...unique.values()].sort((left, right) => left.classification.localeCompare(right.classification) || left.targetPath.localeCompare(right.targetPath));
}

function localPathIdentity(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === "win32" || process.platform === "darwin" ? resolved.toLowerCase() : resolved;
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}
