#!/usr/bin/env node
import process from "node:process";
import { scanWorkspace, initWorkspace } from "../core/workspace.js";
import { createPublishPlan } from "../core/publish.js";
import { applyProfile, driftReport } from "../core/profiles.js";

const args = process.argv.slice(2);
const command = args[0] ?? "help";

try {
  if (command === "help" || command === "--help" || command === "-h") {
    help();
  } else if (command === "init") {
    const root = arg("--root") ?? process.cwd();
    const config = await initWorkspace(root);
    print(config);
  } else if (command === "scan") {
    const root = arg("--root") ?? process.cwd();
    const snapshot = await scanWorkspace(root);
    print(snapshot);
  } else if (command === "audit") {
    const root = arg("--root") ?? process.cwd();
    const snapshot = await scanWorkspace(root);
    print(snapshot.audit);
    process.exitCode = snapshot.audit.findings.some((item) => item.severity === "critical") ? 2 : 0;
  } else if (command === "publish-plan") {
    const root = arg("--root") ?? process.cwd();
    const visibility = (arg("--visibility") ?? "private") as "private" | "public";
    const snapshot = await scanWorkspace(root);
    print(await createPublishPlan(root, snapshot.config, snapshot.skills, visibility));
  } else if (command === "drift") {
    const root = arg("--root") ?? process.cwd();
    const profile = arg("--profile") ?? "default";
    const target = arg("--target") ?? ".skillops/skills";
    const snapshot = await scanWorkspace(root);
    print(await driftReport(root, snapshot.config, snapshot.skills, snapshot.assets, profile, target));
  } else if (command === "apply-profile") {
    const root = arg("--root") ?? process.cwd();
    const profile = arg("--profile") ?? "default";
    const target = arg("--target") ?? ".skillops/skills";
    const snapshot = await scanWorkspace(root);
    print(await applyProfile(root, snapshot.config, snapshot.skills, snapshot.assets, profile, target));
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function arg(name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function print(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function help(): void {
  console.log(`SkillOps CLI

Usage:
  skillops init [--root <dir>]
  skillops scan [--root <dir>]
  skillops audit [--root <dir>]
  skillops publish-plan [--root <dir>] [--visibility private|public]
  skillops drift [--root <dir>] [--profile default] [--target .skillops/skills]
  skillops apply-profile [--root <dir>] [--profile default] [--target .skillops/skills]
`);
}
