import path from "node:path";
import { promises as fs } from "node:fs";
import { scanWorkspace } from "../core/workspace.js";
import { loadConfigReadOnly } from "../core/config.js";
import { discoverSkills } from "../core/skills.js";
import { createPublishPlan } from "../core/publish.js";
import { createSharePlan, shareProject, type ShareProjectOptions } from "../core/share.js";
import { shareDriftReport, type ShareDriftOptions } from "../core/share-drift.js";
import { getEnvironmentStatus } from "../core/environment.js";
import { createInstalledSkillOrganizePlan, organizeInstalledSkills, scanInstalledSkills } from "../core/installed-skills.js";
import { arcForgeHome } from "../core/project-store.js";
import { addAppliedSource, applyAvailabilityFromSource, applyFromSource, cleanupLocalSkills, createAvailabilityPlanFromSource, createImportSkillsPlan, createLocalSkillWorkflowPlan, createMergePlan, driftAppliedSources, driftAvailabilityFromSource, driftFromSource, importSkillsIntoProject, listAppliedSources, mergeIntoProject, removeAppliedSource, resolveSkillProject, runAppliedSources } from "../core/sources.js";
import { checkSourceUpdate, updateSource } from "../core/source-update.js";
import { listCatalogSkills, resolveCatalogSkill } from "../core/skill-catalog.js";
import { createSkillProjectAvailabilityPlan, executeSkillProjectAvailabilityPlan, type SkillProjectAliasUpdate } from "../core/skill-project-availability.js";
import { loadSkillProjectManifest, validateSkillProjectManifestSkills } from "../core/skill-project-manifest.js";
import type { CliShimOptions } from "../core/cli-install.js";
import type { AuditMode, InstalledSkillOrganizeDecision, PublishPlan, ShareDeliveryMethod, ShareTargetMode, SkillAvailabilityMode, SkillAvailabilityOverride, SkillProjectApplicabilityAssessment } from "../shared/types.js";

export interface CommandRuntime {
  cwd: string;
  cacheDir?: string;
  cliShim?: CliShimOptions;
}

export interface CommandExecution {
  exitCode: number;
  value?: unknown;
  text?: string;
}

export const helpText = `ArcForge CLI

Local-first, GitHub-first governance for AI agent skills.

Usage:
  arcforge <command> [options]

Commands:
  scan             Scan skills, shared assets, and audit status
  audit            Print audit report; exits 2 on critical findings
  source           Check or update the current Git checkout
  project          Resolve maintenance sources or maintain source availability policy
  workflow         Plan multi-stage skill governance workflows
  merge            Merge project skills into another Skill project
  import           Import skills from another Skill project into this project
  applied          Manage applied source records for the current project
  installed        Scan locally installed and cached agent skills
  catalog          List metadata or resolve user-level on-demand skills
  apply            Plan availability targets or copy a profile into a direct target
  drift            Compare a profile against an installed target
  publish-plan     Collect release facts and preserve an optional Agent assessment
  share            Plan or execute GitHub-first sharing
  doctor           Check Git, CLI install, and optional tools

Common options:
  --root <dir>      ArcForge workspace root. Defaults to current directory.
  --source-dir <dir> Skill source directory inside --root. Defaults to configured sourceDir.
  --profile <name>  Profile name. Defaults to default where supported.

Examples:
  arcforge scan --root .
  arcforge audit --root .
  arcforge audit --root . --mode hybrid --agent codex
  arcforge source status --root .
  arcforge project resolve --name team-skills
  arcforge project availability plan --root ../team-skills --default-mode user-ambient --set review=user-on-demand --aliases 'review=reviewer|code-review'
  arcforge workflow local-skill plan --root . --skill review --to ../team-skills --install codex:user --share origin
  arcforge source update --root . --confirm
  arcforge merge plan --root . --to ../team-skills --skills review --target-path skills/project-a
  arcforge merge plan --root . --source-dir .codex/skills --to ../team-skills --skills project-showcase-video --target-path skills
  arcforge merge run --root . --to github.com/acme/team-skills --skills review --target-path skills/project-a --confirm
  arcforge import plan --root . --from github.com/acme/team-skills --skills review --target-dir skills
  arcforge applied drift --root .
  arcforge installed scan
  arcforge installed organize plan
  arcforge catalog list
  arcforge catalog resolve --query review
  arcforge apply plan --from ../team-skills --profile default --agent-targets codex,claude --project-targets ../app
  arcforge apply --from ../team-skills --profile default --target ~/.codex/skills
  arcforge share plan --root . --repo github.com/acme/team-skills --profile frontend
  arcforge share run --root . --repo github.com/acme/team-skills --profile frontend --confirm
  arcforge doctor

Help:
  arcforge help <command>
  arcforge <command> --help
`;

