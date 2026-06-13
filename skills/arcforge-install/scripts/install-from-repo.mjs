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
const installedSkillNames = ["arcforge", "arcforge-skill-first"];
const recommendedSkillProjects = [
  {
    name: "arckit",
    url: "https://github.com/feitianchengzi/arckit",
    description: "Feitianchengzi AI-agent-assisted software development skill center for idea, decision, project definition, iteration governance, memory, and technology-agnostic engineering workflows."
  },
  {
    name: "arckit-code",
    url: "https://github.com/feitianchengzi/arckit-code",
    description: "Feitianchengzi technology-stack-specific coding skill project. Current skills focus on SwiftUI/Apple client architecture and feedback platform integration."
  }
];
const rawArgs = process.argv.slice(2);
const args = parseArgs(rawArgs);
if (hasHelpFlag(rawArgs)) {
  printHelp();
  process.exit(0);
}
const agents = parseAgents(args.agent ?? "codex");
const desktopMode = args.desktop ?? "install";
const recommendedSkillsArg = args["recommended-skills"];
const recommendedSkillSelection = parseRecommendedSkillSelection(recommendedSkillsArg ?? "prompt");
const recommendedMode = parseRecommendedMode(args["recommended-mode"] ?? "prompt");
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
let currentStage = "initialization";

process.on("uncaughtException", handleFatalError);
process.on("unhandledRejection", handleFatalError);

if (!["install", "build", "package", "skip"].includes(desktopMode)) {
  fail(`Unsupported --desktop value: ${desktopMode}. Use install, build, package, or skip.`);
}
if (recommendedSkillsArg && recommendedMode === "prompt") {
  fail("Pass --recommended-mode quick or --recommended-mode governed when using --recommended-skills.");
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
    recommendedMode,
    recommendedSkillSelection,
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
  summary.desktop = { mode: desktopMode, status: "installed", launcherPath: launcher.launcherPath, command: launcher.launcherPath, shadowRepair: launcher.shadowRepair };
} else {
  await run("npm", ["run", "package"], { cwd: repoRoot, label: "Package ArcForge Desktop" });
  const launcher = await installDesktopLauncher(summary.cli.shimDir);
  summary.desktop = { mode: desktopMode, status: "packaged", outputDir: path.join(repoRoot, "release"), launcherPath: launcher.launcherPath, command: launcher.launcherPath, shadowRepair: launcher.shadowRepair };
}

printSummary(summary);
const verification = await verifyInstall({ cli: summary.cli, desktop: summary.desktop, desktopRequired: desktopMode !== "skip" && desktopMode !== "build" });
printVerifySummary(verification);
if (!verification.ok) process.exit(1);

if (recommendedMode === "prompt") {
  printRecommendedModePrompt({ agents, scriptPath: installScriptDisplayPath() });
} else if (recommendedMode === "governed") {
  printRecommendedGovernancePrompt({
    agents,
    scriptPath: installScriptDisplayPath(),
    selectedNames: recommendedSkillSelection.names,
    cliShimPath: summary.cli.shimPath
  });
} else if (recommendedSkillSelection.mode === "prompt") {
  printRecommendedQuickSkillPrompt({ agents, scriptPath: installScriptDisplayPath() });
} else if (recommendedSkillSelection.names.length > 0) {
  const recommendedSummary = await installRecommendedSkillProjects({
    agents,
    cliShimPath: summary.cli.shimPath,
    selectedNames: recommendedSkillSelection.names
  });
  printRecommendedSkillSummary(recommendedSummary);
} else if (recommendedSkillSelection.mode === "skip") {
  printRecommendedSkillSummary([]);
}

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

