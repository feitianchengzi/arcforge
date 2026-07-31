import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import type {
  AppliedSourceRecord,
  ArcForgeProfile,
  SkillAvailabilityDestination,
  SkillAvailabilityPlan,
  SkillAvailabilityMode,
  SkillAvailabilityOverride,
  SkillAvailabilityPolicyOrigin,
  SkillAvailabilityResolution,
  SkillProjectManifest,
  SkillProjectManifestDiagnostic,
  SkillSummary,
  WorkspaceSnapshot
} from "../shared/types.js";

export interface ResolveSkillAvailabilityOptions {
  skills: Pick<SkillSummary, "name" | "relativePath">[];
  profile?: Pick<ArcForgeProfile, "availability">;
  sourceManifest?: SkillProjectManifest;
  invocationOverrides?: SkillAvailabilityOverride[];
  compatibilityMode?: SkillAvailabilityMode;
}

export interface CreateSkillAvailabilityPlanOptions {
  source: WorkspaceSnapshot;
  consumerRoot?: string;
  profileName: string;
  skills?: string[];
  agentTargetIds: string[];
  projectTargetDirs?: string[];
  invocationOverrides?: SkillAvailabilityOverride[];
  appliedRecords?: AppliedSourceRecord[];
  homeDir?: string;
  loaderSourcePath?: string;
  compatibilityMode?: SkillAvailabilityMode;
}

export const ARCFORGE_ON_DEMAND_SKILL_NAME = "arcforge-on-demand";

const AGENT_SKILL_DIRS: Record<string, string[]> = {
  codex: [".codex", "skills"],
  claude: [".claude", "skills"],
  cursor: [".cursor", "skills"]
};

const AVAILABILITY_MODES = new Set<SkillAvailabilityMode>([
  "user-ambient",
  "project-ambient",
  "user-on-demand"
]);

export function resolveSkillAvailability(options: ResolveSkillAvailabilityOptions): SkillAvailabilityResolution {
  const diagnostics: SkillProjectManifestDiagnostic[] = [];
  const selectedNames = new Set(options.skills.map((skill) => skill.name));
  const invocation = overrideMap(options.invocationOverrides, "invocation", selectedNames, diagnostics);
  const profileSkills = overrideMap(options.profile?.availability?.skills, "profile-skill", selectedNames, diagnostics);
  const profileDefault = checkedMode(options.profile?.availability?.defaultMode, "profile-default", diagnostics);
  const sourceDefault = options.sourceManifest?.availability.defaultMode;
  const sourceByPath = new Map(options.sourceManifest?.availability.skills.map((item) => [item.path, item.mode]) ?? []);
  const compatibilityMode = options.compatibilityMode ?? "user-ambient";

  const duplicateNames = duplicateValues(options.skills.map((skill) => skill.name));
  for (const name of duplicateNames) {
    diagnostics.push({
      severity: "error",
      code: "DUPLICATE_SKILL_NAME",
      path: name,
      message: `Availability cannot resolve duplicate selected skill name: ${name}`
    });
  }

  const items = options.skills.map((skill) => {
    const sourceSkill = sourceByPath.get(toPosixPath(skill.relativePath));
    const sourceRecommendation = sourceSkill ?? sourceDefault;
    const sourceRecommendationOrigin = sourceSkill ? "skill" as const : sourceDefault ? "project" as const : "none" as const;
    const ordered: Array<[SkillAvailabilityMode | undefined, SkillAvailabilityPolicyOrigin]> = [
      [invocation.get(skill.name), "invocation"],
      [profileSkills.get(skill.name), "profile-skill"],
      [profileDefault, "profile-default"],
      [sourceSkill, "source-skill"],
      [sourceDefault, "source-default"],
      [compatibilityMode, "compatibility"]
    ];
    const selected = ordered.find(([mode]) => mode !== undefined) as [SkillAvailabilityMode, SkillAvailabilityPolicyOrigin];
    const consumerOverride = invocation.get(skill.name) ?? profileSkills.get(skill.name) ?? profileDefault;
    return {
      skill: skill.name,
      sourcePath: toPosixPath(skill.relativePath),
      sourceRecommendation,
      sourceRecommendationOrigin,
      consumerOverride,
      effectiveMode: selected[0],
      policyOrigin: selected[1]
    };
  });

  return { items, diagnostics };
}

