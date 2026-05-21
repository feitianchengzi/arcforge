# 技术决策记录

| 决策 | 状态 | 结论 | 关联文档 |
|---|---|---|---|
| 本地优先架构 | ✅ 已采用 | 系统采用 Electron + React + TypeScript core，无后端服务，Git 和文件系统作为集成边界。 | architecture/solution.md |
| 渲染层安全边界 | ✅ 已采用 | 渲染层关闭 Node 集成并通过 preload 暴露窄 IPC 方法集。 | architecture/solution.md、sharing-ipc/solution.md |
| 规则化本地审计 | ✅ 已采用 | 审计采用本地正则和结构规则，输出可定位发现和扣分评分。 | audit/solution.md |
| 配置组替换应用 | ✅ 已采用 | 应用配置组时替换目标中已存在的技能和资产目录，使漂移项可通过再次应用恢复为来源版本。 | profiles-sync/solution.md |
| GitHub-first 共享 | ✅ 已采用 | 共享使用 Git 仓库工作树、README 区块和安装命令，不引入托管注册中心。 | sharing-ipc/solution.md |
| CLI JSON 自动化 | ✅ 已采用 | CLI 直接复用 core，并以 JSON 和退出码支撑 CI。 | cli/solution.md |
