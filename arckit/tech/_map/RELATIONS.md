# 技术关系

## 模块依赖

- architecture/solution.md 定义 Electron、React、core、CLI 和 shared 类型的整体分层。
- workspace/solution.md 生成 WorkspaceSnapshot，供 audit/solution.md、profiles-sync/solution.md、sharing-ipc/solution.md 和 cli/solution.md 使用。
- audit/solution.md 依赖 workspace/solution.md 发现的技能列表，并将 AuditReport 嵌入 WorkspaceSnapshot。
- profiles-sync/solution.md 依赖 workspace/solution.md 的 SkillOpsConfig、SkillSummary 和 SharedAssetSummary。
- cli/solution.md 通过命令编排层复用 workspace/solution.md、audit/solution.md、profiles-sync/solution.md 和共享 core 能力，并作为桌面端同等能力的执行入口。
- sharing-ipc/solution.md 依赖 cli/solution.md 的命令编排层、workspace/solution.md 的扫描结果、profiles-sync/solution.md 的漂移结果模型和 architecture/solution.md 的 IPC 边界；技能文件编辑能力依赖主进程文件系统访问和 WorkspaceSnapshot 中的技能、共享资产信息。

## 模型关系

- WorkspaceSnapshot.yaml 引用 SkillOpsConfig.yaml 和 AuditReport.yaml。
- AuditReport.yaml 嵌入技能摘要结构，并由 workspace-scan 返回。
- DriftReport.yaml 由 profile-drift 返回，并被主进程用于渲染差异窗口。
- ApplyProfileResult.yaml 由 profile-apply 返回，桌面端随后触发 profile-drift。
- PublishPlan.yaml 由 publish-plan 返回，ShareResult.yaml 由 publish-share 返回。
- EnvironmentStatus.yaml 由 system-environment 返回。
- SkillOpsConfig.yaml 包含桌面端保存的应用目标组合和共享目标组合。

## 契约关系

- workspace-scan 是桌面端大部分页面的数据入口。
- workspace-init 写入默认 SkillOpsConfig，并通常后接 workspace-scan。
- profile-apply 和 profile-drift 使用相同的 profile 与 targetDir 参数。
- publish-plan 只读取工作区并生成计划；publish-share 的 sharePlan 只预检权限并生成交付计划；publish-share 的 share 执行与 CLI share run 共用共享 core 执行 Git 写入、推送和 Pull Request 创建。
- source-download 返回本地项目根路径，随后由 workspace-scan 打开。
- system-environment 独立于工作区，用于桌面端环境提示、CLI shim 状态和可选第三方工具检测。
- skill-file 契约只允许访问当前工作区内的技能文件，并支撑内置编辑器和独立编辑窗口。