export async function createSkillAvailabilityPlan(options: CreateSkillAvailabilityPlanOptions): Promise<SkillAvailabilityPlan> {
  const profile = options.source.config.profiles.find((item) => item.name === options.profileName);
  if (!profile) throw new Error(`Profile not found: ${options.profileName}`);

  const diagnostics = [...(options.source.sourceManifestDiagnostics ?? [])];
  const selectedSkills = selectPlanSkills(options.source.skills, profile.skills, options.skills, diagnostics);
  const resolution = resolveSkillAvailability({
    skills: selectedSkills,
    profile,
    sourceManifest: options.source.sourceManifest,
    invocationOverrides: options.invocationOverrides,
    compatibilityMode: options.compatibilityMode ?? compatibilityModeForTargets(options.projectTargetDirs)
  });
  diagnostics.push(...resolution.diagnostics);

  const sourceIdentity = await resolveSourceIdentity(options.source);
  const sourceKey = crypto.createHash("sha256").update(sourceIdentity).digest("hex").slice(0, 24);
  const homeDir = path.resolve(options.homeDir ?? os.homedir());
  const consumerRoot = path.resolve(options.consumerRoot ?? options.source.root);
  const agentTargetIds = normalizeAgentTargets(options.agentTargetIds, diagnostics);
  const projectRoots = normalizeProjectRoots(consumerRoot, options.projectTargetDirs);
  validateTargetContext(resolution.items, agentTargetIds, projectRoots, diagnostics);
  validateCatalogAliases(selectedSkills, resolution.items, options.source.sourceManifest, diagnostics);

  const planItems = await Promise.all(resolution.items.map(async (item) => {
    const skill = selectedSkills.find((candidate) => candidate.name === item.skill && toPosixPath(candidate.relativePath) === item.sourcePath);
    if (!skill) throw new Error(`Resolved availability item has no source skill: ${item.skill}`);
    return {
      ...item,
      destinations: availabilityDestinations(item.effectiveMode, item.skill, sourceKey, homeDir, agentTargetIds, projectRoots),
      contentDigest: await directoryDigest(skill.path)
    };
  }));

  const loaderTargets = planItems.some((item) => item.effectiveMode === "user-on-demand")
    ? await resolveLoaderTargets(
      agentTargetIds,
      homeDir,
      options.loaderSourcePath,
      options.appliedRecords ?? [],
      diagnostics
    )
    : [];
  const cleanup = cleanupItems(
    options.source.root,
    options.profileName,
    sourceKey,
    planItems,
    options.appliedRecords ?? []
  );

  return {
    sourceKey,
    sourceIdentity,
    profile: options.profileName,
    sourcePolicyDigest: sourcePolicyDigest(options.source.sourceManifest),
    items: planItems,
    loaderTargets,
    cleanup,
    diagnostics: dedupeDiagnostics(diagnostics),
    requiresConfirm: true
  };
}

async function resolveLoaderTargets(
  agentTargetIds: string[],
  homeDir: string,
  loaderSourcePath: string | undefined,
  appliedRecords: AppliedSourceRecord[],
  diagnostics: SkillProjectManifestDiagnostic[]
): Promise<SkillAvailabilityPlan["loaderTargets"]> {
  if (!loaderSourcePath) {
    diagnostics.push({
      severity: "error",
      code: "ON_DEMAND_LOADER_SOURCE_UNAVAILABLE",
      message: "The ArcForge on-demand entry skill source is unavailable."
    });
  }
  const expectedDigest = loaderSourcePath ? await directoryDigest(path.resolve(loaderSourcePath)) : "";
  return Promise.all(agentTargetIds.map(async (agentId) => {
    const targetPath = path.join(homeDir, ...AGENT_SKILL_DIRS[agentId], ARCFORGE_ON_DEMAND_SKILL_NAME);
    const inspection = await inspectLoaderTarget(targetPath);
    if (!inspection.exists) {
      return { agentId, path: targetPath, status: "missing" as const, expectedDigest };
    }
    if (inspection.digest && inspection.digest === expectedDigest) {
      return {
        agentId,
        path: targetPath,
        status: "same" as const,
        expectedDigest,
        existingDigest: inspection.digest
      };
    }
    if (inspection.digest && isManagedLoaderTarget(agentId, targetPath, appliedRecords)) {
      return {
        agentId,
        path: targetPath,
        status: "managed-update" as const,
        expectedDigest,
        existingDigest: inspection.digest
      };
    }
    diagnostics.push({
      severity: "error",
      code: "ON_DEMAND_LOADER_CONFLICT",
      path: targetPath,
      message: `The on-demand entry target already exists and is not proven to be ArcForge-managed: ${targetPath}`
    });
    return {
      agentId,
      path: targetPath,
      status: "conflict" as const,
      expectedDigest,
      existingDigest: inspection.digest
    };
  }));
}

