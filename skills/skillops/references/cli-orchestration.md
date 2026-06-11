# CLI 编排

需要通过 SkillOps CLI 执行治理阶段、理解 CLI 原子能力、确认参数语义或做临时验证时读取本文件。

## CLI 入口

已安装后优先使用：

```bash
skillops <command>
```

在 SkillOps 仓库开发环境中，如果还没有安装全局 shim，可使用：

```bash
node dist/cli/index.js <command>
```

如果 `dist/cli/index.js` 不存在，先运行项目已有构建命令，例如：

```bash
npm run build:cli
```

Desktop launcher 安装后优先使用：

```bash
skillops-desktop
```

如果 `skillops-desktop` 不在 PATH，使用安装脚本输出的 launcher 绝对路径；不要把它说成已经可直接调用。

## 原子命令表

查询、计划或诊断命令：

- `skillops scan [--root <dir>] [--source-dir <dir>]`
- `skillops audit [--root <dir>] [--source-dir <dir>]`
- `skillops source status [--root <dir>]`：会 fetch upstream refs，可能写 `.git/FETCH_HEAD` 等 Git 元数据；不要在禁止写源码的真实 checkout 中运行。
- `skillops merge plan --root <dir> [--source-dir <dir>] --to <path-or-url> --target-path <dir> [--skills <a,b>] [--profile <name>] [--target <dir>]`
- `skillops applied list [--root <dir>]`
- `skillops applied drift [--root <dir>] [--id <record-id>]`
- `skillops drift [--root <dir>] [--from <path-or-url>] [--profile <name>] --target <dir> [--skills <a,b>]`
- `skillops publish-plan [--root <dir>] [--visibility private|public]`
- `skillops share plan --root <dir> --repo <repo> [--profile <name>] [--skills <a,b>] [--visibility private|public] [--target-mode direct|namedProject] [--project-name <name>] [--delivery target-pr|fork-pr|direct-push|local-branch] [--branch <name>]`
- `skillops share plan --root <dir> --same-repository [--same-repository-remote <name>] [--profile <name>] [--skills <a,b>]`
- `skillops doctor`

写入或状态性命令：

- `skillops source update [--root <dir>] --confirm`
- `skillops merge run --root <dir> [--source-dir <dir>] --to <path-or-url> --target-path <dir> [--skills <a,b>] [--profile <name>] [--target <dir>] --confirm`
- `skillops applied add --root <dir> --from <path-or-url> --profile <name> --target <dir> [--skills <a,b>]`
- `skillops applied remove <record-id> [--root <dir>]`
- `skillops applied run [--root <dir>] [--id <record-id>] --confirm`
- `skillops apply [--root <dir>] [--from <path-or-url>] [--profile <name>] --target <dir> [--skills <a,b>] [--save]`
- `skillops share run --root <dir> --repo <repo> [--profile <name>] [--skills <a,b>] --confirm`
- `skillops share run --root <dir> --same-repository [--same-repository-remote <name>] [--profile <name>] [--skills <a,b>] --confirm`

当前 CLI 没有公开 `import` 命令；从外部 Skill 项目导入到当前项目的 import plan/run 目前是 Desktop IPC 能力。

## 最小项目结构和默认配置

SkillOps 可以在没有显式配置文件的目录中工作。最小正式 Skill 项目结构：

```text
formal-skills/
  skills/
    code-review/
      SKILL.md
```

如果 root 下存在 `skills/*/SKILL.md`，默认配置为：

- `sourceDir: "skills"`
- `profiles[0].name: "default"`
- `profiles[0].skills: ["*"]`
- `profiles[0].targets: ["claude", "codex", "cursor"]`

因此 `default` profile 默认包含 `skills/` 下发现的全部 skills，不需要先写配置文件。项目本地 agent skills 的最小结构：

```text
business-project/
  .codex/
    skills/
      code-review/
        SKILL.md
```

这类目录必须用项目根作为 `--root`，用 `.codex/skills` 作为 `--source-dir`。

## 原子能力速查

| 能力 | CLI | 写入属性 | 何时转 Desktop |
|---|---|---|---|
| 发现 | `scan` | 不写项目文件 | 需要在项目列表中选择或查看健康度 |
| 审计 | `audit` | 不写项目文件 | 需要定位 findings 并编辑文件 |
| Git 来源状态 | `source status` | 可能写 Git 元数据 | 需要用户理解 ahead/behind/dirty 后决定更新 |
| Git 来源更新 | `source update --confirm` | 写 Git checkout | 需要用户先确认更新风险 |
| 正式化计划 | `merge plan` | 不写目标 | 有冲突或需要视觉复核 |
| 正式化执行 | `merge run --confirm` | 写正式 Skill 项目和应用关系 | 有冲突时不要执行，转 Desktop 或手动 review |
| 应用关系 | `applied list/add/remove/drift/run` | add/remove/run 会写状态或目标 | 需要查看多条关系或完整 diff |
| 一次性应用 | `apply` | 写目标目录，`--save` 写应用关系 | 需要选择多个目标或确认覆盖 |
| 漂移 | `drift` | 不写目标 | 需要完整文件级 diff |
| 发布准备 | `publish-plan` | 不写远端 | 需要审查 checklist 和文件清单 |
| Git 共享 | `share plan/run` | run 可能写 Git、push、PR | 需要确认交付方式、权限或 PR 计划 |
| 环境诊断 | `doctor` | 不写项目文件 | 需要安装 CLI shim 或查看 GUI 环境 |

