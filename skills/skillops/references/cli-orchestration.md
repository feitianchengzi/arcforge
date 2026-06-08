# CLI 编排

需要通过当前 SkillOps CLI 执行某个治理阶段，或在用户明确要求时串联多个阶段时读取本文件。

## CLI 入口

已安装后优先使用：

```bash
skillops <command>
```

需要打开 Desktop 时，已通过 `skillops-install` 安装的环境优先使用：

```bash
skillops-desktop
```

在 SkillOps 仓库开发环境中，如果还没有安装全局 shim，可使用：

```bash
node dist/cli/index.js <command>
```

如果 `dist/cli/index.js` 不存在，先运行项目已有构建命令，例如 `npm run build:cli`。

## 可用命令

- `skillops scan [--root <dir>] [--source-dir <dir>]`
- `skillops audit [--root <dir>] [--source-dir <dir>]`
- `skillops merge plan --root <dir> [--source-dir <dir>] --to <path-or-url> --target-path <dir> [--skills <a,b>] [--profile <name>] [--target <dir>]`
- `skillops merge run --root <dir> [--source-dir <dir>] --to <path-or-url> --target-path <dir> [--skills <a,b>] [--profile <name>] [--target <dir>] --confirm`
- `skillops apply [--root <dir>] [--from <path-or-url>] [--profile <name>] --target <dir> [--save]`
- `skillops drift [--root <dir>] [--from <path-or-url>] [--profile <name>] --target <dir>`
- `skillops applied list [--root <dir>]`
- `skillops applied drift [--root <dir>] [--id <record-id>]`
- `skillops applied run [--root <dir>] [--id <record-id>] --confirm`
- `skillops publish-plan [--root <dir>] [--visibility private|public]`
- `skillops share plan --root <dir> --repo <repo> [--profile <name>] [--skills <a,b>]`
- `skillops share plan --root <dir> --same-repository [--profile <name>] [--skills <a,b>]`
- `skillops share run --root <dir> --repo <repo> [--profile <name>] [--skills <a,b>] --confirm`
- `skillops source status [--root <dir>]`
- `skillops source update [--root <dir>] --confirm`
- `skillops doctor`

## 临时验证规则

在测试、子代理模拟或一次性 fixture 中运行写入命令时：

```bash
SKILLOPS_HOME=/private/tmp/<run>/.skillops-home skillops <command>
```

这样 applied source state 会写到临时目录，而不是真实用户级 `~/.skillops`。

临时验证允许在临时 root、临时正式 Skill 项目和临时 target 中执行 `merge run --confirm`、`apply --save`、`drift` 和 `share plan`。不要在真实用户项目或真实 agent 目录上无确认执行写入。

## 同步命令顺序

如果 skill 存在于项目本地 agent 目录，保持 `--root` 为项目根目录，并把 agent skill 目录传给 `--source-dir`：

```bash
skillops scan --root . --source-dir .codex/skills
skillops audit --root . --source-dir .codex/skills
```

不要把 `.codex` 当作 root，除非用户明确要求把 `.codex` 自身当作工作区。

1. 检查当前状态：

```bash
skillops scan --root .
skillops applied list --root .
```

2. 合并前审计：

```bash
skillops audit --root .
```

3. 生成合并计划：

```bash
skillops merge plan --root . --source-dir <source-dir-if-needed> --to <formal-skill-project> --skills <skill-name> --target-path <parent-dir-inside-formal-project> --profile default --target <target-record-path>
```

4. 用户确认后执行合并：

```bash
skillops merge run --root . --source-dir <source-dir-if-needed> --to <formal-skill-project> --skills <skill-name> --target-path <parent-dir-inside-formal-project> --profile default --target <target-record-path> --confirm
```

5. 用户确认后，从正式来源应用到目标项目或 agent 目录：

```bash
skillops apply --root <target-project> --from <formal-skill-project> --profile default --target <target-agent-skill-dir> --save
```

6. 检查目标漂移：

```bash
skillops drift --root <target-project> --from <formal-skill-project> --profile default --target <target-agent-skill-dir>
```

步骤 4、5、6 必须串行执行。`apply` 依赖合并后的正式 Skill 项目，`drift` 依赖应用后的目标目录。

## 路径语义

`merge --target-path` 是正式 Skill 项目内的父目录。CLI 会在其下追加 skill 名。合并 `project-demo-video` 时应使用：

```bash
--target-path skills
```

不要使用 `--target-path skills/project-demo-video`，否则会生成 `skills/project-demo-video/project-demo-video`。

`merge --target` 是记录到当前项目 applied source 中的目标目录，不是合并输出目录。常见值是 `.codex/skills`、`.claude/skills` 或 `.cursor/skills`。

## 远程分享命令顺序

远程分享应从正式 Skill 项目执行，而不是从原始项目本地草稿执行。

`source status` 和 `share plan --same-repository` 要求正式 Skill 项目位于 Git 仓库中。如果当前目录不是 Git 仓库，先说明这个前提；临时验证可以跳过 `source status`，或用 `git init`、本地 bare remote、upstream branch 构造 fixture。真实分享前必须让用户确认正式 Skill 项目的 Git 仓库位置和 remote。

1. 检查正式来源状态：

```bash
skillops source status --root <formal-skill-project>
```

2. 生成发布准备清单：

```bash
skillops publish-plan --root <formal-skill-project> --visibility private
```

3. 生成分享计划：

```bash
skillops share plan --root <formal-skill-project> --repo <github-or-git-repo> --profile default
```

如果只想在同一仓库内准备分享计划，可用：

```bash
skillops share plan --root <formal-skill-project> --same-repository --profile default
```

4. 用户确认后执行远程分享：

```bash
skillops share run --root <formal-skill-project> --repo <github-or-git-repo> --profile default --confirm
```

## 确认规则

真实项目中运行以下命令前必须得到用户明确确认：

- `merge run`
- `apply`，只要目标不是临时目录
- `applied run`
- `source update`
- `share run`

确认前说明 root、source、target、profile、skills、repository、branch 和覆盖风险。临时路径模拟可以在报告中说明范围后执行。
