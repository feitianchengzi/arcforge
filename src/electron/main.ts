import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { runSkillOpsCommand, createPublishPlanCommand, applyProfileCommand, driftReportCommand, downloadSourceCommand, shareProjectCommand } from "../commands/index.js";
import { scanWorkspace, initWorkspace } from "../core/workspace.js";
import { saveConfig } from "../core/config.js";
import { getEnvironmentStatus } from "../core/environment.js";
import { installCliShim } from "../core/cli-install.js";
import { defaultSkillFile, listSkillFiles, listWorkspaceFiles, readSkillFile, writeSkillFile } from "../core/skill-files.js";
import type { AppState, DriftReport, ProjectUiState, RecentWorkspace, ShareTargetMode, SkillEditorWindowContext, SkillOpsConfig, TargetRecord } from "../shared/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliMarkerIndex = process.argv.indexOf("--cli");
let appStateWriteQueue: Promise<unknown> = Promise.resolve();

app.setName("SkillOps");

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
    ? await dialog.showOpenDialog(win, { properties: ["openDirectory", "createDirectory", "showHiddenFiles"] })
    : await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory", "showHiddenFiles"] });
  return result.canceled ? undefined : result.filePaths[0];
});

ipcMain.handle("workspace:scan", (_event, root: string) => scanWorkspace(root));
ipcMain.handle("workspace:init", (_event, root: string) => initWorkspace(root));
ipcMain.handle("workspace:saveConfig", (_event, root: string, config: SkillOpsConfig) => saveWorkspaceConfig(root, config));
ipcMain.handle("system:defaultTargets", () => defaultTargets());
ipcMain.handle("system:environment", () => getElectronEnvironmentStatus());
ipcMain.handle("system:installCli", () => installCliShim({ ...cliShimOptions(), updateShellProfile: true }));
ipcMain.handle("appState:load", () => loadAppState());
ipcMain.handle("appState:save", (_event, patch: Partial<AppState>) => saveAppStatePatch(patch));
ipcMain.handle("appState:migrate", (_event, legacyState: Partial<AppState>, origin: string) => migrateAppState(legacyState, origin));
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
ipcMain.handle("skillFile:list", (_event, root: string, skillPath: string) => listSkillFiles(root, skillPath));
ipcMain.handle("skillFile:listWorkspace", (_event, root: string, directoryPath: string) => listWorkspaceFiles(root, directoryPath));
ipcMain.handle("skillFile:read", (_event, root: string, filePath: string) => readSkillFile(root, filePath));
ipcMain.handle("skillFile:write", (_event, root: string, filePath: string, content: string) => writeSkillFile(root, filePath, content));
ipcMain.handle("skillFile:openWindow", (event, root: string, skillPath: string, filePath?: string, context?: SkillEditorWindowContext) => openSkillFileWindow(root, skillPath, filePath, context, BrowserWindow.fromWebContents(event.sender)));
ipcMain.handle("skillFile:openWorkspaceWindow", (event, root: string, directoryPath: string, filePath?: string, context?: SkillEditorWindowContext) => openWorkspaceFileWindow(root, directoryPath, filePath, context, BrowserWindow.fromWebContents(event.sender)));

async function saveWorkspaceConfig(root: string, config: SkillOpsConfig) {
  await saveConfig(root, normalizeConfig(config));
  return scanWorkspace(root);
}

async function loadAppState(): Promise<AppState> {
  try {
    const raw = await fs.readFile(appStatePath(), "utf8");
    return normalizeAppState(JSON.parse(raw) as Partial<AppState>);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return defaultAppState();
    throw error;
  }
}

async function saveAppStatePatch(patch: Partial<AppState>): Promise<AppState> {
  return withAppStateWrite(async () => {
    const current = await loadAppState();
    const next = normalizeAppState({
      ...current,
      ...patch,
      projectState: patch.projectState ?? current.projectState,
      migratedLocalStorageOrigins: patch.migratedLocalStorageOrigins ?? current.migratedLocalStorageOrigins
    });
    await writeAppState(next);
    return next;
  });
}

