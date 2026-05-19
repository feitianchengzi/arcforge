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
  profiles: SkillOpsProfile[];
}

export interface DriftItem {
  skill: string;
  status: "missing" | "changed" | "same";
  sourcePath: string;
  targetPath: string;
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

export interface WorkspaceSnapshot {
  root: string;
  config: SkillOpsConfig;
  skills: SkillSummary[];
  audit: AuditReport;
}

export interface ApplyProfileResult {
  profile: string;
  targetDir: string;
  copied: string[];
  skipped: string[];
}
