import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import type {
  SkillAvailabilityMode,
  SkillAvailabilityOverride,
  SkillProjectManifest,
  SkillProjectManifestDiagnostic,
  SkillProjectManifestSkill,
  SkillSummary
} from "../shared/types.js";
import {
  parseSkillProjectManifest,
  SKILL_PROJECT_MANIFEST_FILE,
  validateSkillProjectManifestSkills
} from "./skill-project-manifest.js";

export interface SkillProjectAliasUpdate {
  skill: string;
  aliases: string[];
}

export interface SkillProjectAvailabilityPlanOptions {
  root: string;
  sourceDir: string;
  skills: Pick<SkillSummary, "name" | "relativePath">[];
  currentManifest?: SkillProjectManifest;
  currentDiagnostics?: SkillProjectManifestDiagnostic[];
  sourceDirOverrideProvided?: boolean;
  defaultMode?: SkillAvailabilityMode | null;
  set?: SkillAvailabilityOverride[];
  aliases?: SkillProjectAliasUpdate[];
  remove?: string[];
}

export interface SkillProjectAvailabilityChange {
  kind: "source-dir" | "default-mode" | "skill-policy";
  skill?: string;
  path?: string;
  before: string | SkillProjectManifestSkill | null;
  after: string | SkillProjectManifestSkill | null;
}

export interface SkillProjectAvailabilityPlan {
  root: string;
  manifestPath: string;
  planDigest: string;
  existed: boolean;
  before: SkillProjectManifest | null;
  proposed: SkillProjectManifest;
  changes: SkillProjectAvailabilityChange[];
  diagnostics: SkillProjectManifestDiagnostic[];
  blocked: boolean;
  requiresConfirm: true;
}

export interface SkillProjectAvailabilityRunResult {
  manifestPath: string;
  written: boolean;
  manifest: SkillProjectManifest;
  changes: SkillProjectAvailabilityChange[];
  diagnostics: SkillProjectManifestDiagnostic[];
}

