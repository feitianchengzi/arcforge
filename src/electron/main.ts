import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { runArcForgeCommand, shareProjectCommand, createSharePlanCommand, shareDriftReportCommand } from "../commands/index.js";
import { scanWorkspace } from "../core/workspace.js";
import { saveConfig } from "../core/config.js";
import { getEnvironmentStatus } from "../core/environment.js";
import { installCliShim } from "../core/cli-install.js";
import { hideLocalProjectInList, listLocalProjectStates, saveLocalProjectListMetadata, saveLocalProjectListOrder, type LocalProjectState } from "../core/project-store.js";
import { defaultSkillFile, listSkillFiles, listWorkspaceFiles, readSkillFile, writeSkillFile } from "../core/skill-files.js";
import { applyFromSource, createImportSkillsPlan, createMergePlan, driftAppliedSources, driftFromSource, importSkillsIntoProject, listAppliedSources, mergeIntoProject, resolveSkillProjectRoot, runAppliedSources, type ImportSkillsOptions, type MergeOptions } from "../core/sources.js";
import { checkSourceUpdate, updateSource } from "../core/source-update.js";
import type { AppState, ApplyDriftCheckRecord, DriftFileDiff, DriftReport, ProjectUiState, RecentWorkspace, ShareDeliveryMethod, ShareDriftCheckRecord, ShareTargetMode, SkillEditorWindowContext, ArcForgeConfig, TargetRecord } from "../shared/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliMarkerIndex = process.argv.indexOf("--cli");
let appStateWriteQueue: Promise<unknown> = Promise.resolve();
const execFileAsync = promisify(execFile);
type DesktopContext = {
  root: string;
  page?: ProjectUiState["tab"];
};

app.setName("ArcForge");

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
    await seedDesktopContext(desktopContextFromArgs(process.argv)).catch((error) => {
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
    const result = await runArcForgeCommand(args, {
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
    title: "ArcForge",
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

function desktopContextFromArgs(args: string[]): DesktopContext | undefined {
  const root = readArg(args, "--root");
  if (!root) return undefined;
  const page = readArg(args, "--page");
  return {
    root: path.resolve(root),
    page: isProjectTab(page) ? page : undefined
  };
}

function readArg(args: string[], name: string): string | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === name) return cleanString(args[index + 1]);
    if (value.startsWith(`${name}=`)) return cleanString(value.slice(name.length + 1));
  }
  return undefined;
}

async function seedDesktopContext(context: DesktopContext | undefined): Promise<void> {
  if (!context?.root) return;
  const now = new Date().toISOString();
  await saveLocalProjectListMetadata(context.root, {
    order: 0,
    lastOpenedAt: now,
    hidden: false,
    sourceKind: "local",
    localSourcePath: context.root
  });
  const current = await loadAppState();
  const currentProjectState = current.projectState[context.root] ?? {};
  await saveAppStatePatch({
    activeWorkspace: context.root,
    projectState: {
      ...current.projectState,
      [context.root]: {
        ...currentProjectState,
        tab: context.page ?? currentProjectState.tab ?? "overview"
      }
    }
  });
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

ipcMain.handle("workspace:chooseDirectory", async (event, defaultPath?: string, parentPath?: string) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.show();
  win?.focus();
  const options = {
    properties: ["openDirectory", "createDirectory", "showHiddenFiles"] as Array<"openDirectory" | "createDirectory" | "showHiddenFiles">,
    defaultPath: defaultPath ? path.resolve(defaultPath) : undefined
  };
  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options);
  if (result.canceled) return undefined;
  return parentPath ? directorySelectionResult(result.filePaths[0], parentPath) : result.filePaths[0];
});

