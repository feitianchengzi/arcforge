# 交互功能矩阵

| 交互路径 | 状态 | 策略源 | 线框投影 | 对应产品/代码 |
|---|---|---|---|---|
| app-shell/ | ✅ 已完成 | 当前项目上下文稳定，下载和扫描失败可恢复 | 四态外壳、侧边栏、顶部工具栏、添加项目 Sheet | arckit/spec/interface/desktop-app.md、src/ui/main.tsx、src/electron/main.ts |
| project-review/ | ✅ 已完成 | 先判断健康，再定位技能、资产和审计问题 | 四态审阅、指标卡、技能/审计列表、空结果 | arckit/spec/audit/rule-audit.md、src/ui/main.tsx |
| profiles-targets/ | ✅ 已完成 | 先确认配置组和目标路径，再执行应用与漂移检查 | 四态配置目标、表单、漂移列表、差异 Sheet | arckit/spec/profile/*.md、src/core/profiles.ts |
| sharing/ | ✅ 已完成 | 发布计划先行，远端写入前确认目标路径并保留失败输入 | 四态共享、计划输出、共享日志、来源下载 Sheet | arckit/spec/share/github-sharing.md、src/core/publish.ts、src/electron/main.ts |

