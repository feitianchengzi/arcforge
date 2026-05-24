import os from "node:os";
import path from "node:path";
import { scanWorkspace, initWorkspace } from "../core/workspace.js";
import { createPublishPlan } from "../core/publish.js";
import { applyProfile, driftReport } from "../core/profiles.js";
import { createSharePlan, downloadSource, shareProject, type ShareProjectOptions } from "../core/share.js";
import { getEnvironmentStatus } from "../core/environment.js";
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
  init             Create skillops.config.json in a workspace
  scan             Scan skills, shared assets, and audit status
  audit            Print audit report; exits 2 on critical findings
  publish-plan     Generate a GitHub-first release checklist
  drift            Compare a profile against an installed target
  apply-profile    Copy a profile into an agent or project target
  share            Plan or execute GitHub-first sharing
  doctor           Check Git, CLI install, and optional tools

Common options:
  --root <dir>      SkillOps workspace root. Defaults to current directory.
  --profile <name>  Profile name. Defaults to default where supported.

Examples:
  skillops scan --root .
  skillops audit --root .
  skillops apply-profile --root . --profile default --target ~/.codex/skills
  skillops share plan --root . --repo github.com/acme/team-skills --profile frontend
  skillops share run --root . --repo github.com/acme/team-skills --profile frontend --confirm
  skillops doctor

Help:
  skillops help <command>
  skillops <command> --help

Install:
  Requires Node.js 20 or newer on PATH.
  curl -fsSL https://github.com/feitianchengzi/skillops/releases/latest/download/install.sh | sh
`;

const commandHelpText: Record<string, string> = {
  init: `SkillOps CLI - init

Create skillops.config.json in a workspace.

Usage:
  skillops init [--root <dir>]

Options:
  --root <dir>  Workspace root. Defaults to current directory.
`,
  scan: `SkillOps CLI - scan

Scan skills, shared assets, and audit status. Outputs JSON.

Usage:
  skillops scan [--root <dir>]

Options:
  --root <dir>  Workspace root. Defaults to current directory.
`,
  audit: `SkillOps CLI - audit

Print the audit report as JSON. Exits 2 when critical findings exist.

Usage:
  skillops audit [--root <dir>]

Options:
  --root <dir>  Workspace root. Defaults to current directory.
`,
  "publish-plan": `SkillOps CLI - publish-plan

Generate a GitHub-first release checklist and install command hints. This command does not push to a remote repository.

Usage:
  skillops publish-plan [--root <dir>] [--visibility private|public]

Options:
  --root <dir>                  Workspace root. Defaults to current directory.
  --visibility private|public   Release visibility. Defaults to private.
`,
  drift: `SkillOps CLI - drift

Compare a profile from the source workspace against an installed target directory. Outputs JSON.

Usage:
  skillops drift [--root <dir>] [--profile <name>] [--target <dir>]

Options:
  --root <dir>      Workspace root. Defaults to current directory.
  --profile <name>  Profile to compare. Defaults to default.
  --target <dir>    Installed target directory. Defaults to .skillops/skills.
`,
  "apply-profile": `SkillOps CLI - apply-profile

Copy a profile from the source workspace into an agent or project target directory. Outputs JSON.

Usage:
  skillops apply-profile [--root <dir>] [--profile <name>] [--target <dir>]

Options:
  --root <dir>      Workspace root. Defaults to current directory.
  --profile <name>  Profile to copy. Defaults to default.
  --target <dir>    Destination directory. Defaults to .skillops/skills.
`,
  share: `SkillOps CLI - share

Plan or execute sharing from a local workspace to a Git repository. Outputs JSON.

Usage:
  skillops share plan --repo <repo> [options]
  skillops share run --repo <repo> [options] --confirm
  skillops share --repo <repo> [options]

Required:
  --repo <repo>                 GitHub owner/repo, GitHub URL, tree URL, or full Git URL.

Options:
  --root <dir>                  Workspace root. Defaults to current directory.
  --profile <name>              Profile to share. Defaults to default.
  --skills <a,b>                One-time skill selection. Overrides profile skills for this share.
  --visibility private|public   Share visibility metadata. Defaults to private.
  --target-mode direct          Use the repository path as the Skill project root.
  --target-mode namedProject    Write under a project folder.
  --project-name <name>         Project folder name. Required with namedProject.
  --delivery <method>           target-pr, fork-pr, direct-push, or local-branch.
  --branch <name>               Share branch name. Defaults to skillops/share/<project>.
  --message <text>              Commit message. Defaults to "Share SkillOps project".
  --confirm                     Required for remote writes with share run.
  --cache-dir <dir>             Git worktree cache. Defaults to ~/.skillops/cache.

Examples:
  skillops share plan --root . --repo github.com/acme/team-skills --profile frontend
  skillops share run --root . --repo github.com/acme/team-skills --delivery target-pr --confirm
  skillops share plan --root . --repo github.com/acme/team-skills/tree/main/projects --target-mode namedProject --project-name web
`,
  doctor: `SkillOps CLI - doctor

Check local runtime dependencies and optional integrations. Outputs JSON.

Checks:
  Git availability
  Desktop CLI shim status when launched from the packaged desktop app
  Optional tools: skillshare, npx, clawhub

Usage:
  skillops doctor
