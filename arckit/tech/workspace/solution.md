# 工作区扫描方案

## 方案概述

工作区扫描方案以本地目录为输入，生成可供桌面端和 CLI 复用的工作区快照。方案聚合配置加载、技能发现、共享资产发现、审计执行和本地 Git 来源识别。

## 配置与本地项目状态

配置加载采用两层结构：默认配置和用户级本地项目状态。用户级本地项目状态位于 `~/.skillops/projects/<project-key>.json`，由 CLI 和 Desktop 共同读写。

`project-key` 根据项目身份生成。Git 工作区优先使用规范化远端地址和工作区相对 Git 根目录的路径；没有 Git 远端时使用绝对路径。该策略让 GitHub 来源 checkout 的本地配置跟随仓库身份，而普通本地目录仍按路径区分。

项目根目录下的 `skillops.config.json` 是迁移输入，不是持久配置。系统发现该文件时，如果用户级项目状态不存在，先解析文件并保存为用户级本地项目状态；如果用户级项目状态已经存在，则不覆盖用户级状态。完成判断后系统删除项目根目录下的该文件。

保存配置时，系统把格式化 JSON 写入用户级项目状态，不写入来源 checkout。配置组字段缺失时使用空数组。

默认配置版本为 1，来源目录通常为 `skills`；如果工作区根目录本身包含 `SKILL.md` 或大小写不同的 `skill.md`，来源目录为 `.`。默认配置组名称为 `default`，技能选择为全部技能，目标为 Codex、Claude 和 Cursor。

## 技能发现

技能发现从配置指定的来源目录开始。来源目录不存在时，发现结果为空数组。

扫描使用递归目录遍历。目录中存在 `SKILL.md` 或大小写不同的 `skill.md` 时，该目录被识别为一个技能。

扫描忽略 `.git` 和 `node_modules` 目录。

技能摘要模型为 `SkillSummary`，嵌入在 `WorkspaceSnapshot` 中。技能名称优先来自 frontmatter 的 `name` 字段，缺省时使用目录名。

技能描述优先来自 frontmatter 的 `description` 字段，缺省时使用正文第一个非标题段落的压缩摘要。

技能目标来自 frontmatter 的 `metadata.targets` 或 `targets` 字段，并且只接受字符串数组。

技能版本来自 frontmatter 的 `version` 字段。

技能目录下存在 `references` 和 `scripts` 子目录时，摘要中的对应布尔字段为真。

发现结果按技能名称排序。

## frontmatter 解析

frontmatter 解析器支持文档开头的 `---` 块。解析结果包含 frontmatter 字段表和正文。

解析器支持字符串值、布尔值、简单数组、折叠块、多行块和一级嵌套字段。

嵌套字段以点号形式展开，例如 `metadata.targets`。

解析失败或文档没有 frontmatter 时，frontmatter 为空对象，正文保持原内容。

## 共享资产发现

共享资产发现只检查来源目录下的顶层目录。

不包含任何 `SKILL.md` 或大小写不同的 `skill.md` 的顶层目录被识别为共享资产。来源目录本身是一个技能目录时，系统不生成共享资产。共享资产模型为 `SharedAssetSummary`，嵌入在 `WorkspaceSnapshot` 中。

共享资产用于配置组应用时随所有配置组同步。共享资产不作为独立技能参与结构审计。

结果按资产名称排序。

## 快照聚合

`scanWorkspace` 加载配置、发现技能、发现共享资产，并调用审计方案生成审计报告。

扫描会尝试识别当前工作区是否位于本地 Git 仓库内。识别成功时，快照包含 Git 根目录、工作区相对 Git 根目录的路径、当前分支和远端列表；识别失败时该字段为空。

返回模型为 `WorkspaceSnapshot`，包含根路径、配置、技能列表、共享资产列表、审计报告和可选本地 Git 来源信息。

桌面端和 CLI 均以该模型作为主要数据输入。

## 来源更新检查

来源更新检查复用本地 Git 来源识别结果。输入为 SkillOps 工作区根目录，系统解析该目录所属 Git 根目录、当前分支和远端列表。

检查流程读取当前分支的 upstream。若 upstream 未显式配置，系统尝试使用同名 `origin/<branch>` 作为上游。

检查流程执行 `git fetch --prune <remote>` 更新远端引用，然后通过 `git rev-list --left-right --count HEAD...<upstream>` 计算 ahead 与 behind commit 数。

检查结果包含本地 HEAD、上游 HEAD、ahead 数、behind 数、本次 fetch 前的 `FETCH_HEAD` 修改时间、距离上次 fetch 的时长、未提交变更状态、是否可更新和 Git 执行消息。

可更新条件为本地落后上游、没有本地领先提交、没有未提交变更且能够解析远端与当前分支。来源检查前系统先执行项目配置迁移与删除；迁移删除造成的 Git 状态按普通工作区变更处理。

来源更新流程要求调用方传入确认标记。确认后系统重新检查状态，只执行 `git pull --ff-only <remote> <branch>`，并在更新后再次检查状态生成结果。

GitHub 来源下载流程在已有缓存存在时只更新远端 refs，不自动合并工作区文件。用户通过来源更新检查看到落后 commit 数后，再决定是否执行来源更新。

## 错误语义

配置文件 JSON 解析失败时，错误向调用方传播。

文件读取失败时，技能发现或审计所在流程返回错误，调用方负责展示。

来源目录不存在不是错误，系统返回空技能列表和空共享资产列表。

## 关联契约

该方案由 `workspace-scan` 和 `workspace-init` 契约暴露给桌面端。

CLI 的 `scan`、`audit`、`publish-plan`、`drift` 和 `apply-profile` 命令均复用该方案。

CLI 的 `source status` 和 `source update` 命令复用本方案中的来源更新检查与快进更新流程。