async function migrateAppState(legacyState: Partial<AppState>, origin: string): Promise<AppState> {
  return withAppStateWrite(async () => {
    const current = await loadAppState();
    const migrationOrigin = origin || "unknown";
    if (current.migratedLocalStorageOrigins?.includes(migrationOrigin)) return current;
    const next = normalizeAppState({
      ...current,
      language: current.language ?? legacyState.language,
      activeWorkspace: current.activeWorkspace ?? legacyState.activeWorkspace,
      recentWorkspaces: mergeRecentWorkspaces(legacyState.recentWorkspaces, current.recentWorkspaces),
      targetHistory: mergeTargetHistory(legacyState.targetHistory, current.targetHistory),
      projectState: {
        ...(legacyState.projectState ?? {}),
        ...current.projectState
      },
      migratedLocalStorageOrigins: [...(current.migratedLocalStorageOrigins ?? []), migrationOrigin]
    });
    await writeAppState(next);
    return next;
  });
}

function withAppStateWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = appStateWriteQueue.then(operation, operation);
  appStateWriteQueue = next.catch(() => undefined);
  return next;
}

async function writeAppState(state: AppState): Promise<void> {
  await fs.mkdir(path.dirname(appStatePath()), { recursive: true });
  await fs.writeFile(appStatePath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function appStatePath(): string {
  return path.join(app.getPath("userData"), "state.json");
}

function defaultAppState(): AppState {
  return {
    version: 1,
    recentWorkspaces: [],
    targetHistory: [],
    projectState: {},
    migratedLocalStorageOrigins: []
  };
}

function normalizeAppState(state: Partial<AppState>): AppState {
  return {
    version: 1,
    language: state.language === "en" || state.language === "zh-CN" ? state.language : undefined,
    activeWorkspace: cleanString(state.activeWorkspace),
    recentWorkspaces: normalizeRecentWorkspaces(state.recentWorkspaces),
    targetHistory: normalizeTargetHistory(state.targetHistory),
    projectState: normalizeProjectState(state.projectState),
    migratedLocalStorageOrigins: Array.from(new Set((state.migratedLocalStorageOrigins ?? []).map(cleanString).filter(Boolean) as string[]))
  };
}

function normalizeRecentWorkspaces(items?: RecentWorkspace[]): RecentWorkspace[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is RecentWorkspace => Boolean(item) && typeof item === "object")
    .map((item) => ({
      path: cleanString(item.path) ?? "",
      name: cleanString(item.name) ?? cleanString(item.path)?.split(/[\\/]/).filter(Boolean).pop() ?? "Skill project",
      lastOpenedAt: cleanString(item.lastOpenedAt) ?? new Date().toISOString(),
      skillCount: Number.isFinite(item.skillCount) ? item.skillCount : 0,
      auditScore: Number.isFinite(item.auditScore) ? item.auditScore : 0,
      status: item.status === "downloading" || item.status === "error" || item.status === "ready" ? item.status : undefined,
      sourceUrl: cleanString(item.sourceUrl),
      error: cleanString(item.error)
    }))
    .filter((item) => item.path)
    .slice(0, 20);
}

function normalizeTargetHistory(items?: TargetRecord[]): TargetRecord[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is TargetRecord => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: cleanString(item.id) ?? "",
      sourcePath: cleanString(item.sourcePath) ?? "",
      sourceName: cleanString(item.sourceName) ?? "",
      profile: cleanString(item.profile) ?? "default",
      destinationName: cleanString(item.destinationName) ?? "",
      destinationPath: cleanString(item.destinationPath) ?? "",
      lastAppliedAt: cleanString(item.lastAppliedAt) ?? new Date().toISOString()
    }))
    .filter((item) => item.id && item.sourcePath && item.destinationPath)
    .slice(0, 100);
}

function normalizeProjectState(value?: Record<string, ProjectUiState>): Record<string, ProjectUiState> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value)
    .filter((entry): entry is [string, ProjectUiState] => typeof entry[0] === "string" && Boolean(entry[1]) && typeof entry[1] === "object")
    .map(([projectRoot, state]) => [projectRoot, {
      tab: isProjectTab(state.tab) ? state.tab : undefined,
      profile: cleanString(state.profile),
      applyTargetGroupId: cleanString(state.applyTargetGroupId),
      shareTargetGroupId: cleanString(state.shareTargetGroupId)
    }]));
}

function mergeRecentWorkspaces(primary?: RecentWorkspace[], secondary?: RecentWorkspace[]): RecentWorkspace[] {
  const merged = new Map<string, RecentWorkspace>();
  for (const item of normalizeRecentWorkspaces([...(primary ?? []), ...(secondary ?? [])])) {
    if (!merged.has(item.path)) merged.set(item.path, item);
  }
  return Array.from(merged.values()).slice(0, 20);
}

