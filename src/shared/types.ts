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

export interface SkillFileEntry {
  name: string;
  path: string;
  relativePath: string;
  type: "file" | "directory";
  size?: number;
  children?: SkillFileEntry[];
}

export interface SkillFileDocument {
  path: string;
  relativePath: string;
  content: string;
  modifiedAt: string;
}

export interface SkillEditorWindowContext {
  sourceDir: string;
  profileName?: string;
  profiles: ArcForgeProfile[];
  skills: SkillSummary[];
  assets: SharedAssetSummary[];
  collapsedFolders?: string[];
  treeScrollTop?: number;
  editorScrollTop?: number;
  labels?: {
    files: string;
    profile: string;
    reload: string;
    save: string;
    noFileSelected: string;
    selectFile: string;
    loading: string;
    loaded: string;
    saving: string;
    saved: string;
    cannotOpenFile: string;
  };
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
  disclaimer: string;
  feedbackUrl: string;
}

export interface ArcForgeProfile {
  name: string;
  description?: string;
  skills: string[];
  targets: string[];
}

export interface ArcForgeConfig {
  version: 1;
  sourceDir: string;
  teamRepo?: string;
  shareTargetMode?: ShareTargetMode;
  shareProjectName?: string;
  applyTargets?: ApplyTargetGroup[];
  shareTargets?: ShareTargetGroup[];
  profiles: ArcForgeProfile[];
}

export interface AppliedSourceRecord {
  id: string;
  sourceRoot: string;
  sourceName?: string;
  sourceRemoteUrl?: string;
  profile: string;
  targetDir: string;
  skills: string[];
  sourceCommit?: string;
  appliedAt?: string;
  updatedAt: string;
}

export interface MergeSkillPlanItem {
  name: string;
  sourcePath: string;
  targetPath: string;
  status: "new" | "same" | "conflict";
  files?: DriftFileDiff[];
}

export interface MergePlan {
  root: string;
  targetProjectRoot: string;
  targetProjectName: string;
  targetPath: string;
  profile: string;
  targetDir: string;
  skills: MergeSkillPlanItem[];
  appliedRecord: AppliedSourceRecord;
  hasConflicts: boolean;
}

export interface MergeResult {
  plan: MergePlan;
  copied: string[];
  skipped: string[];
  appliedRecord: AppliedSourceRecord;
  messages: string[];
}

export interface ImportSkillsPlan {
  root: string;
  sourceProjectRoot: string;
  sourceProjectName: string;
  sourceProfile: string;
  targetDir: string;
  targetProfile: string;
  skills: MergeSkillPlanItem[];
  appliedRecord: AppliedSourceRecord;
  hasConflicts: boolean;
}

export interface ImportSkillsResult {
  plan: ImportSkillsPlan;
  copied: string[];
  skipped: string[];
  appliedRecord: AppliedSourceRecord;
  messages: string[];
}

export interface ApplyTargetGroup {
  id: string;
  name: string;
  profile: string;
  agentTargetIds: string[];
  projectTargetDirs: string[];
  customTargetDirs?: string[];
}

export interface ShareTargetGroup {
  id: string;
  name: string;
  profile: string;
  remoteUrl: string;
  targetMode: ShareTargetMode;
  projectName?: string;
  sameRepository?: boolean;
  sameRepositoryRemote?: string;
}

export interface LocalGitRemote {
  name: string;
  fetchUrl?: string;
  pushUrl?: string;
  canonicalKey: string;
}

export interface LocalGitSource {
  root: string;
  relativePath: string;
  currentBranch?: string;
  remotes: LocalGitRemote[];
}

export interface SourceUpdateStatus {
  root: string;
  gitRoot: string;
  relativePath: string;
  branch?: string;
  upstream?: string;
  remoteName?: string;
  remoteUrl?: string;
  head?: string;
  upstreamHead?: string;
  ahead: number;
  behind: number;
  dirty: boolean;
  canUpdate: boolean;
  previousFetchAt?: string;
  previousFetchAgeMs?: number;
  checkedAt: string;
  messages: string[];
}

export interface SourceUpdateResult {
  before: SourceUpdateStatus;
  after: SourceUpdateStatus;
  updated: boolean;
  fastForwardOnly: boolean;
  messages: string[];
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
  remoteUrl?: string;
  targetPath?: string;
  commitHash?: string;
  sameRepository?: boolean;
  messages?: string[];
}