function hasHelpFlag(rawArgs) {
  return rawArgs.includes("--help") || rawArgs.includes("-h");
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

function parseRecommendedSkillSelection(value) {
  const raw = String(value ?? "prompt").trim().toLowerCase();
  if (!raw || raw === "prompt") return { mode: "prompt", names: [] };
  if (["skip", "none", "no"].includes(raw)) return { mode: "skip", names: [] };

  const allowed = new Set(recommendedSkillProjects.map((project) => project.name));
  const names = raw === "all"
    ? recommendedSkillProjects.map((project) => project.name)
    : raw.split(",").map((item) => item.trim()).filter(Boolean);
  const invalid = names.filter((name) => !allowed.has(name));
  if (invalid.length > 0) {
    fail(`Unsupported --recommended-skills value: ${invalid.join(", ")}. Use prompt, skip, all, arckit, arckit-code, or arckit,arckit-code.`);
  }
  return { mode: "install", names: [...new Set(names)] };
}

function parseRecommendedMode(value) {
  const mode = String(value ?? "prompt").trim().toLowerCase();
  if (["prompt", "quick", "governed"].includes(mode)) return mode;
  fail(`Unsupported --recommended-mode value: ${mode}. Use prompt, quick, or governed.`);
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

function userSkillRoot(agent) {
  return path.dirname(userSkillTarget(agent, "arcforge"));
}

async function installCliShim(options) {
  const shimDir = await chooseShimDir();
  await mkdir(shimDir, { recursive: true });
  const shimPath = path.join(shimDir, process.platform === "win32" ? "arcforge.cmd" : "arcforge");
  const cliEntry = path.join(repoRoot, "dist", "cli", "index.js");
  await assertExists(cliEntry, "CLI build missing after npm run build:cli.");
  const shimContent = cliShimContent(cliEntry);

  await writeExecutableShim(shimPath, shimContent);
  const shadowRepair = await repairPathCommandShadows({
    commandName: process.platform === "win32" ? "arcforge.cmd" : "arcforge",
    desiredPath: shimPath,
    shimContent
  });

  const pathContainsShim = pathInPath(shimDir);
  const profilePath = options.updatePath && !pathContainsShim ? await updatePersistentPath(shimDir) : undefined;
  return {
    shimPath,
    shimDir,
    pathContainsShim: pathContainsShim || Boolean(profilePath),
    profilePath,
    shadowRepair
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
  const shimContent = desktopShimContent(electronEntry);
  await writeExecutableShim(launcherPath, shimContent);
  const shadowRepair = await repairPathCommandShadows({
    commandName: process.platform === "win32" ? "arcforge-desktop.cmd" : "arcforge-desktop",
    desiredPath: launcherPath,
    shimContent
  });

  return { launcherPath, shadowRepair };
}

function desktopShimPath(shimDir) {
  return path.join(shimDir, process.platform === "win32" ? "arcforge-desktop.cmd" : "arcforge-desktop");
}

async function verifyInstall(options) {
  currentStage = "Verify ArcForge install";
  const checks = [];
  const cliEntry = path.join(repoRoot, "dist", "cli", "index.js");
  await addPathCheck(checks, "CLI shim exists", options.cli.shimPath);
  if (process.platform !== "win32") await addExecutableCheck(checks, "CLI shim executable", options.cli.shimPath);
  checks.push({ label: "CLI command directory on PATH", path: options.cli.shimDir, ok: pathInPath(options.cli.shimDir), optional: true });
  await addPathCheck(checks, "CLI entry exists", cliEntry);
  await addTransientShadowCheck(checks, process.platform === "win32" ? "arcforge.cmd" : "arcforge");
  await addResolvedCommandCheck(checks, {
    label: "first non-transient arcforge command resolves to this install",
    commandName: process.platform === "win32" ? "arcforge.cmd" : "arcforge",
    expectedSnippet: cliEntry
  });
  await addResolvedCommandRunCheck(checks, {
    label: "first non-transient arcforge command runs doctor",
    commandName: process.platform === "win32" ? "arcforge.cmd" : "arcforge",
    commandArgs: ["doctor"]
  });

  if (options.desktopRequired) {
    const electronEntry = path.join(repoRoot, "node_modules", "electron", "cli.js");
    await addPathCheck(checks, "Desktop launcher exists", options.desktop.launcherPath);
    if (process.platform !== "win32") await addExecutableCheck(checks, "Desktop launcher executable", options.desktop.launcherPath);
    checks.push({ label: "Desktop command directory on PATH", path: options.cli.shimDir, ok: pathInPath(options.cli.shimDir), optional: true });
    await addTransientShadowCheck(checks, process.platform === "win32" ? "arcforge-desktop.cmd" : "arcforge-desktop");
    await addResolvedCommandCheck(checks, {
      label: "first non-transient arcforge-desktop command resolves to this install",
      commandName: process.platform === "win32" ? "arcforge-desktop.cmd" : "arcforge-desktop",
      expectedSnippet: electronEntry
    });
    await addPathCheck(checks, "Electron launcher exists", electronEntry);
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

async function addResolvedCommandCheck(checks, options) {
  const resolved = await firstDurableCommandPath(options.commandName);
  if (!resolved) {
    checks.push({ label: options.label, path: options.commandName, ok: false });
    return;
  }
  const content = await readTextIfFile(resolved);
  checks.push({
    label: options.label,
    path: resolved,
    ok: content.includes(options.expectedSnippet)
  });
}

async function addTransientShadowCheck(checks, commandName) {
  const resolved = await firstCommandPath(commandName);
  if (!resolved || !isTransientAgentShimDir(path.dirname(resolved))) return;
  checks.push({
    label: `${commandName} is shadowed by transient agent PATH in this shell`,
    path: resolved,
    ok: false,
    optional: true
  });
}

async function addResolvedCommandRunCheck(checks, options) {
  const resolved = await firstDurableCommandPath(options.commandName);
  if (!resolved) {
    checks.push({ label: options.label, path: options.commandName, ok: false });
    return;
  }
  checks.push({
    label: options.label,
    path: resolved,
    ok: await commandExitsSuccessfully(resolved, options.commandArgs)
  });
}

function cliShimContent(cliEntry) {
  if (process.platform === "win32") return `@echo off\r\nnode "${cliEntry}" %*\r\n`;
  return `#!/bin/sh\nexec node "${cliEntry}" "$@"\n`;
}

function desktopShimContent(electronEntry) {
  if (process.platform === "win32") return `@echo off\r\ncd /d "${repoRoot}"\r\nnode "${electronEntry}" . %*\r\n`;
  return `#!/bin/sh\ncd "${repoRoot}"\nexec node "${electronEntry}" . "$@"\n`;
}

async function writeExecutableShim(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  if (process.platform !== "win32") await chmod(filePath, 0o755);
}

async function repairPathCommandShadows(options) {
  const repaired = [];
  const ignoredTransient = [];
  const unresolved = [];
  const candidates = commandCandidates(options.commandName);
  for (const candidate of candidates) {
    if (samePath(candidate, options.desiredPath)) break;
    if (!(await pathExists(candidate))) continue;
    const dirPath = path.dirname(candidate);
    if (isTransientAgentShimDir(dirPath)) {
      ignoredTransient.push(candidate);
      continue;
    }
    if (!isInsideHome(candidate)) {
      unresolved.push({ path: candidate, reason: "outside user home" });
      continue;
    }
    if (!(await isWritableFileOrDirectory(candidate))) {
      unresolved.push({ path: candidate, reason: "not writable" });
      continue;
    }
    await writeExecutableShim(candidate, options.shimContent);
    repaired.push(candidate);
  }
  if (unresolved.length > 0) {
    fail(`Cannot repair PATH shadowing command(s): ${unresolved.map((item) => `${item.path} (${item.reason})`).join(", ")}`);
  }
  return { repaired, ignoredTransient };
}

async function firstDurableCommandPath(commandName) {
  for (const candidate of commandCandidates(commandName)) {
    if (!(await pathExists(candidate))) continue;
    if (isTransientAgentShimDir(path.dirname(candidate))) continue;
    return candidate;
  }
  return undefined;
}

async function firstCommandPath(commandName) {
  for (const candidate of commandCandidates(commandName)) {
    if (await pathExists(candidate)) return candidate;
  }
  return undefined;
}

function commandCandidates(commandName) {
  return (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter(Boolean)
    .map((entry) => path.join(path.resolve(entry), commandName));
}

function samePath(left, right) {
  return normalizePath(left) === normalizePath(right);
}

function isInsideHome(filePath) {
  const relative = path.relative(installHome, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function isWritableFileOrDirectory(filePath) {
  if (await pathExists(filePath)) {
    try {
      await access(filePath, fsConstants.W_OK);
      return true;
    } catch {
      return false;
    }
  }
  return isWritableDirectory(path.dirname(filePath));
}

async function readTextIfFile(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

async function commandExitsSuccessfully(command, commandArgs) {
  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      cwd: repoRoot,
      env: process.env,
      stdio: "ignore",
      shell: process.platform === "win32"
    });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
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

async function installRecommendedSkillProjects(options) {
  const selectedProjects = recommendedSkillProjects.filter((project) => options.selectedNames.includes(project.name));
  const installed = [];
  for (const agent of options.agents) {
    const targetDir = userSkillRoot(agent);
    for (const project of selectedProjects) {
      await run(options.cliShimPath, [
        "drift",
        "--root",
        repoRoot,
        "--from",
        project.url,
        "--profile",
        "default",
        "--target",
        targetDir
      ], {
        cwd: repoRoot,
        label: `Preview ${project.name} install for ${agent}`
      });
      await run(options.cliShimPath, [
        "apply",
        "--root",
        repoRoot,
        "--from",
        project.url,
        "--profile",
        "default",
        "--target",
        targetDir,
        "--confirm"
      ], {
        cwd: repoRoot,
        label: `Install ${project.name} for ${agent}`
      });
      await run(options.cliShimPath, [
        "drift",
        "--root",
        repoRoot,
        "--from",
        project.url,
        "--profile",
        "default",
        "--target",
        targetDir
      ], {
        cwd: repoRoot,
        label: `Verify ${project.name} install for ${agent}`
      });
      installed.push({ agent, project: project.name, url: project.url, targetDir });
    }
  }
  return installed;
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
  printShadowRepairSummary("CLI command shadow repaired", value.cli.shadowRepair);
  console.log(`Desktop: ${value.desktop.status} (${value.desktop.mode})`);
  if (value.desktop.command) console.log(`Desktop command: ${value.desktop.command}`);
  if (value.desktop.launcherPath) console.log(`Desktop launcher: ${value.desktop.launcherPath}`);
  printShadowRepairSummary("Desktop command shadow repaired", value.desktop.shadowRepair);
  if (value.desktop.outputDir) console.log(`Desktop package output: ${value.desktop.outputDir}`);
  if (!value.cli.pathContainsShim) {
    console.log(`Run CLI directly now: ${value.cli.shimPath} doctor`);
    console.log(`Add this directory to PATH if needed: ${value.cli.shimDir}`);
  }
}

function printShadowRepairSummary(label, value) {
  if (!value) return;
  for (const item of value.repaired) {
    console.log(`${label}: ${item}`);
  }
  for (const item of value.ignoredTransient) {
    console.log(`Ignored transient agent PATH shadow: ${item}`);
    console.log("  Current agent shell may still resolve this first; verification uses the first non-transient command.");
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
  console.log(`Recommended mode: ${value.recommendedMode}`);
  console.log(`Recommended skills: ${formatRecommendedSkillSelection(value.recommendedSkillSelection)}`);
  if (value.npmCacheDir) console.log(`NPM cache: ${value.npmCacheDir}`);
  console.log(`Verify only: ${verifyOnly ? "yes" : "no"}`);
  console.log(`Skip npm install: ${value.skipNpmInstall ? "yes" : "no"}`);
  console.log(`Update PATH: ${value.updatePath ? "yes" : "no"}`);
}

function printHelp() {
  console.log(`ArcForge repository installer

Usage:
  node skills/arcforge-install/scripts/install-from-repo.mjs [options]

Options:
  --agent <list>                 Agent targets: codex, claude, cursor. Default: codex.
  --desktop <mode>               Desktop mode: install, build, package, skip. Default: install.
  --recommended-mode <mode>      prompt, quick, or governed. Default: prompt.
  --recommended-skills <value>   prompt, skip, all, arckit, arckit-code, or arckit,arckit-code. Default: prompt.
  --update-path                  Add the selected user bin directory to the shell profile.
  --skip-npm-install             Skip npm install when dependencies are already present.
  --dry-run                      Print target paths without writing or building.
  --verify                       Check the existing install without writing.
  --home <path>                  Use an alternate HOME for temporary validation.
  --shim-dir <path>              Write CLI and Desktop shims to this directory.
  --npm-cache <path>             Use an alternate npm cache directory.
  --help                         Print this help without installing.

Default install:
  node skills/arcforge-install/scripts/install-from-repo.mjs --agent codex --desktop install

Optional recommended skills after ArcForge is installed:
  node skills/arcforge-install/scripts/install-from-repo.mjs --agent codex --desktop skip --skip-npm-install --recommended-mode quick --recommended-skills all
  node skills/arcforge-install/scripts/install-from-repo.mjs --agent codex --desktop skip --skip-npm-install --recommended-mode quick --recommended-skills arckit
  node skills/arcforge-install/scripts/install-from-repo.mjs --agent codex --desktop skip --skip-npm-install --recommended-mode quick --recommended-skills arckit-code
  node skills/arcforge-install/scripts/install-from-repo.mjs --agent codex --desktop skip --skip-npm-install --recommended-mode governed
  node skills/arcforge-install/scripts/install-from-repo.mjs --agent codex --desktop skip --skip-npm-install --recommended-mode quick --recommended-skills skip

Recommended Skill projects:
  arckit: ${recommendedSkillProjects[0].url}
    ${recommendedSkillProjects[0].description}
  arckit-code: ${recommendedSkillProjects[1].url}
    ${recommendedSkillProjects[1].description}
`);
}

function printRecommendedModePrompt(options) {
  console.log("\nAGENT ACTION REQUIRED: recommended install mode choice pending");
  console.log("Recommended skill stage: pending_install_mode_choice");
  console.log("ArcForge core install is complete. Teach the user the difference between quick install and governed install before writing recommended skills.");
  console.log("Quick install mode: directly uses GitHub as the source, creates only temporary source checkouts, writes the selected projects to the agent skill target, and does not establish a persistent maintenance source.");
  console.log("Governed install mode: pauses before writing recommended skills, then uses the arcforge workflow to confirm source/upstream, maintenance source, application target, profile/skills, whether to save an applied source record, and the record root.");
  console.log("Last agent-facing action: ask the user to choose quick install, governed install, or skip recommended Skill projects.");
  console.log("Do not mark the install turn complete until the user chooses one of these modes or explicitly stops.");
  console.log("Ask this question in the final response:");
  console.log("  ArcForge 核心安装已完成。推荐 Skill 项目可以用两种模式继续：");
  console.log("  1. 快速安装：直接从 GitHub drift/apply 到当前 agent 的用户级 skills，不建立持久维护源。");
  console.log("  2. 严格治理：先确认来源、维护源、应用目标、profile/skills 和关系记录，再由 arcforge workflow 执行。");
  console.log("  3. 暂不安装推荐 Skill 项目。");
  console.log("  你希望使用哪种模式？");
  console.log("Commands after the user chooses:");
  console.log(`- Quick mode: node ${options.scriptPath} --agent ${options.agents.join(",")} --desktop skip --skip-npm-install --recommended-mode quick`);
  console.log(`- Governed mode: node ${options.scriptPath} --agent ${options.agents.join(",")} --desktop skip --skip-npm-install --recommended-mode governed`);
  console.log(`- Skip: node ${options.scriptPath} --agent ${options.agents.join(",")} --desktop skip --skip-npm-install --recommended-mode quick --recommended-skills skip`);
}

function printRecommendedQuickSkillPrompt(options) {
  console.log("\nAGENT ACTION REQUIRED: recommended quick skill choice pending");
  console.log("Recommended skill stage: pending_quick_skill_choice");
  console.log("ArcForge core install is complete. Do not finish with only a summary that arckit or arckit-code were not installed.");
  console.log("Quick install mode selected: the recommended projects will be applied directly from GitHub to the agent skill target without creating a persistent maintenance source or saved applied source record.");
  console.log("Last agent-facing action: ask the user to install arckit, install arckit-code, install both, or skip.");
  console.log("Do not mark the install turn complete until the user chooses one of these four options or explicitly stops.");
  console.log("Ask the user which recommended Feitianchengzi Skill project to install next:");
  for (const project of recommendedSkillProjects) {
    console.log(`- ${project.name}: ${project.description}`);
    console.log(`  Source: ${project.url}`);
  }
  console.log("Ask this question in the final response:");
  console.log("  ArcForge 核心安装已完成。你希望我现在安装哪一项？");
  console.log("  1. 安装 arckit 和 arckit-code");
  console.log("  2. 只安装 arckit");
  console.log("  3. 只安装 arckit-code");
  console.log("  4. 暂不安装");
  console.log("Commands after the user chooses:");
  console.log(`- Both: node ${options.scriptPath} --agent ${options.agents.join(",")} --desktop skip --skip-npm-install --recommended-mode quick --recommended-skills all`);
  console.log(`- arckit only: node ${options.scriptPath} --agent ${options.agents.join(",")} --desktop skip --skip-npm-install --recommended-mode quick --recommended-skills arckit`);
  console.log(`- arckit-code only: node ${options.scriptPath} --agent ${options.agents.join(",")} --desktop skip --skip-npm-install --recommended-mode quick --recommended-skills arckit-code`);
  console.log(`- Skip: node ${options.scriptPath} --agent ${options.agents.join(",")} --desktop skip --skip-npm-install --recommended-mode quick --recommended-skills skip`);
}

function printRecommendedGovernancePrompt(options) {
  const selectedProjects = options.selectedNames.length > 0
    ? recommendedSkillProjects.filter((project) => options.selectedNames.includes(project.name))
    : recommendedSkillProjects;
  console.log("\nAGENT ACTION REQUIRED: recommended governed install pending");
  console.log("Recommended skill stage: pending_governance_endpoints");
  console.log("Governed install mode selected. Do not write recommended skills from this script.");
  console.log("Hand off to the arcforge workflow and confirm the governance endpoints before any apply/import/save operation.");
  console.log("Suggested endpoint model to explain to the user:");
  console.log(`- Source/upstream: ${selectedProjects.map((project) => `${project.name}=${project.url}`).join(", ")}`);
  console.log("- Temporary source checkout: created only while drift/import reads GitHub; it is not a maintenance source.");
  console.log("- Maintenance source: pending user choice. Use none for direct governed apply, or choose/import into a local formal Skill project for long-term maintenance.");
  console.log(`- Application target: ${options.agents.map((agent) => `${agent}=${userSkillRoot(agent)}`).join(", ")}`);
  console.log("- Sharing target: none in this install stage.");
  console.log("- Profile/skills: pending user choice; default profile is default.");
  console.log("- Relationship record: pending user choice. If saved, confirm the record root separately; it is not the application target and may not be the current cwd.");
  console.log("Ask this question in the final response:");
  console.log("  严格治理模式不会立即写入推荐 skills。请确认：");
  console.log("  1. 要处理哪些项目：arckit、arckit-code，还是两个都处理？");
  console.log("  2. 是否需要本地持久维护源？如果需要，维护源 root 是哪个目录？");
  console.log("  3. 应用目标是否是当前 agent 的用户级 skills 目录？");
  console.log("  4. 是否保存 applied source record？如果保存，关系记录归属 root 是哪个目录？");
  console.log("After the user confirms, use the arcforge workflow. Direct governed apply normally uses:");
  for (const project of selectedProjects) {
    for (const agent of options.agents) {
      const targetDir = userSkillRoot(agent);
      console.log(`- Preview: ${options.cliShimPath} drift --root <record-or-maintenance-root> --from ${project.url} --profile default --target ${targetDir}`);
      console.log(`- Apply after confirmation: ${options.cliShimPath} apply --root <record-or-maintenance-root> --from ${project.url} --profile default --target ${targetDir} --save --confirm`);
    }
  }
  console.log("If the user wants a persistent local maintenance source first, use import plan/run before apply.");
}

function printRecommendedSkillSummary(items) {
  console.log("\nRecommended skill install summary");
  if (items.length === 0) {
    console.log("No recommended skills installed.");
    return;
  }
  for (const item of items) {
    console.log(`Skill project (${item.agent}/${item.project}): ${item.url} -> ${item.targetDir}`);
  }
}

function formatRecommendedSkillSelection(selection) {
  if (selection.mode === "prompt") return "prompt";
  if (selection.names.length === 0) return "skip";
  return selection.names.join(",");
}

function installScriptDisplayPath() {
  return path.relative(repoRoot, fileURLToPath(import.meta.url)).replace(/\\/g, "/");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function handleFatalError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const recommendedStage = isRecommendedInstallStage(currentStage);
  console.error(recommendedStage ? "\nRecommended skill install failed" : "\nArcForge install failed");
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
  } else if (recommendedStage) {
    console.error("- Confirm GitHub access, network, proxy, and target skill directory permissions, then rerun the recommended install command.");
    console.error("- Rerun with --recommended-skills skip if you only need ArcForge itself.");
  } else {
    console.error("- Rerun with --dry-run to inspect target paths, then rerun the install command after fixing the reported issue.");
  }
  process.exit(1);
}

function isRecommendedInstallStage(value) {
  return value.includes("Install arckit")
    || value.includes("Install arckit-code")
    || value.includes("Preview arckit")
    || value.includes("Preview arckit-code")
    || value.includes("Verify arckit")
    || value.includes("Verify arckit-code");
}
