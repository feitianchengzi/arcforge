# CLI 方案

## 方案概述

CLI 方案提供与桌面端共享 core 的自动化入口。命令行输出为格式化 JSON，适合脚本和 CI 读取。

CLI 不启动 Electron 窗口，不使用桌面端本地存储，不执行共享推送。

## 命令解析

CLI 从进程参数读取命令名。缺省命令为帮助。

参数使用名称查找方式读取。每个命令按需读取 `--root`、`--visibility`、`--profile` 和 `--target`。

未知命令抛出错误并设置失败退出码。

## 命令集合

`init` 命令初始化工作区配置，并输出 `SkillOpsConfig`。

`scan` 命令扫描工作区，并输出 `WorkspaceSnapshot`。

`audit` 命令扫描工作区，并输出 `AuditReport`。

`publish-plan` 命令扫描工作区，并输出 `PublishPlan`。

`drift` 命令扫描工作区，并输出 `DriftReport`。

`apply-profile` 命令扫描工作区，应用配置组，并输出 `ApplyProfileResult`。

## 默认参数

所有工作区命令默认以当前进程目录作为根目录。

`publish-plan` 的默认可见性为 `private`。

`drift` 和 `apply-profile` 的默认配置组为 `default`。

`drift` 和 `apply-profile` 的默认目标目录为 `.skillops/skills`。

## 输出与退出码

成功命令把结果以缩进 JSON 输出到标准输出。

命令执行错误时，CLI 输出错误消息到标准错误，并设置失败退出码。

`audit` 命令存在严重级发现时，退出码为 2。没有严重级发现时，退出码为 0。

## core 复用

CLI 直接调用 `scanWorkspace`、`initWorkspace`、`createPublishPlan`、`driftReport` 和 `applyProfile`。

CLI 与桌面端共享数据模型，因此相同工作区在两种入口下返回一致的核心结构。

## 关联模型

该方案使用 `SkillOpsConfig`、`WorkspaceSnapshot`、`AuditReport`、`PublishPlan`、`DriftReport` 和 `ApplyProfileResult`。

## 关联契约

CLI 不使用 Electron IPC。CLI 命令语义与 `_shared/contracts/` 中对应契约保持同构，便于桌面端和自动化入口对齐。