`
};

export async function runSkillOpsCommand(args: string[], runtime: CommandRuntime): Promise<CommandExecution> {
  const command = args[0] ?? "help";
  if (command === "help") {
    return { exitCode: 0, text: helpFor(args[1]) };
  }
  if (command === "--help" || command === "-h" || args.includes("--help") || args.includes("-h")) {
    return { exitCode: 0, text: helpFor(command === "--help" || command === "-h" ? undefined : command) };
  }

  if (command === "init") {
    const root = arg(args, "--root") ?? runtime.cwd;
    return { exitCode: 0, value: await initWorkspace(root) };
  }

  if (command === "scan") {
    const root = arg(args, "--root") ?? runtime.cwd;
    return { exitCode: 0, value: await scanWorkspace(root) };
  }

  if (command === "audit") {
    const root = arg(args, "--root") ?? runtime.cwd;
    const snapshot = await scanWorkspace(root);
    return {
      exitCode: snapshot.audit.findings.some((item) => item.severity === "critical") ? 2 : 0,
      value: snapshot.audit
    };
  }

  if (command === "publish-plan") {
    const root = arg(args, "--root") ?? runtime.cwd;
    const visibility = parseVisibility(arg(args, "--visibility") ?? "private");
    const snapshot = await scanWorkspace(root);
    return { exitCode: 0, value: await createPublishPlan(root, snapshot.config, snapshot.skills, visibility) };
  }

  if (command === "drift") {
    const root = arg(args, "--root") ?? runtime.cwd;
    const profile = arg(args, "--profile") ?? "default";
    const target = arg(args, "--target") ?? ".skillops/skills";
    const snapshot = await scanWorkspace(root);
    return { exitCode: 0, value: await driftReport(root, snapshot.config, snapshot.skills, snapshot.assets, profile, target) };
  }

  if (command === "apply-profile") {
    const root = arg(args, "--root") ?? runtime.cwd;
    const profile = arg(args, "--profile") ?? "default";
    const target = arg(args, "--target") ?? ".skillops/skills";
    const snapshot = await scanWorkspace(root);
    return { exitCode: 0, value: await applyProfile(root, snapshot.config, snapshot.skills, snapshot.assets, profile, target) };
  }

  if (command === "share") {
    const action = args[1] === "plan" || args[1] === "run" ? args[1] : "plan";
    const remoteUrl = arg(args, "--repo") ?? arg(args, "--remote");
    if (!remoteUrl) throw new Error("Missing required option: --repo");
    const options: ShareProjectOptions = {
      root: arg(args, "--root") ?? runtime.cwd,
      remoteUrl,
      visibility: parseVisibility(arg(args, "--visibility") ?? "private"),
      message: arg(args, "--message"),
      targetMode: parseTargetMode(arg(args, "--target-mode") ?? "direct"),
      projectName: arg(args, "--project-name"),
      profileName: arg(args, "--profile") ?? "default",
      skills: parseSkills(arg(args, "--skills")),
      cacheDir: arg(args, "--cache-dir") ?? runtime.cacheDir ?? defaultCacheDir(),
      delivery: parseDelivery(arg(args, "--delivery")),
      shareBranch: arg(args, "--branch"),
      confirm: hasFlag(args, "--confirm")
    };
    if (action === "plan") {
      return {
        exitCode: 0,
        value: await createSharePlanCommand(options)
      };
    }
    const plan = !options.confirm ? await createSharePlanCommand(options) : undefined;
    if (plan?.requiresConfirm) {
      return {
        exitCode: 1,
        value: {
          error: "Remote sharing requires --confirm.",
          plan
        }
      };
    }
    return {
      exitCode: 0,
      value: await shareProjectCommand(options)
    };
  }

  if (command === "doctor") {
    return {
      exitCode: 0,
      value: await getEnvironmentStatus(runtime.cliShim)
    };
  }

  throw new Error(`Unknown command: ${command}`);
}

function helpFor(command?: string): string {
  if (!command) return helpText;
  const text = commandHelpText[command];
  if (!text) throw new Error(`Unknown help topic: ${command}`);
  return text;
}

export async function createPublishPlanCommand(root: string, visibility: "private" | "public") {
  const snapshot = await scanWorkspace(root);
  return createPublishPlan(root, snapshot.config, snapshot.skills, visibility);
}

export async function applyProfileCommand(root: string, profile: string, targetDir: string) {
  const snapshot = await scanWorkspace(root);
  return applyProfile(root, snapshot.config, snapshot.skills, snapshot.assets, profile, targetDir);
}

export async function driftReportCommand(root: string, profile: string, targetDir: string) {
  const snapshot = await scanWorkspace(root);
  return driftReport(root, snapshot.config, snapshot.skills, snapshot.assets, profile, targetDir);
}

export async function shareProjectCommand(options: ShareProjectOptions) {
  return shareProject({
    ...options,
    cacheDir: options.cacheDir || defaultCacheDir()
  });
}

export async function createSharePlanCommand(options: ShareProjectOptions) {
  return createSharePlan({
    ...options,
    cacheDir: options.cacheDir || defaultCacheDir()
  });
}

export async function downloadSourceCommand(remoteUrl: string, cacheDir?: string) {
  return downloadSource({
    remoteUrl,
    cacheDir: cacheDir || defaultCacheDir()
  });
}

function arg(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
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
  return path.join(os.homedir(), ".skillops", "cache");
}
