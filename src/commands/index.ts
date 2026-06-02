import path from "node:path";
import { scanWorkspace } from "../core/workspace.js";
import { createPublishPlan } from "../core/publish.js";
import { createSharePlan, shareProject, type ShareProjectOptions } from "../core/share.js";
import { shareDriftReport, type ShareDriftOptions } from "../core/share-drift.js";
import { getEnvironmentStatus } from "../core/environment.js";
import { skillOpsHome } from "../core/project-store.js";
import { addAppliedSource, applyFromSource, createMergePlan, driftAppliedSources, driftFromSource, listAppliedSources, mergeIntoProject, removeAppliedSource, runAppliedSources } from "../core/sources.js";
import { checkSourceUpdate, updateSource } from "../core/source-update.js";
import type { CliShimOptions } from "../core/cli-install.js";
import type { ShareDeliveryMethod, ShareTargetMode } from "../shared/types.js";

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

export const helpText = `SkillOps CLI

Local-first, GitHub-first governance for AI agent skills.

Usage:
  skillops <command> [options]

Commands:
  scan             Scan skills, shared assets, and audit status
  audit            Print audit report; exits 2 on critical findings
  source           Check or update the current Git checkout
  merge            Merge project skills into another Skill project
  applied          Manage applied source records for the current project
  apply            Copy a profile into an agent or project target
  drift            Compare a profile against an installed target
  publish-plan     Generate a GitHub-first release checklist
  share            Plan or execute GitHub-first sharing
  doctor           Check Git, CLI install, and optional tools

Common options:
  --root <dir>      SkillOps workspace root. Defaults to current directory.
  --profile <name>  Profile name. Defaults to default where supported.

Examples:
  skillops scan --root .
  skillops audit --root .
  skillops source status --root .
  skillops source update --root . --confirm
  skillops merge plan --root . --to ../team-skills --skills review --target-path skills/project-a
  skillops merge run --root . --to github.com/acme/team-skills --skills review --target-path skills/project-a --confirm
  skillops applied drift --root .
  skillops apply --from ../team-skills --profile default --target ~/.codex/skills
  skillops share plan --root . --repo github.com/acme/team-skills --profile frontend
  skillops share run --root . --repo github.com/acme/team-skills --profile frontend --confirm
  skillops doctor

Help:
  skillops help <command>
  skillops <command> --help
`;

const commandHelpText: Record<string, string> = {
  scan: `SkillOps CLI - scan

Scan skills, shared assets, and audit status. Outputs JSON.

Usage:
  skillops scan [--root <dir>]
`,
  audit: `SkillOps CLI - audit

Print the audit report as JSON. Exits 2 when critical findings exist.

Usage:
  skillops audit [--root <dir>]
`,
  source: `SkillOps CLI - source

Check or update any Git checkout. This is independent from Skill project merge or apply relationships.

Usage:
  skillops source status [--root <dir>]
  skillops source update [--root <dir>] --confirm
`,
  merge: `SkillOps CLI - merge

Merge current project skills into another Skill project and record that project as the applied source.

Usage:
  skillops merge plan --to <path-or-url> --target-path <dir> [options]
  skillops merge run --to <path-or-url> --target-path <dir> [options] --confirm

Options:
  --root <dir>         Current project root. Defaults to current directory.
  --to <path-or-url>   Target Skill project path, GitHub shorthand or Git URL.
  --skills <a,b>       Skills to merge. Defaults to the selected profile.
  --profile <name>     Profile to update in the target project. Defaults to default.
  --target-path <dir>  Directory in the target project where skills are written.
  --target <dir>       Applied target directory recorded for the current project. Defaults to .skillops/skills.
`,
  applied: `SkillOps CLI - applied

Manage the current project's applied source records.

Usage:
  skillops applied list [--root <dir>]
  skillops applied add --from <path-or-url> --profile <name> --target <dir> [--skills <a,b>]
  skillops applied remove <id> [--root <dir>]
  skillops applied drift [--root <dir>] [--id <record-id>]
  skillops applied run [--root <dir>] [--id <record-id>] --confirm
`,
  apply: `SkillOps CLI - apply

Copy a profile from another Skill project or the current workspace into a target directory. Outputs JSON.

Usage:
  skillops apply [--root <dir>] [--from <path-or-url>] [--profile <name>] --target <dir> [--save]
`,
  drift: `SkillOps CLI - drift

Compare a profile from another Skill project or the current workspace against an installed target directory. Outputs JSON.

Usage:
  skillops drift [--root <dir>] [--from <path-or-url>] [--profile <name>] --target <dir>
`,
  "publish-plan": `SkillOps CLI - publish-plan

Generate a GitHub-first release checklist and install command hints. This command does not push to a remote repository.

Usage:
  skillops publish-plan [--root <dir>] [--visibility private|public]
`,
  share: `SkillOps CLI - share

Plan or execute sharing from a local workspace to a Git repository. Outputs JSON.

Usage:
  skillops share plan --repo <repo> [options]
  skillops share run --repo <repo> [options] --confirm
  skillops share plan --same-repository [options]
  skillops share run --same-repository [options] --confirm
`,
  doctor: `SkillOps CLI - doctor

Check local runtime dependencies and optional integrations. Outputs JSON.

Usage:
  skillops doctor
`
};

