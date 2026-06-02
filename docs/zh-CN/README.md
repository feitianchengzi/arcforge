# SkillOps

[English](../../README.md)

SkillOps 是面向 AI agent skills 的本地优先、GitHub 优先治理工作台。

SkillOps 帮助个人开发者和小团队把 `SKILL.md` 文件变成经过审计、分组、可共享的资产，然后再安装到 agent，或发布到 GitHub/ClawHub。

![SkillOps 治理理念图](../assets/skillops-overview.svg)

## 为什么会有这个项目

SkillOps 最开始是我自己的一个需求：我希望有一个小而本地优先的工具，用来在 skills 被复制到 agent 或分享给别人之前，先把它们管理起来。**我现在也不确定这个方向是否真的值得长期投入**，所以不想在没有明确反馈前把它做得过重。

如果**你也有 skill 管理需求**，并且在现有工具里找不到符合自己工作方式的方案，欢迎给这个项目一个 star、提 issue，或者直接发 PR。这能让我知道**不是只有我一个人遇到这类问题**。

**大家的 star 是我判断是否继续投入 SkillOps 的最直接信号**。真实需求越多，我就越有理由把它从个人工作流工具，继续维护成一个更认真可用的项目。

## 定位

SkillOps 不是 skill marketplace、公开 registry、包管理器，也不是 agent runtime。

它负责分发之前的工作流：

```text
编写 skill -> 审计 -> 组成 profile -> 应用到目标 -> 检查 drift -> 发布准备
```

SkillOps 主要回答这些运营问题：

- 哪些 skills 是这个项目或团队批准使用的？
- 能否在应用前直接查看和修复源 skill？
- 这个 skill 是否适合共享或公开发布？
- 已安装副本是否偏离了源仓库？
- 应该给用户什么安装命令和发布 checklist？

## 和同类产品的差异

