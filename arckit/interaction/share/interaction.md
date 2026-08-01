# Share - 交互规范

## 交互策略

### 核心任务

用户在 Share 页面复核当前 Skill 项目的共享事实、Agent 提供的发布准备 assessment，以及写入 Git 目标前的执行计划。

### 主路径

页面先展示共享范围、目标远端、文件与来源策略事实、权限和交付选项。调用方提供 Agent readiness assessment 时，页面另行展示其摘要、证据、未知项、安装命令候选和 checklist；没有 assessment 时明确显示 `not-supplied`，不由 Core 补造通用结论。用户复核后确认 Git 写入和交付计划。

### 决策点

用户决定共享当前项目或某个配置组，决定目标分支、提交信息和交付方式，并判断 Agent assessment 中的未知项是否需要先处理。系统只用确定性事实执行路径、安全、权限和确认门禁。

### 信息揭示

页面先展示共享范围和确定性事实，再展示可选的 Agent assessment，最后展示执行计划和结果。事实与判断使用不同标签；GitHub 或 ClawHub/OpenClaw 只作为发布准备目标，不作为 ArcForge 内置市场。

### 状态流

无可共享内容时显示空状态。选择范围后生成事实计划；assessment 缺失不是 Core 自动补全的理由。存在确定性阻断项时禁用执行。确认后显示执行进度。完成后展示实际 Git 结果、链接，以及 assessment 中已经提供的后续项。

### 反馈与恢复

执行失败保留范围、远端、提交信息和 assessment。权限失败保留计划并提示用户在外部授权。assessment 有未知项时保留事实上下文供 Agent 或用户继续判断。共享完成后可返回 Audit 或 Skills 修复后再次生成计划。

### 输入输出边界

输入包括共享范围、远端、分支、提交信息、交付选项、可选 Agent readiness assessment 和确认。输出为确定性发布事实、原样保留的 assessment、执行日志和结果摘要。Core 不生成固定安装器命令、审计分数阈值或通用发布 checklist。

## 页面状态

| 状态 | 触发条件 | data-kit 关键控件 |
|------|---------|-----------------|
| 范围选择 | 进入 Share 页面 | ScopePicker |
| 事实与 assessment | 用户选择范围 | FactList、AssessmentPanel |
| 执行确认 | 检查通过后点击 Share | ConfirmationDialog |
| 执行中 | 用户确认执行 | ProgressView |
| 完成/失败 | 执行结束 | ResultView |

## 交互行为

- **选择范围:** 用户选择当前项目或配置组。
- **生成计划:** 系统生成共享文件、来源 manifest、权限、交付集成等事实，并原样保留可选 Agent assessment。
- **检查阻断:** 确定性路径、安全、权限或确认阻断项存在时执行按钮不可用；Core 不从业务未知项推导固定结论。
- **确认执行:** 用户确认后系统执行本地写入或 Git 辅助动作。
- **查看结果:** 完成后展示实际 GitHub/Git 结果，以及 assessment 已提供的命令候选和 checklist。

## 弹窗/对话框

| 名称 | 触发 | data-kit | 内容 |
|------|------|----------|------|
| Share confirmation | 点击 Share | ConfirmationDialog | 范围、远端、文件和提交信息 |
| Permission issue | 权限不足 | Alert | 缺失权限和外部修复方式 |

## 错误处理

| 错误类型 | 展示方式 | 恢复操作 |
|---------|---------|---------|
| 缺少远端 | 检查项阻断 | 配置远端 |
| Agent assessment 未提供 | 待评估状态 | 保留事实，交给 Agent 分析或由用户决定是否继续 |
| Git 执行失败 | 结果错误 | 修正后重试 |
| 权限不足 | Alert | 外部授权后重试 |

## 加载策略

| 场景 | 策略 |
|------|------|
| 计划生成 | 保留范围选择并显示检查中 |
| 执行共享 | 显示步骤日志 |
| 完成后刷新 | 刷新共享事实、assessment 状态和结果摘要 |
