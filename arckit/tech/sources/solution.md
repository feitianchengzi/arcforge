# Skill 项目来源技术方案

## 方案概述

来源方案把任意可扫描的 Skill 项目直接作为归并、应用和漂移来源，不再维护全局来源清单。

方案由 `src/core/sources.ts` 承载。CLI、Electron 主进程和渲染层都通过同一组 core 能力处理 Skill 项目解析、归并计划、归并执行、应用关系、一次性应用和漂移。

远程 Git 或 GitHub 地址先通过来源下载流程落到本地缓存，再作为本地 Skill 项目目录参与后续操作。

Git 更新检查由 `src/core/source-update.ts` 承载，是独立 Git helper。它检查任意当前工作区 checkout，不依赖来源登记或应用关系。

## Skill 项目解析

`resolveSkillProjectRoot(input, cacheDir)` 接收本地目录或远程地址。

本地目录通过绝对路径解析和配置探测确定 Skill 项目根目录。

远程地址复用共享来源解析和下载能力，支持 GitHub shorthand、GitHub URL、Git URL、SSH Git URL，以及带引用和子目录的 GitHub tree/blob URL。

解析结果只返回本地项目根目录。系统不创建 `sources.json`，不生成来源 ID，也不要求项目写入额外来源标记。

## 归并计划

`createMergePlan` 读取当前项目快照和目标 Skill 项目快照。当前项目技能选择来自命令或 UI 传入的技能列表；未传入时使用配置组选择。

归并目标路径是目标 Skill 项目根目录下的相对路径。系统清理空段、当前目录段和上级目录段，并校验最终路径仍位于目标项目根目录内。

计划阶段逐个比较当前项目技能目录和目标项目目标目录。目标不存在为 `new`，内容一致为 `same`，内容不同或路径类型不兼容为 `conflict`。

计划结果包含目标项目根目录、目标项目名称、目标路径、配置组、当前项目应用目标目录、技能计划项、应用关系草案和冲突标记。

## 归并执行

`mergeIntoProject` 要求 `confirm: true`。

存在任一冲突时，系统返回冲突错误，不覆盖目标项目内容。

新增技能使用临时目录复制和替换策略写入目标项目。内容一致的技能跳过文件写入。

归并后系统合并目标项目配置组。配置组存在时追加本次技能名称并保留已有技能；配置组不存在时创建同名配置组。

归并后系统把当前项目更新为应用目标。应用关系按来源项目根目录、配置组和目标目录合并技能列表。

归并不提交或推送 Git 变更。

## 应用关系

应用关系持久化在当前项目的用户级状态中。

`AppliedSourceRecord` 包含记录标识、来源项目根目录、可选远程 URL、来源名称、配置组、目标目录、技能列表、可选来源提交哈希、上次应用时间和更新时间。

`addAppliedSource` 手动添加应用关系时直接解析 `from` 为来源项目根目录，扫描来源项目并按配置组选出技能。命令传入技能列表时，应用关系只记录指定技能。

`listAppliedSources`、`removeAppliedSource`、`driftAppliedSources` 和 `runAppliedSources` 都只读取当前项目状态，不访问全局来源清单。

## 一次性应用与漂移

`applyFromSource` 可以从 `from` 指定的 Skill 项目或当前目录复制配置组到目标目录。指定 `save` 时，系统把本次来源保存为应用关系。

`driftFromSource` 可以从 `from` 指定的 Skill 项目或当前目录比较配置组和目标目录。

一次性应用和漂移复用 `profiles-sync` 的 `applyProfile` 和 `driftReport` 能力。共享资产随配置组一起参与应用和漂移。

## Git 更新检查

`checkSourceUpdate` 接收根目录，执行 fetch，并计算当前分支相对上游的 ahead、behind、dirty 和 canUpdate 状态。

`updateSource` 要求显式确认。更新流程重新检查状态，只在本地落后上游、没有本地领先提交、没有未提交变更且能够解析远端分支时执行 `git pull --ff-only`。

桌面端把该能力放在总览页；CLI 通过 `source status` 和 `source update` 暴露。该命令名表示 Git source checkout，不表示 SkillOps 的持久来源实体。

## 关键边界

来源解析失败时，调用方收到明确错误，不创建应用关系。

远程 checkout 只作为缓存目录存在。删除应用关系不会删除缓存 checkout。

应用关系中的 `sourceRoot` 是后续漂移和重新应用的真实来源。若目录被用户删除或移动，后续操作返回文件系统错误。

归并写目标项目、应用写目标目录、Git 更新和远程共享都要求显式确认。

## 使用的数据结构

该方案使用 `AppliedSourceRecord`、`WorkspaceSnapshot`、`SkillOpsConfig`、`DriftReport`、`ApplyProfileResult`、`SourceUpdateStatus` 和 `SourceUpdateResult`。
