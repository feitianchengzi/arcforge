# 发布记录

本文记录 SkillOps 各版本面向用户的变化。SkillOps 仍处于 `1.0` 之前，因此版本记录重点关注工作流能力、打包行为和文档变化，不承诺稳定的公开 API。

## v0.1.6 - 2026-05-25

### 新增

- 新增 GitHub Pull Request 共享能力，用于把 Skill 项目提交到 GitHub 审阅流程。
- 新增 CLI 共享计划与执行拆分：
  - `skillops share plan` 预览发布计划、GitHub 权限、推荐交付方式、分支、目标路径和后续命令。
  - `skillops share run --confirm` 执行远端写入。
- 新增基于 GitHub CLI 的权限检测，覆盖登录状态、仓库权限、推荐交付方式和降级选项。
- 新增目标仓库 Pull Request、fork Pull Request、直接推送分支和本地分支四种交付方式。
- 新增桌面端共享确认流程，在写入 GitHub 前要求确认。
- 共享结果新增 PR 链接、checkout 路径、提交哈希、交付方式和手动恢复命令。

### 变更

- 共享执行改为使用隔离的共享 checkout，不直接在用户当前工作区 checkout 中写入。
- 桌面端和 CLI 统一为“先计划、再确认写入”的共享流程。
- 桌面端共享改为自动使用 GitHub 权限推荐的交付方式，不再要求用户在权限检测前选择交付方式。
- CLI 共享执行在直接推送或 Pull Request 交付失败时保留手动恢复引导。
- Electron preload 桥和 IPC handler 新增独立的共享计划操作。
- ArcKit 规格、交互文档和技术契约同步描述 GitHub PR 工作流和更新后的 `ShareResult`。

## v0.1.5 - 2026-05-24

### 新增

- 新增工作区技能文件浏览、读取、写入和独立编辑窗口能力。
- 新增 profile 感知的 dashboard、destinations、profiles 和 share 视图模块。
- 新增可复用的 UI shell 组件和 app-state 持久化工具。
- 新增独立的共享 core 模块，分别处理 Git 操作、远端解析和共享目标同步。
- `SkillOpsConfig` 新增保存共享目标组的能力。
- 新增 `skill-file` IPC 契约，并扩展共享 IPC 文档。

### 变更

- 将大型桌面 UI 实现拆分为更聚焦的 view/component 模块。
- 重构共享内部实现，将路径解析、Git 执行和文件同步拆成独立 core 职责。
- 扩展项目审阅、配置组与目标的交互规格，覆盖编辑器和目标工作流状态。
- 更新桌面应用规格和架构文档，补充文件编辑、已保存共享目标和分栏视图行为。

### 修复

- 修复 release 安装后的 CLI shim 入口解析问题。

## v0.1.4 - 2026-05-22

### 新增

- 新增 `src/commands` 共享命令编排层。
- 新增从终端和桌面入口复用的 CLI-first 共享能力。
- 新增桌面端 CLI repair 流程，用于修复本地 shim。
- 新增 GitHub Release CLI installer 资产和安装脚本。
- 新增最近项目和项目 UI 上下文的桌面 app state 持久化。
- 新增 Git、CLI shim、`skillshare`、`npx` 和 `clawhub` 环境检测。
- 新增 CLI 和桌面端演示视频资产。
- 新增 `build:cli` 打包支持和 CLI-only release asset staging。

### 变更

- CLI 执行改为通过共享命令层，使桌面 `--cli` 和终端 CLI 使用同一套命令行为。
- 共享执行迁移到 core `share` 模块，不再只放在 Electron main process 中。
- 重构 Electron main process 中的 CLI mode、环境检测、app state 和命令委派职责。
- 更新中英文 README 和 roadmap，补充 CLI 安装、CLI repair、演示视频和 release packaging。
- 优化 target group 状态处理。
- 刷新 README 使用资产。

## v0.1.3 - 2026-05-22

### 新增

- 新增 ArcKit visual design system，包括 design tokens、component catalog、light/dark theme notes 和 style preview 页面。
- 新增 README 和文档使用的 overview、workflow SVG 资产。
- 新增 same-source sharing 支持，在兼容当前 checkout 的场景下减少不必要的复制 worktree。

### 变更

- 将视觉系统应用到桌面 app shell 样式。
- 重写中英文 README、comparison、product 和 roadmap 中的 SkillOps 定位说明。
- 更新共享规格和技术说明，补充 same-source sharing 行为。

## v0.1.2 - 2026-05-21

### 新增

- 新增 ArcKit 产品、交互和技术文档。
- 新增 GitHub release notes 生成配置。
- 新增 app shell、project review、profiles and targets、sharing 的交互线框。
- 新增 workspace scan、profile apply/drift、publish plan/share、source download 和 environment status 的技术契约与模型。
- 新增共享资产归属元数据处理，用于更安全的共享协作。
- 新增 publish plan 面板中的共享进度反馈。

### 变更

- 从模板重新生成 ArcKit 交互文档。
- 强化共享技能协作行为。
- 共享技能同步从粗粒度整体替换调整为按条目同步。
- 更新 Electron sharing handler 和 profile apply 内部实现，使其对齐新的 ArcKit 契约。

### 修复

- 修复 profile apply 替换行为。
- 修复共享目标路径处理。

## v0.1.1 - 2026-05-20

### 变更

- `v0.1.1` 与 `v0.1.0` 指向同一个提交，两个 tag 之间没有代码差异。
- 该 release 状态只从 GitHub release workflow 发布打包产物。

## v0.1.0 - 2026-05-20

### 新增

- 新增初始 SkillOps MVP。
- 新增本地 Skill 项目扫描、默认配置加载和示例 `skillops.config` 结构。
- 新增 `SKILL.md` 发现能力，支持 frontmatter 解析、版本元数据、references 和 scripts 检测。
- 新增规则化审计，检查密钥、危险指令和缺失元数据。
- 新增 profile 技能分组、profile 应用和已安装目标漂移比较。
- 新增 GitHub-first publish-plan，包含安装命令和发布检查项。
- 新增 Electron 桌面壳，支持工作区选择、扫描、审计、profile、应用、漂移和 publish-plan UI。
- 新增初始 JSON CLI，覆盖 init、scan、audit、publish plan、drift 和 apply-profile 工作流。
- 新增中英文 README，以及 product、architecture、comparison 和 roadmap 文档。
- 新增 CI 和跨平台打包工作流基础。

### 修复

- 修复 Electron packaging dependency scope。
- 设置 Linux package maintainer 元数据。
- 优化 packaging release workflow。
- 从 app manifest 读取 release version base。
- 创建 release 前先 checkout 仓库。
- 只上传已打包的 release assets。
