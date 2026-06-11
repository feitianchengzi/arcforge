# 对比说明

SkillOps 不是 registry、marketplace、包管理器、installer、MCP registry，也不是 agent runtime。

它是面向 `SKILL.md` 仓库的本地优先治理层：

```text
创建/迭代 skills -> 子代理验证 -> 审计 -> profiles -> 应用到目标 -> drift 检查 -> 发布准备
```

## 快速地图

| 相邻产品 | 核心任务 | 为什么容易混淆 | SkillOps 的边界 |
|---|---|---|---|
| [skillshare](https://github.com/runkids/skillshare) | 在多个 AI CLI 工具之间同步 skills、agents、rules、commands 等文件资源。 | 它也支持多 agent、团队共享和安全检查。 | SkillOps 应该位于上游：Skill First 验证、批准 profiles、review gate、drift report 和发布准备。安装/同步尽量委托。 |
| [npx skills](https://github.com/vercel-labs/skills) / [Vercel Agent Skills](https://vercel.com/docs/agent-resources/skills) | 将打包好的 skills 添加到多个 agent 环境。 | 它也处理 skill package 和安装命令。 | SkillOps 围绕 skill 仓库做治理和发布就绪检查；`npx skills` 是安装路径。 |
| [ClawHub/OpenClaw](https://github.com/openclaw/clawhub) | 公开 registry，负责 OpenClaw skills/packages 的发布、版本、搜索、安装和 moderation。 | 它拥有较完整的 skill 生态和审计/moderation 流程。 | SkillOps 应该在发布到 ClawHub 前做准备，不重复 registry/search/marketplace。 |
| [Claude Code plugins](https://code.claude.com/docs/en/plugins) 和 [Claude skills](https://code.claude.com/docs/en/skills) | Claude Code 能力的 runtime packaging 和加载机制。 | Plugins 可以包含 skills，也能通过 marketplace 分发。 | SkillOps 管理源 skill 集合，然后再进入 Claude 专属 plugin 或本地 skill 目录。 |
| Cursor rules / `AGENTS.md` / `CLAUDE.md` | 某个项目或 agent 的本地指令文件。 | 里面的内容可能很像 skill。 | SkillOps 管理跨项目、跨 agent 复用的 skill 资产和 profiles；项目指令文件是目标输出或本地策略文件。 |
| [Smithery](https://smithery.ai/) / [MCP registry](https://github.com/modelcontextprotocol/registry) | 发现和安装 MCP servers。 | MCP servers 和 skills 都能扩展 agent。 | SkillOps 治理文本/文件型 skills，不做 tool-server 分发。 |
| GitHub 仓库本身 | 存储、review、release 和权限管理。 | SkillOps 本来就把 GitHub 当 source of truth。 | SkillOps 在 Git 之上增加 skill-aware 扫描、审计、profiles、drift report 和发布 checklist。 |

## SkillOps vs skillshare

`skillshare` 是最接近、也最容易混淆的产品。

从它的 README 看，`skillshare` 关注的是 AI CLI skills、agents、rules、commands 和其他文件型资源的 "one source of truth"。它可以同步到 Claude、Cursor、Codex、OpenClaw、OpenCode 等大量目标，从 Git hosts 安装，做安全审计，支持项目 skills，并提供 Web UI。

SkillOps 不应该和 `skillshare` 比谁更会同步。它更有价值的位置在生命周期上游：

| 问题 | skillshare | SkillOps |
|---|---|---|
| 如何同步到 60+ agent 目标？ | 核心能力。 | 委托或集成。 |
| 如何从 Git hosts 安装/更新 skills？ | 核心能力。 | 生成安装建议和发布计划。 |
| 如何管理 agents、rules、commands、prompts 和 extras？ | 核心能力。 | 除非作为目标 metadata，否则不做。 |
| 哪些 skills 是这个项目 profile 批准使用的？ | 可以通过配置/过滤实现，但不是主要产品叙事。 | 核心能力。 |
| 一个工作模式是否已经沉淀成 skill，并通过真实任务验证？ | 不是主要同步任务。 | 核心能力，通过 `skillops-skill-first` 完成。 |
| 某个项目是否偏离了批准过的源 profile？ | 接近 sync state。 | 核心能力。 |
| 这个仓库是否适合团队共享或公开发布？ | 相邻能力。 | 核心能力。 |
| 是否要做托管 registry？ | 不做。 | 不做。 |

实际立场：SkillOps 可以生成适合 `skillshare` 的源目录和命令。用户需要广泛 target 覆盖时，`skillshare` 可以成为安装/同步后端。

## SkillOps vs npx skills

`npx skills` 是 Vercel Agent Skills 相关的开放安装路径。Vercel 文档把 skills 描述为可添加到多个 AI agents 的打包能力，GitHub 项目也把自己定位成 "the open agent skills tool"。

SkillOps 不应该竞争“一条命令安装”。

| 问题 | npx skills | SkillOps |
|---|---|---|
| 如何把一个公开 skill package 添加到 agent？ | 核心能力。 | 不是主要任务。 |
| 如何让团队仓库在安装前可 review？ | 不是主要任务。 | 核心能力。 |
| 如何按项目/团队/release profile 分组 skills？ | 不是主要任务。 | 核心能力。 |
| 如何检查目标目录和源仓库之间的 drift？ | 不是主要任务。 | 核心能力。 |
| 如何准备 GitHub release checklist？ | 不是主要任务。 | 核心能力。 |

实际立场：SkillOps 应该在发布计划里输出 `npx skills add ...` 命令，而不是替代 installer。

## SkillOps vs ClawHub/OpenClaw

ClawHub 是 OpenClaw 的公开 skill registry。它的 README 描述了发布、版本、搜索、评论/星标、moderation hooks、vector search、本地安装、pin/update 和 package publishing 等能力。

SkillOps 不应该重建这些能力。

| 问题 | ClawHub/OpenClaw | SkillOps |
|---|---|---|
| 用户去哪里发现公开 skills？ | ClawHub。 | 不做。 |
| 公开版本、星标、评论和 moderation 在哪里处理？ | ClawHub。 | 不做。 |
| 如何发布/安装 OpenClaw skills/packages？ | ClawHub/OpenClaw CLI。 | 生成就绪 checklist 和命令提示。 |
| 如何在公开发布前 review 私有团队 skill 仓库？ | 相邻能力。 | 核心能力。 |
| 如何维护每个项目批准使用的 skill profiles？ | 不是 registry 的主要任务。 | 核心能力。 |

实际立场：SkillOps 应该成为 ClawHub preflight 工具，而不是 ClawHub 竞品。

## SkillOps vs Claude Code Plugins 和 Skills

Claude Code plugins 可以打包 custom commands、agents、hooks、skills 和 MCP servers。Claude Code skills 从 skill 目录加载，也可以来自 plugins。

这说明 Claude Code 是重要目标，但不是同一产品层。

| 问题 | Claude Code plugin/skill system | SkillOps |
|---|---|---|
| Claude Code 如何加载或激活 skill？ | Runtime 负责。 | 不做。 |
| 如何打包 Claude 专属 plugin marketplace？ | Claude plugin system。 | 除非生成发布建议，否则不做。 |
| 团队应该先批准哪些可复用 skills？ | 不是主要任务。 | 核心能力。 |
| 如何只把某个 profile 应用到 `~/.claude/skills` 或 plugin 源目录？ | 目标相关操作。 | 核心目标工作流。 |

实际立场：Claude Code 是目标 runtime 和 packaging surface。SkillOps 管理文件进入那里之前的源仓库就绪状态。

## SkillOps vs Cursor Rules、AGENTS.md、CLAUDE.md

Cursor rules、`AGENTS.md`、`CLAUDE.md` 等文件是项目本地指令面。它们非常有用，但本身不是可复用 skill 生命周期系统。

| 问题 | 项目指令文件 | SkillOps |
|---|---|---|
| 这个具体仓库应该如何指导 agent？ | 核心任务。 | 可以生成或应用目标文件，但不替代本地策略。 |
| 如何在多个项目复用同一个能力？ | 手动复制或模板。 | Profiles 和 apply 工作流。 |
| 如何审计/发布一个可移植的 `SKILL.md` 资产？ | 不是主要任务。 | 核心能力。 |
| 如何发现某个项目里的拷贝已经过期？ | 手动。 | Drift report。 |

实际立场：项目指令文件是目标或配套文件。SkillOps 是源侧管理器。

## SkillOps vs MCP Registries

Smithery 或社区 MCP registry 等工具帮助用户发现和安装 MCP servers。MCP servers 暴露 tools/resources；skills 是指导 agent 行为的文本/文件包。

| 问题 | MCP registry | SkillOps |
|---|---|---|
| 如何发现/安装 MCP server？ | 核心能力。 | 不做。 |
| 如何治理可复用的 `SKILL.md` 资产？ | 不做。 | 核心能力。 |
| 如何判断哪些 skills 适合公开共享？ | 不做。 | 核心能力。 |
| 如何把 skill 和 MCP setup 文档组合起来？ | 可以写在文档里。 | 可以审计和打包 skill 侧说明。 |

实际立场：MCP registry 管理 tools。SkillOps 管理 skill instructions 和 supporting files。

## 产品规则

不确定时，把 SkillOps 留在上游：

- 自己做：skill-first authoring/validation、scan、audit、profiles、drift、publish-readiness、GitHub release prep。
- 集成：installers、registries、agent runtimes、MCP registries。
- 避免：托管 marketplace、公开搜索、评分、评论、大而全 sync engine、agent runtime 行为、通用 agent 评测平台。