const commandHelpText: Record<string, string> = {
  scan: `ArcForge CLI - scan

Scan skills, shared assets, and audit status. Outputs JSON.

Usage:
  arcforge scan [--root <dir>] [--source-dir <dir>]
`,
  audit: `ArcForge CLI - audit

Print the audit report as JSON. Exits 2 when critical findings exist.

Usage:
  arcforge audit [--root <dir>] [--source-dir <dir>] [--mode rule|agent|hybrid] [--agent codex] [--agent-command <command>] [--proxy <url>] [--no-proxy <hosts>] [--timeout-ms <ms>]

Options:
  --mode <mode>             rule is the default. agent runs only agent diagnosis. hybrid combines both.
  --agent <name>            Agent adapter name. Defaults to codex.
  --agent-command <command> Custom non-interactive agent command. The audit prompt is sent on stdin and stdout must be JSON.
  --proxy <url>             Optional HTTP/HTTPS proxy for the Agent CLI, for example http://127.0.0.1:7890.
  --no-proxy <hosts>        Optional comma-separated NO_PROXY hosts.
  --timeout-ms <ms>         Agent diagnosis timeout. Defaults to 120000.
`,
  source: `ArcForge CLI - source

Check or update any Git checkout. This is independent from Skill project merge or apply relationships.
The status action may fetch upstream refs and write Git metadata such as FETCH_HEAD.

Usage:
  arcforge source status [--root <dir>]
  arcforge source update [--root <dir>] --confirm

Options:
  --root <dir>  Git checkout or workspace root. Defaults to current directory.
  --confirm     Required for update. Updates are fast-forward only.
`,
  project: `ArcForge CLI - project

Resolve real Skill project maintenance sources or maintain their persistent skill availability policy. Outputs JSON.
Availability plan is read-only. Availability run atomically writes arcforge.skill-project.json after confirmation.

Usage:
  arcforge project resolve --name <project-name-or-path> [--root <dir>]
  arcforge project availability plan [--root <dir>] [--source-dir <dir>] [--default-mode <mode|none>] [--set <skill=mode,...>] [--aliases <skill=alias|alias,...>] [--remove <skill,...>]
  arcforge project availability run [--root <dir>] [--source-dir <dir>] [--default-mode <mode|none>] [--set <skill=mode,...>] [--aliases <skill=alias|alias,...>] [--remove <skill,...>] --plan-digest <digest> --confirm

Options:
  --root <dir>          Search context or maintenance source root. Defaults to current directory.
  --name <name>         Project directory name or path to inspect.
  --source-dir <dir>    Skill source directory used when creating the source manifest.
  --default-mode <mode> Project recommendation: user-ambient, project-ambient, user-on-demand, or none to clear.
  --set <items>         Persistent per-skill recommendations such as review=user-on-demand.
  --aliases <items>     On-demand aliases such as review=reviewer|code-review; an empty value clears aliases.
  --remove <skills>     Remove persistent per-skill recommendations by name or relative path.
  --plan-digest <hash>  Digest returned by the reviewed availability plan; required for run.
  --confirm             Required for availability run.
`,
  workflow: `ArcForge CLI - workflow

Create read-only endpoint plans for multi-stage governance flows.

Usage:
  arcforge workflow local-skill plan --root <project> --skill <name> --to <explicit-skill-project-path> [--source-dir <dir>] [--install codex:user|claude:user|cursor:user|<dir>] [--share <remote-or-repo>]
`,
  merge: `ArcForge CLI - merge

Merge current project skills into another Skill project and record that project as the applied source.

Usage:
  arcforge merge plan --to <path-or-url> --target-path <dir> [options]
  arcforge merge run --to <path-or-url> --target-path <dir> [options] --confirm
  arcforge merge cleanup-local --skills <a,b> [options] --confirm

Options:
  --root <dir>         Current project root. Defaults to current directory.
  --source-dir <dir>   Skill source directory inside --root. Use .codex/skills for project-local Codex skills.
  --to <path-or-url>   Target Skill project path, GitHub shorthand or Git URL.
  --skills <a,b>       Skills to merge. Defaults to the selected profile.
  --profile <name>     Profile to update in the target project. Defaults to default.
  --target-path <dir>  Parent directory in the target project. Skill names are appended under it.
  --target <dir>       Applied target directory recorded for the current project. Defaults to .arcforge/skills.
  --confirm            Required for run and cleanup-local writes.
`,
  import: `ArcForge CLI - import

Import selected skills from another Skill project into the current project. The plan action is read-only; run writes into the current project after review.

Usage:
  arcforge import plan --from <path-or-url> [options]
  arcforge import run --from <path-or-url> [options] --confirm

Options:
  --root <dir>            Current project root. Defaults to current directory.
  --from <path-or-url>    Source Skill project path, GitHub shorthand or Git URL.
  --profile <name>        Source profile name. Defaults to default.
  --skills <a,b>          Skills to import. Defaults to the selected source profile.
  --target-dir <dir>      Directory inside the current project to write skills. Defaults to configured sourceDir.
  --target-profile <name> Current-project profile to update. Defaults to the first configured profile.
`,
  applied: `ArcForge CLI - applied

Manage the current project's applied source records.

Usage:
  arcforge applied list [--root <dir>]
  arcforge applied add --from <path-or-url> --profile <name> --target <dir> [--skills <a,b>] [--allow-unrelated-root]
  arcforge applied remove <id> [--root <dir>]
  arcforge applied drift [--root <dir>] [--id <record-id>]
  arcforge applied run [--root <dir>] [--id <record-id>] [--cleanup-paths <dir,dir>] --confirm

Options:
  --allow-unrelated-root  Save the relation even when --root is not the source root
                          and does not contain the target. Use only for intentional
                          cross-workspace ownership.
`,
  installed: `ArcForge CLI - installed

Scan locally installed and cached agent skills and plan local cleanup. Scan is read-only. Organize run writes only after --confirm.

Usage:
  arcforge installed scan [--home <dir>] [--include-system] [--no-plugin-cache]
  arcforge installed organize plan [--home <dir>] [--no-plugin-cache] [--decisions <json-file>]
  arcforge installed organize run [--home <dir>] [--no-plugin-cache] --decisions <json-file> --confirm

Options:
  --home <dir>         User home directory to inspect. Defaults to the current OS user home.
  --include-system     Include agent system skills. Defaults to false.
  --no-plugin-cache    Exclude Codex plugin cache skills. Codex plugin cache is included by default.
  --decisions <file>   Agent- or user-authored JSON decisions. Without it, the plan contains evidence only and no actions.
  --confirm            Required for organize run.
`,
  catalog: `ArcForge CLI - catalog

List minimal candidate metadata or resolve one selected user-level on-demand skill from the local ArcForge catalog. Outputs JSON.
These commands read only the catalog index and, for a resolved selection, its skill directory. They never scan arbitrary roots, rank candidates semantically, or execute a skill.

Usage:
  arcforge catalog list
  arcforge catalog resolve --query <name-or-qualified-name> [--mode exact|search]

Options:
  list             Return validated name, qualified name, source key, and summary metadata for Agent semantic selection.
  --query <query>  Skill qualified name, name, or alias. Required.
  --mode <mode>    exact is the default. search also matches indexed summaries after explicit entry-skill invocation.
`,
  apply: `ArcForge CLI - apply

Plan availability-aware user, project, and on-demand targets, or copy a profile into a legacy direct target. Outputs JSON.
Plan is read-only. Legacy direct apply writes the target directory after confirmation.

Usage:
  arcforge apply plan [--root <dir>] [--from <path-or-url>] [--profile <name>] [--skills <a,b>] --agent-targets <codex,claude,cursor> [--project-targets <dir,dir>] [--availability <skill=mode,...>]
  arcforge apply run [--root <dir>] [--from <path-or-url>] [--profile <name>] [--skills <a,b>] --agent-targets <codex,claude,cursor> [--project-targets <dir,dir>] [--availability <skill=mode,...>] [--cleanup-paths <dir,dir>] [--save] --confirm
  arcforge apply run [--root <dir>] [--from <path-or-url>] [--profile <name>] [--skills <a,b>] --target <dir> [--save] [--allow-unrelated-root] --confirm
  arcforge apply [--root <dir>] [--from <path-or-url>] [--profile <name>] [--skills <a,b>] --target <dir> [--save] [--allow-unrelated-root] --confirm

Options:
  --root <dir>          Target project root when --from is set. Defaults to current directory.
  --from <path-or-url>  Source Skill project path, GitHub shorthand or Git URL. Omit to apply from current workspace.
  --profile <name>      Source profile name. Defaults to default.
  --skills <a,b>        Skills to apply. Defaults to the selected source profile.
  --agent-targets <ids> Agent user targets used by availability-aware plan.
  --project-targets <dirs> Comma-separated project roots used by project-ambient skills.
  --availability <items> Invocation overrides such as review=user-on-demand,build=project-ambient.
  --project-assessments <file> Agent- or user-authored JSON assessments bound to the selected project roots.
  --cleanup-paths <dirs> Exact comma-separated cleanup paths selected from the fresh plan.
  --target <dir>        Application target directory. With --from, this is resolved inside --root.
  --save                Save an applied source relation for later drift/reapply.
  --allow-unrelated-root Save the relation even when --root is not the source root
                        and does not contain the target.
  --confirm             Required. Confirms writing the application target directory.
`,
  drift: `ArcForge CLI - drift

Compare a profile from another Skill project or the current workspace against availability-aware or legacy installed targets. Outputs JSON.

Usage:
  arcforge drift [--root <dir>] [--from <path-or-url>] [--profile <name>] [--skills <a,b>] --agent-targets <codex,claude,cursor> [--project-targets <dir,dir>] [--availability <skill=mode,...>]
  arcforge drift [--root <dir>] [--from <path-or-url>] [--profile <name>] [--skills <a,b>] --target <dir>

Options:
  --root <dir>          Target project root when --from is set. Defaults to current directory.
  --from <path-or-url>  Source Skill project path, GitHub shorthand or Git URL. Omit to compare from current workspace.
  --profile <name>      Source profile name. Defaults to default.
  --skills <a,b>        Skills to compare. Defaults to the selected source profile.
  --agent-targets <ids> Agent user targets used by availability-aware drift.
  --project-targets <dirs> Project roots used by project-ambient skills.
  --availability <items> Invocation overrides such as review=user-on-demand.
  --project-assessments <file> Agent- or user-authored JSON assessments bound to the selected project roots.
  --target <dir>        Application target directory. With --from, this is resolved inside --root.
`,
  "publish-plan": `ArcForge CLI - publish-plan

Collect deterministic GitHub-first release facts. An optional Agent-authored assessment is preserved but not generated by core. This command does not push to a remote repository.

Usage:
  arcforge publish-plan [--root <dir>] [--visibility private|public] [--readiness-assessment <json-file>]
`,
  share: `ArcForge CLI - share

Plan or execute sharing from a local workspace to a Git repository. Outputs JSON.
The plan action is read-only. The run action can write Git branches, push, or create PRs depending on delivery.

Usage:
  arcforge share plan --repo <repo> [options]
  arcforge share run --repo <repo> [options] --confirm
  arcforge share plan --same-repository [options]
  arcforge share run --same-repository [options] --confirm

Options:
  --root <dir>                      Maintenance source root. Defaults to current directory.
  --repo <repo>                     GitHub/Git repository sharing target.
  --same-repository                 Share into the current repository remote instead of a separate repo.
  --same-repository-remote <name>   Remote name for same-repository sharing.
  --profile <name>                  Profile to share. Defaults to default.
  --skills <a,b>                    Skills to share. Defaults to the selected profile.
  --visibility <private|public>     Publish-plan visibility. Defaults to private.
  --target-mode <direct|namedProject> How files are placed in the sharing target.
  --project-name <name>             Named project folder when target-mode is namedProject.
  --delivery <target-pr|fork-pr|direct-push|local-branch> Preferred GitHub delivery method.
  --branch <name>                   Share branch name.
  --message <text>                  Commit or PR message.
  --readiness-assessment <json-file> Agent-authored readiness assessment to validate and preserve.
  --confirm                         Required for run.
`,
  doctor: `ArcForge CLI - doctor

Check local runtime dependencies and optional integrations. Outputs JSON.

Usage:
  arcforge doctor
`
};

