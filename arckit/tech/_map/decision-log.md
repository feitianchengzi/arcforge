# 技术决策记录

| 决策 | 状态 | 结论 | 关联文档 |
|---|---|---|---|
| 本地优先架构 | ✅ 已采用 | 系统采用 Electron + React + TypeScript core，无后端服务，Git 和文件系统作为集成边界。 | architecture/solution.md |
| 渲染层安全边界 | ✅ 已采用 | 渲染层关闭 Node 集成并通过 preload 暴露窄 IPC 方法集。 | architecture/solution.md、sharing-ipc/solution.md |
| 规则默认、Agent 可选的审计 | ✅ 已采用 | 默认审计采用本地正则和结构规则；CLI 可选调用 Agent CLI 做临时副本内的语义诊断，并输出可定位发现和扣分评分。 | audit/solution.md |
| 配置组替换应用 | ✅ 已采用 | 应用配置组时替换目标中已存在的技能和资产目录，使漂移项可通过再次应用恢复为来源版本。 | profiles-sync/solution.md |
| Git 跟踪的维护源推荐 | ✅ 已采用 | Skill 项目使用根目录 `arcforge.skill-project.json` 长期维护项目默认和逐 skill 推荐；用户本地 profile 覆盖不写回来源。 | workspace/solution.md、profiles-sync/solution.md、sharing-ipc/solution.md |
| 确定性可用性解析 | ✅ 已采用 | 最终模式依次采用调用覆盖、profile 逐项、profile 默认、来源逐项、来源默认和兼容规则，三类合法模式为用户常驻、项目常驻和用户按需。 | profiles-sync/solution.md |
| 用户级按需 catalog 与显式入口 | ✅ 已采用 | 按需副本放在用户级 ArcForge catalog，只有显式调用入口后才解析一个已安装 skill；ArcForge 不承担 skill 执行或常驻 agent runtime。 | profiles-sync/solution.md |
| GitHub-first 共享 | ✅ 已采用 | 共享使用 Git 仓库工作树、README 区块和安装命令，不引入托管注册中心。 | sharing-ipc/solution.md |
| CLI JSON 自动化 | ✅ 已采用 | CLI 直接复用 core，并以 JSON 和退出码支撑 CI。 | cli/solution.md |
