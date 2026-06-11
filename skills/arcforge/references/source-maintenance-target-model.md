# 来源、维护源、应用目标和共享目标模型

当用户提到安装、同步、导入、迁移、复用、应用、更新、漂移、共享或发布时读取本文件。目标是在所有场景中先把对象关系说清楚，再选择 CLI 或 Desktop。

ArcForge 的最小完整抽象是：4 个端点对象、1 个关系对象、2 个选择维度。

## 四个端点对象

- 来源 / 上游源：内容从哪里来，或维护源从哪里更新。可能是 GitHub/Git URL、本地 Skill 项目、当前项目 agent skill 目录、正式 Skill 项目 checkout、Git upstream，或已保存的 applied source record。
- 维护源：ArcForge 要审计、编辑、profile、版本化和准备分享的本地 Skill 项目或项目内 skill 来源目录。它是治理工作的 source of truth，不一定等于来源。
- 应用目标：Codex、Claude、Cursor 用户级 skill 目录，项目内 `.codex/skills`、`.claude/skills`、`.cursor/skills`，或自定义项目目录。它是消费位置，不应该被默认当作维护源。ArcForge 语境里的“安装 skills”通常就是把来源或维护源应用到这个目标。
- 共享目标：维护源要交付到哪里给团队或外部使用。可能是 GitHub/Git repo、同仓库分支、target PR、fork PR、direct push、local branch，或 ClawHub/OpenClaw 发布准备目标。

## 关系对象和选择维度

- 关系记录：记录“哪个来源 profile/skills 连接到了哪个本地目录”，用于 drift 和 reapply。它是连接关系，不是第五类端点。`profileApply` 表示维护源应用到了应用目标；`maintenanceImport` 表示外部来源导入到了当前维护源目录。
- profile / skills selection：本轮处理哪个 profile、全部 skills 还是部分 skills。
- 当前项目 / workspace：命令执行上下文和用户级状态归属；它可能同时包含维护源或应用目标，但不能自动等同于二者。

## 不变量

- 共享目标不是应用目标。应用目标是本机或项目怎么用；共享目标是维护源怎么交付出去。
- 共享目标未来可能变成别人的来源。例如 share 到 GitHub 后，另一个项目从这个 repo import/apply，它就是那个项目的来源。
- 来源和维护源可以相同，也可以不同。本地正式 Skill 项目带 remote 时，维护源是本地 checkout，上游源是 Git remote。
- 应用目标不应该默认变成维护源。`~/.codex/skills` 通常是消费目录，不应该未经确认就拿来做审计、profile 和版本化维护。
- 当前项目 skill 迁移的默认治理方向是：当前项目 skill 来源目录 -> 正式维护源 -> 应用目标或共享目标。不要直接把当前项目 skill 到处复制，除非用户明确要一次性复制并接受没有 durable source relationship。
- 从 GitHub/Git/本地 Skill 项目安装到 Codex、Claude、Cursor 或项目 agent 目录，是 ArcForge 自己的安装治理路径：先解析来源和 profile/skills，再对目标做 drift，确认后 apply，并按需保存关系记录。不要把这种请求转交给通用 skill installer。

## 统一前置检查

在执行写入前，先报告或询问：

- 来源 / 上游源：`from`、`to`、Git remote、本地路径或 applied source record 是什么。
- 维护源：当前要扫描、审计、导入、归并、编辑 profile 或发布准备的 root/sourceDir/targetDir 是什么。
- 应用目标：要写入哪个 agent、项目或自定义目录；如果没有应用目标，本轮只停在导入、正式化、审计或发布准备。
- 共享目标：是否要交付到 GitHub/Git/PR/branch/registry 准备；如果没有共享目标，本轮不执行 share/publish。
- profile/skills：使用哪个 profile，全部 skills 还是部分 skills。
- 关系状态：是否需要保存 applied source record，后续是否要 drift/reapply。
- 确认边界：哪些步骤只读，哪些步骤会写维护源、应用目标、用户级状态、Git checkout 或远程仓库。

如果任何端点会影响写入位置且不明确，先停止并要求澄清。可以给出建议值，但必须标为建议并等待用户确认真实写入。

## 场景矩阵