export async function runArcForgeCommand(args: string[], runtime: CommandRuntime): Promise<CommandExecution> {
  const command = args[0] ?? "help";
  if (command === "help") return { exitCode: 0, text: helpFor(args[1]) };
  if (command === "--help" || command === "-h" || args.includes("--help") || args.includes("-h")) {
    return { exitCode: 0, text: helpFor(command === "--help" || command === "-h" ? undefined : command) };
  }

  if (command === "scan") {
    return { exitCode: 0, value: await scanWorkspace(arg(args, "--root") ?? runtime.cwd, { sourceDir: arg(args, "--source-dir") }) };
  }

  if (command === "audit") {
    const snapshot = await scanWorkspace(arg(args, "--root") ?? runtime.cwd, {
      sourceDir: arg(args, "--source-dir"),
      audit: {
        mode: parseAuditMode(arg(args, "--mode") ?? "rule"),
        agent: arg(args, "--agent"),
        agentCommand: arg(args, "--agent-command"),
        proxy: parseProxyOptions(arg(args, "--proxy"), arg(args, "--no-proxy")),
        timeoutMs: parseOptionalPositiveInteger(arg(args, "--timeout-ms"), "--timeout-ms")
      }
    });
    return { exitCode: snapshot.audit.findings.some((item) => item.severity === "critical") ? 2 : 0, value: snapshot.audit };
  }

  if (command === "source") return runSourceCommand(args, runtime);
  if (command === "project") return runProjectCommand(args, runtime);
  if (command === "workflow") return runWorkflowCommand(args, runtime);
  if (command === "merge") return runMergeCommand(args, runtime);
  if (command === "import") return runImportCommand(args, runtime);
  if (command === "applied") return runAppliedCommand(args, runtime);
  if (command === "installed") return runInstalledCommand(args, runtime);
  if (command === "catalog") {
    const action = args[1] ?? "resolve";
    if (action === "list") return { exitCode: 0, value: await listCatalogSkills() };
    if (action !== "resolve") throw new Error(`Unknown catalog action: ${action}`);
    const mode = arg(args, "--mode") ?? "exact";
    if (mode !== "exact" && mode !== "search") throw new Error("Catalog mode must be exact or search.");
    return { exitCode: 0, value: await resolveCatalogSkill(requiredArg(args, "--query"), mode) };
  }

  if (command === "apply") {
    const root = arg(args, "--root") ?? runtime.cwd;
    const profile = arg(args, "--profile") ?? "default";
    if (args[1] === "plan") {
      return {
        exitCode: 0,
        value: await createAvailabilityPlanFromSource({
          root,
          from: arg(args, "--from"),
          profile,
          skills: parseSkills(arg(args, "--skills")),
          agentTargetIds: parseCsv(requiredArg(args, "--agent-targets")),
          projectTargetDirs: parseCsv(arg(args, "--project-targets")),
          availabilityOverrides: parseAvailabilityOverrides(arg(args, "--availability")),
          projectAssessments: await parseProjectAssessments(arg(args, "--project-assessments"), runtime.cwd),
          cacheDir: arg(args, "--cache-dir") ?? runtime.cacheDir ?? defaultCacheDir()
        })
      };
    }
    if (args[1] === "run" && !arg(args, "--target")) {
      if (!hasFlag(args, "--confirm")) {
        return { exitCode: 1, value: { error: "Availability-aware apply requires --confirm after reviewing a fresh plan.", requiresConfirm: true } };
      }
      return {
        exitCode: 0,
        value: await applyAvailabilityFromSource({
          root,
          from: arg(args, "--from"),
          profile,
          skills: parseSkills(arg(args, "--skills")),
          agentTargetIds: parseCsv(requiredArg(args, "--agent-targets")),
          projectTargetDirs: parseCsv(arg(args, "--project-targets")),
          availabilityOverrides: parseAvailabilityOverrides(arg(args, "--availability")),
          projectAssessments: await parseProjectAssessments(arg(args, "--project-assessments"), runtime.cwd),
          cleanupPaths: parseCsv(arg(args, "--cleanup-paths")),
          save: hasFlag(args, "--save"),
          confirm: true,
          allowUnrelatedRoot: hasFlag(args, "--allow-unrelated-root"),
          cacheDir: arg(args, "--cache-dir") ?? runtime.cacheDir ?? defaultCacheDir()
        })
      };
    }
    if (!hasFlag(args, "--confirm")) {
      return { exitCode: 1, value: { error: "Apply writes the target directory and requires --confirm after reviewing drift.", requiresConfirm: true } };
    }
    return {
      exitCode: 0,
      value: await applyFromSource(root, arg(args, "--from"), profile, requiredArg(args, "--target"), hasFlag(args, "--save"), parseSkills(arg(args, "--skills")), runtime.cacheDir ?? defaultCacheDir(), hasFlag(args, "--allow-unrelated-root"))
    };
  }

  if (command === "drift") {
    const root = arg(args, "--root") ?? runtime.cwd;
    const profile = arg(args, "--profile") ?? "default";
    if (!arg(args, "--target")) {
      return {
        exitCode: 0,
        value: await driftAvailabilityFromSource({
          root,
          from: arg(args, "--from"),
          profile,
          skills: parseSkills(arg(args, "--skills")),
          agentTargetIds: parseCsv(requiredArg(args, "--agent-targets")),
          projectTargetDirs: parseCsv(arg(args, "--project-targets")),
          availabilityOverrides: parseAvailabilityOverrides(arg(args, "--availability")),
          projectAssessments: await parseProjectAssessments(arg(args, "--project-assessments"), runtime.cwd),
          cacheDir: arg(args, "--cache-dir") ?? runtime.cacheDir ?? defaultCacheDir()
        })
      };
    }
    return { exitCode: 0, value: await driftFromSource(root, arg(args, "--from"), profile, requiredArg(args, "--target"), parseSkills(arg(args, "--skills")), runtime.cacheDir ?? defaultCacheDir()) };
  }

  if (command === "publish-plan") {
    const root = arg(args, "--root") ?? runtime.cwd;
    const visibility = parseVisibility(arg(args, "--visibility") ?? "private");
    const snapshot = await scanWorkspace(root);
    return { exitCode: 0, value: await createPublishPlan(root, snapshot.config, snapshot.skills, visibility, snapshot.sourceManifest, snapshot.sourceManifestDiagnostics, await parseReadinessAssessment(arg(args, "--readiness-assessment"), runtime.cwd)) };
  }

  if (command === "share") {
    const action = args[1] === "plan" || args[1] === "run" ? args[1] : "plan";
    const remoteUrl = arg(args, "--repo") ?? arg(args, "--remote");
    const sameRepository = hasFlag(args, "--same-repository");
    if (!remoteUrl && !sameRepository) throw new Error("Missing required option: --repo");
    const options: ShareProjectOptions = {
      root: arg(args, "--root") ?? runtime.cwd,
      remoteUrl: remoteUrl ?? "",
      visibility: parseVisibility(arg(args, "--visibility") ?? "private"),
      message: arg(args, "--message"),
      targetMode: parseTargetMode(arg(args, "--target-mode") ?? "direct"),
      projectName: arg(args, "--project-name"),
      profileName: arg(args, "--profile") ?? "default",
      skills: parseSkills(arg(args, "--skills")),
      cacheDir: arg(args, "--cache-dir") ?? runtime.cacheDir ?? defaultCacheDir(),
      delivery: parseDelivery(arg(args, "--delivery")),
      shareBranch: arg(args, "--branch"),
      confirm: hasFlag(args, "--confirm"),
      sameRepository,
      sameRepositoryRemote: arg(args, "--same-repository-remote"),
      readinessAssessment: await parseReadinessAssessment(arg(args, "--readiness-assessment"), runtime.cwd)
    };
    if (action === "plan") return { exitCode: 0, value: await createSharePlanCommand(options) };
    const plan = !options.confirm ? await createSharePlanCommand(options) : undefined;
    if (plan?.requiresConfirm) return { exitCode: 1, value: { error: "Remote sharing requires --confirm.", plan } };
    return { exitCode: 0, value: await shareProjectCommand(options) };
  }

  if (command === "doctor") return { exitCode: 0, value: await getEnvironmentStatus(runtime.cliShim) };

  throw new Error(`Unknown command: ${command}`);
}

