# 技术功能矩阵

| 技术路径 | 状态 | 覆盖功能 | 主要模型 | 主要契约 |
|---|---|---|---|---|
| architecture/solution.md | ✅ 已采用 | 桌面壳、React UI、core 复用、CLI 入口 | WorkspaceSnapshot、ArcForgeConfig、LocalProjectState | 全部 IPC 契约 |
| workspace/solution.md | ✅ 已采用 | 本地项目状态、消费端配置加载、维护源清单加载、技能发现、共享资产发现、Git 来源识别、快照生成 | ArcForgeConfig、SkillProjectManifest、LocalProjectState、WorkspaceSnapshot | workspace-scan |
| sources/solution.md | 🔬 调研中 | 中性 Skill 项目候选、显式维护源选择、远程下载、本地归并、provenance 清理、应用关系和 Git 更新 | SkillProjectManifest、AppliedSourceRecord、WorkspaceSnapshot、DriftReport、ApplyProfileResult、SourceUpdateStatus、SourceUpdateResult | workspace-add-remote、apply-plan、apply-run、apply-drift |
| audit/solution.md | 🔬 调研中 | 密钥、危险指令与结构事实检查，可选 Agent 语义诊断和规则覆盖摘要 | AuditReport、WorkspaceSnapshot | workspace-scan |
| profiles-sync/solution.md | 🔬 调研中 | 来源推荐、未分类门禁、Agent 项目评估、三类计划、用户 catalog、显式整理和漂移 | SkillProjectManifest、SkillProjectApplicabilityAssessment、ArcForgeConfig、SkillAvailabilityPlan、UserSkillCatalog、AppliedSourceRecord、ApplyProfileResult、DriftReport | apply-plan、apply-run、apply-drift、catalog-resolve |
| sharing-ipc/solution.md | 🔬 调研中 | preload 桥接、发布事实、Agent readiness、来源下载、权限预检、共享推送、PR 和编辑窗口 | SkillProjectManifest、PublishPlan、SharePlanResult、ShareResult、EnvironmentStatus、ArcForgeConfig | workspace-add-remote、share-plan、share-run、share-drift、system-environment、skill-file |
| cli/solution.md | ✅ 已采用 | scan、audit rule/agent/hybrid、source、merge、applied、apply plan/run、drift、catalog resolve、publish-plan、share、doctor JSON 命令、桌面 --cli 模式和 GitHub Release CLI 安装 | SkillAvailabilityPlan、UserSkillCatalog、AppliedSourceRecord、WorkspaceSnapshot、AuditReport、PublishPlan、SharePlanResult、DriftReport、ApplyProfileResult、ShareResult、SourceUpdateStatus、SourceUpdateResult、EnvironmentStatus | 与 IPC 同构但不经 Electron |