| 用户意图 | 来源 / 上游源 | 维护源 | 应用目标 | 共享目标 | 优先 CLI | 何时用 Desktop |
|---|---|---|---|---|---|---|
| 从远程 GitHub/Git Skill 项目安装到 Codex/Claude/Cursor 用户级目录 | 远程 URL 或 Git shorthand | 可选：临时/本地正式 Skill 项目 checkout；如果用户要先纳入治理，则是当前项目 `targetDir` 或正式 Skill 项目 | 用户级 agent skill 目录 | 暂无 | `drift`，确认后 `apply --save`；需要先纳入维护时先 `import plan/run` | 需要选择远程源、skills、agent 类型或复核 diff 时打开 Skills/Import 或 Destinations |
| 从远程 GitHub/Git Skill 项目安装到某个项目的 agent 目录 | 远程 URL 或 Git shorthand | 可选：当前项目维护源或正式 Skill 项目 | 目标项目 `.codex/skills`、`.claude/skills`、`.cursor/skills` 等 | 暂无 | `drift`，确认后 `apply --save`；需要先纳入维护时先 `import plan/run` | 需要选择项目目录、skills、agent 类型或复核 diff 时打开 Skills/Import 或 Destinations |
| 从远程 GitHub/Git Skill 项目导入到当前项目维护 | 远程 URL 或 Git shorthand | 当前项目 `root` + `targetDir`，通常是 `skills` | 暂无，除非用户还要安装给 agent | 暂无 | `import plan`，确认后 `import run` | 需要选择远程源、source profile、skills、targetDir、targetProfile 或复核冲突时打开 Skills/Import |
| 从本地 Skill 项目导入到当前项目维护 | 本地 Skill 项目路径 | 当前项目 `root` + `targetDir` | 暂无或后续目标 | 暂无 | `import plan`，确认后 `import run` | 需要目录选择、skills 多选或冲突复核时打开 Skills/Import |
| 把当前项目内 skill 迁移/正式化到团队 Skill 项目 | 当前项目 `root/sourceDir` | 目标正式 Skill 项目 `to` + `targetPath` | 可选：当前项目 applied target record | 暂无 | `merge plan`，确认后 `merge run` | 目标项目选择、冲突、文件复核或 profile 编辑时打开 Skills |
| 从正式 Skill 项目安装/应用到 Codex/Claude/Cursor 用户级目录 | 正式 Skill 项目 `from` | 正式 Skill 项目 checkout | 用户级 agent skill 目录 | 暂无 | `drift`，确认后 `apply --save` | 需要选择多个 agent、看完整 diff 或确认覆盖时打开 Destinations |
| 从正式 Skill 项目安装/应用到某个项目的 agent 目录 | 正式 Skill 项目 `from` | 正式 Skill 项目 checkout | 目标项目 `.codex/skills` 等 | 暂无 | `drift`，确认后 `apply --save` | 需要选择项目目录、agent 类型、多个目标或完整 diff 时打开 Destinations |
| 检查已安装副本是否偏离来源 | applied source record 或显式 `from` | 记录中的 sourceRoot 或显式来源 | 记录中的 targetDir 或显式 target | 暂无 | `applied drift` 或 `drift` | 需要文件级 diff、判断是否覆盖本地修改时打开 Destinations diff |
| 重新应用已保存关系 | applied source record | record.sourceRoot | record.targetDir | 暂无 | `applied drift`，确认后 `applied run --confirm` | 多条关系选择、完整 diff 或覆盖确认时打开 Destinations |
| 更新维护源 Git checkout | Git upstream | 当前 Git checkout | 暂无 | 暂无 | `source status`，确认后 `source update --confirm` | 需要理解 ahead/behind/dirty 后决定是否更新时打开 Overview |
| 准备共享或发布 | Git remote 或用户输入 repo | 正式 Skill 项目 checkout | 暂无 | GitHub/Git repo、PR、branch 或 registry 发布准备 | `publish-plan` 或 `share plan`，确认后 `share run` | 需要选择 repo、交付方式、PR/direct push 或复核计划时打开 Share |
| 只想一次性给 agent 装公开 GitHub/Git Skill 项目，不需要先纳入维护 | 远程 URL 或 Git shorthand | 本轮无持久维护源，除非用户要求保存为本地维护源 | agent skill 目录 | 暂无 | `drift`，确认后 `apply`；建议 `--save` 记录来源关系 | 通常不打开 Desktop，除非需要选择 skills/profile/agent 或看完整 diff |

## CLI 选择规则

- 只读发现、审计、计划和 drift 优先 CLI。
- 写维护源前必须先有 plan：`import plan` 或 `merge plan`。
- 写应用目标前必须先 drift：`drift`、`applied drift` 或 Desktop diff。安装到 agent 或项目目录也属于写应用目标。
- 写共享目标前必须先有 `publish-plan`、`share plan` 或共享 drift。
- `apply --confirm` 会写目标目录；真实目标上运行前必须由 agent 在对话里获得明确确认。
- `source status` 可能写 Git 元数据；只读/模拟场景中跳过，或使用临时 fixture。
- 临时验证必须设置 `ARCFORGE_HOME=/private/tmp/<run>/.arcforge-home`，不要污染真实用户级状态。

## Desktop 选择规则

Desktop 不是默认第一步，但以下情况应主动建议或打开：

- 用户需要在多个来源、维护源、应用目标或共享目标之间选择。
- 需要从远程或本地来源勾选部分 skills。
- 需要选择 targetDir、targetProfile、agent 类型、项目目录、自定义目标、repo 或交付方式。
- plan 或 drift 有冲突、changed、extra，用户需要看完整 diff。
- 用户要求“快速确认”、视觉复核、批量目标或共享交付方式确认。

Desktop 支持页面级 context open：`arcforge-desktop --root <absolute-project-root> --page <overview|skills|profiles|destinations|share|audit>`。交接时必须告诉用户 root、页面、上下文和要做的决定；回到 agent 后重新运行对应 CLI plan/drift 确认结果。当前仍缺少细粒度 skill/profile/target deep link 和可脚本化结果导出。

## 输出要求

开始流程时输出：

```text
来源/上游源: <已知/待确认/本轮无>
维护源: <已知/待确认>
应用目标: <已知/待确认/本轮无>
共享目标: <已知/待确认/本轮无>
profile/skills: <已知/待确认>
关系记录: <保存/不保存/待确认/本轮无>
建议入口: <CLI command 或 Desktop page>
写入确认: <不需要/需要，说明写哪里>
```

不要用“默认目录”绕过这个检查。
