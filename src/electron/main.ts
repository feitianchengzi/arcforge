import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { runSkillOpsCommand, createPublishPlanCommand, applyProfileCommand, driftReportCommand, downloadSourceCommand, shareProjectCommand } from "../commands/index.js";
import { scanWorkspace, initWorkspace } from "../core/workspace.js";
import { saveConfig } from "../core/config.js";
import { getEnvironmentStatus } from "../core/environment.js";
import { installCliShim } from "../core/cli-install.js";
import type { DriftReport, ShareTargetMode, SkillOpsConfig } from "../shared/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliMarkerIndex = process.argv.indexOf("--cli");

if (cliMarkerIndex !== -1) {
  app.whenReady()
    .then(() => runElectronCli(process.argv.slice(cliMarkerIndex + 1)))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      app.exit(1);
    });
} else {
  app.whenReady().then(async () => {
    await installCliShim(cliShimOptions()).catch((error) => {
      console.warn(error instanceof Error ? error.message : String(error));
    });
    await createWindow();
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
}

async function runElectronCli(args: string[]): Promise<void> {
  try {
    const result = await runSkillOpsCommand(args, {
      cwd: process.cwd(),
      cacheDir: cacheRoot(),
      cliShim: cliShimOptions()
    });
    if (result.text) {
      console.log(result.text);
    } else {
      console.log(JSON.stringify(result.value, null, 2));
    }
    app.exit(result.exitCode);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    app.exit(1);
  }
}

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 980,
    minHeight: 640,
    title: "SkillOps",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 24, y: 22 },
    backgroundColor: "#F3F5F8",
    roundedCorners: true,
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
ipcMain.handle("system:environment", () => getElectronEnvironmentStatus());
ipcMain.handle("system:installCli", () => installCliShim({ ...cliShimOptions(), updateShellProfile: true }));
ipcMain.handle("source:download", (_event, remoteUrl: string) => downloadSourceCommand(remoteUrl, cacheRoot()));
ipcMain.handle("publish:plan", (_event, root: string, visibility: "private" | "public") => createPublishPlanCommand(root, visibility));
ipcMain.handle("publish:share", (_event, root: string, remoteUrl: string, visibility: "private" | "public", message: string, targetMode: ShareTargetMode, projectName: string, profileName: string) => shareProjectCommand({
  root,
  remoteUrl,
  visibility,
  message,
  targetMode,
  projectName,
  profileName,
  cacheDir: cacheRoot()
}));
ipcMain.handle("profile:apply", (_event, root: string, profile: string, targetDir: string) => applyProfileCommand(root, profile, targetDir));
ipcMain.handle("profile:drift", (_event, root: string, profile: string, targetDir: string) => driftReportCommand(root, profile, targetDir));
ipcMain.handle("profile:openDriftDiff", (event, report: DriftReport) => openDriftDiffWindow(report, BrowserWindow.fromWebContents(event.sender)));

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

function cacheRoot(): string {
  return path.join(app.getPath("userData"), "cache");
}

function cliShimOptions() {
  return {
    executablePath: process.execPath,
    appPath: app.getAppPath(),
    appIsPackaged: app.isPackaged
  };
}

async function getElectronEnvironmentStatus() {
  return getEnvironmentStatus(cliShimOptions());
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
