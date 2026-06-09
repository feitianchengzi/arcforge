# 缺失能力

执行 SkillOps 治理阶段或建设能力框架时发现产品缺口，读取本文件。只要有 fallback，就不要阻断当前 workflow。缺口要作为产品差距报告，不要伪装成已实现。

## CLI 缺口

### 当前项目分类器

需要命令：

```bash
skillops current --root <dir>
```

用途：

- 判断当前目录是普通项目、Skill 项目、单个 skill 目录还是目标项目。
- 列出项目本地 skills。
- 列出 applied source records。
- 推荐下一步 workflow。

Fallback：分别运行 `scan`、`applied list` 和 `source status`。

### 目标目录解析器

需要命令：

```bash
skillops target resolve --project <project-dir> --agent <codex|claude|cursor> [--scope user|project]
```

用途：

- 避免 agent 或用户手写 `.codex/skills`、`.claude/skills`、`.cursor/skills` 或自定义 target path。
- 降低 apply/drift 命令误写目标的风险。

Fallback：请用户提供准确 target directory，或在临时验证中手动创建目标 agent skill 目录。

### 正式 Skill 项目初始化

需要命令：

```bash
skillops project init --root <formal-skill-project>
```

用途：

- 在 merge 前创建或规范化本地正式 Skill 项目。
- 避免目标正式项目目录不存在时出现不清楚的失败。

Fallback：先创建正式 Skill 项目目录；真实远程分享前确认它是 Git 仓库。

### Workflow Plan

需要命令：

```bash
skillops workflow local-skill plan --root <project> --skill <name> --to <formal-skill-project> --target-project <project> --repo <repo>
```

用途：

- 一次性生成完整端到端能力路线计划。
- 标出风险、缺少输入和需要确认的步骤。

Fallback：按 `references/capability-framework.md` 和 `references/cli-orchestration.md` 逐步执行。

### CLI Import 命令

Desktop 主进程已有 `import:plan` 和 `import:run` 能力，用于从外部 Skill 项目把 skills 导入当前项目，但 CLI 当前没有公开命令。

需要命令：

```bash
skillops import plan --root <project> --from <source-project> [--profile <name>] [--skills <a,b>] [--target-dir <dir>] [--target-profile <name>]
skillops import run --root <project> --from <source-project> [options] --confirm
```

Fallback：用 `merge` 表达正式化场景；如果用户明确要把外部 Skill 项目导入当前项目，建议 Desktop。

### Agent 友好的结果提示

命令 JSON 需要补充：

- `summary`
- `blocking`
- `warnings`
- `recommendedNextAction`
- `requiresDesktop`
- `requiresConfirmation`

Fallback：从现有 JSON 推断，并明确说明不确定性。

### CLI Help 参数不完整

部分命令的 `help` 输出比实际解析能力简略。例如 `apply` 和 `drift` 实际支持 `--skills <a,b>`，但 `help apply`/`help drift` 可能没有展示。

Fallback：以 `references/cli-orchestration.md` 的命令表和源码行为为准；向用户说明 CLI help 需要补充。

### Git 前提提示

`source status` 在非 Git 目录会失败。需要更友好的错误或 plan 输出，说明正式 Skill 项目要进入远程分享路径前必须位于 Git 仓库中。

Fallback：报告这个前提；临时验证可以跳过 `source status` 或用 `git init` fixture，真实分享前请用户确认 Git repository。

### 同仓库共享远端权限验证

`share plan --same-repository` 在本地 Git 仓库有 remote 时可能基于本地状态推荐 `directPush`，但不能充分证明用户对远端有写权限；显式传 `--delivery local-branch` 时也可能仍按同仓库 direct push 计划展示。

Fallback：把同仓库共享计划视为需要人工确认的高风险步骤。真实 `share run --same-repository` 前说明 remote、branch、delivery、commit message 和 push 风险；如果用户不确定写权限，建议先用普通 `share plan --repo github.com/<owner>/<repo>` 检查 GitHub access，或改为本地分支/手动 PR 流程。

### Frontmatter 列表元数据解析

`scan` 可能无法把常见 YAML 顶层列表 frontmatter 解析成可见 metadata，例如：

```yaml
targets:
  - codex
```

这不阻断 scan、audit、merge、apply 或 drift 等阶段，但会影响 `targets` 等 metadata 的可见性。

Fallback：在报告中说明 metadata 可能缺失；需要准确目标信息时读取原始 `SKILL.md` frontmatter 或让 CLI frontmatter parser 支持标准 YAML 列表。

## Desktop 缺口

### Context Open

需要命令或 deep link：

```bash
skillops desktop --root <project> --page <page> [context options]
```

用途：

- 让 agent 打开 Desktop 到具体 workflow 上下文。
- 避免把用户送到泛化 home page。

Fallback：告诉用户手动打开哪个 project 和 page。

### Workflow Context Persistence

需要行为：

- Desktop 记住触发 UI handoff 的 scan、merge plan、drift report 或 share plan。
- 回到 agent 后能从同一个结果继续。

Fallback：Desktop 编辑或决策后，重新运行相关 CLI 命令。

### Desktop 可脚本化只读导出

需要能力：

- 导出当前 UI 选择的 profile、target group、share target 和 diff review 结论。
- 让 agent 能把 Desktop 决策转回 CLI 参数。

Fallback：让用户在对话中说明 Desktop 里选择的 profile、target 或交付方式，再由 agent 重新运行 CLI。

## Skill 缺口

### 正式来源发现

Skill 需要可靠判断项目本地 skill 是否已经属于某个正式 Skill 项目。

Fallback：检查 applied source records；没有明确关系时，请用户选择正式 Skill 项目。

### 多项目批量同步

阶段化治理先支持单个目标项目。批量目标应使用 Desktop 或未来 workflow plan command。

Fallback：对每个目标项目重复 apply 和 drift。

### 跨 agent 目标默认路径

Skill 目前只能按常见约定推断 Codex、Claude、Cursor 的目标目录，缺少统一 resolver。

Fallback：真实 apply 前要求用户确认目标目录；临时验证中手动创建目标目录。