export function createSkillProjectAvailabilityPlan(
  options: SkillProjectAvailabilityPlanOptions
): SkillProjectAvailabilityPlan {
  const root = path.resolve(options.root);
  if (options.currentManifest && options.sourceDirOverrideProvided) {
    throw new Error("--source-dir can only be used when creating arcforge.skill-project.json; update an existing manifest explicitly before changing its source directory.");
  }
  const structuralDiagnostics = (options.currentDiagnostics ?? []).filter((item) =>
    item.severity === "error"
    && item.code !== "SKILL_PROJECT_MANIFEST_STALE_PATH"
    && item.code !== "SKILL_PROJECT_MANIFEST_ALIASES_MODE_INVALID"
    && item.code !== "SKILL_PROJECT_MANIFEST_ALIAS_CONFLICT"
    && item.code !== "SKILL_PROJECT_MANIFEST_APPLICABILITY_MODE_INVALID"
  );
  const base = normalizeManifest(options.currentManifest ?? {
    version: 1,
    sourceDir: normalizeSourceDir(options.sourceDir),
    availability: { skills: [] }
  });
  const original = options.currentManifest ? normalizeManifest(options.currentManifest) : null;
  const byPath = new Map<string, SkillProjectManifestSkill>(
    base.availability.skills.map((item) => [item.path, cloneSkillPolicy(item)])
  );
  const set = uniqueSkillOverrides(options.set ?? [], "set");
  const aliases = uniqueAliasUpdates(options.aliases ?? []);
  const remove = uniqueStrings(options.remove ?? [], "remove");
  const resolvedSet = set.map((item) => ({ ...item, ...resolveDiscoveredSkill(item.skill, options.skills) }));
  const resolvedAliases = aliases.map((item) => ({ ...item, ...resolveDiscoveredSkill(item.skill, options.skills) }));
  const resolvedRemove = remove.map((skill) => ({ skill, relativePath: resolveConfiguredOrDiscoveredPath(skill, options.skills, byPath) }));
  assertUniqueResolvedPaths(resolvedSet, "set");
  assertUniqueResolvedPaths(resolvedAliases, "aliases");
  assertUniqueResolvedPaths(resolvedRemove, "remove");
  const setPaths = new Set(resolvedSet.map((item) => item.relativePath));
  const aliasPaths = new Set(resolvedAliases.map((item) => item.relativePath));
  for (const item of resolvedRemove) {
    if (setPaths.has(item.relativePath) || aliasPaths.has(item.relativePath)) {
      throw new Error(`Availability policy cannot remove and update the same skill in one operation: ${item.skill} (${item.relativePath})`);
    }
  }

  for (const item of resolvedRemove) {
    byPath.delete(item.relativePath);
  }
  for (const item of resolvedSet) {
    const current = byPath.get(item.relativePath);
    byPath.set(item.relativePath, {
      path: item.relativePath,
      mode: item.mode,
      ...(item.mode === "user-on-demand" && current?.aliases?.length ? { aliases: current.aliases } : {}),
      ...(item.mode === "project-ambient" && current?.projectApplicability
        ? { projectApplicability: current.projectApplicability }
        : {})
    });
  }
  for (const update of resolvedAliases) {
    const current = byPath.get(update.relativePath);
    if (!current) throw new Error(`Aliases require an explicit source policy for skill: ${update.skill}`);
    if (current.mode !== "user-on-demand" && update.aliases.length > 0) {
      throw new Error(`Aliases are only valid for user-on-demand skills: ${update.skill}`);
    }
    const normalizedAliases = uniqueStrings(
      update.aliases.map((item) => item.trim()),
      `aliases for ${update.skill}`,
      (item) => item.toLowerCase()
    ).sort();
    byPath.set(update.relativePath, {
      path: current.path,
      mode: current.mode,
      ...(normalizedAliases.length ? { aliases: normalizedAliases } : {}),
      ...(current.projectApplicability ? { projectApplicability: current.projectApplicability } : {})
    });
  }

  const proposed = normalizeManifest({
    ...base,
    availability: {
      ...(options.defaultMode === null
        ? {}
        : { defaultMode: options.defaultMode ?? base.availability.defaultMode }),
      skills: [...byPath.values()]
    }
  });
  const parsed = parseSkillProjectManifest(JSON.stringify(proposed));
  if (!parsed.manifest) throw new Error("Generated source availability manifest is invalid.");
  const diagnostics = validateSkillProjectManifestSkills(parsed.manifest, options.skills, [
    ...structuralDiagnostics,
    ...parsed.diagnostics
  ]);
  const changes = manifestChanges(original, parsed.manifest, options.skills);
  const manifestPath = path.join(root, SKILL_PROJECT_MANIFEST_FILE);
  const planDigest = crypto.createHash("sha256").update(JSON.stringify({
    root,
    manifestPath,
    before: original,
    proposed: parsed.manifest,
    changes,
    diagnostics
  })).digest("hex");

  return {
    root,
    manifestPath,
    planDigest,
    existed: Boolean(original),
    before: original,
    proposed: parsed.manifest,
    changes,
    diagnostics,
    blocked: diagnostics.some((item) => item.severity === "error"),
    requiresConfirm: true
  };
}