function mergeTargetHistory(primary?: TargetRecord[], secondary?: TargetRecord[]): TargetRecord[] {
  const merged = new Map<string, TargetRecord>();
  for (const item of normalizeTargetHistory([...(primary ?? []), ...(secondary ?? [])])) {
    if (!merged.has(item.id)) merged.set(item.id, item);
  }
  return Array.from(merged.values()).slice(0, 100);
}

function cleanString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isProjectTab(value: unknown): value is ProjectUiState["tab"] {
  return value === "overview" || value === "skills" || value === "profiles" || value === "destinations" || value === "share" || value === "audit";
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function normalizeConfig(config: SkillOpsConfig): SkillOpsConfig {
  return {
    version: 1,
    sourceDir: config.sourceDir || "skills",
    teamRepo: config.teamRepo?.trim() || undefined,
    shareTargetMode: config.shareTargetMode,
    shareProjectName: config.shareProjectName?.trim() || undefined,
    applyTargets: config.applyTargets?.map((group) => ({
      id: group.id,
      name: group.name.trim(),
      profile: group.profile,
      agentTargetIds: normalizeStringList(group.agentTargetIds),
      projectTargetDirs: normalizeStringList(group.projectTargetDirs),
      customTargetDirs: normalizeStringList(group.customTargetDirs)
    })),
    shareTargets: config.shareTargets?.map((group) => ({
      id: group.id,
      name: group.name.trim(),
      profile: group.profile,
      remoteUrl: group.remoteUrl.trim(),
      targetMode: group.targetMode,
      projectName: group.projectName?.trim() || undefined
    })),
    profiles: config.profiles.map((profile) => ({
      name: profile.name.trim(),
      description: profile.description?.trim() || undefined,
      skills: profile.skills,
      targets: profile.targets
    }))
  };
}

function normalizeStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => cleanString(item)).filter((item): item is string => Boolean(item)) : [];
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

async function openSkillFileWindow(root: string, skillPath: string, filePath?: string, context?: SkillEditorWindowContext, parent?: BrowserWindow | null): Promise<void> {
  const initialFilePath = filePath || await defaultSkillFile(skillPath);
  await listSkillFiles(root, skillPath);
  if (initialFilePath) await readSkillFile(root, initialFilePath);
  await openWorkspaceFileWindow(root, skillPath, initialFilePath, context, parent);
}

