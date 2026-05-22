export type Language = "en" | "zh-CN";

export interface Dictionary {
  appSubtitle: string;
  openWorkspace: string;
  addSkillProject: string;
  addLocalProject: string;
  localProjectHelp: string;
  githubProjectHelp: string;
  projectHealth: string;
  projectPath: string;
  settings: string;
  recentWorkspaces: string;
  currentWorkspace: string;
  addSharedSource: string;
  sharedSourcePlaceholder: string;
  downloadSource: string;
  downloadingSource: string;
  projectDownloading: string;
  projectDownloadFailed: string;
  noRecentWorkspaces: string;
  removeWorkspace: string;
  noWorkspace: string;
  chooseStatus: string;
  choosingWorkspace: string;
  chooseCanceled: string;
  desktopRequired: string;
  environmentReady: (version: string) => string;
  environmentGitMissing: string;
  cliReady: string;
  cliNeedsRepair: string;
  repairCli: string;
  scanning: string;
  errorStatus: (message: string) => string;
  foundStatus: (skills: number, score: number) => string;
  language: string;
  english: string;
  simplifiedChinese: string;
  tabs: {
    overview: string;
    skills: string;
    audit: string;
    profiles: string;
    destinations: string;
    share: string;
  };
  nextSteps: string;
  reviewAudit: string;
  configureProfiles: string;
  manageDestinations: string;
  prepareSharing: string;
  projectSummary: string;
  rescan: string;
  initConfig: string;
  emptyTitle: string;
  emptyBody: string;
  emptyExample: string;
  metrics: {
    skills: string;
    auditScore: string;
    critical: string;
    warnings: string;
    score: string;
    criticalFindings: string;
  };
  skillsTitle: string;
  sharedAssetsTitle: string;
  sharedAssetsHelp: string;
  noSharedAssets: string;
  noDescription: string;
  findingsTitle: string;
  noFindings: string;
  applyProfile: string;
  manageProfiles: string;
  profileHelp: string;
  newProfile: string;
  deleteProfile: string;
  saveProfiles: string;
  cancel: string;
  edit: string;
  profileName: string;
  unnamedProfile: string;
  profileDescription: string;
  includedSkills: string;
  allSkills: string;
  profileTargets: string;
  configSaved: string;
  profile: string;
  applySkills: string;
  applyHelp: string;
  source: string;
  destination: string;
  agentTargets: string;
  projectTarget: string;
  selectProject: string;
  targetGroups: string;
  newTargetGroup: string;
  editTargetGroup: string;
  deleteTargetGroup: string;
  saveTargetGroup: string;
  groupName: string;
  selectedTargets: string;
  noSelectedTargets: string;
  noTargetGroups: string;
  projectTargets: string;
  addProjectTarget: string;
  remove: string;
  installPreview: (skills: number, profile: string) => string;
  targetHistory: string;
  noTargetHistory: string;
  lastApplied: string;
  checkDrift: string;
  viewDiff: string;
  apply: string;
  copiedSkipped: (copied: number, skipped: number, copiedAssets?: number, skippedAssets?: number) => string;
  drift: string;
  driftEmpty: string;
  publishHelp: string;
  shareNow: string;
  shareTargets: string;
  newShareTarget: string;
  editShareTarget: string;
  deleteShareTarget: string;
  saveShareTarget: string;
  noShareTargets: string;
  remoteRepository: string;
  shareTargetMode: string;
  shareDirectPath: string;
  shareDirectPathHelp: string;
  shareNamedProject: string;
  shareNamedProjectHelp: string;
  shareProjectName: string;
  commitMessage: string;
  sharing: string;
  shareComplete: (branch: string) => string;
  shareOutput: string;
}

