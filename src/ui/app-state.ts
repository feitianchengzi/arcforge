import type { AppState, ProjectUiState, RecentWorkspace, TargetRecord } from "../shared/types";
import type { Language } from "./i18n";

const RECENT_WORKSPACES_KEY = "skillops.recentWorkspaces";
const ACTIVE_WORKSPACE_KEY = "skillops.activeWorkspace";
const TARGET_HISTORY_KEY = "skillops.targetHistory";
const PROJECT_STATE_KEY = "skillops.projectState";

export const MAX_RECENT_WORKSPACES = 8;

export function readLegacyAppState(): Partial<AppState> {
  return {
    version: 1,
    language: readLegacyLanguage(),
    activeWorkspace: window.localStorage.getItem(ACTIVE_WORKSPACE_KEY) ?? undefined,
    recentWorkspaces: loadLegacyJson<RecentWorkspace[]>(RECENT_WORKSPACES_KEY, []),
    targetHistory: loadLegacyJson<TargetRecord[]>(TARGET_HISTORY_KEY, []),
    projectState: loadLegacyJson<Record<string, ProjectUiState>>(PROJECT_STATE_KEY, {})
  };
}

function readLegacyLanguage(): Language | undefined {
  const stored = window.localStorage.getItem("skillops.language");
  return stored === "en" || stored === "zh-CN" ? stored : undefined;
}

function loadLegacyJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}
