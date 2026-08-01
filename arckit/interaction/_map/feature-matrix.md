# 交互功能矩阵

| 页面 | 状态 | 策略源 | 线框投影 | 对应产品/代码 |
|---|---|---|---|---|
| home/ | ✅ 已完成 | 最近项目、本地项目和远程项目统一作为项目入口，下载或扫描失败可恢复 | 最近项目、空状态、添加项目 Sheet、环境提示 | arckit/spec/interface/desktop-app.md、src/ui/main.tsx、src/electron/main.ts |
| overview/ | ✅ 已完成 | 项目扫描后先展示审计 coverage 和下一步任务，不直接执行高风险写入 | coverage 指标、侧边导航、下一步任务、加载/空/错状态 | arckit/spec/interface/desktop-app.md、src/ui/views/dashboard.tsx |
| skills/ | ✅ 已完成 | 技能文件以文件树和编辑器为主路径；归并支持本地或远程目标 Skill 项目，并生成当前项目应用关系 | 文件树、配置组筛选、编辑器、目标项目选择、归并计划、冲突清单、未保存确认 | arckit/spec/audit/rule-audit.md、arckit/spec/sources/skill-project-merge.md、src/ui/views/dashboard.tsx、src/core/sources.ts |
| profiles/ | ✅ 已完成 | 配置组定义技能集合，保存后提示影响目标，删除前展示关联影响 | 配置组列表、表单、技能勾选、影响摘要、删除确认 | arckit/spec/profile/*.md、src/core/profiles.ts |
| destinations/ | ✅ 已完成 | 标准 Agent 目标先检查漂移并审查三类 skill 的 availability-aware 计划；项目适用性由 Agent assessment 或用户显式 override 提供，自定义目录保持 direct 路径 | 目标组合与漂移、目标 Sheet、三类模式计划、assessment/override、阻断诊断、cleanup 确认、应用结果与失败恢复 | arckit/spec/profile/skill-availability.md、arckit/spec/sources/skill-project-merge.md、src/ui/views/destinations.tsx、src/ui/main.tsx |
| share/ | ✅ 已完成 | 共享是预发布和团队治理动作，确定性事实与可选 Agent assessment 分开展示，Git 写入仍需确认 | 范围选择、事实/assessment、确认执行、步骤日志、失败恢复 | arckit/spec/share/github-sharing.md、src/core/publish.ts、src/core/share-sync.ts |
| audit/ | ✅ 已完成 | 审计发现可筛选、定位并跳转 Skills 修复，coverage 代替质量评分，重新扫描失败不清空旧结果 | coverage 摘要、发现列表、详情、通过状态、重新扫描失败 | arckit/spec/audit/rule-audit.md、src/core/audit.ts |