ipcMain.handle("workspace:scan", (_event, root: string) => scanWorkspace(root));
ipcMain.handle("workspace:saveConfig", (_event, root: string, config: ArcForgeConfig) => saveWorkspaceConfig(root, config));
ipcMain.handle("workspace:openFolder", (_event, root: string) => openWorkspaceFolder(root));
ipcMain.handle("system:defaultTargets", () => defaultTargets());
ipcMain.handle("system:environment", () => getElectronEnvironmentStatus());
ipcMain.handle("system:installCli", () => installCliShim({ ...cliShimOptions(), updateShellProfile: true }));
ipcMain.handle("system:openExternal", (_event, url: string) => openExternalUrl(url));
ipcMain.handle("appState:load", () => loadAppState());
ipcMain.handle("appState:save", (_event, patch: Partial<AppState>) => saveAppStatePatch(patch));
ipcMain.handle("appState:migrate", (_event, legacyState: Partial<AppState>, origin: string) => migrateAppState(legacyState, origin));
ipcMain.handle("projectList:remember", (_event, workspace: RecentWorkspace, orderedPaths?: string[]) => rememberProjectWorkspace(workspace, orderedPaths));
ipcMain.handle("projectList:reorder", (_event, orderedPaths: string[]) => reorderProjectWorkspaces(orderedPaths));
ipcMain.handle("projectList:remove", (_event, root: string) => removeProjectWorkspace(root));
ipcMain.handle("workspace:addRemote", (_event, remoteUrl: string) => resolveSkillProjectRoot(remoteUrl, cacheRoot()));
ipcMain.handle("source:status", (_event, root: string) => checkSourceUpdate({ root }));
ipcMain.handle("source:update", (_event, root: string, confirm?: boolean) => updateSource({ root, confirm: Boolean(confirm) }));
ipcMain.handle("merge:plan", (_event, options: MergeOptions) => createMergePlan({ ...options, cacheDir: cacheRoot() }));
ipcMain.handle("merge:run", (_event, options: MergeOptions) => mergeIntoProject({ ...options, cacheDir: cacheRoot(), confirm: true }));
ipcMain.handle("import:plan", (_event, options: ImportSkillsOptions) => createImportSkillsPlan({ ...options, cacheDir: cacheRoot() }));
ipcMain.handle("import:run", (_event, options: ImportSkillsOptions) => importSkillsIntoProject({ ...options, cacheDir: cacheRoot(), confirm: true }));
ipcMain.handle("applied:list", (_event, root: string) => listAppliedSources(root));
ipcMain.handle("applied:drift", (_event, root: string, id?: string) => driftAppliedSources(root, id));
ipcMain.handle("applied:run", (_event, root: string, id?: string) => runAppliedSources(root, id, true));
ipcMain.handle("apply:run", (_event, root: string, from: string | undefined, profile: string, targetDir: string, save?: boolean, skills?: string[]) => applyFromSource(root, from, profile, targetDir, Boolean(save), skills, cacheRoot()));
ipcMain.handle("apply:drift", (_event, root: string, from: string | undefined, profile: string, targetDir: string, skills?: string[]) => driftFromSource(root, from, profile, targetDir, skills, cacheRoot()));
ipcMain.handle("share:plan", (_event, root: string, remoteUrl: string, visibility: "private" | "public", targetMode: ShareTargetMode, projectName: string, profileName: string, message?: string, delivery?: ShareDeliveryMethod, branch?: string, sameRepository?: boolean, sameRepositoryRemote?: string) => createSharePlanCommand({
  root,
  remoteUrl,
  visibility,
  message,
  targetMode,
  projectName,
  profileName,
  delivery,
  shareBranch: branch,
  sameRepository,
  sameRepositoryRemote,
  cacheDir: cacheRoot()
}));
ipcMain.handle("share:run", (_event, root: string, remoteUrl: string, visibility: "private" | "public", message: string, targetMode: ShareTargetMode, projectName: string, profileName: string, delivery?: ShareDeliveryMethod, branch?: string, confirm?: boolean, sameRepository?: boolean, sameRepositoryRemote?: string) => shareProjectCommand({
  root,
  remoteUrl,
  visibility,
  message,
  targetMode,
  projectName,
  profileName,
  delivery,
  shareBranch: branch,
  confirm,
  sameRepository,
  sameRepositoryRemote,
  cacheDir: cacheRoot()
}));
ipcMain.handle("share:drift", (_event, root: string, remoteUrl: string, targetMode: ShareTargetMode, projectName: string, profileName: string, sameRepository?: boolean, sameRepositoryRemote?: string) => shareDriftReportCommand({
  root,
  remoteUrl,
  targetMode,
  projectName,
  profileName,
  sameRepository,
  sameRepositoryRemote,
  cacheDir: cacheRoot()
}));
ipcMain.handle("diff:openDrift", (event, report: DriftReport) => openDriftDiffWindow(report, BrowserWindow.fromWebContents(event.sender)));
ipcMain.handle("skillFile:list", (_event, root: string, skillPath: string) => listSkillFiles(root, skillPath));
ipcMain.handle("skillFile:listWorkspace", (_event, root: string, directoryPath: string) => listWorkspaceFiles(root, directoryPath));
ipcMain.handle("skillFile:read", (_event, root: string, filePath: string) => readSkillFile(root, filePath));
ipcMain.handle("skillFile:write", (_event, root: string, filePath: string, content: string) => writeSkillFile(root, filePath, content));
ipcMain.handle("skillFile:openWindow", (event, root: string, skillPath: string, filePath?: string, context?: SkillEditorWindowContext) => openSkillFileWindow(root, skillPath, filePath, context, BrowserWindow.fromWebContents(event.sender)));
ipcMain.handle("skillFile:openWorkspaceWindow", (event, root: string, directoryPath: string, filePath?: string, context?: SkillEditorWindowContext) => openWorkspaceFileWindow(root, directoryPath, filePath, context, BrowserWindow.fromWebContents(event.sender)));

