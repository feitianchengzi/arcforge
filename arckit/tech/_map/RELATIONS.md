# 技术关系

## 模块依赖

- architecture/solution.md 定义 Electron、React、core、CLI 和 shared 类型的整体分层。
- workspace/solution.md 生成 WorkspaceSnapshot，并提供本地 Git 来源识别结果，供 sources/solution.md、audit/solution.md、profiles-sync/solution.md、sharing-ipc/solution.md 和 cli/solution.md 使用。
- sources/solution.md 复用 workspace/solution.md 的扫描、profiles-sync/solution.md 的应用与漂移、sharing-ipc/solution.md 的远程项目下载入口和 core/source-update 的 fast-forward-only Git helper。
- audit/solution.md 依赖 workspace/solution.md 发现的技能列表，并将 AuditReport 嵌入 WorkspaceSnapshot。
- profiles-sync/solution.md 依赖 workspace/solution.md 的 ArcForgeConfig、SkillSummary 和 SharedAssetSummary。
- cli/solution.md 通过命令编排层复用 workspace/solution.md、sources/solution.md、audit/solution.md、profiles-sync/solution.md 和共享 core 能力，并作为桌面端同等能力的执行入口。
- sharing-ipc/solution.md 依赖 cli/solution.md 的命令编排层、workspace/solution.md 的扫描与来源更新结果、profiles-sync/solution.md 的漂移结果模型和 architecture/solution.md 的 IPC 边界；技能文件编辑能力依赖主进程文件系统访问和 WorkspaceSnapshot 中的技能、共享资产信息。

## 模型关系

- WorkspaceSnapshot.yaml 引用 ArcForgeConfig.yaml 和 AuditReport.yaml。
- LocalProjectState.yaml 持有用户级项目配置覆盖和应用关系，引用 ArcForgeConfig.yaml 与 AppliedSourceRecord.yaml，并由 core/project-store 读写。
- AppliedSourceRecord.yaml 保存当前项目对来源 Skill 项目配置组的应用关系。
- AuditReport.yaml 嵌入技能摘要结构，并由 workspace-scan 返回。
- DriftReport.yaml 由 apply-drift、applied drift 和 share-drift 返回，并被主进程用于渲染差异窗口。
- ApplyProfileResult.yaml 由 apply-run 和 applied run 返回，桌面端随后触发 apply-drift 或 applied drift。
- PublishPlan.yaml 嵌入 SharePlanResult.yaml，SharePlanResult.yaml 由 share-plan 返回，ShareResult.yaml 由 share-run 返回。
- SourceUpdateStatus.yaml 由独立 Git checkout 状态检查返回，SourceUpdateResult.yaml 由确认后的 fast-forward 更新返回。
- EnvironmentStatus.yaml 由 system-environment 返回。
- ArcForgeConfig.yaml 包含用户级项目状态中的应用目标组合和共享目标组合。

## 契约关系

- workspace-scan 是桌面端大部分页面的数据入口。
- apply-run 和 apply-drift 使用相同的 root、from、profile、targetDir 与 skills 参数；from 为空时使用当前工作区，非空时解析为来源 Skill 项目。
- workspace-add-remote 下载或复用远程 Skill 项目并返回本地根目录，桌面端随后直接打开或使用该路径。
- share-plan 只预检权限并生成交付计划；share-run 执行与 CLI share run 共用共享 core 执行 Git 写入、推送和 Pull Request 创建。
- system-environment 独立于工作区，用于桌面端环境提示、CLI shim 状态和可选第三方工具检测。
- skill-file 契约只允许访问当前工作区内的技能文件，并支撑内置编辑器和独立编辑窗口。