async function runInstalledCommand(args: string[], runtime: CommandRuntime): Promise<CommandExecution> {
  const action = args[1] ?? "scan";
  const options = {
    home: arg(args, "--home"),
    includeAgentSystemSkills: hasFlag(args, "--include-system"),
    includeCodexPluginCache: !hasFlag(args, "--no-plugin-cache")
  };
  if (action === "scan") return { exitCode: 0, value: await scanInstalledSkills(options) };
  if (action === "organize") {
    const organizeAction = args[2] ?? "plan";
    const decisions = await parseOrganizeDecisions(arg(args, "--decisions"), runtime.cwd);
    if (organizeAction === "plan") return { exitCode: 0, value: await createInstalledSkillOrganizePlan({ ...options, decisions }) };
    if (organizeAction === "run") return { exitCode: 0, value: await organizeInstalledSkills({ ...options, decisions, confirm: hasFlag(args, "--confirm") }) };
    throw new Error(`Unknown installed organize action: ${organizeAction}`);
  }
  throw new Error(`Unknown installed action: ${action}`);
}

async function runSourceCommand(args: string[], runtime: CommandRuntime): Promise<CommandExecution> {
  const action = args[1] === "update" ? "update" : "status";
  const root = arg(args, "--root") ?? runtime.cwd;
  if (action === "update") return { exitCode: 0, value: await updateSource({ root, confirm: hasFlag(args, "--confirm") }) };
  return { exitCode: 0, value: await checkSourceUpdate({ root }) };
}