async function saveWorkspaceConfig(root: string, config: ArcForgeConfig) {
  await saveConfig(root, normalizeConfig(config));
  return scanWorkspace(root);
}

async function openExternalUrl(url: string): Promise<void> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "github.com" || !parsed.pathname.startsWith("/feitianchengzi/arcforge/issues")) {
    throw new Error("External URL is not allowed.");
  }
  await shell.openExternal(parsed.toString());
}

async function openWorkspaceFolder(root: string): Promise<void> {
  const target = path.resolve(root);
  const stat = await fs.stat(target);
  if (!stat.isDirectory()) {
    throw new Error("Workspace path is not a directory.");
  }
  const message = await shell.openPath(target);
  if (message) {
    throw new Error(message);
  }
}

async function directorySelectionResult(selectedPath: string, parentPath: string): Promise<{ path: string; relativePath: string; isInside: boolean }> {
  const selected = await realLocalPath(selectedPath);
  const parent = await realLocalPath(parentPath);
  const relativePath = path.relative(parent, selected) || ".";
  const isInside = relativePath === "." || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
  return {
    path: selected,
    relativePath,
    isInside
  };
}

async function realLocalPath(filePath: string): Promise<string> {
  const resolved = path.resolve(filePath);
  try {
    return await fs.realpath(resolved);
  } catch {
    return resolved;
  }
}

async function loadAppState(): Promise<AppState> {
  try {
    const raw = await fs.readFile(appStatePath(), "utf8");
    const state = normalizeAppState(JSON.parse(raw) as Partial<AppState>);
    await persistRecentWorkspaceList(state.recentWorkspaces);
    return withProjectList({ ...state, recentWorkspaces: [] });
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return withProjectList(defaultAppState());
    throw error;
  }
}

async function saveAppStatePatch(patch: Partial<AppState>): Promise<AppState> {
  return withAppStateWrite(async () => {
    const current = await loadAppState();
    if (patch.recentWorkspaces) await persistRecentWorkspaceList(patch.recentWorkspaces);
    const next = normalizeAppState({
      ...current,
      ...patch,
      recentWorkspaces: [],
      projectState: patch.projectState ?? current.projectState,
      migratedLocalStorageOrigins: patch.migratedLocalStorageOrigins ?? current.migratedLocalStorageOrigins
    });
    await writeAppState(next);
    return withProjectList(next);
  });
}

