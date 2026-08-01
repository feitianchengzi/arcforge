# 功能矩阵

| 功能路径 | 状态 | 主要用户场景 | 来源依据 |
|---|---|---|---|
| workspace/discovery.md | 🟢 已实现 | 打开 Skill 项目，扫描技能与共享资产，识别本地 Git 信息 | README、docs/product.md、src/core/workspace.ts、src/core/skills.ts、src/core/config.ts、src/core/project-store.ts |
| sources/skill-project-merge.md | 🟡 开发中 | 以客观候选证据和 Agent/用户显式选择确认维护源，归并技能并只清理有 provenance 的工作副本 | 用户场景、src/core/sources.ts、src/core/source-update.ts、src/core/profiles.ts |
| audit/rule-audit.md | 🟡 开发中 | 在共享或发布前检查密钥、危险指令和结构事实，并用独立 Agent 诊断处理语义质量 | README、docs/architecture.md、src/core/audit.ts、用户产品方向讨论 |
| profile/profile-management.md | 🟢 已实现 | 为项目维护多组技能集合并保存配置 | README、src/shared/types.ts、src/core/profiles.ts、src/ui/main.tsx |
| profile/destination-sync.md | 🟡 开发中 | 把配置组应用到目标并检测漂移，以 Agent 显式决定而非路径优先级整理已安装 skill | README、src/core/profiles.ts、src/core/installed-skills.ts、src/ui/main.tsx |
| profile/skill-availability.md | 🟡 开发中 | 在 Skill 项目维护推荐与自然语言适用条件，由 Agent 动态评估并应用为用户级常驻、项目级常驻或用户级按需能力 | 用户产品方向讨论、profile/profile-management.md、profile/destination-sync.md、src/core/skill-availability.ts、src/core/project-store.ts |
| share/github-sharing.md | 🟡 开发中 | 下载 GitHub Skill 项目，生成发布事实，检测权限并按 Agent/用户显式交付计划共享或创建 PR | README、docs/comparison.md、src/core/publish.ts、src/electron/main.ts |
| interface/agent-skill.md | 🟡 开发中 | 通过 ArcForge skill 由 Agent 解释治理语义、动态选择能力承载和验证方式，再把显式计划交给确定性核心执行 | 用户产品方向讨论、skills/arcforge/SKILL.md、skills/arcforge-skill-first/SKILL.md、interface/cli.md、interface/desktop-app.md |
| interface/desktop-app.md | 🟢 已实现 | 作为本地 UI 层完成项目、技能文件编辑、审计、配置组、目标、漂移和共享操作 | src/ui/main.tsx、src/ui/i18n.ts、src/electron/preload.cts |
| interface/cli.md | 🟢 已实现 | 作为结构化执行层支持终端、CI 和 Agent Skill 编排扫描、审计、归并、共享、漂移和应用 | README、src/cli/index.ts、src/commands/index.ts |
