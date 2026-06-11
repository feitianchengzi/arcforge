import path from "node:path";
import type { PublishPlan, ArcForgeConfig, SkillSummary } from "../shared/types.js";
import { listFiles } from "./fs.js";

export async function createPublishPlan(
  root: string,
  config: ArcForgeConfig,
  skills: SkillSummary[],
  visibility: "private" | "public" = "private"
): Promise<PublishPlan> {
  const files = (await listFiles(path.resolve(root, config.sourceDir)))
    .map((file) => path.relative(root, file))
    .sort();
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
    ]
  };
}
