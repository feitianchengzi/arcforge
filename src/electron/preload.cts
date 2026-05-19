import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("skillops", {
  chooseWorkspace: () => ipcRenderer.invoke("workspace:choose"),
  scanWorkspace: (root: string) => ipcRenderer.invoke("workspace:scan", root),
  initWorkspace: (root: string) => ipcRenderer.invoke("workspace:init", root),
  createPublishPlan: (root: string, visibility: "private" | "public") => ipcRenderer.invoke("publish:plan", root, visibility),
  applyProfile: (root: string, profile: string, targetDir: string) => ipcRenderer.invoke("profile:apply", root, profile, targetDir),
  driftReport: (root: string, profile: string, targetDir: string) => ipcRenderer.invoke("profile:drift", root, profile, targetDir)
});