| 产品类型 | 代表产品 | 它们主要解决 | SkillOps 解决 |
|---|---|---|---|
| 公开 skill registry | [ClawHub/OpenClaw](https://github.com/openclaw/clawhub)、skills.sh | 发现、公开发布、搜索、marketplace 体验 | 发布前准备；继续让 GitHub 做 source of truth |
| 跨 agent 安装工具 | [skillshare](https://github.com/runkids/skillshare)、[npx skills](https://github.com/vercel-labs/skills) | 把 skills 安装和同步到多个 agent | 先审阅和编辑源 skills，再围绕这些工具生成 profiles、审计门禁、drift report 和发布计划 |
| Agent 原生系统 | [Claude Code plugins](https://code.claude.com/docs/en/plugins)、[Claude skills](https://code.claude.com/docs/en/skills)、Cursor rules | runtime 加载、激活、agent 专属行为 | 在复制到 runtime 目录前管理源 skills |
| 项目指令文件 | `AGENTS.md`、`CLAUDE.md`、`.cursor/rules` | 告诉某个项目或 agent 如何工作 | 跨项目、跨 agent 管理可复用的 `SKILL.md` 资产 |
| MCP registry | [Smithery](https://smithery.ai/) 等 MCP 目录 | 发现和安装 MCP servers | 专注 skill 治理，不做 tool-server 分发 |

一句话：registry 用来发现和分发，installer 用来复制到 agent，SkillOps 用来判断哪些 skill 值得信任、如何分组、如何应用、如何发布。

更详细的逐项对比见 [对比说明](comparison.md)。

## 什么时候用

当你需要在 skills 被复制到 agent 或准备发布之前，先做一层本地治理时，适合使用 SkillOps。

| 场景 | 用 SkillOps 做什么 | 主要能力 |
|---|---|---|
| 团队私有 skill 仓库 | 不搭 registry，也能让 skill 变更经过 Git review | scan、audit、profiles、GitHub share |
| 按项目配置 agent | 每个项目只安装它应该使用的已批准 skills | apply、drift、applied |
| 项目内自然产生的 skill 正式维护 | 把业务项目中的可复用 skill 归并到另一个 Skill 项目，并让当前项目成为应用目标 | merge、applied |
| 维护 GitHub 来源项目 | 先查看当前 Git checkout 落后上游多少 commit，再自主决定是否更新 | source status、source update |
| 公开发布前检查 | 检查 secrets、风险指令、薄弱 metadata 和内部引用 | audit、publish-plan |
| 多 agent 漂移控制 | 比较已安装副本和来源 Skill 项目是否一致 | drift、applied |
| 本地编辑 skill | 不离开工作台即可查看和编辑 `SKILL.md`、references 与 scripts | 桌面端技能文件编辑器 |
| CI 守门 | 在共享或发布前输出 JSON 检查结果 | CLI commands |

如果你只是想浏览公开 skills，或一次性给某个 agent 安装一个 skill，SkillOps 不是最短路径。

## 怎么用

推荐工作区结构：

```text
my-skills/
  skills/
    code-review/
      SKILL.md
      references/
    release-writer/
      SKILL.md
```

本地来源和 GitHub 来源也可以直接指向单个 skill 文件夹：

```text
code-review/
  SKILL.md
  references/
```

本地项目设置：

SkillOps 会把日常本地项目设置保存到 `~/.skillops/projects`，因此 GitHub 来源 checkout 不会只因为配置组或目标变化而变脏。如果项目根目录仍存在 `skillops.config.json`，当用户级项目状态不存在时系统会先迁移进去；当用户级项目状态已存在时系统只删除项目根目录下的该文件。

本地状态中的配置结构：

```json
{
  "version": 1,
  "sourceDir": "skills",
  "teamRepo": "github.com/acme/team-skills",
  "profiles": [
    {
      "name": "frontend",
      "description": "Skills approved for frontend projects.",
      "skills": ["code-review", "release-writer"],
      "targets": ["codex", "claude", "cursor"]
    }
  ]
}
```

### 桌面端

使用演示：

![SkillOps 桌面端演示](../assets/skillops-desktop-demo.gif)

从 GitHub Releases 下载最新版 macOS `.dmg`、Windows `.exe` 或 Linux `.AppImage` 即可安装桌面端。

开发时从源码启动：

```bash
npm install
npm run dev
```

本地打包桌面端：

```bash
npm run package
```

桌面端是 skills 被复制到 agent 或准备 GitHub 优先共享之前的本地治理工作台。

| 桌面端亮点 | 为什么重要 |
|---|---|
| 内置 skill 文档编辑器 | 让审计发现的问题可以直接回到本地 `SKILL.md`、references 和 scripts 修复，形成治理闭环。 |
| 配置组感知的工作区视图 | 让项目、团队、发布用的 skill 集合成为实际操作上下文，而不只是配置字段。 |
| 多应用目标组合 | 把批准过的 profile 一次性、可控地应用到 agent、项目和自定义本地目录。 |
| 多共享目标组合 | 将同一套治理后的 skill 集合准备到不同 GitHub 共享或发布路径。 |
| Drift 与 CLI 修复反馈 | 让已安装副本和本地 CLI 环境都有明确状态，不靠用户猜测哪里变化或失败。 |

桌面端 release 包内置同一套 CLI 引擎。应用启动后会安装用户级 `skillops` shim，环境提示会显示 shim 是否已经在 PATH 中可用。当 shim 目录需要写入 shell profile 时，可以在桌面端环境提示中使用 **修复 CLI**。

### CLI

使用视频：[SkillOps CLI 演示](../assets/skillops-cli-demo.mp4)

从最新 GitHub Release 安装 CLI：

需要 PATH 中已有 Node.js 20 或更高版本。

```bash
curl -fsSL https://github.com/feitianchengzi/skillops/releases/latest/download/install.sh | sh
```

Windows PowerShell：

```powershell
irm https://github.com/feitianchengzi/skillops/releases/latest/download/install.ps1 | iex
```

本地构建并运行 CLI：

```bash
npm install
npm run build:cli
node dist/cli/index.js help
```

常用命令：

```bash
skillops scan --root .
skillops audit --root .
skillops source status --root .
skillops source update --root . --confirm
skillops merge plan --root . --to ../team-skills --skills code-review --target-path skills/project-a
skillops merge run --root . --to github.com/acme/team-skills --skills code-review --target-path skills/project-a --confirm
skillops applied list --root .
skillops applied drift --root .
skillops apply --from ../team-skills --profile default --target ~/.codex/skills
skillops drift --from github.com/acme/team-skills --profile default --target ~/.codex/skills
skillops publish-plan --root . --visibility public
skillops share plan --root . --repo github.com/acme/team-skills --profile frontend
skillops share run --root . --repo github.com/acme/team-skills --profile frontend --message "Share frontend skills" --confirm
skillops doctor
```

传给 `merge`、`apply` 或 `drift` 的远程 Skill 项目会先下载到本地缓存，然后以本地目录参与后续操作。`source status` 和 `source update` 是独立的 Git checkout 操作：它们只检查当前 `--root`，报告 ahead/behind 状态，并且只有在显式传入 `--confirm` 后才会执行 fast-forward-only 更新。

## 项目状态

早期 MVP。`1.0` 之前 API 和配置结构可能会变化。

更多文档：

- [产品说明](product.md)
- [对比说明](comparison.md)
- [架构说明](architecture.md)
- [路线图](roadmap.md)
- [发布记录](release-notes.md)
