# CLI 方案

## 方案概述

CLI 方案由 `src/commands/index.ts` 承载，统一为终端、CI 和 Electron `--cli` 模式提供 JSON 命令入口。

CLI 不提供初始化命令，不提供来源登记命令，也不保留 `apply-profile` 兼容入口。所有本地项目状态由扫描、配置保存、归并和应用关系保存动作按需创建。

## 命令解析

命令编排层接收 `string[]` 参数和运行时上下文。运行时上下文包含当前工作目录、可选缓存目录和可选 CLI shim 配置。

参数使用名称查找方式读取。主要参数包括 `--root`、`--from`、`--to`、`--profile`、`--skills`、`--target`、`--target-path`、`--visibility`、`--repo`、`--message`、`--target-mode`、`--project-name`、`--same-repository`、`--same-repository-remote`、`--cache-dir`、`--save` 和 `--confirm`。

所有成功结果以格式化 JSON 输出。帮助文本直接输出纯文本。

## 命令集合

`scan` 调用 `scanWorkspace`，输出工作区快照。

`audit` 调用 `scanWorkspace` 并输出审计报告；存在严重级发现时退出码为 2。

`source status` 调用 `checkSourceUpdate`，检查当前 `--root` Git checkout 的 ahead/behind 状态。

`source update` 调用 `updateSource`，要求 `--confirm`，只执行 fast-forward-only 更新。

`merge plan` 调用 `createMergePlan`，把当前项目技能计划归并到 `--to` 指定的目标 Skill 项目。

`merge run` 调用 `mergeIntoProject`，要求 `--confirm`，在无冲突时写入目标 Skill 项目并保存当前项目应用关系。

`applied list`、`applied add`、`applied remove`、`applied drift` 和 `applied run` 分别调用应用关系的列表、添加、删除、漂移和重新应用能力。

`apply` 调用 `applyFromSource`。用户通过 `--from` 指定来源 Skill 项目；未指定时使用当前 `--root`。

`drift` 调用 `driftFromSource`。用户通过 `--from` 指定来源 Skill 项目；未指定时使用当前 `--root`。

`publish-plan` 调用 `createPublishPlan`，只对当前 `--root` 生成发布就绪清单。

`share plan` 和 `share run` 调用共享 core。共享运行默认不写远端，只有 `share run --confirm` 执行远端写入。

`doctor` 调用 `getEnvironmentStatus`，输出 Git、CLI shim 和可选工具状态。

## 缓存与确认

远程 Skill 项目解析需要缓存目录。CLI 默认使用用户级 `.skillops/cache`，桌面端调用同一命令时可以注入应用数据目录作为缓存根。

`merge run`、`applied run`、`source update` 和远程共享写入都要求 `--confirm`。

`merge`、`applied`、`apply`、`drift`、`publish-plan` 和 `share` 的默认配置组为 `default`。

`merge` 记录的默认应用目标目录为 `.skillops/skills`。

## 状态与持久化

本地项目状态目录为 `~/.skillops/projects`。

CLI 不写入全局来源清单。远程来源只下载到缓存并在应用关系中记录解析后的本地根目录和可选远程 URL。

应用关系保存到当前项目状态，用于后续 `applied drift` 和 `applied run`。

## 退出码

成功命令退出码为 0。

`audit` 存在严重级发现时退出码为 2。

缺少确认参数、归并存在冲突、Git 更新不满足 fast-forward 条件、共享权限不足或命令参数缺失时返回失败退出码。

## 模块依赖

CLI 通过命令编排层调用 `scanWorkspace`、`createPublishPlan`、`createMergePlan`、`mergeIntoProject`、`applyFromSource`、`driftFromSource`、`addAppliedSource`、`runAppliedSources`、`checkSourceUpdate`、`updateSource`、`shareProject` 和 `getEnvironmentStatus`。

Skill 项目解析、归并和应用关系位于 `core/sources`。配置组应用和漂移位于 `core/profiles`。GitHub 来源解析、共享工作树、README 写入、配置合并和 Git 推送位于共享 core 模块。

## 使用的数据结构

该方案使用 `AppliedSourceRecord`、`WorkspaceSnapshot`、`AuditReport`、`PublishPlan`、`DriftReport`、`ApplyProfileResult`、`ShareResult`、`SourceUpdateStatus`、`SourceUpdateResult` 和 `EnvironmentStatus`。