async function openWorkspaceFileWindow(root: string, directoryPath: string, filePath?: string, context?: SkillEditorWindowContext, parent?: BrowserWindow | null): Promise<void> {
  const initialFilePath = filePath;
  await listWorkspaceFiles(root, directoryPath);
  if (initialFilePath) await readSkillFile(root, initialFilePath);
  const editorContext = normalizeSkillEditorWindowContext(context, directoryPath);
  const win = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 860,
    minHeight: 560,
    title: `SkillOps - ${path.basename(directoryPath)}`,
    parent: parent ?? undefined,
    backgroundColor: "#F3F5F8",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(renderSkillEditorHtml(root, directoryPath, initialFilePath, editorContext))}`);
}

function normalizeSkillEditorWindowContext(context: SkillEditorWindowContext | undefined, directoryPath: string): SkillEditorWindowContext {
  const labels = {
    files: cleanString(context?.labels?.files) ?? "Files",
    profile: cleanString(context?.labels?.profile) ?? "Profile",
    reload: cleanString(context?.labels?.reload) ?? "Reload",
    save: cleanString(context?.labels?.save) ?? "Save",
    noFileSelected: cleanString(context?.labels?.noFileSelected) ?? "No file selected",
    selectFile: cleanString(context?.labels?.selectFile) ?? "Choose a file to view or edit.",
    loading: cleanString(context?.labels?.loading) ?? "Loading file...",
    loaded: cleanString(context?.labels?.loaded) ?? "File loaded.",
    saving: cleanString(context?.labels?.saving) ?? "Saving file...",
    saved: cleanString(context?.labels?.saved) ?? "File saved.",
    cannotOpenFile: cleanString(context?.labels?.cannotOpenFile) ?? "Cannot open file"
  };
  return {
    sourceDir: cleanString(context?.sourceDir) ?? path.basename(directoryPath),
    profileName: cleanString(context?.profileName),
    profiles: Array.isArray(context?.profiles) ? context.profiles : [],
    skills: Array.isArray(context?.skills) ? context.skills : [],
    assets: Array.isArray(context?.assets) ? context.assets : [],
    collapsedFolders: normalizeStringList(context?.collapsedFolders),
    treeScrollTop: Number.isFinite(context?.treeScrollTop) ? context?.treeScrollTop : 0,
    editorScrollTop: Number.isFinite(context?.editorScrollTop) ? context?.editorScrollTop : 0,
    labels
  };
}

function renderSkillEditorHtml(root: string, directoryPath: string, filePath: string | undefined, context: SkillEditorWindowContext): string {
  const labels = context.labels;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SkillOps - ${escapeHtml(path.basename(directoryPath))}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #202124; background: #f3f5f8; }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body { margin: 0; overflow: hidden; }
    button { min-height: 34px; border: 1px solid #d0d5dd; border-radius: 8px; background: #fff; color: #344054; padding: 8px 12px; font: inherit; font-size: 13px; font-weight: 650; cursor: pointer; }
    button:hover:not(:disabled) { background: #f8fafc; border-color: #b8c1cf; }
    button:disabled { opacity: 0.55; cursor: not-allowed; }
    .primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
    .primary:hover:not(:disabled) { background: #174ea6; border-color: #174ea6; }
    .app { height: 100%; display: grid; grid-template-rows: auto minmax(0, 1fr); }
    header { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 18px 22px; border-bottom: 1px solid #e5e7eb; background: #fff; }
    header > div:first-child { min-width: 0; flex: 1 1 auto; }
    h1, p { margin: 0; }
    h1 { font-size: 18px; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    p, .muted { color: #667085; font-size: 12px; line-height: 1.45; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .actions { flex: 0 0 auto; display: flex; gap: 8px; flex-wrap: nowrap; justify-content: flex-end; }
    .actions button { white-space: nowrap; }
    .workspace { min-height: 0; display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 14px; padding: 14px; }
    .tree, .editor { min-height: 0; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; overflow: hidden; }
    .tree { display: flex; flex-direction: column; }
    .tree-title { display: grid; gap: 8px; padding: 12px 14px; border-bottom: 1px solid #eef0f3; }
    .tree-title h2 { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; line-height: 1.25; }
    .tree-controls { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 8px; color: #667085; font-size: 12px; }
    .tree-controls select { min-width: 0; width: 100%; min-height: 32px; border: 1px solid #d0d5dd; border-radius: 8px; padding: 6px 10px; background: #fff; color: #344054; font: inherit; font-size: 12px; }
    .tree-body { min-height: 0; overflow: auto; padding: 8px; }
    .tree-button { width: 100%; min-height: 30px; justify-content: flex-start; border-color: transparent; background: transparent; padding: 6px 8px; text-align: left; font-weight: 600; }
    .tree-button.active { background: #e8f1ff; border-color: #b8d2ff; color: #174ea6; }
    .tree-row { margin-top: 2px; }
    .tree-label { display: flex; gap: 7px; align-items: center; min-width: 0; }
    .tree-caret, .tree-icon { width: 14px; height: 14px; flex: 0 0 14px; color: #667085; }
    .tree-caret svg, .tree-icon svg { display: block; width: 14px; height: 14px; stroke: currentColor; }
    .tree-label span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .editor { display: grid; grid-template-rows: auto minmax(0, 1fr); }
    .editor-bar { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 12px 14px; border-bottom: 1px solid #eef0f3; }
    .editor-bar > div:first-child { min-width: 0; flex: 1 1 auto; }
    .editor-bar strong { display: block; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    textarea { width: 100%; height: 100%; resize: none; border: 0; outline: 0; padding: 16px; font: 13px/1.55 SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; color: #202124; background: #fff; tab-size: 2; }
    .empty { display: grid; place-items: center; color: #667085; }
    @media (max-width: 880px) {
      .workspace { grid-template-columns: 1fr; grid-template-rows: 240px minmax(0, 1fr); }
      header { flex-direction: column; align-items: stretch; }
      .actions { justify-content: flex-start; }
    }
  </style>
</head>
<body>
  <div class="app">
    <header>
      <div>
        <h1>${escapeHtml(path.basename(directoryPath))}</h1>
        <p>${escapeHtml(directoryPath)}</p>
      </div>
      <div class="actions">
        <button id="reload">${escapeHtml(labels?.reload ?? "Reload")}</button>
        <button id="save" class="primary" disabled>${escapeHtml(labels?.save ?? "Save")}</button>
      </div>
    </header>
    <div class="workspace">
      <aside class="tree">
        <div class="tree-title">
          <h2>${escapeHtml(context.sourceDir)}${escapeHtml(labels?.files ?? "Files")}</h2>
          <label class="tree-controls"><span>${escapeHtml(labels?.profile ?? "Profile")}</span><select id="profile"></select></label>
        </div>
        <div id="tree" class="tree-body"></div>
      </aside>
      <section class="editor">
        <div class="editor-bar">
          <div>
            <strong id="file-title">${escapeHtml(labels?.noFileSelected ?? "No file selected")}</strong>
            <p id="status">${escapeHtml(labels?.selectFile ?? "Choose a file to view or edit.")}</p>
          </div>
        </div>
        <textarea id="editor" spellcheck="false" disabled></textarea>
      </section>
    </div>
  </div>
  <script>
    const rootPath = ${JSON.stringify(root)};
    const directoryPath = ${JSON.stringify(directoryPath)};
    const editorContext = ${JSON.stringify(context)};
    const labels = editorContext.labels || {};
    let currentFilePath = ${JSON.stringify(filePath)};
    let lastSavedContent = "";
    let files = [];
    let filteredFiles = [];
    let activeProfileName = editorContext.profileName || (editorContext.profiles[0] && editorContext.profiles[0].name) || "";
    const collapsedFolders = new Set(editorContext.collapsedFolders || []);
    let restoreTreeScroll = Number(editorContext.treeScrollTop) || 0;
    let restoreEditorScroll = Number(editorContext.editorScrollTop) || 0;
    const tree = document.getElementById("tree");
    const profileSelect = document.getElementById("profile");
    const editor = document.getElementById("editor");
    const saveButton = document.getElementById("save");
    const reloadButton = document.getElementById("reload");
    const status = document.getElementById("status");
    const fileTitle = document.getElementById("file-title");

    function setStatus(message) {
      status.textContent = message;
    }

    function flatten(entries) {
      return entries.flatMap((entry) => entry.type === "directory" ? flatten(entry.children || []) : [entry]);
    }

    function filterFilesByProfile(entries) {
      const profile = (editorContext.profiles || []).find((item) => item.name === activeProfileName) || (editorContext.profiles || [])[0];
      if (!profile || (profile.skills || []).includes("*")) return entries;
      const selectedNames = new Set(profile.skills || []);
      const roots = [
        ...(editorContext.skills || []).filter((skill) => selectedNames.has(skill.name)).map((skill) => skill.path),
        ...(editorContext.assets || []).map((asset) => asset.path)
      ];
      if (roots.length === 0) return [];
      return filterEntriesByRoots(entries, roots);
    }

    function filterEntriesByRoots(entries, roots) {
      return entries.flatMap((entry) => {
        if (roots.some((root) => samePath(entry.path, root) || isDescendantPath(entry.path, root))) return [entry];
        if (entry.type !== "directory") return [];
        const children = filterEntriesByRoots(entry.children || [], roots);
        return children.length > 0 ? [{ ...entry, children }] : [];
      });
    }

    function renderTree(entries, depth = 0) {
      return entries.map((entry) => {
        if (entry.type === "directory") {
          const collapsed = collapsedFolders.has(entry.path);
          const children = collapsed ? "" : renderTree(entry.children || [], depth + 1);
          return '<div class="tree-row" style="padding-left:' + (depth * 12) + 'px"><button class="tree-button tree-label" data-folder="' + escapeAttribute(entry.path) + '"><span class="tree-caret">' + caretIcon(collapsed) + '</span><span class="tree-icon">' + folderIcon() + '</span><span>' + escapeHtml(entry.name) + '</span></button>' + children + '</div>';
        }
        const active = entry.path === currentFilePath ? " active" : "";
        return '<div class="tree-row" style="padding-left:' + (depth * 12) + 'px"><button class="tree-button tree-label' + active + '" data-path="' + escapeAttribute(entry.path) + '"><span class="tree-caret"></span><span class="tree-icon">' + fileIcon() + '</span><span>' + escapeHtml(entry.name) + '</span></button></div>';
      }).join("");
    }

    function bindTreeEvents() {
      for (const button of tree.querySelectorAll("button[data-folder]")) {
        button.addEventListener("click", () => {
          const folderPath = button.getAttribute("data-folder");
          if (!folderPath) return;
          if (collapsedFolders.has(folderPath)) {
            collapsedFolders.delete(folderPath);
          } else {
            collapsedFolders.add(folderPath);
          }
          tree.innerHTML = renderTree(filteredFiles);
          bindTreeEvents();
        });
      }
      for (const button of tree.querySelectorAll("button[data-path]")) {
        button.addEventListener("click", () => void openFile(button.getAttribute("data-path")));
      }
    }

    function renderProfileSelect() {
      const profiles = editorContext.profiles || [];
      profileSelect.innerHTML = profiles.map((profile) => '<option value="' + escapeAttribute(profile.name) + '">' + escapeHtml(profile.name) + '</option>').join("");
      profileSelect.value = activeProfileName;
      profileSelect.disabled = profiles.length === 0;
    }

    function renderFilteredTree() {
      filteredFiles = filterFilesByProfile(files);
      const flat = flatten(filteredFiles);
      if (!flat.some((item) => item.path === currentFilePath)) {
        const preferred = flat.find((item) => item.name === "SKILL.md") || flat[0];
        currentFilePath = preferred ? preferred.path : undefined;
      }
      tree.innerHTML = renderTree(filteredFiles);
      bindTreeEvents();
      if (restoreTreeScroll) {
        tree.scrollTop = restoreTreeScroll;
        restoreTreeScroll = 0;
      } else {
        tree.querySelector("button.active")?.scrollIntoView({ block: "nearest" });
      }
    }

    async function loadTree() {
      files = await window.skillops.listWorkspaceFiles(rootPath, directoryPath);
      filteredFiles = filterFilesByProfile(files);
      if (!currentFilePath) {
        const first = flatten(filteredFiles)[0];
        currentFilePath = first ? first.path : undefined;
      }
      renderProfileSelect();
      renderFilteredTree();
    }

    async function openFile(filePath) {
      if (!filePath) return;
      currentFilePath = filePath;
      saveButton.disabled = true;
      editor.disabled = true;
      setStatus(labels.loading || "Loading file...");
      try {
        const document = await window.skillops.readSkillFile(rootPath, filePath);
        lastSavedContent = document.content;
        editor.value = document.content;
        editor.disabled = false;
        fileTitle.textContent = document.relativePath;
        setStatus(labels.loaded || "File loaded.");
        renderFilteredTree();
        if (restoreEditorScroll) {
          editor.scrollTop = restoreEditorScroll;
          restoreEditorScroll = 0;
        }
      } catch (error) {
        editor.value = "";
        fileTitle.textContent = labels.cannotOpenFile || "Cannot open file";
        setStatus(error instanceof Error ? error.message : String(error));
      }
    }

    async function saveFile() {
      if (!currentFilePath || editor.value === lastSavedContent) return;
      saveButton.disabled = true;
      setStatus(labels.saving || "Saving file...");
      try {
        const document = await window.skillops.writeSkillFile(rootPath, currentFilePath, editor.value);
        lastSavedContent = document.content;
        setStatus(labels.saved || "File saved.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error));
      } finally {
        saveButton.disabled = editor.value === lastSavedContent;
      }
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
    }

    function escapeAttribute(value) {
      return escapeHtml(value).replace(/\\n/g, " ");
    }

    function caretIcon(collapsed) {
      return collapsed
        ? '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
    }

    function folderIcon() {
      return '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.6 3.9A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>';
    }

    function fileIcon() {
      return '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>';
    }

    editor.addEventListener("input", () => {
      saveButton.disabled = editor.value === lastSavedContent || !currentFilePath;
    });
    profileSelect.addEventListener("change", () => {
      activeProfileName = profileSelect.value;
      renderFilteredTree();
      void openFile(currentFilePath);
    });
    saveButton.addEventListener("click", () => void saveFile());
    reloadButton.addEventListener("click", async () => {
      await loadTree();
      await openFile(currentFilePath);
    });
    void loadTree().then(() => openFile(currentFilePath)).catch((error) => setStatus(error instanceof Error ? error.message : String(error)));

    function normalizePath(filePath) {
      return String(filePath || "").replace(/\\\\/g, "/").replace(/\\/+$/, "");
    }

    function samePath(a, b) {
      return normalizePath(a) === normalizePath(b);
    }

    function isDescendantPath(candidate, parent) {
      const normalizedCandidate = normalizePath(candidate);
      const normalizedParent = normalizePath(parent);
      return normalizedCandidate.startsWith(normalizedParent + "/");
    }
  </script>
</body>
</html>`;
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
