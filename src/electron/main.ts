import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { scanWorkspace, initWorkspace } from "../core/workspace.js";
import { createPublishPlan } from "../core/publish.js";
import { applyProfile, driftReport } from "../core/profiles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    ? await dialog.showOpenDialog(win, { properties: ["openDirectory"] })
    : await dialog.showOpenDialog({ properties: ["openDirectory"] });
  return result.canceled ? undefined : result.filePaths[0];
});

ipcMain.handle("workspace:scan", (_event, root: string) => scanWorkspace(root));
ipcMain.handle("workspace:init", (_event, root: string) => initWorkspace(root));
ipcMain.handle("publish:plan", (_event, root: string, visibility: "private" | "public") => createPublishPlanFromRoot(root, visibility));
ipcMain.handle("profile:apply", (_event, root: string, profile: string, targetDir: string) => applyProfileFromRoot(root, profile, targetDir));
ipcMain.handle("profile:drift", (_event, root: string, profile: string, targetDir: string) => driftReportFromRoot(root, profile, targetDir));

async function createPublishPlanFromRoot(root: string, visibility: "private" | "public") {
  const snapshot = await scanWorkspace(root);
  return createPublishPlan(root, snapshot.config, snapshot.skills, visibility);
}

async function applyProfileFromRoot(root: string, profile: string, targetDir: string) {
  const snapshot = await scanWorkspace(root);
  return applyProfile(root, snapshot.config, snapshot.skills, profile, targetDir);
}

async function driftReportFromRoot(root: string, profile: string, targetDir: string) {
  const snapshot = await scanWorkspace(root);
  return driftReport(root, snapshot.config, snapshot.skills, profile, targetDir);
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
