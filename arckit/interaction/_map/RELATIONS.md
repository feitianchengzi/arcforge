# 交互关系

## 策略依赖

- app-shell/ 提供固定当前项目、全局扫描状态和添加项目入口，是其他交互流程的上下文来源。
- project-review/ 依赖 app-shell/ 的工作区快照，展示项目健康状态、技能列表、共享资产和审计发现。
- profiles-targets/ 依赖 app-shell/ 的当前项目和 project-review/ 中的技能范围，执行配置组编辑、目标应用和漂移检查。
- sharing/ 依赖 app-shell/ 的当前项目、project-review/ 的审计结果意识，以及 profiles-targets/ 的配置组信息生成共享说明。

## 投影关系

- 每个流程的 interaction.md 包含「交互策略」章节，并由 default.html 的加载、成功、空状态和错误状态投影。
- 每个 default.html 由 new-page-design.sh 生成的模板派生，保留 wireframe-container、details 状态结构、wireframe-canvas 和 device-frame.desktop。
- wireframe-style.css 来自 arckit-interaction assets，并作为全目录唯一线框样式。

## 恢复路径

- 下载和扫描失败在 app-shell/ 中保留项目或来源上下文。
- 审计问题在 project-review/ 中保留文件路径和行号，用户修复后通过重新扫描恢复。
- 目标写入和漂移问题在 profiles-targets/ 中保留配置组和目标路径，用户可重试或查看差异。
- 共享失败在 sharing/ 中保留远端、目标模式、项目名和提交信息，用户修正后重试。

