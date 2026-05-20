export type Severity = "info" | "warning" | "critical";

export interface SkillSummary {
  name: string;
  description: string;
  path: string;
  relativePath: string;
  targets: string[];
  version?: string;
  hasReferences: boolean;
  hasScripts: boolean;
}

export interface SharedAssetSummary {
  name: string;
  path: string;
  relativePath: string;
}

export interface AuditFinding {
  severity: Severity;
  code: string;
  message: string;
  file: string;
  line?: number;
}

export interface AuditReport {
  root: string;
  generatedAt: string;
  skills: SkillSummary[];
  findings: AuditFinding[];
  score: number;
}

export interface SkillOpsProfile {
  name: string;
  description?: string;
  skills: string[];
  targets: string[];
}

export interface SkillOpsConfig {
  version: 1;
  sourceDir: string;
  teamRepo?: string;
  shareTargetMode?: ShareTargetMode;
  shareProjectName?: string;
  profiles: SkillOpsProfile[];
}

export interface DriftItem {
  skill: string;
  kind?: "skill" | "asset";
  status: "missing" | "changed" | "same";
  sourcePath: string;
  targetPath: string;
  files?: DriftFileDiff[];
  summary?: {
    missing: number;
    changed: number;
    extra: number;
  };
}

export interface DriftFileDiff {
  path: string;
  status: "missing" | "changed" | "extra";
  sourceHash?: string;
  targetHash?: string;
}

export interface DriftReport {
  profile: string;
  targetDir: string;
  items: DriftItem[];
}

export interface PublishPlan {
  root: string;
  repositoryName: string;
  visibility: "private" | "public";
  files: string[];
  installCommands: string[];
  checklist: string[];
}

export interface ShareResult {
  remoteUrl: string;
  branch: string;
  targetPath?: string;
  committed: boolean;
  pushed: boolean;
  messages: string[];
}

export type ShareTargetMode = "direct" | "namedProject";

export interface WorkspaceSnapshot {
  root: string;
  config: SkillOpsConfig;
  skills: SkillSummary[];
  assets: SharedAssetSummary[];
  audit: AuditReport;
}

export interface ApplyProfileResult {
  profile: string;
  targetDir: string;
  copied: string[];
  skipped: string[];
  copiedAssets?: string[];
  skippedAssets?: string[];
}
