import path from "node:path";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import type {
  SkillAvailabilityMode,
  SkillProjectManifest,
  SkillProjectManifestDiagnostic,
  SkillProjectManifestSkill,
  SkillSummary
} from "../shared/types.js";

export const SKILL_PROJECT_MANIFEST_FILE = "arcforge.skill-project.json";

export interface SkillProjectManifestLoadResult {
  manifest?: SkillProjectManifest;
  diagnostics: SkillProjectManifestDiagnostic[];
}

export interface SharedSkillProjectManifest {
  manifest?: SkillProjectManifest;
  selectedSkillPaths: string[];
  policyDigest?: string;
  diagnostics: SkillProjectManifestDiagnostic[];
}

const AVAILABILITY_MODES = new Set<SkillAvailabilityMode>([
  "user-ambient",
  "project-ambient",
  "user-on-demand"
]);

export async function loadSkillProjectManifest(root: string): Promise<SkillProjectManifestLoadResult> {
  const filePath = path.join(root, SKILL_PROJECT_MANIFEST_FILE);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return parseSkillProjectManifest(raw);
  } catch (error) {
    if (isMissingFileError(error)) return { diagnostics: [] };
    return {
      diagnostics: [{
        severity: "error",
        code: "SKILL_PROJECT_MANIFEST_READ_FAILED",
        message: `Cannot read ${SKILL_PROJECT_MANIFEST_FILE}: ${errorMessage(error)}`
      }]
    };
  }
}

export function parseSkillProjectManifest(raw: string): SkillProjectManifestLoadResult {
  const diagnostics: SkillProjectManifestDiagnostic[] = [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    return {
      diagnostics: [{
        severity: "error",
        code: "SKILL_PROJECT_MANIFEST_PARSE_FAILED",
        message: `${SKILL_PROJECT_MANIFEST_FILE} is not valid JSON: ${errorMessage(error)}`
      }]
    };
  }

  if (!isRecord(value) || value.version !== 1 || !isRecord(value.availability) || !Array.isArray(value.availability.skills)) {
    return {
      diagnostics: [{
        severity: "error",
        code: "SKILL_PROJECT_MANIFEST_SCHEMA_INVALID",
        message: `${SKILL_PROJECT_MANIFEST_FILE} requires version 1 and availability.skills.`
      }]
    };
  }

  const sourceDir = optionalRelativePath(value.sourceDir, true, "sourceDir", diagnostics);
  const defaultMode = optionalMode(value.availability.defaultMode, "availability.defaultMode", diagnostics);
  const skills: SkillProjectManifestSkill[] = [];
  const seenPaths = new Set<string>();

  for (const [index, item] of value.availability.skills.entries()) {
    const location = `availability.skills[${index}]`;
    if (!isRecord(item)) {
      diagnostics.push(errorDiagnostic("SKILL_PROJECT_MANIFEST_SKILL_INVALID", location, `${location} must be an object.`));
      continue;
    }
    const skillPath = requiredRelativePath(item.path, false, `${location}.path`, diagnostics);
    const mode = requiredMode(item.mode, `${location}.mode`, diagnostics);
    const aliases = optionalAliases(item.aliases, `${location}.aliases`, diagnostics);
    if (!skillPath || !mode) continue;
    if (seenPaths.has(skillPath)) {
      diagnostics.push(errorDiagnostic("SKILL_PROJECT_MANIFEST_DUPLICATE_PATH", skillPath, `Duplicate skill policy path: ${skillPath}`));
      continue;
    }
    seenPaths.add(skillPath);
    skills.push({ path: skillPath, mode, ...(aliases ? { aliases } : {}) });
  }

  return {
    manifest: {
      version: 1,
      ...(sourceDir ? { sourceDir } : {}),
      availability: {
        ...(defaultMode ? { defaultMode } : {}),
        skills
      }
    },
    diagnostics
  };
}

export function validateSkillProjectManifestSkills(
  manifest: SkillProjectManifest | undefined,
  skills: Pick<SkillSummary, "name" | "relativePath">[],
  existing: SkillProjectManifestDiagnostic[] = []
): SkillProjectManifestDiagnostic[] {
  const diagnostics = [...existing];
  const discoveredPaths = new Set(skills.map((skill) => toPosixPath(skill.relativePath)));
  const configuredPaths = new Set(manifest?.availability.skills.map((item) => item.path) ?? []);

  for (const item of manifest?.availability.skills ?? []) {
    if (!discoveredPaths.has(item.path)) {
      diagnostics.push(errorDiagnostic(
        "SKILL_PROJECT_MANIFEST_STALE_PATH",
        item.path,
        `Availability policy path does not match a discovered skill: ${item.path}`
      ));
    }
  }

  if (!manifest?.availability.defaultMode) {
    for (const skill of skills) {
      const skillPath = toPosixPath(skill.relativePath);
      if (configuredPaths.has(skillPath)) continue;
      diagnostics.push({
        severity: "warning",
        code: "UNCLASSIFIED_SKILL",
        path: skillPath,
        message: `Skill has no source recommendation: ${skill.name}`
      });
    }
  }

  return diagnostics;
}

