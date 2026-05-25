# CLI 方案

## 方案概述

CLI 方案是 SkillOps 的权威执行入口。桌面端只提供可视化参数收集、状态展示和系统集成，实际业务动作与 CLI 共用同一套命令编排层。

命令编排层位于 `src/commands/`。CLI 从终端参数调用命令编排层；Electron 主进程从 IPC handler 调用同一命令编排层；Electron 可执行文件在 `--cli` 模式下不创建窗口，并直接执行 CLI 命令。

CLI 命令输出为格式化 JSON，适合脚本和 CI 读取。执行错误输出到标准错误并设置失败退出码。

## 命令解析

CLI 从进程参数读取命令名。缺省命令为帮助。

参数使用名称查找方式读取。每个命令按需读取 `--root`、`--visibility`、`--profile`、`--skills`、`--target`、`--repo`、`--message`、`--target-mode`、`--project-name`、`--same-repository`、`--same-repository-remote` 和 `--cache-dir`。

`--skills` 使用逗号分隔的技能名称。命令同时收到 `--profile` 与 `--skills` 时，`--skills` 表示一次性技能选择，并覆盖配置组中的技能选择；共享仓库中写入的配置组仍使用命令传入的配置组名称作为命名基础。

`source update` 命令读取 `--confirm`。缺少确认参数时，命令不执行 Git 更新。

未知命令抛出错误并设置失败退出码。

## 命令集合

`init` 命令初始化工作区配置，并输出 `SkillOpsConfig`。

`scan` 命令扫描工作区，并输出 `WorkspaceSnapshot`。

`audit` 命令扫描工作区，并输出 `AuditReport`。

`publish-plan` 命令扫描工作区，并输出 `PublishPlan`。

`drift` 命令扫描工作区，并输出 `DriftReport`。

`apply-profile` 命令扫描工作区，应用配置组，并输出 `ApplyProfileResult`。

`share` 命令扫描工作区，把指定配置组或指定技能同步到远端 Git 仓库，并输出 `ShareResult`。同仓库共享模式下，命令直接在当前 Skill 项目所在 Git 仓库中提交项目相对路径并推送当前分支。

`source status` 命令检查当前 Skill 项目 Git 来源相对上游的 ahead/behind commit 数，并输出 `SourceUpdateStatus`。

`source update` 命令在确认后执行 fast-forward-only 更新，并输出 `SourceUpdateResult`。

`doctor` 命令检测本机 CLI shim、Git 和可选第三方工具状态，并输出 `EnvironmentStatus`。

## 默认参数

所有工作区命令默认以当前进程目录作为根目录。

`publish-plan` 和 `share` 的默认可见性为 `private`。

`drift`、`apply-profile` 和 `share` 的默认配置组为 `default`。

`drift` 和 `apply-profile` 的默认目标目录为 `.skillops/skills`。

`share` 的默认目标模式为 `direct`，默认提交信息为 `Share SkillOps project`。

`share` 的缓存目录默认为用户级 SkillOps 目录下 `.skillops/cache`。桌面端调用同一命令时传入应用数据目录作为缓存根，以沿用桌面安装包的应用级缓存。

本地项目状态目录为 `~/.skillops/projects`，CLI 与 Desktop 共享该存储。`init` 创建或刷新本地项目状态，不向来源 checkout 写入 `skillops.config.json`。

`source` 命令默认以当前目录作为来源工作区根目录。

## 输出与退出码

成功命令把结果以缩进 JSON 输出到标准输出。

命令执行错误时，CLI 输出错误消息到标准错误，并设置失败退出码。

`audit` 命令存在严重级发现时，退出码为 2。没有严重级发现时，退出码为 0。

`share` 命令执行 Git 写入、提交和推送。没有文件变更时命令仍返回成功，并在 `ShareResult.committed` 中返回 `false`。

`source status` 命令成功时返回退出码 0。当前目录不在 Git 仓库、处于 detached HEAD 或当前分支没有上游时，命令返回失败退出码。

`source update` 命令缺少确认参数、本地存在未提交变更、本地领先上游或无法解析上游时返回失败退出码。更新执行时使用 fast-forward-only pull。

## core 复用

CLI 通过命令编排层调用 `scanWorkspace`、`initWorkspace`、`createPublishPlan`、`driftReport`、`applyProfile`、`shareProject`、`checkSourceUpdate` 和 `updateSource`。

GitHub 来源解析、来源更新检查、共享工作树、README 写入、配置合并和 Git 推送位于 core 共享模块。Electron 主进程不持有独立的共享业务实现。

CLI 与桌面端共享数据模型，因此相同工作区在两种入口下返回一致的核心结构。

## 桌面安装包 CLI 能力

Electron 可执行文件支持 `--cli` 参数。该模式下主进程不创建 BrowserWindow，并把 `--cli` 后的参数传入 CLI 命令编排层。

桌面应用启动后在用户级可写目录安装 `skillops` shim。shim 指向当前桌面可执行文件并追加 `--cli` 参数。用户安装并启动桌面端后，终端可通过 `skillops` 调用同一套能力。

shim 安装目标优先使用当前 `PATH` 中用户主目录下可写的目录。找不到可写目录时，macOS/Linux 回退到用户主目录下 `.local/bin/skillops`，Windows 回退到用户主目录下 `.skillops/bin/skillops.cmd`。

桌面端环境检测返回 shim 是否存在、shim 目录是否在 `PATH` 中，以及修复提示。shim 安装失败或目录不在 `PATH` 中时，桌面 UI 提供 Repair CLI 操作。Repair CLI 会重写 shim；macOS 和 Linux 上，当 shim 目录不在 `PATH` 中时，Repair CLI 会向当前用户的 shell profile 写入 PATH 片段；Windows 上，Repair CLI 会更新用户级 PATH。PATH 持久化变更需要用户打开新终端后生效。

## GitHub Release CLI 安装

发布流水线生成 CLI-only 包。CLI 包只包含 `dist/cli`、`dist/commands`、`dist/core`、`dist/shared`、README、LICENSE、最小 package 元数据和平台 shim。

发布资产包含 macOS、Linux 和 Windows CLI 压缩包，以及 `install.sh`、`install.ps1` 和 `checksums.txt`。安装脚本从 GitHub latest release 下载对应平台资产，安装到用户主目录下 `.skillops/cli/latest`，并把 `skillops` shim 写入用户级 bin 目录。

GitHub Release CLI 安装不要求用户安装桌面端，也不要求用户本地执行 TypeScript 构建。

## 关联模型

该方案使用 `SkillOpsConfig`、`WorkspaceSnapshot`、`AuditReport`、`PublishPlan`、`DriftReport`、`ApplyProfileResult`、`ShareResult`、`SourceUpdateStatus`、`SourceUpdateResult` 和 `EnvironmentStatus`。

## 关联契约

CLI 不使用 Electron IPC。CLI 命令语义与 `_shared/contracts/` 中对应契约保持同构，桌面端 IPC handler 仅把 UI 参数映射到命令编排层。
