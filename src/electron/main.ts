import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { scanWorkspace, initWorkspace } from "../core/workspace.js";
import { saveConfig } from "../core/config.js";
import { createPublishPlan } from "../core/publish.js";
import { applyProfile, driftReport } from "../core/profiles.js";
import type { DriftReport, EnvironmentStatus, ShareResult, ShareTargetMode, SharedAssetSummary, SkillOpsConfig, SkillSummary } from "../shared/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);

interface ParsedRemoteSource {
  cloneUrl: string;
  ref: string;
  subdir: string;
}

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 980,
    minHeight: 640,
    title: "SkillOps",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) {
    await win.loadURL(devServer);
  } else {
    await win.loadFile(path.join(__dirname, "../../dist-ui/index.html"));
  }
}

ipcMain.handle("workspace:choose", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.show();
  win?.focus();
  const result = win
    ? await dialog.showOpenDialog(win, { properties: ["openDirectory", "createDirectory"] })
    : await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
  return result.canceled ? undefined : result.filePaths[0];
});

ipcMain.handle("workspace:scan", (_event, root: string) => scanWorkspace(root));
ipcMain.handle("workspace:init", (_event, root: string) => initWorkspace(root));
ipcMain.handle("workspace:saveConfig", (_event, root: string, config: SkillOpsConfig) => saveWorkspaceConfig(root, config));
ipcMain.handle("system:defaultTargets", () => defaultTargets());
ipcMain.handle("system:environment", () => getEnvironmentStatus());
ipcMain.handle("source:download", (_event, remoteUrl: string) => downloadSource(remoteUrl));
ipcMain.handle("publish:plan", (_event, root: string, visibility: "private" | "public") => createPublishPlanFromRoot(root, visibility));
ipcMain.handle("publish:share", (_event, root: string, remoteUrl: string, visibility: "private" | "public", message: string, targetMode: ShareTargetMode, projectName: string) => shareProject(root, remoteUrl, visibility, message, targetMode, projectName));
ipcMain.handle("profile:apply", (_event, root: string, profile: string, targetDir: string) => applyProfileFromRoot(root, profile, targetDir));
ipcMain.handle("profile:drift", (_event, root: string, profile: string, targetDir: string) => driftReportFromRoot(root, profile, targetDir));
ipcMain.handle("profile:openDriftDiff", (event, report: DriftReport) => openDriftDiffWindow(report, BrowserWindow.fromWebContents(event.sender)));

async function createPublishPlanFromRoot(root: string, visibility: "private" | "public") {
  const snapshot = await scanWorkspace(root);
  return createPublishPlan(root, snapshot.config, snapshot.skills, visibility);
}

async function shareProject(root: string, remoteUrl: string, visibility: "private" | "public", message: string, targetMode: ShareTargetMode, projectName: string): Promise<ShareResult> {
  const target = parseRemoteSource(remoteUrl);
  const snapshot = await scanWorkspace(root);
  const messages: string[] = [];
  const checkout = await prepareShareCheckout(target, messages);
  const checkoutRoot = checkout.root;
  const branch = checkout.branch;
  const targetSubdir = shareTargetSubdir(target.subdir, targetMode, projectName || path.basename(root), snapshot.config.sourceDir);
  const targetRoot = targetSubdir ? path.join(checkoutRoot, targetSubdir) : checkoutRoot;
  const installRef = remoteProjectRef(target.cloneUrl, branch, targetSubdir);
  const localConfig = normalizeConfig({
    ...snapshot.config,
    teamRepo: remoteUrl.trim(),
    shareTargetMode: targetMode,
    shareProjectName: projectName.trim() || undefined
  });
  const publishedConfig = normalizeConfig({ ...localConfig, teamRepo: installRef });

  await saveConfig(root, localConfig);
  await syncProjectToShareTarget(root, targetRoot, publishedConfig, snapshot.skills, snapshot.assets, visibility);
  messages.push(`Shared project files to ${targetSubdir || "."}.`);

  await runGit(checkoutRoot, targetSubdir ? ["add", targetSubdir] : ["add", publishedConfig.sourceDir, "skillops.config.json", "README.md"], messages);
  const status = await runGit(checkoutRoot, ["status", "--porcelain"], messages);
  const committed = status.trim().length > 0;
  if (committed) {
    await runGit(checkoutRoot, ["commit", "-m", message.trim() || "Share SkillOps project"], messages);
  } else {
    messages.push("No file changes to commit.");
  }
  await runGit(checkoutRoot, ["push", "-u", "origin", branch], messages);
  return { remoteUrl: target.cloneUrl, branch, targetPath: targetSubdir || ".", committed, pushed: true, messages };
}

