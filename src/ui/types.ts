import type { AppState, AppliedSourceRecord, ApplyProfileResult, CliInstallStatus, DriftReport, EnvironmentStatus, ImportSkillsPlan, ImportSkillsResult, MergePlan, MergeResult, ShareDeliveryMethod, SharePlanResult, ShareResult, ShareTargetMode, SkillEditorWindowContext, SkillFileDocument, SkillFileEntry, SkillOpsConfig, SourceUpdateResult, SourceUpdateStatus, WorkspaceSnapshot } from "../shared/types";

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

export interface DirectorySelectionResult {
  path: string;
  relativePath: string;
  isInside: boolean;
}

declare global {
  interface Window {
    skillops: {
      chooseWorkspace: () => Promise<string | undefined>;
      chooseDirectory?: (defaultPath?: string, parentPath?: string) => Promise<string | DirectorySelectionResult | undefined>;
      scanWorkspace: (root: string) => Promise<WorkspaceSnapshot>;
      saveConfig: (root: string, config: SkillOpsConfig) => Promise<WorkspaceSnapshot>;
      openWorkspaceFolder: (root: string) => Promise<void>;
      getDefaultTargets: () => Promise<DefaultTarget[]>;
      getEnvironmentStatus: () => Promise<EnvironmentStatus>;
      installCli: () => Promise<CliInstallStatus>;
      openExternal: (url: string) => Promise<void>;
      loadAppState: () => Promise<AppState>;
      saveAppState: (patch: Partial<AppState>) => Promise<AppState>;
      migrateAppState: (legacyState: Partial<AppState>, origin: string) => Promise<AppState>;
      addRemoteWorkspace: (remoteUrl: string) => Promise<string>;
      sourceUpdateStatus: (root: string) => Promise<SourceUpdateStatus>;
      updateSource: (root: string, confirm?: boolean) => Promise<SourceUpdateResult>;
      createMergePlan: (options: { root: string; to: string; targetPath: string; profile?: string; skills?: string[]; targetDir?: string; confirm?: boolean }) => Promise<MergePlan>;
      mergeIntoProject: (options: { root: string; to: string; targetPath: string; profile?: string; skills?: string[]; targetDir?: string; confirm?: boolean }) => Promise<MergeResult>;
      createImportSkillsPlan: (options: { root: string; from: string; profile?: string; skills?: string[]; targetDir?: string; targetProfile?: string; confirm?: boolean }) => Promise<ImportSkillsPlan>;
      importSkillsIntoProject: (options: { root: string; from: string; profile?: string; skills?: string[]; targetDir?: string; targetProfile?: string; confirm?: boolean }) => Promise<ImportSkillsResult>;
      listAppliedSources: (root: string) => Promise<AppliedSourceRecord[]>;
      driftAppliedSources: (root: string, id?: string) => Promise<DriftReport[]>;
      runAppliedSources: (root: string, id?: string) => Promise<Array<{ record: AppliedSourceRecord; result: ApplyProfileResult }>>;
      applyFromSource: (root: string, from: string | undefined, profile: string, targetDir: string, save?: boolean, skills?: string[]) => Promise<{ result: ApplyProfileResult; record?: AppliedSourceRecord }>;
      driftFromSource: (root: string, from: string | undefined, profile: string, targetDir: string, skills?: string[]) => Promise<DriftReport>;
      createSharePlan: (root: string, remoteUrl: string, visibility: "private" | "public", targetMode: ShareTargetMode, projectName: string, profileName: string, message?: string, delivery?: ShareDeliveryMethod, branch?: string, sameRepository?: boolean, sameRepositoryRemote?: string) => Promise<SharePlanResult>;
      shareProject: (root: string, remoteUrl: string, visibility: "private" | "public", message: string, targetMode: ShareTargetMode, projectName: string, profileName: string, delivery?: ShareDeliveryMethod, branch?: string, confirm?: boolean, sameRepository?: boolean, sameRepositoryRemote?: string) => Promise<ShareResult>;
      shareDriftReport: (root: string, remoteUrl: string, targetMode: ShareTargetMode, projectName: string, profileName: string, sameRepository?: boolean, sameRepositoryRemote?: string) => Promise<DriftReport>;
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
