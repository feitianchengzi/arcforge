import os from "node:os";
import path from "node:path";
import { scanWorkspace, initWorkspace } from "../core/workspace.js";
import { createPublishPlan } from "../core/publish.js";
import { applyProfile, driftReport } from "../core/profiles.js";
import { downloadSource, shareProject, type ShareProjectOptions } from "../core/share.js";
import { getEnvironmentStatus } from "../core/environment.js";
import type { CliShimOptions } from "../core/cli-install.js";
import type { ShareTargetMode } from "../shared/types.js";

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

Usage:
  skillops init [--root <dir>]
  skillops scan [--root <dir>]
  skillops audit [--root <dir>]
  skillops publish-plan [--root <dir>] [--visibility private|public]
  skillops drift [--root <dir>] [--profile default] [--target .skillops/skills]
  skillops apply-profile [--root <dir>] [--profile default] [--target .skillops/skills]
  skillops share --repo <owner/repo|git-url> [--root <dir>] [--profile default] [--skills a,b] [--visibility private|public] [--message <text>] [--target-mode direct|namedProject] [--project-name <name>] [--cache-dir <dir>]
  skillops doctor
`;

export async function runSkillOpsCommand(args: string[], runtime: CommandRuntime): Promise<CommandExecution> {
  const command = args[0] ?? "help";
  if (command === "help" || command === "--help" || command === "-h") {
    return { exitCode: 0, text: helpText };
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
    const remoteUrl = arg(args, "--repo") ?? arg(args, "--remote");
    if (!remoteUrl) throw new Error("Missing required option: --repo");
    return {
      exitCode: 0,
      value: await shareProjectCommand({
        root: arg(args, "--root") ?? runtime.cwd,
        remoteUrl,
        visibility: parseVisibility(arg(args, "--visibility") ?? "private"),
        message: arg(args, "--message"),
        targetMode: parseTargetMode(arg(args, "--target-mode") ?? "direct"),
        projectName: arg(args, "--project-name"),
        profileName: arg(args, "--profile") ?? "default",
        skills: parseSkills(arg(args, "--skills")),
        cacheDir: arg(args, "--cache-dir") ?? runtime.cacheDir ?? defaultCacheDir()
      })
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

function defaultCacheDir(): string {
  return path.join(os.homedir(), ".skillops", "cache");
}