async function applyProfileFromRoot(root: string, profile: string, targetDir: string) {
  const snapshot = await scanWorkspace(root);
  return applyProfile(root, snapshot.config, snapshot.skills, snapshot.assets, profile, targetDir);
}

async function driftReportFromRoot(root: string, profile: string, targetDir: string) {
  const snapshot = await scanWorkspace(root);
  return driftReport(root, snapshot.config, snapshot.skills, snapshot.assets, profile, targetDir);
}

async function openDriftDiffWindow(report: DriftReport, parent?: BrowserWindow | null): Promise<void> {
  const win = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 840,
    minHeight: 560,
    title: "SkillOps Drift Diff",
    parent: parent ?? undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(renderDriftDiffHtml(report))}`);
}

async function saveWorkspaceConfig(root: string, config: SkillOpsConfig) {
  await saveConfig(root, normalizeConfig(config));
  return scanWorkspace(root);
}

function normalizeConfig(config: SkillOpsConfig): SkillOpsConfig {
  return {
    version: 1,
    sourceDir: config.sourceDir || "skills",
    teamRepo: config.teamRepo?.trim() || undefined,
    shareTargetMode: config.shareTargetMode,
    shareProjectName: config.shareProjectName?.trim() || undefined,
    profiles: config.profiles.map((profile) => ({
      name: profile.name.trim(),
      description: profile.description?.trim() || undefined,
      skills: profile.skills,
      targets: profile.targets
    }))
  };
}

async function ensureGitRepository(root: string, messages: string[]): Promise<void> {
  try {
    await runGit(root, ["rev-parse", "--is-inside-work-tree"], messages);
  } catch {
    await runGit(root, ["init", "-b", "main"], messages);
  }
}

async function prepareShareCheckout(target: ParsedRemoteSource, messages: string[]): Promise<{ root: string; branch: string }> {
  const checkoutsRoot = path.join(app.getPath("userData"), "share-worktrees");
  const checkoutRoot = path.join(checkoutsRoot, `${repoName(target.cloneUrl)}-${crypto.createHash("sha256").update(target.cloneUrl).digest("hex").slice(0, 8)}`);
  await fs.mkdir(checkoutsRoot, { recursive: true });
  if (await pathExists(checkoutRoot)) {
    await runGit(checkoutRoot, ["fetch", "--prune", "origin"], messages);
  } else {
    await execFileAsync("git", ["clone", target.cloneUrl, checkoutRoot]);
    messages.push(`git clone ${target.cloneUrl}`);
  }

  const branch = target.ref || await remoteDefaultBranch(checkoutRoot, messages) || "main";
  if (await remoteBranchExists(checkoutRoot, branch, messages)) {
    await runGit(checkoutRoot, ["checkout", "-B", branch, `origin/${branch}`], messages);
    await runGit(checkoutRoot, ["pull", "--ff-only", "origin", branch], messages);
  } else {
    await runGit(checkoutRoot, ["checkout", "-B", branch], messages);
    messages.push(`Remote branch ${branch} does not exist yet; it will be created on push.`);
  }
  return { root: checkoutRoot, branch };
}

async function remoteDefaultBranch(root: string, messages: string[]): Promise<string | undefined> {
  try {
    const value = (await runGit(root, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], messages)).trim();
    return value.replace(/^origin\//, "") || undefined;
  } catch {
    const branches = await remoteBranches(root, messages);
    return branches.includes("main") ? "main" : branches.includes("master") ? "master" : branches[0];
  }
}

async function remoteBranchExists(root: string, branch: string, messages: string[]): Promise<boolean> {
  return (await remoteBranches(root, messages)).includes(branch);
}

async function remoteBranches(root: string, messages: string[]): Promise<string[]> {
  try {
    const output = await runGit(root, ["branch", "-r", "--format=%(refname:short)"], messages);
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("origin/") && line !== "origin/HEAD")
      .map((line) => line.replace(/^origin\//, ""));
  } catch {
    return [];
  }
}

async function syncProjectToShareTarget(root: string, targetRoot: string, config: SkillOpsConfig, skills: SkillSummary[], assets: SharedAssetSummary[], visibility: "private" | "public"): Promise<void> {
  await fs.mkdir(targetRoot, { recursive: true });
  const sourceRoot = path.resolve(root, config.sourceDir);
  const targetSourceRoot = path.join(targetRoot, config.sourceDir);
  await fs.mkdir(targetSourceRoot, { recursive: true });
  for (const item of [...skills, ...assets]) {
    const relativePath = path.relative(sourceRoot, item.path);
    if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new Error(`Refusing to share item outside source directory: ${item.path}`);
    }
    await replaceSharedEntry(item.path, path.join(targetSourceRoot, relativePath), targetSourceRoot);
  }
  await fs.writeFile(path.join(targetRoot, "skillops.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
  const sourceReadme = path.join(root, "README.md");
  const targetReadme = path.join(targetRoot, "README.md");
  if (await pathExists(sourceReadme)) {
    await fs.copyFile(sourceReadme, targetReadme);
  } else {
    await fs.writeFile(targetReadme, `# ${path.basename(root)}\n`, "utf8");
  }
  await writeSharingReadme(targetRoot, config, visibility);
}

