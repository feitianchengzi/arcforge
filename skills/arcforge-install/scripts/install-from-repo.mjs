#!/usr/bin/env node
import { constants as fsConstants } from "node:fs";
import { access, chmod, cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..");
const args = parseArgs(process.argv.slice(2));
const agents = parseAgents(args.agent ?? "codex");
const desktopMode = args.desktop ?? "install";
const updatePath = Boolean(args["update-path"]);
const skipNpmInstall = Boolean(args["skip-npm-install"]);
const dryRun = Boolean(args["dry-run"]);
const verifyOnly = Boolean(args.verify);
const installHome = args.home ? path.resolve(String(args.home)) : os.homedir();
const explicitShimDir = args["shim-dir"] ? path.resolve(String(args["shim-dir"])) : undefined;
const npmCacheDir = args["npm-cache"]
  ? path.resolve(String(args["npm-cache"]))
  : installHome !== os.homedir()
    ? path.join(installHome, ".npm")
    : undefined;
const installedSkillNames = ["arcforge", "arcforge-skill-first"];
let currentStage = "initialization";

process.on("uncaughtException", handleFatalError);
process.on("unhandledRejection", handleFatalError);

if (!["install", "build", "package", "skip"].includes(desktopMode)) {
  fail(`Unsupported --desktop value: ${desktopMode}. Use install, build, package, or skip.`);
}

await assertRepoRoot(repoRoot);
await assertNodeMajor(20);

if (verifyOnly) {
  const shimDir = await chooseShimDir();
  const cli = {
    shimPath: path.join(shimDir, process.platform === "win32" ? "arcforge.cmd" : "arcforge"),
    shimDir,
    pathContainsShim: pathInPath(shimDir)
  };
  const desktop = { launcherPath: desktopShimPath(shimDir) };
  const result = await verifyInstall({ cli, desktop, desktopRequired: desktopMode !== "skip" });
  printVerifySummary(result);
  process.exit(result.ok ? 0 : 1);
}

if (dryRun) {
  printPlan({
    repoRoot,
    agents: agents.map((agent) => ({ agent, targets: userSkillTargets(agent) })),
    cliShimDir: await chooseShimDir(),
    desktopShimPath: desktopShimPath(await chooseShimDir()),
    desktopMode,
    npmCacheDir,
    skipNpmInstall,
    updatePath
  });
  process.exit(0);
}

const summary = {
  repoRoot,
  installedSkills: [],
  cli: undefined,
  desktop: { mode: desktopMode, status: "pending", launcherPath: undefined }
};

if (!skipNpmInstall) {
  await run("npm", ["install"], { cwd: repoRoot, label: "Install Node dependencies" });
}

for (const agent of agents) {
  for (const skillName of installedSkillNames) {
    const target = userSkillTarget(agent, skillName);
    await installRepoSkill(skillName, target);
    summary.installedSkills.push({ agent, skillName, target });
  }
}

await run("npm", ["run", "build:cli"], { cwd: repoRoot, label: "Build ArcForge CLI" });
summary.cli = await installCliShim({ updatePath });

if (desktopMode === "skip") {
  summary.desktop = { mode: desktopMode, status: "skipped" };
} else if (desktopMode === "build") {
  await run("npm", ["run", "build"], { cwd: repoRoot, label: "Build ArcForge Desktop runtime" });
  summary.desktop = { mode: desktopMode, status: "built", command: "npm run dev" };
} else if (desktopMode === "install") {
  await run("npm", ["run", "build"], { cwd: repoRoot, label: "Build ArcForge Desktop runtime" });
  const launcher = await installDesktopLauncher(summary.cli.shimDir);
  summary.desktop = { mode: desktopMode, status: "installed", launcherPath: launcher.launcherPath, command: launcher.launcherPath };
} else {
  await run("npm", ["run", "package"], { cwd: repoRoot, label: "Package ArcForge Desktop" });
  const launcher = await installDesktopLauncher(summary.cli.shimDir);
  summary.desktop = { mode: desktopMode, status: "packaged", outputDir: path.join(repoRoot, "release"), launcherPath: launcher.launcherPath, command: launcher.launcherPath };
}

printSummary(summary);
const verification = await verifyInstall({ cli: summary.cli, desktop: summary.desktop, desktopRequired: desktopMode !== "skip" && desktopMode !== "build" });
printVerifySummary(verification);
if (!verification.ok) process.exit(1);

function parseArgs(rawArgs) {
  const result = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const item = rawArgs[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = rawArgs[index + 1];
    if (!next || next.startsWith("--")) {
      result[key] = true;
    } else {
      result[key] = next;
      index += 1;
    }
  }
  return result;
}

function parseAgents(value) {
  const agents = String(value)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const allowed = new Set(["codex", "claude", "cursor"]);
  const invalid = agents.filter((agent) => !allowed.has(agent));
  if (invalid.length > 0) fail(`Unsupported --agent value: ${invalid.join(", ")}.`);
  return [...new Set(agents)];
}

async function assertRepoRoot(root) {
  const requiredFiles = [
    "package.json",
    "skills/arcforge/SKILL.md",
    "skills/arcforge-skill-first/SKILL.md",
    "src/cli/index.ts",
    "src/electron/main.ts"
  ];
  for (const relativePath of requiredFiles) {
    await assertExists(path.join(root, relativePath), `ArcForge repository file missing: ${relativePath}`);
  }
}

async function assertNodeMajor(requiredMajor) {
  const major = Number(process.versions.node.split(".")[0]);
  if (!Number.isFinite(major) || major < requiredMajor) {
    fail(`Node.js ${requiredMajor} or newer is required. Found ${process.versions.node}.`);
  }
}

async function installRepoSkill(skillName, targetDir) {
  const sourceDir = path.join(repoRoot, "skills", skillName);
  await assertExists(sourceDir, `Source skill missing: skills/${skillName}`);
  await mkdir(path.dirname(targetDir), { recursive: true });
  await rm(targetDir, { recursive: true, force: true });
  await cp(sourceDir, targetDir, { recursive: true });
}

function userSkillTargets(agent) {
  return installedSkillNames.map((skillName) => ({ skillName, target: userSkillTarget(agent, skillName) }));
}

function userSkillTarget(agent, skillName) {
  if (agent === "codex") return path.join(installHome, ".codex", "skills", skillName);
  if (agent === "claude") return path.join(installHome, ".claude", "skills", skillName);
  return path.join(installHome, ".cursor", "skills", skillName);
}

async function installCliShim(options) {
  const shimDir = await chooseShimDir();
  await mkdir(shimDir, { recursive: true });
  const shimPath = path.join(shimDir, process.platform === "win32" ? "arcforge.cmd" : "arcforge");
  const cliEntry = path.join(repoRoot, "dist", "cli", "index.js");
  await assertExists(cliEntry, "CLI build missing after npm run build:cli.");

  if (process.platform === "win32") {
    await writeFile(shimPath, `@echo off\r\nnode "${cliEntry}" %*\r\n`, "utf8");
  } else {
    await writeFile(shimPath, `#!/bin/sh\nexec node "${cliEntry}" "$@"\n`, "utf8");
    await chmod(shimPath, 0o755);
  }

  const pathContainsShim = pathInPath(shimDir);
  const profilePath = options.updatePath && !pathContainsShim ? await updatePersistentPath(shimDir) : undefined;
  return {
    shimPath,
    shimDir,
    pathContainsShim: pathContainsShim || Boolean(profilePath),
    profilePath
  };
}

async function installDesktopLauncher(shimDir) {
  const launcherPath = desktopShimPath(shimDir);
  const electronEntry = path.join(repoRoot, "node_modules", "electron", "cli.js");
  const mainEntry = path.join(repoRoot, "dist", "electron", "main.js");
  const uiEntry = path.join(repoRoot, "dist-ui", "index.html");
  await assertExists(electronEntry, "Electron is missing. Run npm install before installing the Desktop launcher.");
  await assertExists(mainEntry, "Desktop build missing after npm run build.");
  await assertExists(uiEntry, "Desktop UI build missing after npm run build.");

  if (process.platform === "win32") {
    await writeFile(launcherPath, `@echo off\r\ncd /d "${repoRoot}"\r\nnode "${electronEntry}" . %*\r\n`, "utf8");
  } else {
    await writeFile(launcherPath, `#!/bin/sh\ncd "${repoRoot}"\nexec node "${electronEntry}" . "$@"\n`, "utf8");
    await chmod(launcherPath, 0o755);
  }
  return { launcherPath };
}

function desktopShimPath(shimDir) {
  return path.join(shimDir, process.platform === "win32" ? "arcforge-desktop.cmd" : "arcforge-desktop");
}

async function verifyInstall(options) {
  currentStage = "Verify ArcForge install";
  const checks = [];
  await addPathCheck(checks, "CLI shim exists", options.cli.shimPath);
  if (process.platform !== "win32") await addExecutableCheck(checks, "CLI shim executable", options.cli.shimPath);
  checks.push({ label: "CLI command directory on PATH", path: options.cli.shimDir, ok: pathInPath(options.cli.shimDir), optional: true });
  await addPathCheck(checks, "CLI entry exists", path.join(repoRoot, "dist", "cli", "index.js"));

  if (options.desktopRequired) {
    await addPathCheck(checks, "Desktop launcher exists", options.desktop.launcherPath);
    if (process.platform !== "win32") await addExecutableCheck(checks, "Desktop launcher executable", options.desktop.launcherPath);
    checks.push({ label: "Desktop command directory on PATH", path: options.cli.shimDir, ok: pathInPath(options.cli.shimDir), optional: true });
    await addPathCheck(checks, "Electron launcher exists", path.join(repoRoot, "node_modules", "electron", "cli.js"));
    await addPathCheck(checks, "Desktop main build exists", path.join(repoRoot, "dist", "electron", "main.js"));
    await addPathCheck(checks, "Desktop UI build exists", path.join(repoRoot, "dist-ui", "index.html"));
  }

  return {
    ok: checks.every((check) => check.ok || check.optional),
    checks
  };
}

async function addPathCheck(checks, label, filePath) {
  checks.push({ label, path: filePath, ok: await pathExists(filePath) });
}

async function addExecutableCheck(checks, label, filePath) {
  try {
    await access(filePath, fsConstants.X_OK);
    checks.push({ label, path: filePath, ok: true });
  } catch {
    checks.push({ label, path: filePath, ok: false });
  }
}

async function chooseShimDir() {
  if (explicitShimDir) return explicitShimDir;
  if (installHome !== os.homedir()) return path.join(installHome, ".local", "bin");
  if (process.platform === "win32") return path.join(installHome, ".arcforge", "bin");
  const durableUserDirs = [path.join(installHome, ".local", "bin"), path.join(installHome, "bin")];
  for (const dirPath of durableUserDirs) {
    if (pathInPath(dirPath) || await pathExists(dirPath)) return dirPath;
  }
  const pathEntries = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  for (const entry of pathEntries) {
    const resolved = path.resolve(entry);
    if (!resolved.startsWith(os.homedir())) continue;
    if (isTransientAgentShimDir(resolved)) continue;
    if (await isWritableDirectory(resolved)) return resolved;
  }
  return path.join(installHome, ".local", "bin");
}

function isTransientAgentShimDir(dirPath) {
  const normalized = normalizePath(dirPath);
  return normalized.includes(`${path.sep}.codex${path.sep}tmp${path.sep}`)
    || normalized.includes(`${path.sep}node_modules${path.sep}@openai${path.sep}codex${path.sep}`)
    || path.basename(normalized) === "codex-path";
}

async function updatePersistentPath(shimDir) {
  if (process.platform === "win32") {
    const userPath = process.env.PATH ?? "";
    console.log(`PATH update requested on Windows. Add this directory to User PATH if needed: ${shimDir}`);
    return userPath.includes(shimDir) ? undefined : "Windows User PATH";
  }
  const shellName = path.basename(process.env.SHELL ?? "");
  const profilePath = path.join(installHome, shellName === "bash" ? ".bashrc" : ".zshrc");
  const exportLine = `export PATH="${shimDir}:$PATH"`;
  const existing = await pathExists(profilePath) ? await readFile(profilePath, "utf8") : "";
  if (!existing.includes(exportLine)) {
    await writeFile(profilePath, `${existing.trimEnd()}\n\n# ArcForge CLI\n${exportLine}\n`, "utf8");
  }
  return profilePath;
}

function pathInPath(targetDir) {
  const normalizedTarget = normalizePath(targetDir);
  return (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter(Boolean)
    .some((entry) => normalizePath(entry) === normalizedTarget);
}

function normalizePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

async function run(command, commandArgs, options) {
  currentStage = options.label;
  console.log(`\n> ${options.label}`);
  console.log(`  ${command} ${commandArgs.join(" ")}`);
  const env = { ...process.env };
  if (installHome !== os.homedir()) env.HOME = installHome;
  if (npmCacheDir) env.npm_config_cache = npmCacheDir;
  await new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: options.cwd,
      env,
      stdio: "inherit",
      shell: process.platform === "win32"
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${options.label} failed with exit code ${code}.`));
    });
  });
}

async function assertExists(filePath, message) {
  if (!(await pathExists(filePath))) fail(message);
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isWritableDirectory(dirPath) {
  try {
    await access(dirPath, fsConstants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function printSummary(value) {
  console.log("\nArcForge install summary");
  console.log(`Repository: ${value.repoRoot}`);
  for (const item of value.installedSkills) {
    console.log(`Skill (${item.agent}/${item.skillName}): ${item.target}`);
  }
  console.log(`CLI shim: ${value.cli.shimPath}`);
  console.log(`CLI shim directory on PATH: ${value.cli.pathContainsShim ? "yes" : "no"}`);
  if (value.cli.profilePath) console.log(`PATH profile updated: ${value.cli.profilePath}`);
  console.log(`Desktop: ${value.desktop.status} (${value.desktop.mode})`);
  if (value.desktop.command) console.log(`Desktop command: ${value.desktop.command}`);
  if (value.desktop.launcherPath) console.log(`Desktop launcher: ${value.desktop.launcherPath}`);
  if (value.desktop.outputDir) console.log(`Desktop package output: ${value.desktop.outputDir}`);
  if (!value.cli.pathContainsShim) {
    console.log(`Run CLI directly now: ${value.cli.shimPath} doctor`);
    console.log(`Add this directory to PATH if needed: ${value.cli.shimDir}`);
  }
}

function printVerifySummary(value) {
  console.log("\nArcForge install verification");
  for (const check of value.checks) {
    const status = check.ok ? "ok" : check.optional ? "warn" : "missing";
    console.log(`${status} - ${check.label}: ${check.path}`);
  }
}

function printPlan(value) {
  console.log("ArcForge install dry run");
  console.log(`Repository: ${value.repoRoot}`);
  for (const item of value.agents) {
    for (const target of item.targets) {
      console.log(`Skill (${item.agent}/${target.skillName}): ${target.target}`);
    }
  }
  console.log(`CLI shim directory: ${value.cliShimDir}`);
  console.log(`Desktop launcher: ${value.desktopShimPath}`);
  console.log(`Desktop mode: ${value.desktopMode}`);
  if (value.npmCacheDir) console.log(`NPM cache: ${value.npmCacheDir}`);
  console.log(`Verify only: ${verifyOnly ? "yes" : "no"}`);
  console.log(`Skip npm install: ${value.skipNpmInstall ? "yes" : "no"}`);
  console.log(`Update PATH: ${value.updatePath ? "yes" : "no"}`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function handleFatalError(error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("\nArcForge install failed");
  console.error(`Stage: ${currentStage}`);
  console.error(`Reason: ${message}`);
  console.error("Next steps:");
  if (currentStage.includes("Package")) {
    console.error("- Retry with --desktop install if you only need an installed source launcher.");
    console.error("- Retry --desktop package after network, proxy, certificate, and Electron download access are available.");
  } else if (currentStage.includes("dependencies")) {
    console.error("- Confirm Node.js 20+ is installed and npm can access the registry, then rerun the install command.");
  } else if (currentStage.includes("CLI")) {
    console.error("- Run npm run build:cli manually to inspect TypeScript or build errors.");
  } else {
    console.error("- Rerun with --dry-run to inspect target paths, then rerun the install command after fixing the reported issue.");
  }
  process.exit(1);
}
