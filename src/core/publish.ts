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
  sourceManifestDiagnostics: SkillProjectManifestDiagnostic[] = []
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
  const installRef = config.teamRepo || `github.com/<owner>/${repositoryName}`;

  return {
    root,
    repositoryName,
    visibility,
    files,
    installCommands: [
      `skillshare install ${installRef} --track --all && skillshare sync`,
      `npx skills add ${installRef}`
    ],
    checklist: [
      `${skills.length} skills discovered`,
      "Run audit and fix critical findings before sharing",
      "Add README usage examples and supported agents",
      "Tag a release before public publishing",
      visibility === "public" ? "Remove private URLs, internal paths, and company-only process details" : "Confirm repository permissions and reviewer owner"
    ],
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
