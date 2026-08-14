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

export type SkillAvailabilityMode = "user-ambient" | "project-ambient" | "user-on-demand";

export interface SkillAvailabilityOverride {
  skill: string;
  mode: SkillAvailabilityMode;
}

export interface ArcForgeProfileAvailability {
  defaultMode?: SkillAvailabilityMode;
  skills?: SkillAvailabilityOverride[];
}

export type SkillProjectApplicabilityConditionKind = "required" | "preferred" | "excluded";

export interface SkillProjectApplicabilityCondition {
  id: string;
  kind: SkillProjectApplicabilityConditionKind;
  description: string;
}

export interface SkillProjectApplicability {
  summary: string;
  conditions: SkillProjectApplicabilityCondition[];
  evidenceGuidance?: string[];
  clarifyingQuestions?: string[];
}

export type SkillProjectApplicabilityAssessmentStatus = "suitable" | "unsuitable" | "needs-input" | "overridden";

export interface SkillProjectApplicabilityAssessment {
  skill: string;
  projectRoots: string[];
  status: SkillProjectApplicabilityAssessmentStatus;
  decidedBy: "agent" | "user";
  summary: string;
  conditionResults: Array<{
    conditionId: string;
    outcome: "met" | "not-met" | "unknown";
    evidence: string[];
  }>;
  evidence: string[];
  unknowns: string[];
}

export interface SkillProjectManifestSkill {
  path: string;
  mode: SkillAvailabilityMode;
  aliases?: string[];
  projectApplicability?: SkillProjectApplicability;
}

export interface SkillProjectManifest {
  version: 1;
  sourceDir?: string;
  availability: {
    defaultMode?: SkillAvailabilityMode;
    skills: SkillProjectManifestSkill[];
  };
}

export interface SkillProjectManifestDiagnostic {
  severity: "info" | "warning" | "error";
  code: string;
  path?: string;
  message: string;
}

export type SkillAvailabilityPolicyOrigin =
  | "invocation"
  | "profile-skill"
  | "profile-default"
  | "source-skill"
  | "source-default"
  | "unclassified";

export interface ResolvedSkillAvailability {
  skill: string;
  sourcePath: string;
  sourceRecommendation?: SkillAvailabilityMode;
  sourceRecommendationOrigin: "skill" | "project" | "none";
  consumerOverride?: SkillAvailabilityMode;
  effectiveMode?: SkillAvailabilityMode;
  policyOrigin: SkillAvailabilityPolicyOrigin;
  projectApplicability?: SkillProjectApplicability;
  projectAssessment?: SkillProjectApplicabilityAssessment;
}

export interface SkillAvailabilityResolution {
  items: ResolvedSkillAvailability[];
  diagnostics: SkillProjectManifestDiagnostic[];
}

export type SkillAvailabilityDestinationKind = "user-agent" | "project-agent" | "user-catalog";

export interface SkillAvailabilityDestination {
  kind: SkillAvailabilityDestinationKind;
  agentId?: string;
  projectRoot?: string;
  path: string;
}

export interface SkillAvailabilityPlanItem extends ResolvedSkillAvailability {
  destinations: SkillAvailabilityDestination[];
  contentDigest: string;
}

export interface SkillAvailabilityLoaderTarget {
  agentId: string;
  path: string;
  status: "missing" | "same" | "managed-update" | "conflict";
  expectedDigest: string;
  existingDigest?: string;
}

export interface SkillAvailabilityCleanupItem {
  skill: string;
  path: string;
  reason: string;
  requiresConfirm: true;
}

export interface SkillAvailabilityPlan {
  sourceKey: string;
  sourceIdentity: string;
  profile: string;
  sourcePolicyDigest?: string;
  items: SkillAvailabilityPlanItem[];
  loaderTargets: SkillAvailabilityLoaderTarget[];
  cleanup: SkillAvailabilityCleanupItem[];
  diagnostics: SkillProjectManifestDiagnostic[];
  requiresConfirm: true;
}

export interface UserSkillCatalogEntry {
  qualifiedName: string;
  sourceKey: string;
  skillName: string;
  aliases?: string[];
  summary?: string;
  sourceRoot: string;
  sourceRemoteUrl?: string;
  sourceCommit?: string;
  skillPath: string;
  installedPath: string;
  contentDigest: string;
  appliedRecordIds: string[];
  installedAt: string;
}

export interface UserSkillCatalog {
  version: 1;
  updatedAt: string;
  entries: UserSkillCatalogEntry[];
}

export type CatalogResolveMode = "exact" | "search";

export interface CatalogResolveCandidate {
  skillName: string;
  qualifiedName: string;
  sourceKey: string;
  summary?: string;
}

export interface CatalogListResult {
  status: "available" | "empty";
  candidates: CatalogResolveCandidate[];
}