export function prepareSkillProjectManifestForShare(
  manifest: SkillProjectManifest | undefined,
  skills: Pick<SkillSummary, "relativePath">[],
  diagnostics: SkillProjectManifestDiagnostic[] = []
): SharedSkillProjectManifest {
  const blocking = diagnostics.filter((item) => item.severity === "error");
  if (blocking.length > 0) {
    throw new Error(`SOURCE_MANIFEST_INVALID: ${blocking.map((item) => `${item.code}${item.path ? ` (${item.path})` : ""}`).join(", ")}`);
  }

  const selectedSkillPaths = [...new Set(skills.map((skill) => toPosixPath(skill.relativePath)))].sort();
  if (!manifest) return { selectedSkillPaths, diagnostics: [...diagnostics] };

  const selected = new Set(selectedSkillPaths);
  const normalized: SkillProjectManifest = {
    version: 1,
    ...(manifest.sourceDir ? { sourceDir: manifest.sourceDir } : {}),
    availability: {
      ...(manifest.availability.defaultMode ? { defaultMode: manifest.availability.defaultMode } : {}),
      skills: manifest.availability.skills
        .filter((item) => selected.has(toPosixPath(item.path)))
        .map((item) => ({
          path: toPosixPath(item.path),
          mode: item.mode,
          ...(item.aliases?.length ? { aliases: [...new Set(item.aliases.map((alias) => alias.trim()).filter(Boolean))].sort() } : {})
        }))
        .sort((left, right) => left.path.localeCompare(right.path))
    }
  };

  return {
    manifest: normalized,
    selectedSkillPaths,
    policyDigest: crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex"),
    diagnostics: [...diagnostics]
  };
}

function optionalRelativePath(
  value: unknown,
  allowDot: boolean,
  location: string,
  diagnostics: SkillProjectManifestDiagnostic[]
): string | undefined {
  if (value === undefined || value === null) return undefined;
  return requiredRelativePath(value, allowDot, location, diagnostics);
}

function requiredRelativePath(
  value: unknown,
  allowDot: boolean,
  location: string,
  diagnostics: SkillProjectManifestDiagnostic[]
): string | undefined {
  if (typeof value !== "string" || !isSafeRelativePosixPath(value, allowDot)) {
    diagnostics.push(errorDiagnostic(
      "SKILL_PROJECT_MANIFEST_PATH_INVALID",
      location,
      `${location} must be a normalized POSIX path inside the Skill project root.`
    ));
    return undefined;
  }
  return value;
}

function optionalMode(
  value: unknown,
  location: string,
  diagnostics: SkillProjectManifestDiagnostic[]
): SkillAvailabilityMode | undefined {
  if (value === undefined || value === null) return undefined;
  return requiredMode(value, location, diagnostics);
}

function requiredMode(
  value: unknown,
  location: string,
  diagnostics: SkillProjectManifestDiagnostic[]
): SkillAvailabilityMode | undefined {
  if (!isAvailabilityMode(value)) {
    diagnostics.push(errorDiagnostic(
      "SKILL_PROJECT_MANIFEST_MODE_INVALID",
      location,
      `${location} must be user-ambient, project-ambient, or user-on-demand.`
    ));
    return undefined;
  }
  return value;
}

function optionalAliases(
  value: unknown,
  location: string,
  diagnostics: SkillProjectManifestDiagnostic[]
): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    diagnostics.push(errorDiagnostic("SKILL_PROJECT_MANIFEST_ALIASES_INVALID", location, `${location} must be an array of non-empty strings.`));
    return undefined;
  }
  const aliases: string[] = [];
  const seen = new Set<string>();
  for (const alias of value) {
    const normalized = typeof alias === "string" ? alias.trim() : "";
    if (!normalized || seen.has(normalized)) {
      diagnostics.push(errorDiagnostic("SKILL_PROJECT_MANIFEST_ALIASES_INVALID", location, `${location} contains an empty or duplicate alias.`));
      continue;
    }
    seen.add(normalized);
    aliases.push(normalized);
  }
  return aliases.length > 0 ? aliases : undefined;
}

function isSafeRelativePosixPath(value: string, allowDot: boolean): boolean {
  if (!value || value.trim() !== value || value.includes("\\") || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) return false;
  const normalized = path.posix.normalize(value);
  if (normalized !== value || normalized === ".." || normalized.startsWith("../")) return false;
  return allowDot || normalized !== ".";
}

function isAvailabilityMode(value: unknown): value is SkillAvailabilityMode {
  return typeof value === "string" && AVAILABILITY_MODES.has(value as SkillAvailabilityMode);
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function errorDiagnostic(code: string, location: string, message: string): SkillProjectManifestDiagnostic {
  return { severity: "error", code, path: location, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMissingFileError(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