async function runProjectCommand(args: string[], runtime: CommandRuntime): Promise<CommandExecution> {
  const action = args[1] ?? "resolve";
  if (action === "availability") {
    const availabilityAction = args[2] ?? "plan";
    if (availabilityAction !== "plan" && availabilityAction !== "run") {
      throw new Error(`Unknown project availability action: ${availabilityAction}`);
    }
    if (availabilityAction === "run" && !hasFlag(args, "--confirm")) {
      return {
        exitCode: 1,
        value: {
          error: "Source availability update requires --confirm after reviewing a fresh plan.",
          requiresConfirm: true
        }
      };
    }
    const root = arg(args, "--root") ?? runtime.cwd;
    const sourceDirOverride = arg(args, "--source-dir");
    const snapshot = await loadSourceAvailabilitySnapshot(root, sourceDirOverride);
    const plan = createSkillProjectAvailabilityPlan({
      root: snapshot.root,
      sourceDir: snapshot.sourceDir,
      skills: snapshot.skills,
      currentManifest: snapshot.sourceManifest,
      currentDiagnostics: snapshot.sourceManifestDiagnostics,
      sourceDirOverrideProvided: sourceDirOverride !== undefined,
      defaultMode: parseOptionalSourceDefaultMode(arg(args, "--default-mode")),
      set: parseAvailabilityOverrides(arg(args, "--set")),
      aliases: parseAliasUpdates(arg(args, "--aliases")),
      remove: parseCsv(arg(args, "--remove"))
    });
    if (availabilityAction === "plan") return { exitCode: plan.blocked ? 2 : 0, value: plan };
    const expectedPlanDigest = arg(args, "--plan-digest");
    if (!expectedPlanDigest) {
      return {
        exitCode: 1,
        value: {
          error: "Source availability run requires --plan-digest from the reviewed plan.",
          requiresPlanDigest: true,
          freshPlan: plan
        }
      };
    }
    if (expectedPlanDigest !== plan.planDigest) {
      return {
        exitCode: 1,
        value: {
          error: "Source availability plan changed; review the fresh plan before running again.",
          planChanged: true,
          expectedPlanDigest,
          actualPlanDigest: plan.planDigest,
          freshPlan: plan
        }
      };
    }
    return { exitCode: 0, value: await executeSkillProjectAvailabilityPlan(plan, true) };
  }
  if (action !== "resolve") throw new Error(`Unknown project action: ${action}`);
  return {
    exitCode: 0,
    value: await resolveSkillProject({
      cwd: arg(args, "--root") ?? runtime.cwd,
      name: requiredArg(args, "--name")
    })
  };
}

