# 交互关系

## 策略依赖

- app-shell/ 是所有流程的入口，提供当前项目上下文、全局状态反馈和页签导航。
- project-review/ 依赖 app-shell/ 的扫描快照，展示健康状态、技能列表、共享资产和审计结果。
- profiles-targets/ 依赖 app-shell/ 的当前项目和 project-review/ 暴露的技能清单，用于配置组选择和目标应用。
- sharing/ 依赖 app-shell/ 的当前项目、project-review/ 的审计结果意识和 profiles-targets/ 的配置组信息，用于生成共享说明。

## 状态传播

- 重新扫描由 app-shell/ 触发，刷新 project-review/、profiles-targets/ 和 sharing/ 的输入数据。
- 配置组保存由 profiles-targets/ 触发，刷新目标应用和 sharing/ 中的配置组展示。
- 应用配置组后，profiles-targets/ 立即更新目标历史和漂移报告。
- 共享设置保存后，sharing/ 更新当前工作区配置，并影响后续发布计划的安装引用。

## 恢复路径

- 下载失败留在 app-shell/ 的项目列表和添加项目弹窗上下文中恢复。
- 审计问题通过 project-review/ 定位文件后，由用户修复并回到 app-shell/ 重新扫描。
- 目标漂移通过 profiles-targets/ 的完整差异窗口定位文件级问题。
- 共享失败保留在 sharing/ 表单和输出区域，用户修正远端地址、目标模式、项目名或 Git 环境后重试。

