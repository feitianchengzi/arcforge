import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("skillops", {
  chooseWorkspace: () => ipcRenderer.invoke("workspace:choose"),
  scanWorkspace: (root: string) => ipcRenderer.invoke("workspace:scan", root),
  initWorkspace: (root: string) => ipcRenderer.invoke("workspace:init", root),
  saveConfig: (root: string, config: unknown) => ipcRenderer.invoke("workspace:saveConfig", root, config),
  getDefaultTargets: () => ipcRenderer.invoke("system:defaultTargets"),
  getEnvironmentStatus: () => ipcRenderer.invoke("system:environment"),
  downloadSource: (remoteUrl: string) => ipcRenderer.invoke("source:download", remoteUrl),
  createPublishPlan: (root: string, visibility: "private" | "public") => ipcRenderer.invoke("publish:plan", root, visibility),
  shareProject: (root: string, remoteUrl: string, visibility: "private" | "public", message: string, targetMode: "direct" | "namedProject", projectName: string) => ipcRenderer.invoke("publish:share", root, remoteUrl, visibility, message, targetMode, projectName),
  applyProfile: (root: string, profile: string, targetDir: string) => ipcRenderer.invoke("profile:apply", root, profile, targetDir),
  driftReport: (root: string, profile: string, targetDir: string) => ipcRenderer.invoke("profile:drift", root, profile, targetDir),
  openDriftDiff: (report: unknown) => ipcRenderer.invoke("profile:openDriftDiff", report)
});