async function inspectLoaderTarget(targetPath: string): Promise<{ exists: boolean; digest?: string }> {
  try {
    const stats = await fs.lstat(targetPath);
    if (!stats.isDirectory() || stats.isSymbolicLink()) return { exists: true };
    return { exists: true, digest: await directoryDigest(targetPath) };
  } catch (error) {
    if (isNodeError(error, "ENOENT")) return { exists: false };
    return { exists: true };
  }
}

function isManagedLoaderTarget(agentId: string, targetPath: string, records: AppliedSourceRecord[]): boolean {
  const normalizedTarget = normalizeLocalPath(path.resolve(targetPath));
  return records.some((record) => {
    if (!record.availabilityItems?.some((item) => item.mode === "user-on-demand")) return false;
    const context = record.availabilityContext;
    if (!context?.agentTargetIds.map((item) => item.trim().toLowerCase()).includes(agentId)) return false;
    const expectedTarget = path.join(path.resolve(context.homeDir), ...AGENT_SKILL_DIRS[agentId], ARCFORGE_ON_DEMAND_SKILL_NAME);
    return normalizeLocalPath(path.resolve(expectedTarget)) === normalizedTarget;
  });
}

async function resolveSourceIdentity(source: WorkspaceSnapshot): Promise<string> {
  const remote = source.localGit?.remotes.find((item) => item.name === "origin")
    ?? [...(source.localGit?.remotes ?? [])].sort((left, right) => left.name.localeCompare(right.name))[0];
  if (remote?.canonicalKey) {
    return `git:${remote.canonicalKey}#${source.localGit?.relativePath || "."}`;
  }
  const resolved = path.resolve(source.root);
  const real = await fs.realpath(resolved).catch(() => resolved);
  return `path:${normalizeLocalPath(real)}`;
}

function selectPlanSkills(
  skills: SkillSummary[],
  profileSkills: string[],
  explicitSkills: string[] | undefined,
  diagnostics: SkillProjectManifestDiagnostic[]
): SkillSummary[] {
  const selection = explicitSkills?.length ? explicitSkills : profileSkills;
  if (explicitSkills?.includes(ARCFORGE_ON_DEMAND_SKILL_NAME)) {
    diagnostics.push({
      severity: "error",
      code: "RESERVED_LOADER_SKILL",
      path: ARCFORGE_ON_DEMAND_SKILL_NAME,
      message: `${ARCFORGE_ON_DEMAND_SKILL_NAME} is an ArcForge-managed entry skill and cannot be selected as a profile skill.`
    });
  }
  const selectableSkills = skills.filter((skill) => skill.name !== ARCFORGE_ON_DEMAND_SKILL_NAME);
  if (selection.includes("*")) return selectableSkills;
  const requested = [...new Set(selection.map((item) => item.trim()).filter((item) => item && item !== ARCFORGE_ON_DEMAND_SKILL_NAME))];
  const requestedSet = new Set(requested);
  const selected = selectableSkills.filter((skill) => requestedSet.has(skill.name));
  const found = new Set(selected.map((skill) => skill.name));
  for (const skill of requested) {
    if (found.has(skill)) continue;
    diagnostics.push({
      severity: explicitSkills?.length ? "error" : "warning",
      code: explicitSkills?.length ? "REQUESTED_SKILL_NOT_FOUND" : "PROFILE_SKILL_NOT_FOUND",
      path: skill,
      message: `Selected availability skill was not discovered: ${skill}`
    });
  }
  return selected;
}

function normalizeAgentTargets(values: string[], diagnostics: SkillProjectManifestDiagnostic[]): string[] {
  const targets = [...new Set(values.map((item) => item.trim().toLowerCase()).filter(Boolean))].sort();
  return targets.filter((agentId) => {
    if (AGENT_SKILL_DIRS[agentId]) return true;
    diagnostics.push({
      severity: "error",
      code: "AGENT_TARGET_UNKNOWN",
      path: agentId,
      message: `Unknown agent target: ${agentId}`
    });
    return false;
  });
}

function normalizeProjectRoots(consumerRoot: string, values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((item) => item.trim()).filter(Boolean).map((item) => path.resolve(consumerRoot, item)))].sort();
}

