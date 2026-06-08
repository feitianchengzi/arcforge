# 缺失能力

执行 SkillOps 治理阶段或建设能力框架时发现产品缺口，读取本文件。只要有 fallback，就不要阻断当前 workflow。

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

### Agent 友好的结果提示

命令 JSON 需要补充：

- `summary`
- `blocking`
- `warnings`
- `recommendedNextAction`
- `requiresDesktop`
- `requiresConfirmation`

Fallback：从现有 JSON 推断，并明确说明不确定性。

### Git 前提提示

`source status` 在非 Git 目录会失败。需要更友好的错误或 plan 输出，说明正式 Skill 项目要进入远程分享路径前必须位于 Git 仓库中。

Fallback：报告这个前提；临时验证可以跳过 `source status` 或用 `git init` fixture，真实分享前请用户确认 Git repository。

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

## Skill 缺口

### 正式来源发现

Skill 需要可靠判断项目本地 skill 是否已经属于某个正式 Skill 项目。

Fallback：检查 applied source records；没有明确关系时，请用户选择正式 Skill 项目。

### 多项目批量同步

阶段化治理先支持单个目标项目。批量目标应使用 Desktop 或未来 workflow plan command。

Fallback：对每个目标项目重复 apply 和 drift。