async function migrateAppState(legacyState: Partial<AppState>, origin: string): Promise<AppState> {
  return withAppStateWrite(async () => {
    const current = await loadAppState();
    const migrationOrigin = origin || "unknown";
    if (current.migratedLocalStorageOrigins?.includes(migrationOrigin)) return current;
    await persistRecentWorkspaceList(mergeRecentWorkspaces(legacyState.recentWorkspaces, current.recentWorkspaces));
    const next = normalizeAppState({
      ...current,
      language: current.language ?? legacyState.language,
      activeWorkspace: current.activeWorkspace ?? legacyState.activeWorkspace,
      recentWorkspaces: [],
      targetHistory: mergeTargetHistory(legacyState.targetHistory, current.targetHistory),
      projectState: {
        ...(legacyState.projectState ?? {}),
        ...current.projectState
      },
      migratedLocalStorageOrigins: [...(current.migratedLocalStorageOrigins ?? []), migrationOrigin]
    });
    await writeAppState(next);
    return withProjectList(next);
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

async function rememberProjectWorkspace(workspace: RecentWorkspace, orderedPaths: string[] = []): Promise<AppState> {
  const item = normalizeRecentWorkspace(workspace);
  if (item.path && !isPendingWorkspacePath(item.path)) {
    await saveLocalProjectListMetadata(item.path, {
      order: orderedPaths.includes(item.path) ? orderedPaths.indexOf(item.path) : 0,
      lastOpenedAt: item.lastOpenedAt,
      hidden: false,
      sourceKind: item.sourceKind,
      localSourcePath: item.localSourcePath,
      githubSourceUrl: item.githubSourceUrl
    });
  }
  await reorderProjectWorkspaces(orderedPaths);
  return loadAppState();
}

async function reorderProjectWorkspaces(orderedPaths: string[]): Promise<AppState> {
  await saveLocalProjectListOrder(orderedPaths.filter((item) => item && !isPendingWorkspacePath(item)));
  return loadAppState();
}

async function removeProjectWorkspace(root: string): Promise<AppState> {
  const value = cleanString(root);
  if (value && !isPendingWorkspacePath(value)) {
    await hideLocalProjectInList(value);
  }
  return loadAppState();
}

async function persistRecentWorkspaceList(workspaces: RecentWorkspace[] = []): Promise<void> {
  const items = normalizeRecentWorkspaces(workspaces).filter((item) => !isPendingWorkspacePath(item.path));
  for (const [order, item] of items.entries()) {
    await saveLocalProjectListMetadata(item.path, {
      order,
      lastOpenedAt: item.lastOpenedAt,
      hidden: false,
      sourceKind: item.sourceKind,
      localSourcePath: item.localSourcePath,
      githubSourceUrl: item.githubSourceUrl
    });
  }
}

async function withProjectList(state: AppState): Promise<AppState> {
  const recentWorkspaces = await recentWorkspacesFromProjectStore();
  const activeWorkspace = state.activeWorkspace && recentWorkspaces.some((item) => item.path === state.activeWorkspace)
    ? state.activeWorkspace
    : recentWorkspaces[0]?.path;
  return {
    ...state,
    activeWorkspace,
    recentWorkspaces
  };
}

async function recentWorkspacesFromProjectStore(): Promise<RecentWorkspace[]> {
  const states = (await listLocalProjectStates())
    .filter((state) => !state.list?.hidden)
    .sort(compareProjectListState);
  const items: RecentWorkspace[] = [];
  for (const state of states) {
    const item = await recentWorkspaceFromProjectState(state);
    if (item) items.push(item);
    if (items.length >= 20) break;
  }
  return items;
}

async function recentWorkspaceFromProjectState(state: LocalProjectState): Promise<RecentWorkspace | undefined> {
  const root = cleanString(state.root);
  if (!root) return undefined;
  const list = state.list ?? {};
  const lastOpenedAt = cleanString(list.lastOpenedAt) ?? state.updatedAt;
  const sourceKind = list.sourceKind === "github" || list.sourceKind === "local" ? list.sourceKind : "local";
  try {
    const snapshot = await scanWorkspace(root);
    return {
      path: snapshot.root,
      name: path.basename(snapshot.root),
      lastOpenedAt,
      skillCount: snapshot.skills.length,
      auditScore: snapshot.audit.score,
      sourceKind,
      localSourcePath: sourceKind === "local" ? cleanString(list.localSourcePath) ?? snapshot.root : undefined,
      githubSourceUrl: sourceKind === "github" ? cleanString(list.githubSourceUrl) : undefined
    };
  } catch {
    return {
      path: root,
      name: path.basename(root),
      lastOpenedAt,
      skillCount: 0,
      auditScore: 0,
      status: "error",
      sourceKind,
      localSourcePath: sourceKind === "local" ? cleanString(list.localSourcePath) ?? root : undefined,
      githubSourceUrl: sourceKind === "github" ? cleanString(list.githubSourceUrl) : undefined,
      error: "Project state exists, but the workspace could not be scanned."
    };
  }
}

function compareProjectListState(a: LocalProjectState, b: LocalProjectState): number {
  const aOrder = finiteNumber(a.list?.order);
  const bOrder = finiteNumber(b.list?.order);
  if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
  if (aOrder !== undefined) return -1;
  if (bOrder !== undefined) return 1;
  return Date.parse(cleanString(b.list?.lastOpenedAt) ?? b.updatedAt) - Date.parse(cleanString(a.list?.lastOpenedAt) ?? a.updatedAt);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isPendingWorkspacePath(value: string): boolean {
  return value.startsWith("pending:");
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
    .map((item) => normalizeRecentWorkspace(item))
    .filter((item) => item.path)
    .slice(0, 20);
}

function normalizeRecentWorkspace(item: RecentWorkspace): RecentWorkspace {
  const pathValue = cleanString(item.path) ?? "";
  const githubSourceUrl = cleanString(item.githubSourceUrl) ?? cleanString(item.sourceUrl);
  const requestedKind = item.sourceKind === "github" || item.sourceKind === "local" ? item.sourceKind : undefined;
  const sourceKind = requestedKind ?? (githubSourceUrl ? "github" : "local");
  return {
    path: pathValue,
    name: cleanString(item.name) ?? cleanString(item.path)?.split(/[\\/]/).filter(Boolean).pop() ?? "Skill project",
    lastOpenedAt: cleanString(item.lastOpenedAt) ?? new Date().toISOString(),
    skillCount: Number.isFinite(item.skillCount) ? item.skillCount : 0,
    auditScore: Number.isFinite(item.auditScore) ? item.auditScore : 0,
    status: item.status === "downloading" || item.status === "error" || item.status === "ready" ? item.status : undefined,
    sourceKind,
    localSourcePath: sourceKind === "local" ? cleanString(item.localSourcePath) ?? pathValue : undefined,
    githubSourceUrl: sourceKind === "github" ? githubSourceUrl : undefined,
    error: cleanString(item.error)
  };
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
      shareTargetGroupId: cleanString(state.shareTargetGroupId),
      applyDriftChecks: normalizeApplyDriftChecks(state.applyDriftChecks),
      shareDriftChecks: normalizeShareDriftChecks(state.shareDriftChecks),
      sourceUpdateCheck: normalizeSourceUpdateCheck(state.sourceUpdateCheck)
    }]));
}