function compatibilityModeForTargets(projectTargetDirs: string[] | undefined): SkillAvailabilityMode {
  return projectTargetDirs?.some((item) => item.trim()) ? "project-ambient" : "user-ambient";
}

function validateTargetContext(
  items: SkillAvailabilityResolution["items"],
  agentTargetIds: string[],
  projectRoots: string[],
  diagnostics: SkillProjectManifestDiagnostic[]
): void {
  if (items.some((item) => item.effectiveMode === "user-ambient") && agentTargetIds.length === 0) {
    diagnostics.push({ severity: "error", code: "USER_AGENT_TARGET_REQUIRED", message: "User ambient skills require at least one agent target." });
  }
  if (items.some((item) => item.effectiveMode === "project-ambient")) {
    if (agentTargetIds.length === 0) diagnostics.push({ severity: "error", code: "PROJECT_AGENT_TARGET_REQUIRED", message: "Project ambient skills require at least one agent target." });
    if (projectRoots.length === 0) diagnostics.push({ severity: "error", code: "PROJECT_TARGET_REQUIRED", message: "Project ambient skills require at least one project target directory." });
  }
  if (items.some((item) => item.effectiveMode === "user-on-demand") && agentTargetIds.length === 0) {
    diagnostics.push({ severity: "error", code: "ON_DEMAND_AGENT_TARGET_REQUIRED", message: "User on-demand skills require at least one agent target for the explicit entry skill." });
  }
}

function availabilityDestinations(
  mode: SkillAvailabilityMode,
  skillName: string,
  sourceKey: string,
  homeDir: string,
  agentTargetIds: string[],
  projectRoots: string[]
): SkillAvailabilityDestination[] {
  if (!isSafePathSegment(skillName)) return [];
  if (mode === "user-on-demand") {
    return [{ kind: "user-catalog", path: path.join(homeDir, ".arcforge", "catalog", sourceKey, skillName) }];
  }
  if (mode === "user-ambient") {
    return agentTargetIds.map((agentId) => ({
      kind: "user-agent",
      agentId,
      path: path.join(homeDir, ...AGENT_SKILL_DIRS[agentId], skillName)
    }));
  }
  return projectRoots.flatMap((projectRoot) => agentTargetIds.map((agentId) => ({
    kind: "project-agent" as const,
    agentId,
    projectRoot,
    path: path.join(projectRoot, ...AGENT_SKILL_DIRS[agentId], skillName)
  })));
}

function validateCatalogAliases(
  skills: SkillSummary[],
  items: SkillAvailabilityResolution["items"],
  manifest: SkillProjectManifest | undefined,
  diagnostics: SkillProjectManifestDiagnostic[]
): void {
  const policies = new Map(manifest?.availability.skills.map((item) => [item.path, item]) ?? []);
  const onDemandPaths = new Set(items.filter((item) => item.effectiveMode === "user-on-demand").map((item) => item.sourcePath));
  const owners = new Map<string, string>();
  for (const skill of skills) {
    if (!isSafePathSegment(skill.name)) {
      diagnostics.push({
        severity: "error",
        code: "SKILL_INSTALL_NAME_INVALID",
        path: skill.relativePath,
        message: `Skill name is not safe as an installation directory: ${skill.name}`
      });
      continue;
    }
    if (!onDemandPaths.has(toPosixPath(skill.relativePath))) continue;
    const aliases = policies.get(toPosixPath(skill.relativePath))?.aliases ?? [];
    for (const candidate of [skill.name, ...aliases]) {
      const normalized = candidate.trim().toLowerCase();
      const owner = owners.get(normalized);
      if (owner && owner !== skill.relativePath) {
        diagnostics.push({
          severity: "error",
          code: "AMBIGUOUS_CATALOG_ALIAS",
          path: candidate,
          message: `Catalog name or alias is shared by multiple selected skills: ${candidate}`
        });
      } else {
        owners.set(normalized, skill.relativePath);
      }
    }
  }
}

