# SkillOps

[English](docs/en/README.md)

SkillOps 是给 coding agent 使用的本地优先、GitHub 优先 skill 生命周期治理工作台。

它帮助个人开发者和小团队把 skills 从创建、验证、审计、分组、应用、漂移检查一路推进到团队共享或公开发布准备。CLI 和 Desktop 都是 agent 可以调度的工具，不是让用户背命令的主入口。

![SkillOps 治理理念图](docs/assets/skillops-overview.svg)

## 从当前仓库安装 SkillOps

安装 SkillOps 的推荐方式不是先手动运行 CLI，而是把当前仓库交给 coding agent。

1. Clone 或打开这个仓库。
2. 用 Codex、Claude Code、Cursor 等 coding agent 打开当前项目。
3. 给 agent 发送：

```text
执行 skills/skillops-install
```

安装 skill 会从当前源码 checkout 完成这些动作：

- 把 `skills/skillops/` 和 `skills/skillops-skill-first/` 安装到当前 agent 的用户级 skill 目录。
- 构建本地 `skillops` CLI shim。
- 安装可由 agent 调起的 `skillops-desktop` launcher。
- 在不能启动 GUI 的环境中，用 headless 校验确认安装结果。

安装完成后，在任意项目中打开 coding agent，然后直接用自然语言让 agent 使用 SkillOps：

```text
使用 skillops 扫描当前项目的 skills
使用 skillops-skill-first 先把这个工作流沉淀成 skill 并做子代理验证
使用 skillops 审计这些 skills 是否适合团队共享
使用 skillops 把 frontend profile 应用到 Codex
使用 skillops 检查已安装副本和来源仓库之间的 drift
使用 skillops 准备 GitHub 和 ClawHub/OpenClaw 发布 checklist
```

如果 agent 无法识别安装 skill，可以让它执行这个兜底命令：

```bash
node skills/skillops-install/scripts/install-from-repo.mjs --agent codex --desktop install
```

只有明确希望修改 shell profile 以加入 PATH 时，才追加 `--update-path`。需要生成本地桌面端安装包时，使用 `--desktop package`。

## 为什么会有这个项目

SkillOps 最开始是一个很具体的本地工作流需求：我希望在 skills 被复制到 agent、分享给团队或准备公开发布之前，先有一个轻量的治理层。随着 Skill First 工作流进入核心范围，SkillOps 也覆盖 skill 被创建和验证之后如何进入审计、正式化和应用流程。

这个治理层不应该取代 agent，不应该变成 marketplace，也不应该绕过 GitHub。它应该帮助 agent 和用户在本地把源 skill 看清楚、改干净、分好组、记录来源，然后再交给现有 agent、安装工具、GitHub 或 ClawHub/OpenClaw。

如果你也遇到类似的 skill 管理问题，欢迎 star、提 issue 或发 PR。真实需求越多，越值得把 SkillOps 从个人工作流工具继续维护成更认真可用的项目。

## 产品定位

SkillOps 不是 skill marketplace、公开 registry、搜索引擎、评分系统、付费分发平台、包管理器，也不是 agent runtime。

SkillOps 负责分发之前的工作：

```text
创建/迭代 skill -> 子代理验证 -> 审计 -> 组成 profile -> 应用到目标 -> 检查 drift -> 准备发布
```

它主要回答这些问题：

- 当前项目或团队批准使用哪些 skills？
- 一个工作模式是否已经被沉淀成可复用 skill，并通过真实任务验证？
- 这些源 skills 在应用到 agent 前是否可以被审阅和修复？
- 一个项目内自然产生的 skill 是否值得沉淀到正式 Skill 项目？
- 已安装副本是否偏离了 GitHub 或本地正式来源？
- 团队共享或公开发布前，还缺哪些 checklist？
- 用户应该收到哪些 GitHub、ClawHub/OpenClaw 或 installer 命令提示？

一句话：registry 用来发现和分发，installer 用来复制到 agent，SkillOps 用来判断哪些 skill 值得信任、如何分组、如何应用、如何发布。

更详细的逐项对比见 [对比说明](docs/comparison.md)。

## 工作方式

SkillOps 的新使用理念是 agent-first：

| 组成部分 | 角色 |
|---|---|
| `skills/skillops-install` | 让用户 clone 仓库后，通过 coding agent 完成本地安装。 |
| `skillops-skill-first` skill | 把工作模式沉淀成 skill，并用子代理前测/复测验证。 |
| `skillops` skill | 后续治理流程入口，负责审计、正式化、profile、应用、漂移和发布准备。 |
| CLI | agent 调用的可复现执行层，负责 scan、audit、apply、drift、share 等 JSON 结果。 |
| Desktop | agent 在需要视觉审阅、文件编辑、批量选择、冲突复核或完整 drift diff 时调起的本地工作台。 |
| GitHub | skill source of truth、review、版本、release 和访问控制来源。 |
| ClawHub/OpenClaw 等 registry | 公开发布目标或发布准备检查对象，不是 SkillOps 要替代的系统。 |