function normalizeApplyDriftChecks(value: unknown): Record<string, ApplyDriftCheckRecord> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entries = Object.entries(value as Record<string, ApplyDriftCheckRecord>)
    .map(([key, item]) => [cleanString(key), normalizeApplyDriftCheck(item)] as const)
    .filter((entry): entry is [string, ApplyDriftCheckRecord] => Boolean(entry[0] && entry[1]));
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function normalizeApplyDriftCheck(value: unknown): ApplyDriftCheckRecord | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as ApplyDriftCheckRecord;
  const checkedAt = cleanString(item.checkedAt);
  if (!checkedAt) return undefined;
  return {
    checkedAt,
    signature: cleanString(item.signature),
    reports: Array.isArray(item.reports) ? item.reports.filter((report) => report && typeof report === "object") : [],
    error: cleanString(item.error)
  };
}

function normalizeShareDriftChecks(value: unknown): Record<string, ShareDriftCheckRecord> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entries = Object.entries(value as Record<string, ShareDriftCheckRecord>)
    .map(([key, item]) => [cleanString(key), normalizeShareDriftCheck(item)] as const)
    .filter((entry): entry is [string, ShareDriftCheckRecord] => Boolean(entry[0] && entry[1]));
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function normalizeShareDriftCheck(value: unknown): ShareDriftCheckRecord | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as ShareDriftCheckRecord;
  const checkedAt = cleanString(item.checkedAt);
  if (!checkedAt) return undefined;
  return {
    checkedAt,
    signature: cleanString(item.signature),
    report: item.report && typeof item.report === "object" ? item.report : undefined,
    error: cleanString(item.error)
  };
}