async function replaceSharedEntry(source: string, target: string, targetRoot: string): Promise<void> {
  const resolvedTarget = path.resolve(target);
  const resolvedTargetRoot = path.resolve(targetRoot);
  if (path.resolve(source) === resolvedTarget) {
    throw new Error(`Refusing to replace source directory: ${source}`);
  }
  if (resolvedTarget !== resolvedTargetRoot && !resolvedTarget.startsWith(`${resolvedTargetRoot}${path.sep}`)) {
    throw new Error(`Refusing to write outside source directory: ${target}`);
  }

  await fs.rm(resolvedTarget, { recursive: true, force: true });
  await copyDirectory(source, resolvedTarget);
}

async function copyDirectory(source: string, target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

function shareTargetSubdir(baseSubdir: string, targetMode: ShareTargetMode, projectName: string, sourceDir = "skills"): string {
  const base = cleanRelativePath(baseSubdir);
  if (targetMode === "direct") return projectRootSubdir(base, sourceDir);
  const name = cleanRelativePath(projectName);
  if (!name) throw new Error("Project name is required when sharing under a project folder.");
  return [base, name].filter(Boolean).join("/");
}

function projectRootSubdir(baseSubdir: string, sourceDir: string): string {
  const sourceParts = cleanRelativePath(sourceDir).split("/").filter(Boolean);
  const baseParts = cleanRelativePath(baseSubdir).split("/").filter(Boolean);
  if (sourceParts.length === 0 || baseParts.length < sourceParts.length) return baseSubdir;
  const tail = baseParts.slice(-sourceParts.length);
  if (tail.every((part, index) => part === sourceParts[index])) {
    return baseParts.slice(0, -sourceParts.length).join("/");
  }
  return baseSubdir;
}

function cleanRelativePath(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

async function ensureOrigin(root: string, remoteUrl: string, messages: string[]): Promise<void> {
  try {
    await runGit(root, ["remote", "get-url", "origin"], messages);
    await runGit(root, ["remote", "set-url", "origin", remoteUrl], messages);
  } catch {
    await runGit(root, ["remote", "add", "origin", remoteUrl], messages);
  }
}

async function currentBranch(root: string, messages: string[]): Promise<string> {
  try {
    return (await runGit(root, ["rev-parse", "--abbrev-ref", "HEAD"], messages)).trim();
  } catch {
    return "main";
  }
}

async function runGit(root: string, args: string[], messages: string[]): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, { cwd: root });
    const output = `${stdout}${stderr}`.trim();
    messages.push(`git ${args.join(" ")}${output ? `\n${output}` : ""}`);
    return stdout;
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const stdout = typeof (error as { stdout?: unknown }).stdout === "string" ? (error as { stdout: string }).stdout : "";
    const stderr = typeof (error as { stderr?: unknown }).stderr === "string" ? (error as { stderr: string }).stderr : "";
    throw new Error(`git ${args.join(" ")} failed.\n${details}\n${stdout}${stderr}`.trim());
  }
}

async function writeSharingReadme(root: string, config: SkillOpsConfig, visibility: "private" | "public"): Promise<void> {
  const readmePath = path.join(root, "README.md");
  const existing = await pathExists(readmePath) ? await fs.readFile(readmePath, "utf8") : `# ${path.basename(root)}\n`;
  const section = sharingSection(config, visibility);
  const start = "<!-- skillops:share:start -->";
  const end = "<!-- skillops:share:end -->";
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
  const next = pattern.test(existing)
    ? existing.replace(pattern, section)
    : `${existing.trimEnd()}\n\n${section}\n`;
  await fs.writeFile(readmePath, next, "utf8");
}

