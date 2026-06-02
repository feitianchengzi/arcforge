# 技术功能矩阵

| 技术路径 | 状态 | 覆盖功能 | 主要模型 | 主要契约 |
|---|---|---|---|---|
| architecture/solution.md | ✅ 已采用 | 桌面壳、React UI、core 复用、CLI 入口 | WorkspaceSnapshot、SkillOpsConfig、LocalProjectState | 全部 IPC 契约 |
| workspace/solution.md | ✅ 已采用 | 本地项目状态、配置加载、技能发现、共享资产发现、Git 来源识别、快照生成 | SkillOpsConfig、LocalProjectState、WorkspaceSnapshot | workspace-scan |
| sources/solution.md | ✅ 已采用 | Skill 项目解析、远程下载、本地归并、应用关系、独立 Git 更新检查、应用与漂移 | AppliedSourceRecord、WorkspaceSnapshot、DriftReport、ApplyProfileResult、SourceUpdateStatus、SourceUpdateResult | workspace-add-remote、apply-run、apply-drift |
| audit/solution.md | ✅ 已采用 | 密钥检查、危险指令检查、结构质量检查、审计评分 | AuditReport、WorkspaceSnapshot | workspace-scan |
| profiles-sync/solution.md | ✅ 已采用 | 配置组应用、共享资产复制、漂移检查、差异汇总 | ApplyProfileResult、DriftReport | apply-run、apply-drift |
| sharing-ipc/solution.md | ✅ 已采用 | preload 桥接、应用数据目录注入、远程 Skill 项目下载、共享计划、权限预检、共享推送、PR 创建、环境检测、CLI 修复、技能文件编辑窗口 | PublishPlan、SharePlanResult、ShareResult、EnvironmentStatus、SkillOpsConfig | workspace-add-remote、share-plan、share-run、share-drift、system-environment、skill-file |
| cli/solution.md | ✅ 已采用 | scan、audit、source、merge、applied、apply、drift、publish-plan、share、doctor JSON 命令、桌面 --cli 模式和 GitHub Release CLI 安装 | AppliedSourceRecord、WorkspaceSnapshot、AuditReport、PublishPlan、SharePlanResult、DriftReport、ApplyProfileResult、ShareResult、SourceUpdateStatus、SourceUpdateResult、EnvironmentStatus | 与 IPC 同构但不经 Electron |
