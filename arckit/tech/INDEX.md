# 技术索引

✅ 已采用 | 🔬 调研中 | 📋 调研完成 | ❌ 已废弃 | ⚪ 待定

- architecture/ 总体架构：Electron 桌面壳、React 渲染层、共享 TypeScript core 与本地优先数据流。✅
  - solution.md 总体架构方案：进程边界、模块分层、本地文件系统与无后端运行模型。✅ (64行)
- workspace/ 工作区技术：配置文件、技能发现、共享资产发现与工作区快照生成。✅
  - solution.md 工作区扫描方案：配置加载、frontmatter 解析、目录遍历和快照聚合。✅ (78行)
- audit/ 审计技术：本地规则引擎、风险匹配、结构质量检查与评分模型。✅
  - solution.md 规则审计方案：密钥规则、危险指令、结构校验、发现定位和扣分规则。✅ (80行)
- profiles-sync/ 配置组同步技术：配置组选取、目录复制、哈希签名和漂移报告。✅
  - solution.md 配置组同步方案：技能选择、替换复制、共享资产同步和 SHA-256 漂移比较。✅ (85行)
- sharing-ipc/ 共享与 IPC 技术：Electron preload 桥、GitHub 来源解析、共享工作树和 Git 执行。✅
  - solution.md 共享与 IPC 方案：安全桥接、来源下载、发布计划、共享推送和差异窗口。✅ (135行)
- cli/ 命令行技术：JSON 输出、命令参数、退出码和 core 模块复用。✅
  - solution.md CLI 方案：init、scan、audit、publish-plan、drift、apply-profile 命令边界。✅ (62行)
- _shared/models/ 数据模型：跨领域 TypeScript DTO 与持久化配置结构。✅
  - SkillOpsConfig.yaml 工作区配置模型：来源目录、团队仓库、共享模式和配置组列表。✅ (70行)
  - WorkspaceSnapshot.yaml 工作区快照模型：配置、技能、共享资产和审计报告聚合。✅ (69行)
  - AuditReport.yaml 审计报告模型：发现列表、严重级别、规则代码和评分。✅ (75行)
  - DriftReport.yaml 漂移报告模型：技能/资产状态、文件级差异和差异汇总。✅ (98行)
  - PublishPlan.yaml 发布计划模型：文件清单、安装命令、可见性和检查项。✅ (48行)
  - ShareResult.yaml 共享结果模型：远端地址、分支、目标路径、提交推送状态和消息。✅ (42行)
  - EnvironmentStatus.yaml 环境状态模型：平台、架构和 Git 可用性。✅ (42行)
  - ApplyProfileResult.yaml 应用结果模型：复制和跳过的技能与共享资产。✅ (46行)
- _shared/contracts/ IPC 契约：渲染层通过 preload 调用主进程和 core 能力。✅
  - workspace-scan.yaml 工作区扫描契约：输入根目录，输出工作区快照。✅ (34行)
  - workspace-init.yaml 工作区初始化契约：输入根目录，输出默认配置。✅ (31行)
  - profile-apply.yaml 配置组应用契约：输入根目录、配置组和目标目录，输出应用结果。✅ (39行)
  - profile-drift.yaml 漂移检查契约：输入根目录、配置组和目标目录，输出漂移报告。✅ (40行)
  - publish-plan.yaml 发布计划契约：输入根目录和可见性，输出发布计划。✅ (37行)
  - publish-share.yaml 共享执行契约：输入远端、可见性、提交信息和目标模式，输出共享结果。✅ (61行)
  - source-download.yaml 来源下载契约：输入 GitHub/Git 来源，输出本地项目根路径。✅ (39行)
  - system-environment.yaml 环境检测契约：无业务输入，输出平台与 Git 状态。✅ (26行)