function sharingSection(config: SkillOpsConfig, visibility: "private" | "public"): string {
  const installRef = config.teamRepo || "github.com/<owner>/<repo>";
  const profiles = config.profiles.map((profile) => `- \`${profile.name || "unnamed"}\`: ${profile.skills.includes("*") ? "all skills" : profile.skills.join(", ") || "no skills selected"}`).join("\n");
  return `<!-- skillops:share:start -->
## SkillOps

Visibility: \`${visibility}\`

### Use in SkillOps Desktop

1. Open SkillOps.
2. Click **Add Skill project**.
3. Enter \`${installRef}\` as the GitHub source.
4. Choose a profile and add an application target.

### Profiles

${profiles || "- No profiles configured."}

### CLI

\`\`\`bash
skillshare install ${installRef} --track --all && skillshare sync
npx skills add ${installRef}
\`\`\`
<!-- skillops:share:end -->`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderDriftDiffHtml(report: DriftReport): string {
  const changedItems = report.items.filter((item) => item.status !== "same");
  const rows = report.items.map((item) => {
    const files = item.files ?? [];
    const fileRows = files.length === 0
      ? "<p class=\"muted\">No file-level differences.</p>"
      : `<table>
          <thead><tr><th>Status</th><th>File</th><th>Source SHA256</th><th>Target SHA256</th></tr></thead>
          <tbody>${files.map((file) => `<tr>
            <td><span class="pill ${escapeHtml(file.status)}">${escapeHtml(file.status)}</span></td>
            <td>${escapeHtml(file.path)}</td>
            <td><code>${escapeHtml(shortHash(file.sourceHash))}</code></td>
            <td><code>${escapeHtml(shortHash(file.targetHash))}</code></td>
          </tr>`).join("")}</tbody>
        </table>`;
    const summary = item.summary ?? { missing: 0, changed: 0, extra: 0 };
    return `<section class="item">
      <div class="item-header">
        <div>
          <h2>${escapeHtml(item.skill)} <span>${escapeHtml(item.kind ?? "skill")}</span></h2>
          <p>${escapeHtml(item.sourcePath)} -> ${escapeHtml(item.targetPath)}</p>
        </div>
        <span class="status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>
      </div>
      <div class="counts">
        <span>missing ${summary.missing}</span>
        <span>changed ${summary.changed}</span>
        <span>extra ${summary.extra}</span>
      </div>
      ${fileRows}
    </section>`;
  }).join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SkillOps Drift Diff</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #202124; background: #f6f7f9; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; }
    header { margin-bottom: 20px; }
    h1, h2, p { margin: 0; }
    h1 { font-size: 24px; }
    header p, .muted { margin-top: 6px; color: #667085; font-size: 13px; word-break: break-all; }
    .summary { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
    .summary span, .counts span { border: 1px solid #e5e7eb; border-radius: 999px; padding: 5px 10px; background: #fff; color: #344054; font-size: 12px; }
    .item { margin-top: 14px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; padding: 16px; }
    .item-header { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }
    h2 { font-size: 17px; }
    h2 span { color: #667085; font-size: 12px; font-weight: 500; }
    .status, .pill { display: inline-flex; border-radius: 999px; padding: 4px 8px; font-size: 12px; font-weight: 600; }
    .same { background: #e8f5ee; color: #11845b; }
    .missing, .changed, .extra { background: #fff4d6; color: #9a6700; }
    .counts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; table-layout: fixed; }
    th, td { border-top: 1px solid #eef0f3; padding: 9px 8px; text-align: left; vertical-align: top; font-size: 12px; word-break: break-all; }
    th { color: #667085; font-weight: 700; }
    th:first-child, td:first-child { width: 104px; }
    th:nth-child(3), th:nth-child(4), td:nth-child(3), td:nth-child(4) { width: 168px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #344054; }
  </style>
</head>
<body>
  <header>
    <h1>SkillOps Drift Diff</h1>
    <p>Profile: ${escapeHtml(report.profile)} · Target: ${escapeHtml(report.targetDir)}</p>
    <div class="summary">
      <span>Total ${report.items.length}</span>
      <span>Changed ${changedItems.length}</span>
      <span>Same ${report.items.length - changedItems.length}</span>
    </div>
  </header>
  ${rows || "<p class=\"muted\">No drift items.</p>"}
</body>
</html>`;
}

function shortHash(value?: string): string {
  return value ? value.slice(0, 12) : "";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char] ?? char);
}

function defaultTargets() {
  const home = os.homedir();
  return [
    { id: "codex", name: "Codex", path: path.join(home, ".codex", "skills") },
    { id: "claude", name: "Claude", path: path.join(home, ".claude", "skills") },
    { id: "cursor", name: "Cursor", path: path.join(home, ".cursor", "skills") }
  ];
}

async function getEnvironmentStatus(): Promise<EnvironmentStatus> {
  try {
    const { stdout } = await execFileAsync("git", ["--version"]);
    return {
      platform: process.platform,
      arch: process.arch,
      git: {
        available: true,
        version: stdout.trim()
      }
    };
  } catch (error) {
    return {
      platform: process.platform,
      arch: process.arch,
      git: {
        available: false,
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

async function downloadSource(remoteUrl: string): Promise<string> {
  const source = parseRemoteSource(remoteUrl);
  const sourcesRoot = path.join(app.getPath("userData"), "sources");
  const dirName = `${repoName(source.cloneUrl)}-${crypto.createHash("sha256").update(`${source.cloneUrl}#${source.ref}`).digest("hex").slice(0, 8)}`;
  const target = path.join(sourcesRoot, dirName);
  await fs.mkdir(sourcesRoot, { recursive: true });
  if (await pathExists(target)) {
    await execFileAsync("git", ["-C", target, "pull", "--ff-only"]);
  } else {
    await execFileAsync("git", ["clone", source.cloneUrl, target]);
  }
  if (source.ref) {
    await execFileAsync("git", ["-C", target, "checkout", source.ref]);
  }
  const projectRoot = source.subdir ? path.join(target, source.subdir) : target;
  if (!(await pathExists(projectRoot))) {
    throw new Error(`Subdirectory not found after clone: ${source.subdir}`);
  }
  return projectRoot;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizeRemoteUrl(remoteUrl: string): string {
  const trimmed = remoteUrl.trim();
  if (!trimmed) throw new Error("Remote URL is required.");
  if (/^https?:\/\//.test(trimmed) || /^git@/.test(trimmed) || /^ssh:\/\//.test(trimmed)) return trimmed;
  if (/^[\w.-]+\/[\w.-]+(?:\.git)?$/.test(trimmed)) return appendGit(`https://github.com/${trimmed}`);
  if (/^github\.com\//.test(trimmed)) return appendGit(`https://${trimmed}`);
  throw new Error("Use a GitHub path like owner/repo, github.com/owner/repo, or a full Git URL.");
}

function parseRemoteSource(remoteUrl: string): ParsedRemoteSource {
  const trimmed = remoteUrl.trim();
  if (!trimmed) throw new Error("Remote URL is required.");

  if (/^git@/.test(trimmed) || /^ssh:\/\//.test(trimmed)) {
    return { cloneUrl: trimmed, ref: "", subdir: "" };
  }

  const httpsUrl = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : trimmed.startsWith("github.com/")
      ? `https://${trimmed}`
      : /^[\w.-]+\/[\w.-]+(?:\/.*)?$/.test(trimmed)
        ? `https://github.com/${trimmed}`
        : "";

  if (!httpsUrl) return { cloneUrl: normalizeRemoteUrl(trimmed), ref: "", subdir: "" };

  const url = new URL(httpsUrl);
  if (url.hostname !== "github.com") {
    return { cloneUrl: normalizeRemoteUrl(httpsUrl), ref: "", subdir: "" };
  }

  const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (parts.length < 2) throw new Error("Use a GitHub path like owner/repo or github.com/owner/repo/tree/main/path.");
  const [owner, rawRepo, marker, maybeRef, ...subdirParts] = parts;
  const repo = rawRepo.replace(/\.git$/, "");
  const cloneUrl = `https://github.com/${owner}/${repo}.git`;
  if (marker === "tree" || marker === "blob") {
    if (!maybeRef) throw new Error("GitHub tree URL is missing a branch or tag.");
    return { cloneUrl, ref: decodeURIComponent(maybeRef), subdir: subdirParts.map(decodeURIComponent).join("/") };
  }
  if (parts.length > 2) {
    return { cloneUrl, ref: "", subdir: parts.slice(2).map(decodeURIComponent).join("/") };
  }
  return { cloneUrl, ref: "", subdir: "" };
}

function remoteRef(remoteUrl: string): string {
  return remoteUrl.replace(/^https?:\/\//, "").replace(/\.git$/, "");
}

function remoteProjectRef(cloneUrl: string, branch: string, subdir: string): string {
  const base = remoteRef(cloneUrl);
  return subdir ? `${base}/tree/${branch}/${subdir}` : base;
}

function appendGit(remoteUrl: string): string {
  return remoteUrl.endsWith(".git") ? remoteUrl : `${remoteUrl}.git`;
}

function repoName(remoteUrl: string): string {
  const withoutGit = remoteUrl.replace(/\.git$/, "");
  return withoutGit.split(/[/:]/).filter(Boolean).pop()?.replace(/[^\w.-]/g, "-") || "source";
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
