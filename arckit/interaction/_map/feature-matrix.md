# 交互功能矩阵

| 交互路径 | 状态 | 策略源 | 线框投影 | 对应产品/代码 |
|---|---|---|---|---|
| app-shell/ | ✅ 已完成 | 当前项目上下文稳定，下载和扫描失败可恢复 | 四态外壳、侧边栏、顶部工具栏、添加项目与编辑来源 Sheet | arckit/spec/interface/desktop-app.md、src/ui/main.tsx、src/electron/main.ts |
| project-review/ | ✅ 已完成 | 先判断健康和来源更新状态，再通过技能文件编辑器定位和修复问题 | 四态审阅、指标卡、来源状态卡、文件树、文本编辑器、审计发现 | arckit/spec/audit/rule-audit.md、src/ui/views/dashboard.tsx、src/core/source-update.ts |
| profiles-targets/ | ✅ 已完成 | 先确认配置组、Agent/自定义目标组合，再执行应用与漂移检查 | 四态配置目标、表单、目标组合、漂移列表、差异 Sheet | arckit/spec/profile/*.md、src/ui/views/destinations.tsx、src/core/profiles.ts |
| sharing/ | ✅ 已完成 | 发布计划先行，远端写入前确认目标路径并保留失败输入 | 四态共享、计划输出、共享日志、来源下载 Sheet | arckit/spec/share/github-sharing.md、src/core/publish.ts、src/electron/main.ts |