function cleanupItems(
  sourceRoot: string,
  profileName: string,
  sourceKey: string,
  items: SkillAvailabilityPlan["items"],
  records: AppliedSourceRecord[]
): SkillAvailabilityPlan["cleanup"] {
  const current = new Map(items.map((item) => [item.skill, new Set(item.destinations.map((destination) => path.resolve(destination.path)))]));
  const normalizedSourceRoot = path.resolve(sourceRoot);
  const cleanup = new Map<string, SkillAvailabilityPlan["cleanup"][number]>();
  for (const record of records) {
    const sameSource = record.sourceKey === sourceKey || path.resolve(record.sourceRoot) === normalizedSourceRoot;
    if (!sameSource || record.profile !== profileName) continue;
    for (const history of record.availabilityItems ?? []) {
      for (const destination of history.destinations) {
        const resolved = path.resolve(destination);
        if (current.get(history.skill)?.has(resolved)) continue;
        cleanup.set(resolved, {
          skill: history.skill,
          path: resolved,
          reason: record.sourceKey && record.sourceKey !== sourceKey
            ? "Source identity changed; the previously managed destination is stale."
            : "The previously managed destination is absent from the current availability plan.",
          requiresConfirm: true
        });
      }
    }
  }
  return [...cleanup.values()].sort((left, right) => left.path.localeCompare(right.path));
}

async function directoryDigest(root: string): Promise<string> {
  const files = await listDigestFiles(root);
  const manifest = await Promise.all(files.map(async (filePath) => [
    toPosixPath(path.relative(root, filePath)),
    crypto.createHash("sha256").update(await fs.readFile(filePath)).digest("hex")
  ] as const));
  return crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
}

async function listDigestFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  async function walk(directory: string): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if ([".git", "node_modules", "dist"].includes(entry.name)) continue;
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(filePath);
      else if (entry.isFile()) files.push(filePath);
    }
  }
  await walk(root);
  return files;
}

function sourcePolicyDigest(manifest: SkillProjectManifest | undefined): string | undefined {
  if (!manifest) return undefined;
  const normalized = {
    defaultMode: manifest.availability.defaultMode ?? null,
    skills: [...manifest.availability.skills]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map((item) => ({ path: item.path, mode: item.mode, aliases: [...(item.aliases ?? [])].sort() }))
  };
  return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

function dedupeDiagnostics(diagnostics: SkillProjectManifestDiagnostic[]): SkillProjectManifestDiagnostic[] {
  const unique = new Map<string, SkillProjectManifestDiagnostic>();
  for (const diagnostic of diagnostics) {
    const key = [diagnostic.severity, diagnostic.code, diagnostic.path ?? "", diagnostic.message].join("\u0000");
    unique.set(key, diagnostic);
  }
  return [...unique.values()];
}

function isSafePathSegment(value: string): boolean {
  return Boolean(value) && value !== "." && value !== ".." && !value.includes("/") && !value.includes("\\") && value.trim() === value;
}

function normalizeLocalPath(value: string): string {
  return process.platform === "win32" || process.platform === "darwin" ? value.toLowerCase() : value;
}

function isNodeError(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === code;
}

function overrideMap(
  values: SkillAvailabilityOverride[] | undefined,
  origin: "invocation" | "profile-skill",
  selectedNames: Set<string>,
  diagnostics: SkillProjectManifestDiagnostic[]
): Map<string, SkillAvailabilityMode> {
  const output = new Map<string, SkillAvailabilityMode>();
  for (const value of values ?? []) {
    const skill = typeof value?.skill === "string" ? value.skill.trim() : "";
    const mode = checkedMode(value?.mode, origin, diagnostics, skill);
    if (!skill || !mode) continue;
    if (output.has(skill)) {
      diagnostics.push({
        severity: "error",
        code: "DUPLICATE_AVAILABILITY_OVERRIDE",
        path: skill,
        message: `Duplicate ${origin} availability override for skill: ${skill}`
      });
      continue;
    }
    if (!selectedNames.has(skill)) {
      diagnostics.push({
        severity: "warning",
        code: "AVAILABILITY_OVERRIDE_NOT_SELECTED",
        path: skill,
        message: `${origin} availability override does not match a selected skill: ${skill}`
      });
    }
    output.set(skill, mode);
  }
  return output;
}

function checkedMode(
  value: unknown,
  origin: string,
  diagnostics: SkillProjectManifestDiagnostic[],
  skill?: string
): SkillAvailabilityMode | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string" && AVAILABILITY_MODES.has(value as SkillAvailabilityMode)) return value as SkillAvailabilityMode;
  diagnostics.push({
    severity: "error",
    code: "INVALID_AVAILABILITY_MODE",
    ...(skill ? { path: skill } : {}),
    message: `${origin} availability mode must be user-ambient, project-ambient, or user-on-demand.`
  });
  return undefined;
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function toPosixPath(value: string): string {
  return value.replaceAll("\\", "/");
}
