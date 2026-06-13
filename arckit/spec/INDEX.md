# 产品功能索引

🟢 已实现 | 🟡 开发中 | ⚪ 计划中 | 🔴 已废弃

- workspace/ 工作区管理：本地或 GitHub Skill 项目接入、配置初始化、技能与共享资产发现。🟢
  - discovery.md 工作区发现：读取 ArcForge 配置、扫描技能目录、生成工作区快照和 GitHub 来源更新状态。🟢 (77行)
- sources/ Skill 项目来源：直接使用本地或远程 Skill 项目，支持归并技能、应用关系和独立 Git 更新检查。🟢
  - skill-project-merge.md Skill 项目归并与应用关系：归并当前项目技能到另一个 Skill 项目，生成应用关系，并独立检查当前 Git checkout 更新。🟢 (115行)
- audit/ 审计：对技能内容执行本地规则检查、风险分级与评分。🟢
  - rule-audit.md 规则审计：识别密钥、危险指令、元数据和 skill 写作质量问题，并说明当前规则覆盖边界。🟢 (109行)
- profile/ 配置组与应用：按配置组选择技能、复制到目标目录、检测漂移。🟢
  - profile-management.md 配置组管理：维护技能集合、目标 agent 标识与默认配置。🟢 (66行)
  - destination-sync.md 目标应用与漂移：复制技能和共享资产、对比目录差异、展示文件级漂移。🟢 (103行)
- share/ 共享发布：生成发布计划、检测 GitHub 权限、同步到 GitHub 仓库并创建 PR。🟢
  - github-sharing.md GitHub 共享：解析来源地址、下载项目、生成发布清单、检查共享漂移、确定交付方式并推送或创建 PR。🟢 (171行)
- interface/ 使用界面：Agent Skill 编排 CLI 与桌面 UI，暴露扫描、审计、归并、应用、漂移和共享工作流。🟡
  - agent-skill.md Agent Skill 接口：以项目内 coding agent 为默认入口，编排 CLI、桌面 UI、Skill First 能力单元建模和正向 skill 写作质量模型。⚪ (134行)
  - desktop-app.md 桌面应用：本地 UI 层，支持项目列表、技能编辑、审计、配置组、目标、漂移和共享页面。🟢 (161行)
  - cli.md 命令行接口：结构化执行层，支持扫描、审计、Git 检查、归并、共享、漂移、应用和 agent 编排。🟢 (139行)