export interface CatalogResolveResult {
  status: "resolved" | "ambiguous" | "not-found";
  resolved?: UserSkillCatalogEntry;
  candidates: CatalogResolveCandidate[];
}

export type InstalledSkillInstallKind = "agent-user" | "agent-generic" | "codex-plugin-cache";

export interface InstalledSkillsScanOptions {
  home?: string;
  includeAgentSystemSkills?: boolean;
  includeCodexPluginCache?: boolean;
}

export interface InstalledSkillPluginMetadata {
  channel: string;
  pluginName: string;
  revision: string;
}

export interface InstalledSkillItem {
  name: string;
  description: string;
  path: string;
  relativePath: string;
  rootId: string;
  rootName: string;
  rootPath: string;
  installKind: InstalledSkillInstallKind;
  targets: string[];
  version?: string;
  hasReferences: boolean;
  hasScripts: boolean;
  isSystem: boolean;
  plugin?: InstalledSkillPluginMetadata;
}

export interface InstalledSkillRoot {
  id: string;
  name: string;
  path: string;
  installKind: InstalledSkillInstallKind;
  status: "missing" | "scanned" | "error";
  skillCount: number;
  error?: string;
}

export interface InstalledSkillDuplicateGroup {
  key: string;
  name: string;
  items: InstalledSkillItem[];
}

export interface InstalledSkillsInventory {
  home: string;
  generatedAt: string;
  options: InstalledSkillsScanOptions;
  roots: InstalledSkillRoot[];
  skills: InstalledSkillItem[];
  duplicateGroups: InstalledSkillDuplicateGroup[];
}

export type InstalledSkillOrganizeActionKind = "copy-to-generic" | "link-agent-directory" | "replace-with-link" | "remove-duplicate";

export interface InstalledSkillOrganizeAction {
  kind: InstalledSkillOrganizeActionKind;
  skillName: string;
  sourcePath: string;
  targetPath: string;
  reason: string;
  manifestSignature: string;
  rootName?: string;
}

export interface InstalledSkillOrganizeDecision {
  skillName: string;
  canonicalPath: string;
  reason: string;
  evidence: string[];
  actions: InstalledSkillOrganizeAction[];
}

export interface InstalledSkillOrganizeEvidenceGroup {
  skillName: string;
  items: Array<{
    rootName: string;
    path: string;
    installKind: InstalledSkillInstallKind;
    isSystem: boolean;
    manifestSignature: string;
  }>;
}

export interface InstalledSkillOrganizeConflict {
  skillName: string;
  reason: string;
  items: Array<{
    rootName: string;
    path: string;
    manifestSignature: string;
  }>;
}

export interface InstalledSkillOrganizePlan {
  home: string;
  generatedAt: string;
  genericRoot: string;
  evidenceGroups: InstalledSkillOrganizeEvidenceGroup[];
  decisions: InstalledSkillOrganizeDecision[];
  actions: InstalledSkillOrganizeAction[];
  conflicts: InstalledSkillOrganizeConflict[];
  requiresConfirm: boolean;
  messages: string[];
}

export interface InstalledSkillOrganizeResult {
  plan: InstalledSkillOrganizePlan;
  copied: string[];
  linked: string[];
  removed: string[];
  skipped: string[];
  conflicts: InstalledSkillOrganizeConflict[];
  messages: string[];
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
  source?: "rule" | "agent";
  evidence?: string;
  confidence?: "low" | "medium" | "high";
}

export type AuditMode = "rule" | "agent" | "hybrid";

export interface AuditAgentRun {
  name: string;
  status: "not_requested" | "completed" | "failed" | "timeout" | "unavailable";
  durationMs?: number;
  command?: string;
  error?: string;
}

export interface AgentAuditProxyConfig {
  enabled: boolean;
  proxyUrl?: string;
  noProxy?: string;
}

export interface AuditReport {
  root: string;
  generatedAt: string;
  skills: SkillSummary[];
  findings: AuditFinding[];
  coverage: {
    skillsChecked: number;
    filesChecked: number;
    ruleCategories: string[];
    findingCounts: Record<Severity, number>;
  };
  disclaimer: string;
  feedbackUrl: string;
  mode?: AuditMode;
  agent?: AuditAgentRun;
}

