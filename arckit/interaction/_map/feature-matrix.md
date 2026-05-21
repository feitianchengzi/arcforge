# 交互功能矩阵

| 交互路径 | 状态 | 承载策略 | 对应规格与代码 |
|---|---|---|---|
| app-shell/ | ✅ 已完成 | 固定项目上下文、全局状态反馈、添加项目和设置弹窗 | arckit/spec/interface/desktop-app.md、src/ui/main.tsx、src/electron/main.ts |
| project-review/ | ✅ 已完成 | 总览健康判断、技能与资产浏览、审计发现定位 | arckit/spec/interface/desktop-app.md、arckit/spec/audit/rule-audit.md、src/ui/main.tsx |
| profiles-targets/ | ✅ 已完成 | 配置组草稿、目标路径确认、应用结果和漂移恢复 | arckit/spec/profile/profile-management.md、arckit/spec/profile/destination-sync.md、src/core/profiles.ts |
| sharing/ | ✅ 已完成 | 发布计划先行、远端路径确认、共享执行日志和失败保留输入 | arckit/spec/share/github-sharing.md、src/core/publish.ts、src/electron/main.ts |

