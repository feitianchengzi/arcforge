# 功能矩阵

| 功能路径 | 状态 | 主要用户场景 | 来源依据 |
|---|---|---|---|
| workspace/discovery.md | 🟢 已实现 | 打开或初始化 Skill 项目，扫描技能与共享资产，检查 GitHub 来源更新状态 | README、docs/product.md、src/core/workspace.ts、src/core/skills.ts、src/core/config.ts、src/core/project-store.ts、src/core/source-update.ts |
| audit/rule-audit.md | 🟢 已实现 | 在共享或发布前检查密钥、危险指令与元数据质量 | README、docs/architecture.md、src/core/audit.ts |
| profile/profile-management.md | 🟢 已实现 | 为项目维护多组技能集合并保存配置 | README、src/shared/types.ts、src/core/profiles.ts、src/ui/main.tsx |
| profile/destination-sync.md | 🟢 已实现 | 把配置组应用到 Agent、项目内 Agent 或自定义目录并检测漂移 | README、src/core/profiles.ts、src/electron/main.ts、src/ui/main.tsx |
| share/github-sharing.md | 🟢 已实现 | 下载 GitHub Skill 项目，生成发布计划，检测权限并共享到 Git 仓库或创建 PR | README、docs/comparison.md、src/core/publish.ts、src/electron/main.ts |
| interface/desktop-app.md | 🟢 已实现 | 使用桌面界面完成项目、技能文件编辑、审计、配置组、目标和共享操作 | src/ui/main.tsx、src/ui/i18n.ts、src/electron/preload.cts |
| interface/cli.md | 🟢 已实现 | 在终端或 CI 中执行扫描、审计、发布计划、来源维护、共享执行、漂移和应用 | README、src/cli/index.ts、src/commands/index.ts |
