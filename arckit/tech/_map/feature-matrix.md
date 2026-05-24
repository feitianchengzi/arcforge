# 技术功能矩阵

| 技术路径 | 状态 | 覆盖功能 | 主要模型 | 主要契约 |
|---|---|---|---|---|
| architecture/solution.md | ✅ 已采用 | 桌面壳、React UI、core 复用、CLI 入口 | WorkspaceSnapshot、SkillOpsConfig | 全部 IPC 契约 |
| workspace/solution.md | ✅ 已采用 | 配置加载、技能发现、共享资产发现、快照生成 | SkillOpsConfig、WorkspaceSnapshot | workspace-scan、workspace-init |
| audit/solution.md | ✅ 已采用 | 密钥检查、危险指令检查、结构质量检查、审计评分 | AuditReport、WorkspaceSnapshot | workspace-scan |
| profiles-sync/solution.md | ✅ 已采用 | 配置组应用、共享资产复制、漂移检查、差异汇总 | ApplyProfileResult、DriftReport | profile-apply、profile-drift |
| sharing-ipc/solution.md | ✅ 已采用 | preload 桥接、应用数据目录注入、来源下载、发布计划、权限预检、共享推送、PR 创建、环境检测、CLI 修复、技能文件编辑窗口 | PublishPlan、ShareResult、EnvironmentStatus、SkillOpsConfig | source-download、publish-plan、publish-share、system-environment、skill-file |
| cli/solution.md | ✅ 已采用 | init、scan、audit、publish-plan、drift、apply-profile、share、doctor JSON 命令、桌面 --cli 模式和 GitHub Release CLI 安装 | SkillOpsConfig、WorkspaceSnapshot、AuditReport、PublishPlan、DriftReport、ApplyProfileResult、ShareResult、EnvironmentStatus | 与 IPC 同构但不经 Electron |