export async function executeSkillProjectAvailabilityPlan(
  plan: SkillProjectAvailabilityPlan,
  confirm: boolean
): Promise<SkillProjectAvailabilityRunResult> {
  if (!confirm) throw new Error("Source availability update requires --confirm after reviewing a fresh plan.");
  if (plan.blocked) {
    const blocking = plan.diagnostics.filter((item) => item.severity === "error");
    throw new Error(`SOURCE_MANIFEST_INVALID: ${blocking.map((item) => `${item.code}${item.path ? ` (${item.path})` : ""}`).join(", ")}`);
  }
  if (plan.changes.length === 0) {
    return {
      manifestPath: plan.manifestPath,
      written: false,
      manifest: plan.proposed,
      changes: [],
      diagnostics: plan.diagnostics
    };
  }

  await assertPlanStillCurrent(plan);
  await fs.mkdir(plan.root, { recursive: true });
  const temporaryPath = path.join(plan.root, `.${SKILL_PROJECT_MANIFEST_FILE}.tmp-${process.pid}-${crypto.randomUUID()}`);
  let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
  try {
    handle = await fs.open(temporaryPath, "wx", 0o644);
    await handle.writeFile(`${JSON.stringify(plan.proposed, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await fs.rename(temporaryPath, plan.manifestPath);
  } finally {
    await handle?.close().catch(() => undefined);
    await fs.unlink(temporaryPath).catch(() => undefined);
  }

  return {
    manifestPath: plan.manifestPath,
    written: true,
    manifest: plan.proposed,
    changes: plan.changes,
    diagnostics: plan.diagnostics
  };
}

async function assertPlanStillCurrent(plan: SkillProjectAvailabilityPlan): Promise<void> {
  let current: SkillProjectManifest | null = null;
  try {
    const parsed = parseSkillProjectManifest(await fs.readFile(plan.manifestPath, "utf8"));
    if (!parsed.manifest || parsed.diagnostics.some((item) => item.severity === "error")) {
      throw new Error("SOURCE_MANIFEST_CHANGED: current manifest is no longer valid.");
    }
    current = normalizeManifest(parsed.manifest);
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || (error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (JSON.stringify(current) !== JSON.stringify(plan.before)) {
    throw new Error("SOURCE_MANIFEST_CHANGED: current manifest differs from the reviewed plan.");
  }
}

function manifestChanges(
  before: SkillProjectManifest | null,
  after: SkillProjectManifest,
  skills: Pick<SkillSummary, "name" | "relativePath">[]
): SkillProjectAvailabilityChange[] {
  const changes: SkillProjectAvailabilityChange[] = [];
  const beforeSourceDir = before?.sourceDir ?? null;
  const afterSourceDir = after.sourceDir ?? null;
  if (beforeSourceDir !== afterSourceDir) changes.push({ kind: "source-dir", before: beforeSourceDir, after: afterSourceDir });
  const beforeDefault = before?.availability.defaultMode ?? null;
  const afterDefault = after.availability.defaultMode ?? null;
  if (beforeDefault !== afterDefault) changes.push({ kind: "default-mode", before: beforeDefault, after: afterDefault });

  const beforeByPath = new Map(before?.availability.skills.map((item) => [item.path, item]) ?? []);
  const afterByPath = new Map(after.availability.skills.map((item) => [item.path, item]));
  const paths = [...new Set([...beforeByPath.keys(), ...afterByPath.keys()])].sort();
  for (const skillPath of paths) {
    const previous = beforeByPath.get(skillPath) ?? null;
    const next = afterByPath.get(skillPath) ?? null;
    if (JSON.stringify(previous) === JSON.stringify(next)) continue;
    changes.push({
      kind: "skill-policy",
      skill: skills.find((item) => item.relativePath === skillPath)?.name ?? path.posix.basename(skillPath),
      path: skillPath,
      before: previous,
      after: next
    });
  }
  return changes;
}

function normalizeManifest(manifest: SkillProjectManifest): SkillProjectManifest {
  return {
    version: 1,
    ...(manifest.sourceDir ? { sourceDir: normalizeSourceDir(manifest.sourceDir) } : {}),
    availability: {
      ...(manifest.availability.defaultMode ? { defaultMode: manifest.availability.defaultMode } : {}),
      skills: manifest.availability.skills
        .map((item) => ({
          path: toPosixPath(item.path),
          mode: item.mode,
          ...(item.aliases?.length ? { aliases: [...new Set(item.aliases)].sort() } : {}),
          ...(item.projectApplicability ? {
            projectApplicability: {
              summary: item.projectApplicability.summary.trim(),
              conditions: item.projectApplicability.conditions
                .map((condition) => ({ ...condition, id: condition.id.trim(), description: condition.description.trim() }))
                .sort((left, right) => left.id.localeCompare(right.id)),
              ...(item.projectApplicability.evidenceGuidance?.length
                ? { evidenceGuidance: [...new Set(item.projectApplicability.evidenceGuidance.map((value) => value.trim()))] }
                : {}),
              ...(item.projectApplicability.clarifyingQuestions?.length
                ? { clarifyingQuestions: [...new Set(item.projectApplicability.clarifyingQuestions.map((value) => value.trim()))] }
                : {})
            }
          } : {})
        }))
        .sort((left, right) => left.path.localeCompare(right.path))
    }
  };
}

function cloneSkillPolicy(item: SkillProjectManifestSkill): SkillProjectManifestSkill {
  return {
    ...item,
    ...(item.aliases ? { aliases: [...item.aliases] } : {}),
    ...(item.projectApplicability ? {
      projectApplicability: {
        ...item.projectApplicability,
        conditions: item.projectApplicability.conditions.map((condition) => ({ ...condition })),
        ...(item.projectApplicability.evidenceGuidance ? { evidenceGuidance: [...item.projectApplicability.evidenceGuidance] } : {}),
        ...(item.projectApplicability.clarifyingQuestions ? { clarifyingQuestions: [...item.projectApplicability.clarifyingQuestions] } : {})
      }
    } : {})
  };
}

function normalizeSourceDir(sourceDir: string): string {
  return toPosixPath(sourceDir.trim() || "skills");
}

function resolveDiscoveredSkill(
  skillRef: string,
  skills: Pick<SkillSummary, "name" | "relativePath">[]
): Pick<SkillSummary, "name" | "relativePath"> {
  const normalized = toPosixPath(skillRef.trim());
  const matches = skills.filter((item) => item.name === normalized || toPosixPath(item.relativePath) === normalized);
  if (matches.length === 0) throw new Error(`Source availability skill was not discovered: ${skillRef}`);
  if (matches.length > 1) {
    throw new Error(`Source availability skill name is ambiguous; use a relative path: ${skillRef} (${matches.map((item) => item.relativePath).join(", ")})`);
  }
  return { ...matches[0], relativePath: toPosixPath(matches[0].relativePath) };
}

function resolveConfiguredOrDiscoveredPath(
  skillRef: string,
  skills: Pick<SkillSummary, "name" | "relativePath">[],
  configured: Map<string, SkillProjectManifestSkill>
): string {
  const normalized = toPosixPath(skillRef.trim());
  if (configured.has(normalized)) return normalized;
  const configuredByName = [...configured.keys()].filter((item) => path.posix.basename(item) === normalized);
  if (configuredByName.length === 1) return configuredByName[0];
  if (configuredByName.length > 1) throw new Error(`Configured skill name is ambiguous; use a relative path: ${skillRef}`);
  return resolveDiscoveredSkill(normalized, skills).relativePath;
}

function uniqueSkillOverrides(items: SkillAvailabilityOverride[], label: string): SkillAvailabilityOverride[] {
  const names = new Set<string>();
  return items.map((item) => {
    const skill = item.skill.trim();
    if (!skill || names.has(skill)) throw new Error(`Duplicate or empty skill in availability ${label}: ${item.skill}`);
    names.add(skill);
    return { skill, mode: item.mode };
  });
}

function uniqueAliasUpdates(items: SkillProjectAliasUpdate[]): SkillProjectAliasUpdate[] {
  const names = new Set<string>();
  return items.map((item) => {
    const skill = item.skill.trim();
    if (!skill || names.has(skill)) throw new Error(`Duplicate or empty skill in aliases: ${item.skill}`);
    names.add(skill);
    return { skill, aliases: item.aliases };
  });
}

function uniqueStrings(items: string[], label: string, keyFor: (item: string) => string = (item) => item): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    const key = keyFor(item);
    if (!item || seen.has(key)) throw new Error(`Duplicate or empty value in ${label}: ${item}`);
    seen.add(key);
  }
  return [...seen];
}

function assertUniqueResolvedPaths(
  items: { skill: string; relativePath: string }[],
  label: string
): void {
  const byPath = new Map<string, string>();
  for (const item of items) {
    const previous = byPath.get(item.relativePath);
    if (previous) {
      throw new Error(`Duplicate availability ${label} resolves to the same skill: ${previous}, ${item.skill} (${item.relativePath})`);
    }
    byPath.set(item.relativePath, item.skill);
  }
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}