function normalizeSourceUpdateCheck(value: unknown): ProjectUiState["sourceUpdateCheck"] {
  if (!value || typeof value !== "object") return undefined;
  const item = value as ProjectUiState["sourceUpdateCheck"];
  const checkedAt = cleanString(item?.checkedAt);
  if (!checkedAt) return undefined;
  return {
    checkedAt,
    status: item?.status && typeof item.status === "object" ? item.status : undefined,
    error: cleanString(item?.error)
  };
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

function normalizeConfig(config: ArcForgeConfig): ArcForgeConfig {
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
      projectName: group.projectName?.trim() || undefined,
      sameRepository: group.sameRepository,
      sameRepositoryRemote: group.sameRepositoryRemote?.trim() || undefined
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
  return app.getPath("userData");
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
    title: `ArcForge - ${path.basename(directoryPath)}`,
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
  <title>ArcForge - ${escapeHtml(path.basename(directoryPath))}</title>
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
        const preferred = flat.find((item) => String(item.name).toLowerCase() === "skill.md") || flat[0];
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
      files = await window.arcforge.listWorkspaceFiles(rootPath, directoryPath);
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
        const document = await window.arcforge.readSkillFile(rootPath, filePath);
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
        const document = await window.arcforge.writeSkillFile(rootPath, currentFilePath, editor.value);
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

type DiffFileStatus = DriftFileDiff["status"] | "added" | "deleted" | "renamed";

interface DiffFileDocument {
  path: string;
  status: DiffFileStatus;
  leftTitle: string;
  rightTitle: string;
  leftText: string;
  rightText: string;
}

interface DiffDocument {
  title: string;
  subtitle: string;
  summary: string;
  leftLabel: string;
  rightLabel: string;
  files: DiffFileDocument[];
}

async function openDriftDiffWindow(report: DriftReport, parent?: BrowserWindow | null): Promise<void> {
  const files = await driftDiffFiles(report);
  const changedItems = report.items.filter((item) => item.status !== "same");
  await openDiffDocumentWindow({
    title: "ArcForge Drift Diff",
    subtitle: `Profile: ${report.profile} · Target: ${report.targetDir}`,
    summary: `${changedItems.length} changed / ${report.items.length} checked`,
    leftLabel: report.sameRepository ? "HEAD" : "target",
    rightLabel: report.sameRepository ? "working tree" : "local source",
    files
  }, parent);
}

async function openDiffDocumentWindow(document: DiffDocument, parent?: BrowserWindow | null): Promise<void> {
  const win = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 840,
    minHeight: 560,
    title: document.title,
    parent: parent ?? undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(renderDiffDocumentHtml(document))}`);
}

async function driftDiffFiles(report: DriftReport): Promise<DiffFileDocument[]> {
  const files: DiffFileDocument[] = [];
  const sameRepositoryGitRoot = report.sameRepository
    ? await gitOutput(report.targetDir, ["rev-parse", "--show-toplevel"]).then((value) => value.trim()).catch(() => "")
    : "";
  for (const item of report.items) {
    for (const file of item.files ?? []) {
      if (!safeRelativePath(file.path)) continue;
      if (sameRepositoryGitRoot) {
        const leftText = await readGitBlob(sameRepositoryGitRoot, "HEAD", file.path).catch(() => "");
        const rightPath = path.join(sameRepositoryGitRoot, file.path);
        const rightText = await readTextForDiff(rightPath);
        files.push({
          path: file.path.replace(/\\/g, "/"),
          status: driftDisplayStatus(file.status),
          leftTitle: `HEAD:${file.path}`,
          rightTitle: rightPath,
          leftText,
          rightText
        });
        continue;
      }
      const displayPath = `${item.skill}/${file.path}`.replace(/\\/g, "/");
      const leftPath = path.join(item.targetPath, file.path);
      const rightPath = path.join(item.sourcePath, file.path);
      const leftText = file.status === "missing" ? "" : await readTextForDiff(leftPath);
      const rightText = file.status === "extra" ? "" : await readTextForDiff(rightPath);
      files.push({
        path: displayPath,
        status: driftDisplayStatus(file.status),
        leftTitle: leftPath,
        rightTitle: rightPath,
        leftText,
        rightText
      });
    }
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function driftDisplayStatus(status: DriftFileDiff["status"]): DiffFileStatus {
  if (status === "missing") return "added";
  if (status === "extra") return "deleted";
  return status;
}

async function readGitBlob(root: string, revision: string, filePath: string): Promise<string> {
  return gitOutput(root, ["show", `${revision}:${filePath}`]);
}

async function gitOutput(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd, maxBuffer: 12 * 1024 * 1024 });
  return String(stdout);
}

async function readTextForDiff(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath);
    if (buffer.includes(0)) return "[Binary file]";
    if (buffer.byteLength > 2 * 1024 * 1024) return "[File too large to preview]";
    return buffer.toString("utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return "";
    if (isNodeError(error) && error.code === "EISDIR") return "[Directory]";
    if (isNodeError(error) && (error.code === "EACCES" || error.code === "EPERM")) return "[File is not readable]";
    throw error;
  }
}

function safeRelativePath(value: string): boolean {
  if (!value || path.isAbsolute(value)) return false;
  return !value.split(/[\\/]/).some((part) => part === "..");
}

function renderDiffDocumentHtml(document: DiffDocument): string {
  const payload = JSON.stringify(document).replace(/</g, "\\u003c");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(document.title)}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #202124; background: #f6f7f9; }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body { margin: 0; overflow: hidden; }
    .app { display: grid; grid-template-columns: 310px minmax(0, 1fr); height: 100%; min-height: 0; }
    aside { min-width: 0; min-height: 0; border-right: 1px solid #d9dee7; background: #fff; display: grid; grid-template-rows: auto minmax(0, 1fr); overflow: hidden; }
    header { padding: 18px 20px; border-bottom: 1px solid #e5e7eb; background: #fff; }
    h1, h2, p { margin: 0; }
    h1 { font-size: 20px; line-height: 1.2; }
    header p, .muted { margin-top: 6px; color: #667085; font-size: 12px; word-break: break-all; }
    .tree { min-height: 0; overflow: auto; padding: 10px; }
    .tree ul { list-style: none; margin: 0; padding: 0 0 0 14px; }
    .tree > ul { padding-left: 0; }
    .folder { width: 100%; display: flex; gap: 6px; align-items: center; min-height: 28px; border: 0; border-radius: 6px; margin: 5px 0 3px; padding: 6px 8px; background: transparent; color: #475467; text-align: left; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
    .folder:hover { background: #f8fafc; }
    .folder span:last-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .caret, .folder-icon { width: 14px; height: 14px; flex: 0 0 14px; color: #667085; }
    .caret svg, .folder-icon svg { display: block; width: 14px; height: 14px; stroke: currentColor; }
    .file { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; border: 0; border-radius: 6px; padding: 7px 8px; background: transparent; color: #344054; text-align: left; font: inherit; cursor: pointer; }
    .file:hover, .file.active { background: #eef2f7; }
    .file span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
    .badge { border-radius: 999px; padding: 2px 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .badge.changed, .badge.renamed { background: #fff4d6; color: #9a6700; }
    .badge.missing, .badge.deleted { background: #fee4e2; color: #b42318; }
    .badge.extra, .badge.added { background: #dcfae6; color: #067647; }
    main { min-width: 0; min-height: 0; display: grid; grid-template-rows: auto auto minmax(0, 1fr); }
    .diff-header { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }
    .labels { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); border-bottom: 1px solid #d9dee7; background: #f8fafc; }
    .labels div { padding: 9px 12px; color: #475467; font-size: 12px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .labels div + div { border-left: 1px solid #d9dee7; }
    .diff { min-height: 0; overflow-y: auto; overflow-x: hidden; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.45; background: #fff; }
    .row { display: grid; grid-template-columns: 48px minmax(0, 1fr) 48px minmax(0, 1fr); min-height: 22px; align-items: stretch; }
    .ln { user-select: none; color: #98a2b3; text-align: right; padding: 2px 8px; background: #f8fafc; border-right: 1px solid #edf0f5; }
    .cell { padding: 2px 10px; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; min-width: 0; border-right: 1px solid #edf0f5; }
    .row.same .cell { color: #344054; }
    .row.remove .old, .row.change .old { background: #ffebe9; color: #86181d; }
    .row.add .new, .row.change .new { background: #e6ffed; color: #116329; }
    .empty { color: #98a2b3; }
    .placeholder { padding: 28px; color: #667085; }
  </style>
</head>
<body>
  <div class="app">
    <aside>
      <header>
        <h1>${escapeHtml(document.title)}</h1>
        <p>${escapeHtml(document.subtitle)}</p>
        <p>${escapeHtml(document.summary)}</p>
      </header>
      <nav id="tree" class="tree"></nav>
    </aside>
    <main>
      <header class="diff-header">
        <div>
          <h2 id="file-title">No file selected</h2>
          <p id="file-subtitle" class="muted"></p>
        </div>
        <span id="file-status" class="badge changed">changed</span>
      </header>
      <div class="labels"><div>${escapeHtml(document.leftLabel)}</div><div>${escapeHtml(document.rightLabel)}</div></div>
      <section id="diff" class="diff"><div class="placeholder">No file-level differences.</div></section>
    </main>
  </div>
  <script id="diff-data" type="application/json">${payload}</script>
  <script>
    const data = JSON.parse(document.getElementById("diff-data").textContent);
    let activePath = data.files[0]?.path || "";
    const collapsedFolders = new Set();
    renderTree();
    renderActiveFile();

    function renderTree() {
      const tree = {};
      for (const file of data.files) {
        const parts = file.path.split("/").filter(Boolean);
        let node = tree;
        for (const part of parts.slice(0, -1)) node = node[part] ||= {};
        node[parts[parts.length - 1] || file.path] = file;
      }
      document.getElementById("tree").innerHTML = data.files.length ? renderNode(tree, "") : '<p class="muted">No changed files.</p>';
      document.querySelectorAll("[data-path]").forEach((button) => {
        button.addEventListener("click", () => {
          activePath = button.getAttribute("data-path");
          renderTree();
          renderActiveFile();
        });
      });
      document.querySelectorAll("[data-folder]").forEach((button) => {
        button.addEventListener("click", () => {
          const folderPath = button.getAttribute("data-folder");
          if (!folderPath) return;
          if (collapsedFolders.has(folderPath)) {
            collapsedFolders.delete(folderPath);
          } else {
            collapsedFolders.add(folderPath);
          }
          renderTree();
        });
      });
    }

    function renderNode(node, prefix) {
      const entries = Object.entries(node).sort(([a], [b]) => a.localeCompare(b));
      return "<ul>" + entries.map(([name, value]) => {
        if (value && typeof value.path === "string") {
          const leaf = value.path.split("/").pop();
          return '<li><button class="file ' + (value.path === activePath ? "active" : "") + '" data-path="' + escapeAttr(value.path) + '"><span>' + escapeHtml(leaf) + '</span><span class="badge ' + value.status + '">' + statusLabel(value.status) + '</span></button></li>';
        }
        const folderPath = prefix ? prefix + "/" + name : name;
        const collapsed = collapsedFolders.has(folderPath);
        const children = collapsed ? "" : renderNode(value, folderPath);
        return '<li><button class="folder" data-folder="' + escapeAttr(folderPath) + '"><span class="caret">' + caretIcon(collapsed) + '</span><span class="folder-icon">' + folderIcon() + '</span><span>' + escapeHtml(name) + '</span></button>' + children + '</li>';
      }).join("") + "</ul>";
    }

    function renderActiveFile() {
      const file = data.files.find((item) => item.path === activePath);
      const diff = document.getElementById("diff");
      document.getElementById("file-title").textContent = file?.path || "No file selected";
      document.getElementById("file-subtitle").textContent = file ? file.leftTitle + " -> " + file.rightTitle : "";
      const status = document.getElementById("file-status");
      status.textContent = file ? statusLabel(file.status) : "";
      status.className = "badge " + (file?.status || "changed");
      if (!file) {
        diff.innerHTML = '<div class="placeholder">No file-level differences.</div>';
        return;
      }
      diff.innerHTML = buildDiffRows(file.leftText, file.rightText);
    }

    function buildDiffRows(leftText, rightText) {
      const left = splitLines(leftText);
      const right = splitLines(rightText);
      const operations = lineOperations(left, right);
      const rows = [];
      let leftLine = 1;
      let rightLine = 1;
      for (let index = 0; index < operations.length; index++) {
        const op = operations[index];
        if (op.type === "same") {
          rows.push(rowHtml("same", leftLine++, op.text, rightLine++, op.text));
          continue;
        }
        const removed = [];
        const added = [];
        while (index < operations.length && operations[index].type !== "same") {
          if (operations[index].type === "remove") removed.push(operations[index].text);
          else added.push(operations[index].text);
          index++;
        }
        index--;
        const count = Math.max(removed.length, added.length);
        for (let offset = 0; offset < count; offset++) {
          const oldText = removed[offset];
          const newText = added[offset];
          const kind = oldText !== undefined && newText !== undefined ? "change" : oldText !== undefined ? "remove" : "add";
          rows.push(rowHtml(kind, oldText !== undefined ? leftLine++ : "", oldText ?? "", newText !== undefined ? rightLine++ : "", newText ?? ""));
        }
      }
      return rows.join("") || '<div class="placeholder">No line differences.</div>';
    }

    function lineOperations(left, right) {
      const table = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
      for (let i = left.length - 1; i >= 0; i--) {
        for (let j = right.length - 1; j >= 0; j--) {
          table[i][j] = left[i] === right[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
        }
      }
      const operations = [];
      let i = 0, j = 0;
      while (i < left.length && j < right.length) {
        if (left[i] === right[j]) {
          operations.push({ type: "same", text: left[i] });
          i++; j++;
        } else if (table[i + 1][j] >= table[i][j + 1]) {
          operations.push({ type: "remove", text: left[i++] });
        } else {
          operations.push({ type: "add", text: right[j++] });
        }
      }
      while (i < left.length) operations.push({ type: "remove", text: left[i++] });
      while (j < right.length) operations.push({ type: "add", text: right[j++] });
      return operations;
    }

    function rowHtml(kind, leftLine, leftText, rightLine, rightText) {
      return '<div class="row ' + kind + '"><div class="ln">' + leftLine + '</div><div class="cell old' + (leftText ? '' : ' empty') + '">' + escapeHtml(leftText) + '</div><div class="ln">' + rightLine + '</div><div class="cell new' + (rightText ? '' : ' empty') + '">' + escapeHtml(rightText) + '</div></div>';
    }

    function splitLines(text) {
      if (!text) return [];
      return text.replace(/\\r\\n/g, "\\n").replace(/\\r/g, "\\n").split("\\n");
    }

    function statusLabel(status) {
      return ({ missing: "missing", changed: "changed", extra: "extra", added: "added", deleted: "deleted", renamed: "renamed" })[status] || status;
    }

    function caretIcon(collapsed) {
      return collapsed
        ? '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
    }

    function folderIcon() {
      return '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.6 3.9A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>';
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
    }

    function escapeAttr(value) {
      return escapeHtml(value).replace(/\`/g, "&#96;");
    }
  </script>
</body>
</html>`;
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
