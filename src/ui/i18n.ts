export type Language = "en" | "zh-CN";

export interface Dictionary {
  appSubtitle: string;
  openWorkspace: string;
  noWorkspace: string;
  chooseStatus: string;
  choosingWorkspace: string;
  chooseCanceled: string;
  desktopRequired: string;
  scanning: string;
  errorStatus: (message: string) => string;
  foundStatus: (skills: number, score: number) => string;
  language: string;
  english: string;
  simplifiedChinese: string;
  tabs: {
    overview: string;
    audit: string;
    profiles: string;
    publish: string;
  };
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
  noDescription: string;
  findingsTitle: string;
  noFindings: string;
  applyProfile: string;
  profile: string;
  targetDirectory: string;
  checkDrift: string;
  apply: string;
  copiedSkipped: (copied: number, skipped: number) => string;
  drift: string;
  driftEmpty: string;
  publishPlan: string;
  publishHelp: string;
  privateTeamRepo: string;
  publicRelease: string;
  planOutput: string;
  noPublishPlan: string;
  installCommands: string;
  checklist: string;
}

export const dictionaries: Record<Language, Dictionary> = {
  en: {
    appSubtitle: "GitHub-first skill workspace",
    openWorkspace: "Open workspace",
    noWorkspace: "No workspace selected",
    chooseStatus: "Choose a workspace with a skills/ directory.",
    choosingWorkspace: "Opening workspace picker...",
    chooseCanceled: "Workspace selection canceled.",
    desktopRequired: "Workspace actions require the Electron desktop window. Please use the SkillOps app window, not the browser tab.",
    scanning: "Scanning workspace...",
    errorStatus: (message: string) => `Error: ${message}`,
    foundStatus: (skills: number, score: number) => `Found ${skills} skills. Audit score ${score}/100.`,
    language: "Language",
    english: "English",
    simplifiedChinese: "简体中文",
    tabs: {
      overview: "Overview",
      audit: "Audit",
      profiles: "Profiles",
      publish: "Publish"
    },
    rescan: "Rescan",
    initConfig: "Init config",
    emptyTitle: "Open a skill workspace",
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
    noDescription: "No description",
    findingsTitle: "Findings",
    noFindings: "No findings.",
    applyProfile: "Apply profile",
    profile: "Profile",
    targetDirectory: "Target directory",
    checkDrift: "Check drift",
    apply: "Apply",
    copiedSkipped: (copied: number, skipped: number) => `Copied ${copied}, skipped ${skipped}.`,
    drift: "Drift",
    driftEmpty: "Run drift check to compare selected profile with target directory.",
    publishPlan: "Publish plan",
    publishHelp: "Generate a GitHub-first release checklist and install commands.",
    privateTeamRepo: "Private team repo",
    publicRelease: "Public release",
    planOutput: "Plan output",
    noPublishPlan: "No publish plan generated.",
    installCommands: "Install commands",
    checklist: "Checklist"
  },
  "zh-CN": {
    appSubtitle: "GitHub 优先的技能工作台",
    openWorkspace: "打开工作区",
    noWorkspace: "未选择工作区",
    chooseStatus: "请选择一个包含 skills/ 目录的工作区。",
    choosingWorkspace: "正在打开工作区选择器...",
    chooseCanceled: "已取消选择工作区。",
    desktopRequired: "工作区操作需要在 Electron 桌面窗口中使用，请不要在浏览器标签页中操作。",
    scanning: "正在扫描工作区...",
    errorStatus: (message: string) => `错误：${message}`,
    foundStatus: (skills: number, score: number) => `发现 ${skills} 个技能，审计评分 ${score}/100。`,
    language: "语言",
    english: "English",
    simplifiedChinese: "简体中文",
    tabs: {
      overview: "概览",
      audit: "审计",
      profiles: "配置组",
      publish: "发布"
    },
    rescan: "重新扫描",
    initConfig: "初始化配置",
    emptyTitle: "打开技能工作区",
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
    noDescription: "暂无描述",
    findingsTitle: "发现项",
    noFindings: "没有发现问题。",
    applyProfile: "应用配置组",
    profile: "配置组",
    targetDirectory: "目标目录",
    checkDrift: "检查漂移",
    apply: "应用",
    copiedSkipped: (copied: number, skipped: number) => `已复制 ${copied} 个，跳过 ${skipped} 个。`,
    drift: "漂移",
    driftEmpty: "运行漂移检查，将当前配置组与目标目录进行比较。",
    publishPlan: "发布计划",
    publishHelp: "生成 GitHub 优先的发布清单和安装命令。",
    privateTeamRepo: "团队私有仓库",
    publicRelease: "公开发布",
    planOutput: "计划输出",
    noPublishPlan: "尚未生成发布计划。",
    installCommands: "安装命令",
    checklist: "检查清单"
  }
};
