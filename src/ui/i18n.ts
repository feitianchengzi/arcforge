export type Language = "en" | "zh-CN";

export interface Dictionary {
  appSubtitle: string;
  openWorkspace: string;
  addSkillProject: string;
  addLocalProject: string;
  localProjectHelp: string;
  githubProjectHelp: string;
  editProjectSource: string;
  projectSource: string;
  localSource: string;
  githubSource: string;
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
  cliRepairing: string;
  cliRepairAvailable: string;
  cliRepairNeedsTerminal: string;
  cliRepairManualTitle: string;
  cliRepairManualBody: string;
  cliRepairCopy: string;
  cliRepairCopied: string;
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
  skillFilesTitle: string;
  openSkillWindow: string;
  openFileWindow: string;
  saveFile: string;
  reloadFile: string;
  noSkillFiles: string;
  selectSkillFile: string;
  loadingFile: string;
  savingFile: string;
  cannotOpenFile: string;
  unsavedChanges: string;
  fileSaved: string;
  fileLoaded: string;
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
  targetGroups: string;
  newTargetGroup: string;
  editTargetGroup: string;
  deleteTargetGroup: string;
  saveTargetGroup: string;
  groupName: string;
  selectedTargets: string;
  noSelectedTargets: string;
  noTargetGroups: string;
  targetGroupSummary: (agents: number, targets: number) => string;
  agentProjectFolders: string;
  addAgentProjectFolder: string;
  agentProjectFolderHelp: string;
  customTargets: string;
  addCustomTarget: string;
  targetRoutingHelp: string;
  agentRequired: string;
  targetRequired: string;
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
  sameRepository: string;
  sameRepositoryHelp: string;
  sameRepositoryRemote: string;
  sameRepositoryPath: string;
  commitMessage: string;
  sharing: string;
  shareReady: (branch: string) => string;
  shareReadyLocal: (branch: string) => string;
  shareComplete: (branch: string) => string;
  sharePrComplete: (url: string) => string;
  shareOutput: string;
  githubAccess: string;
  deliveryMethod: string;
  recommended: string;
  targetPullRequest: string;
  forkPullRequest: string;
  directPush: string;
  localBranch: string;
  confirmShare: string;
  cancelShare: string;
  pullRequest: string;
  manualCommands: string;
  cliPreview: string;
}