export const dictionaries: Record<Language, Dictionary> = {
  en: {
    appSubtitle: "GitHub-first skill project manager",
    openWorkspace: "Open local folder",
    addSkillProject: "Add Skill project",
    addLocalProject: "Local folder",
    localProjectHelp: "Use a repository or folder that already contains a skills/ directory.",
    githubProjectHelp: "Download a shared Skill project into the local SkillOps cache.",
    projectHealth: "Project health",
    projectPath: "Project path",
    settings: "Settings",
    recentWorkspaces: "Skill projects",
    currentWorkspace: "Current project",
    addSharedSource: "GitHub source",
    sharedSourcePlaceholder: "owner/repo or github.com/owner/repo/tree/main/path",
    downloadSource: "Download",
    downloadingSource: "Downloading shared source...",
    projectDownloading: "Downloading repository and preparing this Skill project.",
    projectDownloadFailed: "Download failed. Check the repository URL and Git credentials.",
    noRecentWorkspaces: "No Skill projects yet.",
    removeWorkspace: "Remove project",
    noWorkspace: "No Skill project selected",
    chooseStatus: "Choose or download a Skill project with a skills/ directory.",
    choosingWorkspace: "Opening folder picker...",
    chooseCanceled: "Project selection canceled.",
    desktopRequired: "Project actions require the Electron desktop window. Please use the SkillOps app window, not the browser tab.",
    environmentReady: (version: string) => `Runtime ready. ${version}`,
    environmentGitMissing: "Git is not available. Downloading and sharing GitHub projects will not work until Git is installed and available on PATH.",
    cliReady: "CLI ready.",
    cliNeedsRepair: "CLI needs repair.",
    repairCli: "Repair CLI",
    scanning: "Scanning workspace...",
    errorStatus: (message: string) => `Error: ${message}`,
    foundStatus: (skills: number, score: number) => `Found ${skills} skills. Audit score ${score}/100.`,
    language: "Language",
    english: "English",
    simplifiedChinese: "简体中文",
    tabs: {
      overview: "Overview",
      skills: "Skills",
      audit: "Audit",
      profiles: "Profiles",
      destinations: "Destinations",
      share: "Share"
    },
    nextSteps: "Next steps",
    reviewAudit: "Review audit",
    configureProfiles: "Configure profiles",
    manageDestinations: "Manage destinations",
    prepareSharing: "Prepare sharing",
    projectSummary: "Project summary",
    rescan: "Rescan",
    initConfig: "Init config",
    emptyTitle: "Add a Skill project",
    emptyBody: "SkillOps needs to open a repository that contains a skills/ directory. Each skill directory should include a SKILL.md file.",
    emptyExample: "Example:\nskills/\n  code-review/\n    SKILL.md\n  release-writer/\n    SKILL.md",
    metrics: {
      skills: "Skills",
      auditScore: "Audit score",
      critical: "Critical",
      warnings: "Warnings",
      score: "Score",
      criticalFindings: "Critical findings"
    },
    skillsTitle: "Skills",
    sharedAssetsTitle: "Shared assets",
    sharedAssetsHelp: "Folders under skills/ without a SKILL.md are treated as shared assets and are synced with every profile.",
    noSharedAssets: "No shared asset folders.",
    noDescription: "No description",
    findingsTitle: "Findings",
    noFindings: "No findings.",
    applyProfile: "Apply profile",
    manageProfiles: "Manage profiles",
    profileHelp: "Create reusable skill sets for agents, projects, teams, or release workflows.",
    newProfile: "New profile",
    deleteProfile: "Delete profile",
    saveProfiles: "Save profiles",
    cancel: "Cancel",
    edit: "Edit",
    profileName: "Profile name",
    unnamedProfile: "Unnamed profile",
    profileDescription: "Description",
    includedSkills: "Included skills",
    allSkills: "All skills",
    profileTargets: "Profile targets",
    configSaved: "Profiles saved.",
    profile: "Profile",
    applySkills: "Application targets",
    applyHelp: "Install the selected profile from this Skill project into an agent or project target.",
    source: "Source",
    destination: "Destination",
    agentTargets: "Agent targets",
    projectTarget: "Project target",
    selectProject: "Select project",
    targetGroups: "Target groups",
    newTargetGroup: "New target group",
    editTargetGroup: "Edit target group",
    deleteTargetGroup: "Delete target group",
    saveTargetGroup: "Save target group",
    groupName: "Group name",
    selectedTargets: "Selected targets",
    noSelectedTargets: "No targets selected.",
    noTargetGroups: "No saved target groups.",
    projectTargets: "Project targets",
    addProjectTarget: "Add project target",
    remove: "Remove",
    installPreview: (skills: number, profile: string) => `Ready to apply ${skills} skills from the ${profile} profile.`,
    targetHistory: "Target history",
    noTargetHistory: "No targets applied yet.",
    lastApplied: "Last applied",
    checkDrift: "Check drift",
    viewDiff: "View full diff",
    apply: "Apply",
    copiedSkipped: (copied: number, skipped: number, copiedAssets = 0, skippedAssets = 0) => `Copied ${copied} skills and ${copiedAssets} assets. Skipped ${skipped} skills and ${skippedAssets} assets.`,
    drift: "Drift",
    driftEmpty: "Run drift check to compare selected profile with target directory.",
    publishHelp: "Save reusable profile, repository, and target path combinations for GitHub-first sharing.",
    shareNow: "Share now",
    shareTargets: "Share targets",
    newShareTarget: "New share target",
    editShareTarget: "Edit share target",
    deleteShareTarget: "Delete share target",
    saveShareTarget: "Save share target",
    noShareTargets: "No saved share targets.",
    remoteRepository: "Remote repository",
    shareTargetMode: "Target path",
    shareDirectPath: "Use configured path",
    shareDirectPathHelp: "The repository path you entered is the Skill project root.",
    shareNamedProject: "Folder by project name",
    shareNamedProjectHelp: "SkillOps writes this project into a named folder under the repository path.",
    shareProjectName: "Project folder name",
    commitMessage: "Commit message",
    sharing: "Sharing project...",
    shareComplete: (branch: string) => `Shared to ${branch}.`,
    shareOutput: "Share output"
  },
  "zh-CN": {
    appSubtitle: "GitHub 优先的 Skill 项目管理器",
    openWorkspace: "打开本地文件夹",
    addSkillProject: "添加 Skill 项目",
    addLocalProject: "本地文件夹",
    localProjectHelp: "选择一个已经包含 skills/ 目录的仓库或文件夹。",
    githubProjectHelp: "把共享的 Skill 项目下载到本地 SkillOps 缓存。",
    projectHealth: "项目状态",
    projectPath: "项目路径",
    settings: "设置",
    recentWorkspaces: "Skill 项目",
    currentWorkspace: "当前项目",
    addSharedSource: "GitHub 来源",
    sharedSourcePlaceholder: "owner/repo 或 github.com/owner/repo/tree/main/path",
    downloadSource: "下载",
    downloadingSource: "正在下载共享来源...",
    projectDownloading: "正在下载仓库并准备这个 Skill 项目。",
    projectDownloadFailed: "下载失败，请检查仓库地址和 Git 凭据。",
    noRecentWorkspaces: "暂无 Skill 项目。",
    removeWorkspace: "移除项目",
    noWorkspace: "未选择 Skill 项目",
    chooseStatus: "请选择或下载一个包含 skills/ 目录的 Skill 项目。",
    choosingWorkspace: "正在打开文件夹选择器...",
    chooseCanceled: "已取消选择项目。",
    desktopRequired: "项目操作需要在 Electron 桌面窗口中使用，请不要在浏览器标签页中操作。",
    environmentReady: (version: string) => `运行环境可用。${version}`,
    environmentGitMissing: "未检测到 Git。安装 Git 并确保它在 PATH 中可用之前，GitHub 项目的下载和共享功能无法正常工作。",
    cliReady: "CLI 可用。",
    cliNeedsRepair: "CLI 需要修复。",
    repairCli: "修复 CLI",
    scanning: "正在扫描工作区...",
    errorStatus: (message: string) => `错误：${message}`,
    foundStatus: (skills: number, score: number) => `发现 ${skills} 个技能，审计评分 ${score}/100。`,
    language: "语言",
    english: "English",
    simplifiedChinese: "简体中文",
    tabs: {
      overview: "总览",
      skills: "技能",
      audit: "审计",
      profiles: "配置组",
      destinations: "应用目标",
      share: "共享"
    },
    nextSteps: "下一步",
    reviewAudit: "查看审计",
    configureProfiles: "配置技能组",
    manageDestinations: "管理应用目标",
    prepareSharing: "准备共享",
    projectSummary: "项目摘要",
    rescan: "重新扫描",
    initConfig: "初始化配置",
    emptyTitle: "添加 Skill 项目",
    emptyBody: "SkillOps 需要打开一个包含 skills/ 目录的仓库，每个技能目录里应包含 SKILL.md 文件。",
    emptyExample: "示例：\nskills/\n  code-review/\n    SKILL.md\n  release-writer/\n    SKILL.md",
    metrics: {
      skills: "技能数",
      auditScore: "审计评分",
      critical: "严重问题",
      warnings: "警告",
      score: "评分",
      criticalFindings: "严重发现"
    },
    skillsTitle: "技能",
    sharedAssetsTitle: "共享资产",
    sharedAssetsHelp: "skills/ 下没有 SKILL.md 的文件夹会被视为共享资产，并随每个配置组一起同步。",
    noSharedAssets: "暂无共享资产文件夹。",
    noDescription: "暂无描述",
    findingsTitle: "发现项",
    noFindings: "没有发现问题。",
    applyProfile: "应用配置组",
    manageProfiles: "管理配置组",
    profileHelp: "为 Agent、项目、团队或发布流程创建可复用的技能清单。",
    newProfile: "新建配置组",
    deleteProfile: "删除配置组",
    saveProfiles: "保存配置组",
    cancel: "取消",
    edit: "编辑",
    profileName: "配置组名称",
    unnamedProfile: "未命名配置组",
    profileDescription: "描述",
    includedSkills: "包含技能",
    allSkills: "全部技能",
    profileTargets: "适用目标",
    configSaved: "配置组已保存。",
    profile: "配置组",
    applySkills: "应用目标",
    applyHelp: "把当前 Skill 项目的配置组安装到某个 Agent 或项目目标中。",
    source: "来源",
    destination: "应用目标",
    agentTargets: "Agent 目标",
    projectTarget: "项目目标",
    selectProject: "选择项目",
    targetGroups: "目标组合",
    newTargetGroup: "新建目标组合",
    editTargetGroup: "编辑目标组合",
    deleteTargetGroup: "删除目标组合",
    saveTargetGroup: "保存目标组合",
    groupName: "组合名称",
    selectedTargets: "已选目标",
    noSelectedTargets: "尚未选择目标。",
    noTargetGroups: "暂无已保存的目标组合。",
    projectTargets: "项目目标",
    addProjectTarget: "添加项目目标",
    remove: "移除",
    installPreview: (skills: number, profile: string) => `准备应用 ${profile} 配置组中的 ${skills} 个技能。`,
    targetHistory: "目标历史",
    noTargetHistory: "尚未应用到任何目标。",
    lastApplied: "上次应用",
    checkDrift: "检查漂移",
    viewDiff: "查看完整 diff",
    apply: "应用",
    copiedSkipped: (copied: number, skipped: number, copiedAssets = 0, skippedAssets = 0) => `已复制 ${copied} 个技能和 ${copiedAssets} 个资产，跳过 ${skipped} 个技能和 ${skippedAssets} 个资产。`,
    drift: "漂移",
    driftEmpty: "运行漂移检查，将当前配置组与目标目录进行比较。",
    publishHelp: "保存配置组、远端仓库和目标路径组合，用于 GitHub 优先的共享执行。",
    shareNow: "立即共享",
    shareTargets: "共享目标",
    newShareTarget: "新建共享目标",
    editShareTarget: "编辑共享目标",
    deleteShareTarget: "删除共享目标",
    saveShareTarget: "保存共享目标",
    noShareTargets: "暂无已保存的共享目标。",
    remoteRepository: "远端仓库",
    shareTargetMode: "目标路径",
    shareDirectPath: "直接使用配置路径",
    shareDirectPathHelp: "你填写的仓库路径会被当成 Skill 项目根目录。",
    shareNamedProject: "按项目名称建目录",
    shareNamedProjectHelp: "SkillOps 会把当前项目写入仓库路径下的项目名称目录。",
    shareProjectName: "项目目录名称",
    commitMessage: "提交说明",
    sharing: "正在共享项目...",
    shareComplete: (branch: string) => `已共享到 ${branch}。`,
    shareOutput: "共享输出"
  }
};