典型流程：

```text
在 SkillOps 仓库中让 agent 执行 skills/skillops-install
-> 在目标项目中打开 coding agent
-> 如需创建或改进 skill，先让 agent 使用 skillops-skill-first 完成沉淀和验证
-> 让 agent 使用 skillops 扫描或审计本地 skills
-> 把可复用的项目内 skill 归并到正式 Skill 项目
-> 把批准过的 profile 应用到 agent 或项目目标
-> 检查正式来源和已安装副本之间的 drift
-> 准备 GitHub 优先的共享或公开发布说明
```

用户不需要先理解所有 CLI 子命令。CLI 子命令是 agent、CI 或调试场景的底层接口。

## 什么时候用

当你需要在 skills 被复制到 agent、团队共享或公开发布之前，先做一层本地治理时，适合使用 SkillOps。

| 场景 | SkillOps 做什么 |
|---|---|
| 团队私有 skill 仓库 | 不搭 registry，也能让 skill 变更经过 Git review。 |
| 按项目配置 agent | 每个项目只安装它应该使用的已批准 skills。 |
| 项目内自然产生的 skill 正式维护 | 把业务项目中的可复用 skill 归并到正式 Skill 项目。 |
| 维护 GitHub 来源项目 | 先查看当前 Git checkout 落后上游多少 commit，再自主决定是否更新。 |
| 公开发布前检查 | 检查 secrets、风险指令、薄弱 metadata 和内部引用。 |
| 多 agent 漂移控制 | 比较已安装副本和来源 Skill 项目是否一致。 |
| 本地编辑 skill | 在 Desktop 中查看和编辑 `SKILL.md`、references 与 scripts。 |
| CI 守门 | 在共享或发布前输出可机器读取的检查结果。 |

如果你只是想浏览公开 skills，或一次性给某个 agent 安装一个公开 skill，SkillOps 不是最短路径。那类需求应该优先使用 registry 或 installer。

## Skill 项目结构

推荐把可复用 skills 放在正式 Skill 项目里，并让 GitHub 做 source of truth：

```text
my-skills/
  skills/
    code-review/
      SKILL.md
      references/
    release-writer/
      SKILL.md
      scripts/
```

本地来源和 GitHub 来源也可以直接指向单个 skill 文件夹：

```text
code-review/
  SKILL.md
  references/
```

当 skills 位于 `.codex/skills`、`.claude/skills`、`.cursor/skills` 这类项目内 agent 目录时，项目根目录仍然是治理根目录。SkillOps 会把 agent skill 目录作为 `--source-dir` 传给 CLI，让本地项目状态、Git 状态、应用来源记录和漂移报告都归属于真实项目，而不是隐藏的 agent 目录。

SkillOps 会把日常本地项目设置保存到 `~/.skillops/projects`，避免 GitHub source checkout 因 profile 或 target 变化而变脏。项目根目录下遗留的 `skillops.config.json` 会在需要时迁移到用户级项目状态。

配置结构示例：

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

## Desktop

使用演示：

![SkillOps 桌面端演示](docs/assets/skillops-desktop-demo.gif)

Desktop 是本地治理工作台，不是必须先打开的主入口。通常由 agent 在这些场景调起：

- 审计发现问题后，需要直接编辑 `SKILL.md`、references 或 scripts。
- 需要按 profile 批量查看、选择和应用 skills。
- 需要复核 apply、merge、share 的冲突或差异。
- 需要查看已安装副本和来源之间的完整 drift diff。

从源码开发启动：

```bash
npm install
npm run dev
```

本地打包桌面端：

```bash
npm run package
```

发布包内置同一套 CLI 引擎。应用启动后会安装用户级 `skillops` shim，并提示 shim 是否已经在 PATH 中可用。

## CLI

CLI 是 SkillOps 的可复现执行层，主要给 agent、CI 和调试场景使用。

使用视频：[SkillOps CLI 演示](docs/assets/skillops-cli-demo.mp4)

本地构建并运行 CLI：

```bash
npm install
npm run build:cli
node dist/cli/index.js help
```

常用底层命令：

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

早期 MVP。`1.0` 之前 API、配置结构和 Desktop 体验都可能变化。

更多文档：

- [产品说明](docs/product.md)
- [对比说明](docs/comparison.md)
- [架构说明](docs/architecture.md)
- [路线图](docs/roadmap.md)
- [发布记录](docs/release-notes.md)