export interface ApplyDriftCheckRecord {
  checkedAt: string;
  signature?: string;
  reports: DriftReport[];
  error?: string;
}

export interface ShareDriftCheckRecord {
  checkedAt: string;
  signature?: string;
  report?: DriftReport;
  error?: string;
}

export interface SourceUpdateCheckRecord {
  checkedAt: string;
  status?: SourceUpdateStatus;
  error?: string;
}

export interface PublishPlan {
  root: string;
  repositoryName: string;
  visibility: "private" | "public";
  files: string[];
  installCommands: string[];
  checklist: string[];
}

export type ShareDeliveryMethod = "targetPullRequest" | "forkPullRequest" | "directPush" | "localBranch";

export interface GitHubAccessResult {
  remoteUrl: string;
  cloneUrl: string;
  repository?: string;
  defaultBranch?: string;
  viewerPermission?: string;
  authenticated: boolean;
  ghAvailable: boolean;
  canPush: boolean;
  canCreatePullRequest: boolean;
  canFork: boolean;
  recommendedDelivery: ShareDeliveryMethod;
  availableDelivery: ShareDeliveryMethod[];
  unavailableReasons: string[];
  messages: string[];
}

export interface SharePlanResult {
  plan: PublishPlan;
  access: GitHubAccessResult;
  delivery: ShareDeliveryMethod;
  requiresConfirm: boolean;
  branch: string;
  targetPath: string;
  commands: string[];
  sameRepository?: boolean;
  localGit?: LocalGitSource;
}

export interface ShareResult {
  remoteUrl: string;
  branch: string;
  targetPath?: string;
  checkoutRoot?: string;
  committed: boolean;
  pushed: boolean;
  sameRepository?: boolean;
  delivery?: ShareDeliveryMethod;
  pullRequestUrl?: string;
  commitHash?: string;
  access?: GitHubAccessResult;
  manualCommands?: string[];
  errorStage?: string;
  messages: string[];
}

export type ShareTargetMode = "direct" | "namedProject";

export interface WorkspaceSnapshot {
  root: string;
  config: ArcForgeConfig;
  skills: SkillSummary[];
  assets: SharedAssetSummary[];
  audit: AuditReport;
  localGit?: LocalGitSource;
}

export interface RecentWorkspace {
  path: string;
  name: string;
  lastOpenedAt: string;
  skillCount: number;
  auditScore: number;
  status?: "ready" | "downloading" | "error";
  sourceKind?: "local" | "github";
  localSourcePath?: string;
  githubSourceUrl?: string;
  /** Legacy field kept for app-state migration from older desktop builds. */
  sourceUrl?: string;
  error?: string;
}

export interface TargetRecord {
  id: string;
  sourcePath: string;
  sourceName: string;
  profile: string;
  destinationName: string;
  destinationPath: string;
  lastAppliedAt: string;
}

export interface ProjectUiState {
  tab?: "overview" | "skills" | "profiles" | "destinations" | "share" | "audit";
  profile?: string;
  applyTargetGroupId?: string;
  shareTargetGroupId?: string;
  applyDriftChecks?: Record<string, ApplyDriftCheckRecord>;
  shareDriftChecks?: Record<string, ShareDriftCheckRecord>;
  sourceUpdateCheck?: SourceUpdateCheckRecord;
}

export interface AppState {
  version: 1;
  language?: "en" | "zh-CN";
  activeWorkspace?: string;
  recentWorkspaces: RecentWorkspace[];
  targetHistory: TargetRecord[];
  projectState: Record<string, ProjectUiState>;
  migratedLocalStorageOrigins?: string[];
}

export interface EnvironmentStatus {
  platform: string;
  arch: string;
  git: {
    available: boolean;
    version?: string;
    error?: string;
  };
  cli?: CliInstallStatus;
  tools?: {
    skillshare: ToolStatus;
    npx: ToolStatus;
    clawhub: ToolStatus;
  };
}

export interface CliInstallStatus {
  available: boolean;
  executablePath?: string;
  shimPath?: string;
  shimDir?: string;
  shimExists: boolean;
  shimDirInPath: boolean;
  shellProfilePath?: string;
  shellProfileUpdated?: boolean;
  message?: string;
}

export interface ToolStatus {
  available: boolean;
  version?: string;
  error?: string;
}

export interface ApplyProfileResult {
  profile: string;
  targetDir: string;
  copied: string[];
  skipped: string[];
  copiedAssets?: string[];
  skippedAssets?: string[];
}