export async function runSkillOpsCommand(args: string[], runtime: CommandRuntime): Promise<CommandExecution> {
  const command = args[0] ?? "help";
  if (command === "help") return { exitCode: 0, text: helpFor(args[1]) };
  if (command === "--help" || command === "-h" || args.includes("--help") || args.includes("-h")) {
    return { exitCode: 0, text: helpFor(command === "--help" || command === "-h" ? undefined : command) };
  }

  if (command === "scan") {
    return { exitCode: 0, value: await scanWorkspace(arg(args, "--root") ?? runtime.cwd) };
  }

  if (command === "audit") {
    const snapshot = await scanWorkspace(arg(args, "--root") ?? runtime.cwd);
    return { exitCode: snapshot.audit.findings.some((item) => item.severity === "critical") ? 2 : 0, value: snapshot.audit };
  }

  if (command === "source") return runSourceCommand(args, runtime);
  if (command === "merge") return runMergeCommand(args, runtime);
  if (command === "applied") return runAppliedCommand(args, runtime);

  if (command === "apply") {
    const root = arg(args, "--root") ?? runtime.cwd;
    const profile = arg(args, "--profile") ?? "default";
    return {
      exitCode: 0,
      value: await applyFromSource(root, arg(args, "--from"), profile, requiredArg(args, "--target"), hasFlag(args, "--save"), parseSkills(arg(args, "--skills")), runtime.cacheDir ?? defaultCacheDir())
    };
  }

  if (command === "drift") {
    const root = arg(args, "--root") ?? runtime.cwd;
    const profile = arg(args, "--profile") ?? "default";
    return { exitCode: 0, value: await driftFromSource(root, arg(args, "--from"), profile, requiredArg(args, "--target"), parseSkills(arg(args, "--skills")), runtime.cacheDir ?? defaultCacheDir()) };
  }

  if (command === "publish-plan") {
    const root = arg(args, "--root") ?? runtime.cwd;
    const visibility = parseVisibility(arg(args, "--visibility") ?? "private");
    const snapshot = await scanWorkspace(root);
    return { exitCode: 0, value: await createPublishPlan(root, snapshot.config, snapshot.skills, visibility) };
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
      sameRepositoryRemote: arg(args, "--same-repository-remote")
    };
    if (action === "plan") return { exitCode: 0, value: await createSharePlanCommand(options) };
    const plan = !options.confirm ? await createSharePlanCommand(options) : undefined;
    if (plan?.requiresConfirm) return { exitCode: 1, value: { error: "Remote sharing requires --confirm.", plan } };
    return { exitCode: 0, value: await shareProjectCommand(options) };
  }

  if (command === "doctor") return { exitCode: 0, value: await getEnvironmentStatus(runtime.cliShim) };

  throw new Error(`Unknown command: ${command}`);
}

async function runSourceCommand(args: string[], runtime: CommandRuntime): Promise<CommandExecution> {
  const action = args[1] === "update" ? "update" : "status";
  const root = arg(args, "--root") ?? runtime.cwd;
  if (action === "update") return { exitCode: 0, value: await updateSource({ root, confirm: hasFlag(args, "--confirm") }) };
  return { exitCode: 0, value: await checkSourceUpdate({ root }) };
}

async function runMergeCommand(args: string[], runtime: CommandRuntime): Promise<CommandExecution> {
  const action = args[1] === "run" ? "run" : "plan";
  const options = {
    root: arg(args, "--root") ?? runtime.cwd,
    to: requiredArg(args, "--to"),
    targetPath: requiredArg(args, "--target-path"),
    profile: arg(args, "--profile") ?? "default",
    skills: parseSkills(arg(args, "--skills")),
    targetDir: arg(args, "--target") ?? ".skillops/skills",
    confirm: hasFlag(args, "--confirm"),
    cacheDir: arg(args, "--cache-dir") ?? runtime.cacheDir ?? defaultCacheDir()
  };
  return { exitCode: 0, value: action === "run" ? await mergeIntoProject(options) : await createMergePlan(options) };
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
        cacheDir: arg(args, "--cache-dir") ?? runtime.cacheDir ?? defaultCacheDir()
      })
    };
  }
  if (action === "remove") return { exitCode: 0, value: await removeAppliedSource(root, requiredPositional(args[2], "applied record id")) };
  if (action === "drift") return { exitCode: 0, value: await driftAppliedSources(root, arg(args, "--id")) };
  if (action === "run") return { exitCode: 0, value: await runAppliedSources(root, arg(args, "--id"), hasFlag(args, "--confirm")) };
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
  if (!value) return undefined;
  const skills = value.split(",").map((item) => item.trim()).filter(Boolean);
  return skills.length > 0 ? skills : undefined;
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
  return path.join(skillOpsHome(), "cache");
}