## 参数语义

- `--root` 是 SkillOps 工作区根目录，默认当前目录。
- `--source-dir` 是 `--root` 内的相对 skill 来源目录，只覆盖本次扫描、审计或归并。
- 项目本地 agent skills 位于 `.codex/skills`、`.claude/skills`、`.cursor/skills` 时，`--root` 仍然是项目根目录，`--source-dir` 传 agent skill 目录。
- `--profile` 是来源或目标 Skill 项目中的 profile 名，默认通常是 `default`。
- `--skills <a,b>` 用逗号选择部分 skill。
- `--from` 是应用或漂移的来源 Skill 项目，可以是本地目录或远程 Git/GitHub 输入。
- `--to` 是归并目标 Skill 项目，可以是本地目录或远程 Git/GitHub 输入。
- `merge --target-path` 是正式 Skill 项目内的父目录。CLI 会在其下追加 skill 名。
- `merge --target` 是记录到当前项目 applied source 中的目标目录，不是归并输出目录。
- `apply --target` 是真实写入目标。指定 `--from` 时按 `--root` 解析为目标项目内相对路径；未指定 `--from` 时可以是直接目标路径。
- `apply --save` 会把来源、profile、目标目录和技能选择保存为 applied source record。
- applied source state 保存在 `SKILLOPS_HOME/projects` 下的用户级项目状态中；不写入来源 checkout。临时验证时设置 `SKILLOPS_HOME=/private/tmp/<run>/.skillops-home`。

示例：归并 `project-demo-video` 到标准技能目录时应使用：

```bash
skillops merge plan --root . --source-dir .codex/skills --to ../team-skills --skills project-demo-video --target-path skills --profile default --target .codex/skills
```

不要使用 `--target-path skills/project-demo-video`，否则会生成 `skills/project-demo-video/project-demo-video`。

## 常用编排

扫描项目本地 agent skills：

```bash
skillops scan --root . --source-dir .codex/skills
skillops audit --root . --source-dir .codex/skills
```

正式化前计划：

```bash
skillops merge plan --root . --source-dir <source-dir-if-needed> --to <formal-skill-project> --skills <skill-name> --target-path <parent-dir-inside-formal-project> --profile default --target <target-record-path>
```

确认后正式化：

```bash
skillops merge run --root . --source-dir <source-dir-if-needed> --to <formal-skill-project> --skills <skill-name> --target-path <parent-dir-inside-formal-project> --profile default --target <target-record-path> --confirm
```

确认后应用到目标：

```bash
skillops apply --root <target-project> --from <formal-skill-project> --profile default --target <target-agent-skill-dir> --save
```

检查目标漂移：

```bash
skillops drift --root <target-project> --from <formal-skill-project> --profile default --target <target-agent-skill-dir>
```

基于已保存应用关系检查和重新应用：

```bash
skillops applied list --root <project>
skillops applied drift --root <project> --id <record-id>
skillops applied run --root <project> --id <record-id> --confirm
```

维护 Git 来源：

```bash
skillops source status --root <formal-skill-project>
skillops source update --root <formal-skill-project> --confirm
```

发布和共享准备：

```bash
skillops publish-plan --root <formal-skill-project> --visibility private
skillops share plan --root <formal-skill-project> --repo <github-or-git-repo> --profile default
skillops share plan --root <formal-skill-project> --same-repository --profile default
```

`publish-plan` 不要求项目是 Git 仓库，会输出文件清单、安装命令提示和 checklist。`share plan --same-repository` 要求当前 Skill 项目位于带 remote 的 Git 仓库中；如果不是 Git 仓库，会失败并应提示用户先确认正式 Skill 项目的 Git 位置。当前同仓库共享主要基于本地 remote 推断，不等价于已验证远端写权限；真实执行前仍要让用户确认 remote、branch、delivery 和 push 风险。`share plan --repo github.com/<owner>/<repo>` 在 GitHub CLI 未登录或无写权限时仍可生成计划，通常会把推荐交付方式降级为 `localBranch`，并在 `access.unavailableReasons` 中说明原因。

## 确认边界

真实项目中运行以下命令前必须得到用户明确确认：

- `source update`
- `merge run`
- `applied add`
- `applied remove`
- `applied run`
- `apply`，只要目标不是临时目录
- `share run`

确认前说明 root、source/from/to、profile、skills、target、repository、branch、delivery method 和覆盖风险。

## 临时验证规则

在测试、子代理模拟或一次性 fixture 中运行写入命令时设置临时状态目录：

```bash
SKILLOPS_HOME=/private/tmp/<run>/.skillops-home skillops <command>
```

临时验证允许在临时 root、临时正式 Skill 项目和临时 target 中执行 `merge run --confirm`、`apply --save`、`applied add/remove`、`applied run --confirm`、`drift` 和 `share plan`。不要在真实用户项目或真实 agent 目录上无确认执行写入。
