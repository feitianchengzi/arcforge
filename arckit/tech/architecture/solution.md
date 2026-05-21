# 总体架构方案

## 方案概述

SkillOps 采用本地优先的桌面与 CLI 双入口架构。Electron 提供桌面应用壳，React + TypeScript 提供渲染层，TypeScript core 模块承载可复用领域逻辑，Node.js 文件系统和 Git 命令负责本地工作区操作。

系统不包含后端服务。工作区目录、`skillops.config.json`、技能目录、目标目录和 Git 仓库是主要数据边界。

## 模块分层

`src/shared/` 定义跨进程和跨入口复用的数据类型。该层只包含类型和枚举。

`src/core/` 定义 SkillOps 领域逻辑，包括配置加载、技能发现、共享资产发现、审计、配置组应用、漂移检查和发布计划生成。

`src/electron/` 定义桌面主进程、窗口生命周期、IPC handler、Git 来源下载、共享执行和漂移差异窗口。

`src/ui/` 定义 React 桌面界面。渲染层不直接访问 Node.js API，只通过 preload 暴露的 `window.skillops` 方法调用主进程。

`src/cli/` 定义命令行入口。CLI 直接复用 core 模块，并输出 JSON。

## 进程边界

Electron BrowserWindow 启用 `contextIsolation`，关闭渲染层 Node.js 集成。

preload 通过 `contextBridge.exposeInMainWorld` 暴露有限方法集合。渲染层通过该集合调用工作区扫描、配置保存、来源下载、发布计划、共享执行、配置组应用、漂移检查和环境检测。

主进程是文件系统、Git、目录选择器和差异窗口的执行边界。渲染层只持有数据结果和界面状态。

## 数据流

工作区扫描从根目录开始，读取配置，发现技能和共享资产，执行审计，并返回 `WorkspaceSnapshot`。

桌面端以 `WorkspaceSnapshot` 驱动总览、技能、审计、配置组、目标应用和共享页面。

CLI 在每个命令中按需扫描工作区，并输出对应结果模型。

共享执行会先扫描当前工作区，再写入本地配置、同步共享工作树、生成共享 README 区块、提交并推送远端分支。

## 持久化边界

工作区配置持久化为根目录下的 `skillops.config.json`。

桌面端最近项目、当前项目、目标历史、语言和项目 UI 状态保存在浏览器本地存储中。

GitHub 来源缓存和共享工作树缓存保存在 Electron 应用数据目录中。

目标应用写入用户选择的 agent、项目或自定义目录。

## 安全边界

渲染进程没有直接文件系统权限。所有本地写入和 Git 操作均在主进程或 core 中执行。

审计引擎本地运行，不上传技能内容。

共享执行依赖本机 Git 凭据和远端权限。系统记录 Git 命令输出到共享结果消息中。

## 关联模型

该方案使用 `WorkspaceSnapshot`、`SkillOpsConfig`、`AuditReport`、`DriftReport`、`PublishPlan`、`ShareResult`、`EnvironmentStatus` 和 `ApplyProfileResult`。

## 关联契约

该方案覆盖 `workspace-scan`、`workspace-init`、`profile-apply`、`profile-drift`、`publish-plan`、`publish-share`、`source-download` 和 `system-environment`。

