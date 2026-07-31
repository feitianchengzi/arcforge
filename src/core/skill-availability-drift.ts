import path from "node:path";
import type {
  AppliedSourceRecord,
  DriftItem,
  DriftPolicyItem,
  DriftReport,
  DriftTargetExtra,
  SkillAvailabilityDestinationKind,
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
  const items: DriftItem[] = [];
  const expectedByRoot = new Map<string, Set<string>>();
  const ambientRoots = new Map<string, SkillAvailabilityDestinationKind>();

  for (const item of options.plan.items) {
    const skill = skillByPath.get(item.sourcePath);
    if (!skill) throw new Error(`Plan skill is absent from the fresh source snapshot: ${item.sourcePath}`);
    for (const destination of item.destinations) {
      items.push(await driftItem(item.skill, "skill", skill.path, destination.path));
      expectTarget(expectedByRoot, destination.path);
      if (destination.kind !== "user-catalog") ambientRoots.set(path.dirname(destination.path), destination.kind);
    }
  }

  for (const asset of options.source.assets) {
    for (const root of ambientRoots.keys()) {
      const targetPath = path.join(root, asset.name);
      items.push(await driftItem(asset.name, "asset", asset.path, targetPath));
      expectTarget(expectedByRoot, targetPath);
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
    const currentPaths = normalizedPaths(item.destinations.map((destination) => destination.path));
    const recordedPaths = recorded ? normalizedPaths(recorded.destinations) : undefined;
    if (item.policyOrigin === "compatibility") {
      return {
        skill: item.skill,
        status: "unclassified" as const,
        recordedMode: recorded?.mode,
        currentMode: item.effectiveMode,
        recordedPaths,
        currentPaths,
        reason: "The effective mode comes from compatibility fallback because neither source nor consumer policy classifies this skill."
      };
    }
    if (!recorded) {
      return {
        skill: item.skill,
        status: "changed" as const,
        currentMode: item.effectiveMode,
        currentPaths,
        reason: "The current availability plan has no matching saved relationship item."
      };
    }
    if (recorded.mode !== item.effectiveMode || !sameValues(recordedPaths ?? [], currentPaths)) {
      return {
        skill: item.skill,
        status: "changed" as const,
        recordedMode: recorded.mode,
        currentMode: item.effectiveMode,
        recordedPaths,
        currentPaths,
        reason: recorded.mode !== item.effectiveMode
          ? "The effective availability mode differs from the saved relationship."
          : "The resolved destination set differs from the saved relationship."
      };
    }
    return {
      skill: item.skill,
      status: "same" as const,
      recordedMode: recorded.mode,
      currentMode: item.effectiveMode,
      recordedPaths,
      currentPaths,
      reason: "The effective mode and destination set match the saved relationship."
    };
  }).sort((left, right) => left.skill.localeCompare(right.skill));
}

function normalizedPaths(values: string[]): string[] {
  return [...new Set(values.map((value) => path.resolve(value)))].sort((left, right) => left.localeCompare(right));
}

function sameValues(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function dedupeTargetExtras(values: DriftTargetExtra[]): DriftTargetExtra[] {
  const unique = new Map(values.map((item) => [path.resolve(item.targetPath), item]));
  return [...unique.values()].sort((left, right) => left.classification.localeCompare(right.classification) || left.targetPath.localeCompare(right.targetPath));
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}
