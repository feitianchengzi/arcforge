import type { AppState, ApplyProfileResult, CliInstallStatus, DriftReport, EnvironmentStatus, ShareDeliveryMethod, SharePlanResult, ShareResult, ShareTargetMode, SkillEditorWindowContext, SkillFileDocument, SkillFileEntry, SkillOpsConfig, WorkspaceSnapshot } from "../shared/types";

export type Tab = "overview" | "skills" | "profiles" | "destinations" | "share" | "audit";

export interface DefaultTarget {
  id: string;
  name: string;
  path: string;
}

export interface CliRepairNotice {
  title: string;
  body: string;
  details: string;
  copied: boolean;
}

export interface ResolvedApplyTarget {
  kind: "agent" | "project" | "custom";
  id: string;
  name: string;
  path: string;
}

declare global {
  interface Window {
    skillops: {
      chooseWorkspace: () => Promise<string | undefined>;
      scanWorkspace: (root: string) => Promise<WorkspaceSnapshot>;
      initWorkspace: (root: string) => Promise<unknown>;
      saveConfig: (root: string, config: SkillOpsConfig) => Promise<WorkspaceSnapshot>;
      getDefaultTargets: () => Promise<DefaultTarget[]>;
      getEnvironmentStatus: () => Promise<EnvironmentStatus>;
      installCli: () => Promise<CliInstallStatus>;
      loadAppState: () => Promise<AppState>;
      saveAppState: (patch: Partial<AppState>) => Promise<AppState>;
      migrateAppState: (legacyState: Partial<AppState>, origin: string) => Promise<AppState>;
      downloadSource: (remoteUrl: string) => Promise<string>;
      createSharePlan: (root: string, remoteUrl: string, visibility: "private" | "public", targetMode: ShareTargetMode, projectName: string, profileName: string, delivery?: ShareDeliveryMethod, branch?: string) => Promise<SharePlanResult>;
      shareProject: (root: string, remoteUrl: string, visibility: "private" | "public", message: string, targetMode: ShareTargetMode, projectName: string, profileName: string, delivery?: ShareDeliveryMethod, branch?: string, confirm?: boolean) => Promise<ShareResult>;
      applyProfile: (root: string, profile: string, targetDir: string) => Promise<ApplyProfileResult>;
      driftReport: (root: string, profile: string, targetDir: string) => Promise<DriftReport>;
      openDriftDiff: (report: DriftReport) => Promise<void>;
      listSkillFiles: (root: string, skillPath: string) => Promise<SkillFileEntry[]>;
      listWorkspaceFiles: (root: string, directoryPath: string) => Promise<SkillFileEntry[]>;
      readSkillFile: (root: string, filePath: string) => Promise<SkillFileDocument>;
      writeSkillFile: (root: string, filePath: string, content: string) => Promise<SkillFileDocument>;
      openSkillFileWindow: (root: string, skillPath: string, filePath?: string, context?: SkillEditorWindowContext) => Promise<void>;
      openWorkspaceFileWindow: (root: string, directoryPath: string, filePath?: string, context?: SkillEditorWindowContext) => Promise<void>;
    };
  }
}
