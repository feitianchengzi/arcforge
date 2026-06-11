# 功能矩阵

| 功能路径 | 状态 | 主要用户场景 | 来源依据 |
|---|---|---|---|
| workspace/discovery.md | 🟢 已实现 | 打开 Skill 项目，扫描技能与共享资产，识别本地 Git 信息 | README、docs/product.md、src/core/workspace.ts、src/core/skills.ts、src/core/config.ts、src/core/project-store.ts |
| sources/skill-project-merge.md | 🟢 已实现 | 直接使用本地或远程 Skill 项目，把当前项目技能归并到另一个 Skill 项目，并记录当前项目应用关系 | 用户场景、src/core/sources.ts、src/core/source-update.ts、src/core/profiles.ts |
| audit/rule-audit.md | 🟢 已实现 | 在共享或发布前检查密钥、危险指令与元数据质量 | README、docs/architecture.md、src/core/audit.ts |
| profile/profile-management.md | 🟢 已实现 | 为项目维护多组技能集合并保存配置 | README、src/shared/types.ts、src/core/profiles.ts、src/ui/main.tsx |
| profile/destination-sync.md | 🟢 已实现 | 把配置组应用到 Agent、项目内 Agent 或自定义目录并检测漂移 | README、src/core/profiles.ts、src/electron/main.ts、src/ui/main.tsx |
| share/github-sharing.md | 🟢 已实现 | 下载 GitHub Skill 项目，生成发布计划，检测权限并共享到 Git 仓库或创建 PR | README、docs/comparison.md、src/core/publish.ts、src/electron/main.ts |
| interface/agent-skill.md | ⚪ 计划中 | 在项目目录中通过 ArcForge skill 把项目内 skill 归并为正式来源、同步到其他项目并共享到远程仓库 | 用户产品方向讨论、skills/arcforge/SKILL.md、interface/cli.md、interface/desktop-app.md |
| interface/desktop-app.md | 🟢 已实现 | 作为本地 UI 层完成项目、技能文件编辑、审计、配置组、目标、漂移和共享操作 | src/ui/main.tsx、src/ui/i18n.ts、src/electron/preload.cts |
| interface/cli.md | 🟢 已实现 | 作为结构化执行层支持终端、CI 和 Agent Skill 编排扫描、审计、归并、共享、漂移和应用 | README、src/cli/index.ts、src/commands/index.ts |