async function loadSourceAvailabilitySnapshot(root: string, sourceDirOverride?: string) {
  const resolvedRoot = path.resolve(root);
  const stats = await fs.stat(resolvedRoot);
  if (!stats.isDirectory()) throw new Error("Workspace root is not a directory.");
  const sourceManifestResult = await loadSkillProjectManifest(resolvedRoot);
  const config = await loadConfigReadOnly(resolvedRoot);
  const sourceDir = resolveAvailabilitySourceDir(
    sourceDirOverride,
    sourceManifestResult.manifest?.sourceDir ?? config.sourceDir
  );
  await assertAvailabilitySourceDirContained(resolvedRoot, sourceDir);
  const skills = await discoverSkills(resolvedRoot, { ...config, sourceDir });
  return {
    root: resolvedRoot,
    sourceDir,
    skills,
    sourceManifest: sourceManifestResult.manifest,
    sourceManifestDiagnostics: validateSkillProjectManifestSkills(
      sourceManifestResult.manifest,
      skills,
      sourceManifestResult.diagnostics
    )
  };
}

function resolveAvailabilitySourceDir(override: string | undefined, fallback: string): string {
  const value = override?.trim() || fallback.trim();
  const normalized = value.replaceAll("\\", "/");
  if (!normalized || path.posix.isAbsolute(normalized) || path.win32.isAbsolute(value) || path.posix.normalize(normalized) !== normalized || normalized === ".." || normalized.startsWith("../")) {
    throw new Error("--source-dir must be a normalized relative path inside the workspace root.");
  }
  return normalized;
}

async function assertAvailabilitySourceDirContained(root: string, sourceDir: string): Promise<void> {
  const resolvedRoot = await fs.realpath(root);
  const resolvedSourceDir = await resolvePathEvenIfMissing(path.resolve(resolvedRoot, sourceDir));
  const relative = path.relative(resolvedRoot, resolvedSourceDir);
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) return;
  throw new Error("Skill source directory resolves outside the maintenance source root.");
}