export const dictionaries: Record<Language, Dictionary> = {
  en: {
    appSubtitle: "GitHub-first skill project manager",
    openWorkspace: "Open local folder",
    addSkillProject: "Add Skill project",
    addLocalProject: "Local folder",
    localProjectHelp: "Use a repository with skills/ or a single skill folder with SKILL.md.",
    githubProjectHelp: "Download a Skill project or single skill folder into the local SkillOps cache.",
    editProjectSource: "Edit project source",
    projectSource: "Project source",
    localSource: "Local",
    githubSource: "GitHub",
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
    chooseStatus: "Choose or download a Skill project with skills/ or a single SKILL.md folder.",
    choosingWorkspace: "Opening folder picker...",
    chooseCanceled: "Project selection canceled.",
    desktopRequired: "Project actions require the Electron desktop window. Please use the SkillOps app window, not the browser tab.",
    environmentReady: (version: string) => `Runtime ready. ${version}`,
    environmentGitMissing: "Git is not available. Downloading and sharing GitHub projects will not work until Git is installed and available on PATH.",
    cliReady: "CLI ready.",
    cliNeedsRepair: "CLI needs repair.",
    repairCli: "Repair CLI",
    cliRepairing: "Repairing CLI...",
    cliRepairAvailable: "CLI repaired. Open a new terminal if an old terminal still cannot find skillops.",
    cliRepairNeedsTerminal: "CLI shim was repaired. Open a new terminal, or copy the details below to apply the PATH change manually.",
    cliRepairManualTitle: "CLI repair details",
    cliRepairManualBody: "SkillOps could not fully verify the CLI in the current environment. Copy these details to a terminal or another repair tool.",
    cliRepairCopy: "Copy details",
    cliRepairCopied: "Copied",
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
    emptyBody: "SkillOps can open a repository with a skills/ directory, or a single skill folder that contains SKILL.md.",
    emptyExample: "Example:\nskills/\n  code-review/\n    SKILL.md\n\nSingle skill folder:\ncode-review/\n  SKILL.md",
    metrics: {
      skills: "Skills",
      auditScore: "Audit score",
      critical: "Critical",
      warnings: "Warnings",
      score: "Score",
      criticalFindings: "Critical findings"
    },
    skillsTitle: "Skills",
    skillFilesTitle: "Files",
    openSkillWindow: "Open skill window",
    openFileWindow: "Open file window",
    saveFile: "Save",
    reloadFile: "Reload",
    noSkillFiles: "No files found in this skill.",
    selectSkillFile: "Select a file to view or edit.",
    loadingFile: "Loading file...",
    savingFile: "Saving file...",
    cannotOpenFile: "Cannot open file",
    unsavedChanges: "Unsaved changes",
    fileSaved: "File saved.",
    fileLoaded: "File loaded.",
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
    targetGroups: "Target groups",
    newTargetGroup: "New target group",
    editTargetGroup: "Edit target group",
    deleteTargetGroup: "Delete target group",
    saveTargetGroup: "Save target group",
    groupName: "Group name",
    selectedTargets: "Selected targets",
    noSelectedTargets: "No targets selected.",
    noTargetGroups: "No saved target groups.",
    targetGroupSummary: (agents: number, targets: number) => `${agents} agents / ${targets} targets`,
    agentProjectFolders: "Project folders for selected agents",
    addAgentProjectFolder: "Add project folder",
    agentProjectFolderHelp: "When project folders are selected, each checked agent is installed under that project, such as .codex/skills. Without project folders, checked agents use their user-level folders.",
    customTargets: "Custom targets",
    addCustomTarget: "Add custom target",
    targetRoutingHelp: "Choose agents first, then optionally add project folders for those agents. Custom targets are used exactly as selected.",
    agentRequired: "Project folders require at least one agent target.",
    targetRequired: "Select at least one agent target or add a custom target.",
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
    sameRepository: "Share to the same repository",
    sameRepositoryHelp: "Commit and push from the local Git repository, using the current Skill project path only.",
    sameRepositoryRemote: "Git remote",
    sameRepositoryPath: "Local repository path",
    commitMessage: "Commit message",
    sharing: "Sharing project...",
    shareReady: (branch: string) => `Ready to share from ${branch}. Confirm to write to GitHub.`,
    shareReadyLocal: (branch: string) => `Ready to create local share branch ${branch}.`,
    shareComplete: (branch: string) => `Shared to ${branch}.`,
    sharePrComplete: (url: string) => `Pull request created: ${url}`,
    shareOutput: "Share output",
    githubAccess: "GitHub access",
    deliveryMethod: "Delivery method",
    recommended: "Recommended",
    targetPullRequest: "Target repo PR",
    forkPullRequest: "Fork PR",
    directPush: "Push branch",
    localBranch: "Local branch",
    confirmShare: "Confirm share",
    cancelShare: "Cancel",
    pullRequest: "Pull request",
    manualCommands: "Manual commands",
    cliPreview: "CLI preview"
  },
  "zh-CN": {
    appSubtitle: "GitHub 优先的 Skill 项目管理器",
    openWorkspace: "打开本地文件夹",
    addSkillProject: "添加 Skill 项目",
    addLocalProject: "本地文件夹",
    localProjectHelp: "选择包含 skills/ 的仓库，或直接选择包含 SKILL.md 的单个 skill 文件夹。",
    githubProjectHelp: "把 Skill 项目或单个 skill 文件夹下载到本地 SkillOps 缓存。",
    editProjectSource: "编辑项目来源",
    projectSource: "项目来源",
    localSource: "本地",
    githubSource: "GitHub",
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
    chooseStatus: "请选择或下载包含 skills/ 的 Skill 项目，或单个 SKILL.md 文件夹。",
    choosingWorkspace: "正在打开文件夹选择器...",
    chooseCanceled: "已取消选择项目。",
    desktopRequired: "项目操作需要在 Electron 桌面窗口中使用，请不要在浏览器标签页中操作。",
    environmentReady: (version: string) => `运行环境可用。${version}`,
    environmentGitMissing: "未检测到 Git。安装 Git 并确保它在 PATH 中可用之前，GitHub 项目的下载和共享功能无法正常工作。",
    cliReady: "CLI 可用。",
    cliNeedsRepair: "CLI 需要修复。",
    repairCli: "修复 CLI",
    cliRepairing: "正在修复 CLI...",
    cliRepairAvailable: "CLI 已修复。如果旧终端仍找不到 skillops，请打开一个新终端。",
    cliRepairNeedsTerminal: "CLI shim 已修复。请打开一个新终端，或复制下面的信息手动应用 PATH 变更。",
    cliRepairManualTitle: "CLI 修复信息",
    cliRepairManualBody: "当前环境中无法完整验证 CLI。你可以复制这些信息到终端或其他修复工具中继续尝试。",
    cliRepairCopy: "复制信息",
    cliRepairCopied: "已复制",
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
    emptyBody: "SkillOps 可以打开包含 skills/ 目录的仓库，也可以直接打开包含 SKILL.md 的单个 skill 文件夹。",
    emptyExample: "示例：\nskills/\n  code-review/\n    SKILL.md\n\n单个 skill 文件夹：\ncode-review/\n  SKILL.md",
    metrics: {
      skills: "技能数",
      auditScore: "审计评分",
      critical: "严重问题",
      warnings: "警告",
      score: "评分",
      criticalFindings: "严重发现"
    },
    skillsTitle: "技能",
    skillFilesTitle: "文件",
    openSkillWindow: "独立打开技能",
    openFileWindow: "独立打开文件",
    saveFile: "保存",
    reloadFile: "重载",
    noSkillFiles: "这个技能下没有可查看的文件。",
    selectSkillFile: "选择一个文件进行查看或编辑。",
    loadingFile: "正在加载文件...",
    savingFile: "正在保存文件...",
    cannotOpenFile: "无法打开文件",
    unsavedChanges: "有未保存修改",
    fileSaved: "文件已保存。",
    fileLoaded: "文件已加载。",
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
    targetGroups: "目标组合",
    newTargetGroup: "新建目标组合",
    editTargetGroup: "编辑目标组合",
    deleteTargetGroup: "删除目标组合",
    saveTargetGroup: "保存目标组合",
    groupName: "组合名称",
    selectedTargets: "已选目标",
    noSelectedTargets: "尚未选择目标。",
    noTargetGroups: "暂无已保存的目标组合。",
    targetGroupSummary: (agents: number, targets: number) => `${agents} 个 Agent / ${targets} 个目标`,
    agentProjectFolders: "所选 Agent 的项目目录",
    addAgentProjectFolder: "添加项目目录",
    agentProjectFolderHelp: "选择项目目录后，每个勾选的 Agent 会安装到该项目下的对应目录，例如 .codex/skills。未选择项目目录时，勾选的 Agent 使用用户级目录。",
    customTargets: "自定义目标",
    addCustomTarget: "添加自定义目标",
    targetRoutingHelp: "先选择 Agent，再按需为这些 Agent 添加项目目录。自定义目标会按所选目录原样应用。",
    agentRequired: "项目目录需要先选择至少一个 Agent 目标。",
    targetRequired: "请选择至少一个 Agent 目标，或添加一个自定义目标。",
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
    sameRepository: "共享到同一个仓库",
    sameRepositoryHelp: "直接在本地 Git 仓库提交并推送，只操作当前 Skill 项目路径。",
    sameRepositoryRemote: "Git 源",
    sameRepositoryPath: "本地仓库路径",
    commitMessage: "提交说明",
    sharing: "正在共享项目...",
    shareReady: (branch: string) => `准备从 ${branch} 共享。确认后会写入 GitHub。`,
    shareReadyLocal: (branch: string) => `准备创建本地共享分支 ${branch}。`,
    shareComplete: (branch: string) => `已共享到 ${branch}。`,
    sharePrComplete: (url: string) => `已创建 Pull Request：${url}`,
    shareOutput: "共享输出",
    githubAccess: "GitHub 权限",
    deliveryMethod: "交付方式",
    recommended: "推荐",
    targetPullRequest: "目标仓库 PR",
    forkPullRequest: "Fork PR",
    directPush: "推送分支",
    localBranch: "本地分支",
    confirmShare: "确认共享",
    cancelShare: "取消",
    pullRequest: "Pull Request",
    manualCommands: "手动命令",
    cliPreview: "CLI 预览"
  }
};