export interface ArcForgeProfile {
  name: string;
  description?: string;
  skills: string[];
  targets: string[];
  availability?: ArcForgeProfileAvailability;
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
  relationKind?: "profileApply" | "maintenanceImport";
  sourceRoot: string;
  sourceName?: string;
  sourceRemoteUrl?: string;
  sourceKey?: string;
  sourcePolicyDigest?: string;
  profile: string;
  targetDir: string;
  skills: string[];
  managedSkillNames?: string[];
  availabilityItems?: Array<{
    skill: string;
    mode: SkillAvailabilityMode;
    policyOrigin: SkillAvailabilityPolicyOrigin | "compatibility";
    destinations: string[];
  }>;
  availabilityContext?: {
    agentTargetIds: string[];
    projectTargetDirs: string[];
    availabilityOverrides?: SkillAvailabilityOverride[];
    projectAssessments?: SkillProjectApplicabilityAssessment[];
    homeDir: string;
  };
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

export interface ProjectResolveCandidate {
  path: string;
  name: string;
  exists: boolean;
  isSkillProject: boolean;
  sourceDir?: string;
  profiles: string[];
  skillCount: number;
  git?: {
    root: string;
    relativePath: string;
    currentBranch?: string;
    remotes: LocalGitRemote[];
    dirty?: boolean;
  };
  scan?: {
    ok: boolean;
    error?: string;
  };
  match: "exact-path" | "name" | "candidate" | "not-skill-project";
  reasons: string[];
}

export interface ProjectResolveResult {
  query: string;
  cwd: string;
  candidates: ProjectResolveCandidate[];
  selected?: ProjectResolveCandidate;
  messages: string[];
}

export interface LocalSkillWorkflowPlan {
  root: string;
  skill: string;
  sourceDir: string;
  sourceSkillPath: string;
  sourceExists: boolean;
  maintenance: {
    query: string;
    selected?: ProjectResolveCandidate;
    candidates: ProjectResolveCandidate[];
  };
  install?: {
    target: string;
    targetDir: string;
    relationRecordRoot?: string;
  };
  share?: {
    target: string;
    remoteName?: string;
    remoteUrl?: string;
  };
  stages: Array<{
    name: "resolve-maintenance-source" | "merge-plan" | "merge-run" | "apply-drift" | "apply-run" | "share-plan";
    writes: boolean;
    requiresConfirmation: boolean;
    command: string;
    description: string;
  }>;
  blocking: string[];
  warnings: string[];
  recommendedNextAction: string;
}

export interface CleanupLocalSkillPlan {
  root: string;
  sourceDir: string;
  skills: Array<{
    name: string;
    path: string;
    exists: boolean;
    isSkillDirectory: boolean;
    action: "delete" | "skip";
    reason: string;
  }>;
  requiresConfirm: boolean;
  messages: string[];
}

export interface CleanupLocalSkillResult {
  plan: CleanupLocalSkillPlan;
  deleted: string[];
  skipped: string[];
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
  kind?: "skill" | "asset" | "loader";
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

export interface DriftPolicyItem {
  skill: string;
  status: "same" | "changed" | "unclassified";
  recordedMode?: SkillAvailabilityMode;
  currentMode: SkillAvailabilityMode;
  recordedPaths?: string[];
  currentPaths: string[];
  reason: string;
}

export interface DriftFileDiff {
  path: string;
  status: "missing" | "changed" | "extra";
  sourceHash?: string;
  targetHash?: string;
}

export interface DriftTargetExtra {
  name: string;
  kind: "skill" | "asset" | "unknown";
  classification: "managed-stale" | "uncertain" | "unrelated";
  targetPath: string;
  reason: string;
}

export interface DriftReport {
  profile: string;
  targetDir: string;
  items: DriftItem[];
  targetExtras?: DriftTargetExtra[];
  policyDrift?: DriftPolicyItem[];
  availabilityPlan?: SkillAvailabilityPlan;
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
  installReference?: string;
  detectedIntegrations: string[];
  assessmentStatus: "not-supplied" | "supplied";
  readinessAssessment?: {
    summary: string;
    evidence: string[];
    unknowns: string[];
    installCommandCandidates: string[];
    checklist: string[];
  };
  sourceManifest?: {
    path: "arcforge.skill-project.json";
    selectedSkillPaths: string[];
    policyDigest: string;
    diagnostics: string[];
  };
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
  sourceManifest?: SkillProjectManifest;
  sourceManifestDiagnostics?: SkillProjectManifestDiagnostic[];
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
  criticalFindings: number;
  /** Legacy field kept for app-state migration from older desktop builds. */
  auditScore?: number;
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
  agentAuditProxy?: AgentAuditProxyConfig;
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
  targetDir: string | null;
  copied: string[];
  skipped: string[];
  copiedAssets?: string[];
  skippedAssets?: string[];
  availabilityPlan?: SkillAvailabilityPlan;
  destinations?: Array<{
    skill: string;
    kind: SkillAvailabilityDestinationKind | "loader";
    path: string;
    status: "copied" | "replaced" | "skipped";
  }>;
  catalogUpdated?: boolean;
  cleanedPaths?: string[];
}

export interface ApplyFromSourceResult {
  result: ApplyProfileResult;
  record?: AppliedSourceRecord;
  copiedThisRun: string[];
  selectedSkillsThisRun: string[];
  managedSkillNamesHistorical: string[];
}
