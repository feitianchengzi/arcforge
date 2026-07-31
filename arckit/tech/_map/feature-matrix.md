# 技术功能矩阵

| 技术路径 | 状态 | 覆盖功能 | 主要模型 | 主要契约 |
|---|---|---|---|---|
| architecture/solution.md | ✅ 已采用 | 桌面壳、React UI、core 复用、CLI 入口 | WorkspaceSnapshot、ArcForgeConfig、LocalProjectState | 全部 IPC 契约 |
| workspace/solution.md | ✅ 已采用 | 本地项目状态、消费端配置加载、维护源清单加载、技能发现、共享资产发现、Git 来源识别、快照生成 | ArcForgeConfig、SkillProjectManifest、LocalProjectState、WorkspaceSnapshot | workspace-scan |
| sources/solution.md | ✅ 已采用 | Skill 项目解析、来源身份、远程下载、本地归并、应用关系、独立 Git 更新检查、应用与漂移 | SkillProjectManifest、AppliedSourceRecord、WorkspaceSnapshot、DriftReport、ApplyProfileResult、SourceUpdateStatus、SourceUpdateResult | workspace-add-remote、apply-plan、apply-run、apply-drift |
| audit/solution.md | ✅ 已采用 | 密钥检查、危险指令检查、结构质量检查、可选 Agent 语义诊断、审计评分 | AuditReport、WorkspaceSnapshot | workspace-scan |
| profiles-sync/solution.md | ✅ 已采用 | 来源推荐与消费端覆盖、三类可用性计划、常驻/按需应用、用户 catalog、入口解析、共享资产复制、内容与策略漂移 | SkillProjectManifest、ArcForgeConfig、SkillAvailabilityPlan、UserSkillCatalog、AppliedSourceRecord、ApplyProfileResult、DriftReport | apply-plan、apply-run、apply-drift、catalog-resolve |
| sharing-ipc/solution.md | ✅ 已采用 | preload 桥接、应用数据目录注入、远程 Skill 项目下载、维护源清单发布、共享计划、权限预检、共享推送、PR 创建、环境检测、CLI 修复、技能文件编辑窗口 | SkillProjectManifest、PublishPlan、SharePlanResult、ShareResult、EnvironmentStatus、ArcForgeConfig | workspace-add-remote、share-plan、share-run、share-drift、system-environment、skill-file |
| cli/solution.md | ✅ 已采用 | scan、audit rule/agent/hybrid、source、merge、applied、apply plan/run、drift、catalog resolve、publish-plan、share、doctor JSON 命令、桌面 --cli 模式和 GitHub Release CLI 安装 | SkillAvailabilityPlan、UserSkillCatalog、AppliedSourceRecord、WorkspaceSnapshot、AuditReport、PublishPlan、SharePlanResult、DriftReport、ApplyProfileResult、ShareResult、SourceUpdateStatus、SourceUpdateResult、EnvironmentStatus | 与 IPC 同构但不经 Electron |