async function resolvePathEvenIfMissing(input: string): Promise<string> {
  const absolute = path.resolve(input);
  const parsed = path.parse(absolute);
  let current = parsed.root;
  let pending = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let followedLinks = 0;

  while (pending.length > 0) {
    const segment = pending.shift()!;
    const candidate = path.join(current, segment);
    try {
      const stats = await fs.lstat(candidate);
      if (!stats.isSymbolicLink()) {
        current = candidate;
        continue;
      }
      followedLinks += 1;
      if (followedLinks > 40) throw new Error("Skill source directory contains too many symbolic links.");
      const target = path.resolve(path.dirname(candidate), await fs.readlink(candidate));
      const targetRoot = path.parse(target).root;
      pending = [
        ...target.slice(targetRoot.length).split(path.sep).filter(Boolean),
        ...pending
      ];
      current = targetRoot;
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || (error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return path.resolve(candidate, ...pending);
    }
  }

  return current;
}

async function runWorkflowCommand(args: string[], runtime: CommandRuntime): Promise<CommandExecution> {
  const subject = args[1];
  const action = args[2];
  if (subject === "local-skill" && action === "plan") {
    return {
      exitCode: 0,
      value: await createLocalSkillWorkflowPlan({
        root: arg(args, "--root") ?? runtime.cwd,
        sourceDir: arg(args, "--source-dir"),
        skill: requiredArg(args, "--skill"),
        to: requiredArg(args, "--to"),
        install: arg(args, "--install"),
        share: arg(args, "--share"),
        cacheDir: arg(args, "--cache-dir") ?? runtime.cacheDir ?? defaultCacheDir()
      })
    };
  }
  throw new Error(`Unknown workflow action: ${[subject, action].filter(Boolean).join(" ") || "missing"}`);
}

async function runMergeCommand(args: string[], runtime: CommandRuntime): Promise<CommandExecution> {
  const action = args[1] === "run" || args[1] === "cleanup-local" ? args[1] : "plan";
  if (action === "cleanup-local") {
    return {
      exitCode: 0,
      value: await cleanupLocalSkills({
        root: arg(args, "--root") ?? runtime.cwd,
        sourceDir: arg(args, "--source-dir"),
        skills: parseSkills(requiredArg(args, "--skills")) ?? [],
        confirm: hasFlag(args, "--confirm")
      })
    };
  }
  const options = {
    root: arg(args, "--root") ?? runtime.cwd,
    sourceDir: arg(args, "--source-dir"),
    to: requiredArg(args, "--to"),
    targetPath: requiredArg(args, "--target-path"),
    profile: arg(args, "--profile") ?? "default",
    skills: parseSkills(arg(args, "--skills")),
    targetDir: arg(args, "--target") ?? ".arcforge/skills",
    confirm: hasFlag(args, "--confirm"),
    cacheDir: arg(args, "--cache-dir") ?? runtime.cacheDir ?? defaultCacheDir()
  };
  return { exitCode: 0, value: action === "run" ? await mergeIntoProject(options) : await createMergePlan(options) };
}

async function runImportCommand(args: string[], runtime: CommandRuntime): Promise<CommandExecution> {
  const action = args[1] === "run" ? "run" : "plan";
  const options = {
    root: arg(args, "--root") ?? runtime.cwd,
    from: requiredArg(args, "--from"),
    profile: arg(args, "--profile") ?? "default",
    skills: parseSkills(arg(args, "--skills")),
    targetDir: arg(args, "--target-dir"),
    targetProfile: arg(args, "--target-profile"),
    confirm: hasFlag(args, "--confirm"),
    cacheDir: arg(args, "--cache-dir") ?? runtime.cacheDir ?? defaultCacheDir()
  };
  return { exitCode: 0, value: action === "run" ? await importSkillsIntoProject(options) : await createImportSkillsPlan(options) };
}

async function runAppliedCommand(args: string[], runtime: CommandRuntime): Promise<CommandExecution> {
  const action = args[1] ?? "list";
  const root = arg(args, "--root") ?? runtime.cwd;
  if (action === "list") return { exitCode: 0, value: await listAppliedSources(root) };
  if (action === "add") {
    return {
      exitCode: 0,
      value: await addAppliedSource({
        root,
        from: requiredArg(args, "--from"),
        profile: requiredArg(args, "--profile"),
        targetDir: requiredArg(args, "--target"),
        skills: parseSkills(arg(args, "--skills")),
        cacheDir: arg(args, "--cache-dir") ?? runtime.cacheDir ?? defaultCacheDir(),
        allowUnrelatedRoot: hasFlag(args, "--allow-unrelated-root")
      })
    };
  }
  if (action === "remove") return { exitCode: 0, value: await removeAppliedSource(root, requiredPositional(args[2], "applied record id")) };
  if (action === "drift") return { exitCode: 0, value: await driftAppliedSources(root, arg(args, "--id")) };
  if (action === "run") return { exitCode: 0, value: await runAppliedSources(root, arg(args, "--id"), hasFlag(args, "--confirm"), parseCsv(arg(args, "--cleanup-paths"))) };
  throw new Error(`Unknown applied action: ${action}`);
}

function helpFor(command?: string): string {
  if (!command) return helpText;
  const text = commandHelpText[command];
  if (!text) throw new Error(`Unknown help topic: ${command}`);
  return text;
}

export async function shareProjectCommand(options: ShareProjectOptions) {
  return shareProject({ ...options, cacheDir: options.cacheDir || defaultCacheDir() });
}

export async function createSharePlanCommand(options: ShareProjectOptions) {
  return createSharePlan({ ...options, cacheDir: options.cacheDir || defaultCacheDir() });
}

export async function shareDriftReportCommand(options: ShareDriftOptions) {
  return shareDriftReport({ ...options, cacheDir: options.cacheDir || defaultCacheDir() });
}

function arg(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function requiredArg(args: string[], name: string): string {
  const value = arg(args, name);
  if (!value) throw new Error(`Missing required option: ${name}`);
  return value;
}

function requiredPositional(value: string | undefined, label: string): string {
  if (!value || value.startsWith("--")) throw new Error(`Missing required ${label}.`);
  return value;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function parseSkills(value?: string): string[] | undefined {
  const skills = parseCsv(value);
  return skills.length > 0 ? skills : undefined;
}

function parseCsv(value?: string): string[] {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function parseAvailabilityOverrides(value?: string): SkillAvailabilityOverride[] | undefined {
  if (!value?.trim()) return undefined;
  return parseCsv(value).map((item) => {
    const separator = item.indexOf("=");
    if (separator <= 0 || separator === item.length - 1) {
      throw new Error(`Availability override must use skill=mode: ${item}`);
    }
    const skill = item.slice(0, separator).trim();
    const mode = item.slice(separator + 1).trim();
    if (!isSkillAvailabilityMode(mode)) {
      throw new Error(`Availability mode must be user-ambient, project-ambient, or user-on-demand: ${mode}`);
    }
    return { skill, mode };
  });
}

async function parseProjectAssessments(value: string | undefined, cwd: string): Promise<SkillProjectApplicabilityAssessment[] | undefined> {
  return parseJsonArrayFile<SkillProjectApplicabilityAssessment>(value, cwd, "project assessments");
}

async function parseOrganizeDecisions(value: string | undefined, cwd: string): Promise<InstalledSkillOrganizeDecision[] | undefined> {
  return parseJsonArrayFile<InstalledSkillOrganizeDecision>(value, cwd, "installed-skill organize decisions");
}

async function parseReadinessAssessment(value: string | undefined, cwd: string): Promise<PublishPlan["readinessAssessment"]> {
  if (!value?.trim()) return undefined;
  const file = path.resolve(cwd, value);
  const parsed = JSON.parse(await fs.readFile(file, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`Publish readiness assessment must be a JSON object: ${file}`);
  return parsed as PublishPlan["readinessAssessment"];
}

async function parseJsonArrayFile<T>(value: string | undefined, cwd: string, label: string): Promise<T[] | undefined> {
  if (!value?.trim()) return undefined;
  const file = path.resolve(cwd, value);
  const parsed = JSON.parse(await fs.readFile(file, "utf8")) as unknown;
  if (!Array.isArray(parsed)) throw new Error(`${label} must be a JSON array: ${file}`);
  return parsed as T[];
}

function parseOptionalSourceDefaultMode(value?: string): SkillAvailabilityMode | null | undefined {
  if (value === undefined) return undefined;
  if (value === "none") return null;
  if (isSkillAvailabilityMode(value)) return value;
  throw new Error("Source default mode must be user-ambient, project-ambient, user-on-demand, or none.");
}

function parseAliasUpdates(value?: string): SkillProjectAliasUpdate[] | undefined {
  if (value === undefined) return undefined;
  return value.split(",").map((item) => {
    const separator = item.indexOf("=");
    if (separator <= 0) throw new Error(`On-demand aliases must use skill=alias|alias: ${item}`);
    const rawAliases = item.slice(separator + 1);
    const aliases = rawAliases === "" ? [] : rawAliases.split("|").map((alias) => alias.trim());
    if (aliases.some((alias) => !alias)) throw new Error(`On-demand aliases cannot contain empty values: ${item}`);
    return {
      skill: item.slice(0, separator).trim(),
      aliases
    };
  });
}

function isSkillAvailabilityMode(value: string): value is SkillAvailabilityMode {
  return value === "user-ambient" || value === "project-ambient" || value === "user-on-demand";
}

function parseAuditMode(value: string): AuditMode {
  if (value === "rule" || value === "agent" || value === "hybrid") return value;
  throw new Error("Audit mode must be rule, agent, or hybrid.");
}

function parseOptionalPositiveInteger(value: string | undefined, name: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function parseProxyOptions(proxyUrl?: string, noProxy?: string) {
  const proxy = proxyUrl?.trim();
  if (!proxy) return undefined;
  return {
    enabled: true,
    proxyUrl: proxy,
    noProxy: noProxy?.trim() || undefined
  };
}

function parseVisibility(value: string): "private" | "public" {
  if (value === "private" || value === "public") return value;
  throw new Error("Visibility must be private or public.");
}

function parseTargetMode(value: string): ShareTargetMode {
  if (value === "direct" || value === "namedProject") return value;
  throw new Error("Target mode must be direct or namedProject.");
}

function parseDelivery(value?: string): ShareDeliveryMethod | undefined {
  if (!value) return undefined;
  if (value === "target-pr" || value === "targetPullRequest") return "targetPullRequest";
  if (value === "fork-pr" || value === "forkPullRequest") return "forkPullRequest";
  if (value === "direct-push" || value === "directPush") return "directPush";
  if (value === "local-branch" || value === "localBranch") return "localBranch";
  throw new Error("Delivery must be target-pr, fork-pr, direct-push, or local-branch.");
}

function defaultCacheDir(): string {
  return path.join(arcForgeHome(), "cache");
}
