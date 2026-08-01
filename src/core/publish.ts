import path from "node:path";
import type { PublishPlan, ArcForgeConfig, SkillProjectManifest, SkillProjectManifestDiagnostic, SkillSummary } from "../shared/types.js";
import { listFiles } from "./fs.js";
import { SKILL_PROJECT_MANIFEST_FILE, prepareSkillProjectManifestForShare } from "./skill-project-manifest.js";

export async function createPublishPlan(
  root: string,
  config: ArcForgeConfig,
  skills: SkillSummary[],
  visibility: "private" | "public" = "private",
  sourceManifest?: SkillProjectManifest,
  sourceManifestDiagnostics: SkillProjectManifestDiagnostic[] = [],
  readinessAssessment?: PublishPlan["readinessAssessment"]
): Promise<PublishPlan> {
  const sourceRoot = path.resolve(root, config.sourceDir);
  const files = (await Promise.all(skills.map(async (skill) => {
    const resolvedSkill = path.resolve(skill.path);
    if (resolvedSkill !== sourceRoot && !resolvedSkill.startsWith(`${sourceRoot}${path.sep}`)) {
      throw new Error(`Refusing to publish skill outside source directory: ${skill.path}`);
    }
    return listFiles(resolvedSkill);
  }))).flat().map((file) => path.relative(root, file)).sort();
  const sharedManifest = prepareSkillProjectManifestForShare(sourceManifest, skills, sourceManifestDiagnostics);
  const repositoryName = path.basename(root);
  const normalizedAssessment = validateReadinessAssessment(readinessAssessment);

  return {
    root,
    repositoryName,
    visibility,
    files,
    ...(config.teamRepo?.trim() ? { installReference: config.teamRepo.trim() } : {}),
    detectedIntegrations: [],
    assessmentStatus: normalizedAssessment ? "supplied" : "not-supplied",
    ...(normalizedAssessment ? { readinessAssessment: normalizedAssessment } : {}),
    ...(sharedManifest.manifest && sharedManifest.policyDigest ? {
      sourceManifest: {
        path: SKILL_PROJECT_MANIFEST_FILE,
        selectedSkillPaths: sharedManifest.selectedSkillPaths,
        policyDigest: sharedManifest.policyDigest,
        diagnostics: sharedManifest.diagnostics.map((item) => `${item.code}${item.path ? ` (${item.path})` : ""}: ${item.message}`)
      }
    } : {})
  };
}

export function validateReadinessAssessment(value: PublishPlan["readinessAssessment"]): PublishPlan["readinessAssessment"] {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object") throw new Error("Publish readiness assessment must be an object.");
  if (typeof value.summary !== "string" || !value.summary.trim()) throw new Error("Publish readiness assessment summary is required.");
  for (const key of ["evidence", "unknowns", "installCommandCandidates", "checklist"] as const) {
    if (!Array.isArray(value[key]) || value[key].some((item) => typeof item !== "string" || !item.trim())) {
      throw new Error(`Publish readiness assessment ${key} must contain only non-empty strings.`);
    }
  }
  return {
    summary: value.summary.trim(),
    evidence: value.evidence.map((item) => item.trim()),
    unknowns: value.unknowns.map((item) => item.trim()),
    installCommandCandidates: value.installCommandCandidates.map((item) => item.trim()),
    checklist: value.checklist.map((item) => item.trim())
  };
}
