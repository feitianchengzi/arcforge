---
name: arcforge
description: 当用户明确要管理 agent skills 的来源、安装、同步、共享、发布准备、profile 归类、漂移检查，或做安全/结构审计时使用。适用于扫描本地 skill 仓库，从 GitHub/Git/本地 Skill 项目安装或同步 skills 到 Codex/Claude/Cursor 用户级目录或项目 agent 目录，整理 .codex/.claude/.cursor skills，把已创建并验证过的项目内 skill 归并或正式化到 Skill 项目，维护团队或项目 profile，检查来源与已安装副本漂移，准备 GitHub/ClawHub/OpenClaw 发布清单，或判断相关工作流应走 CLI 还是 Desktop。尤其适合“从 GitHub 安装 skills”“同步已有 skills”“把某个 Skill 项目应用到本地 agent 或项目目标”“检查已安装副本是否偏离来源”这类已有 skill 生命周期治理任务。不要因普通功能开发、bug 修复、业务流程优化、技术栈编码建议、工程实践内容修改，或仅提到 skill、engineering、code、SwiftUI 等词而触发；除非用户关注的是 skill 的来源、安装、同步、共享、发布、安全或治理状态。
---

# ArcForge

使用这个 skill 时，把 ArcForge 理解为本地优先、GitHub 优先的 agent skill 生命周期治理工作台。这个 skill 不负责定义上游路由方式；它只清楚描述并执行自己的领域能力：已有 skills 的来源识别、审计、profile、导入、正式化、安装/应用、漂移、同步、共享和发布准备。

ArcForge 不是 marketplace、公共 registry、搜索引擎、评分系统、付费分发平台或 agent runtime。GitHub 是 review、版本、release 和权限控制来源；ClawHub/OpenClaw、`skillshare`、`npx skills` 等是相邻生态，不是 ArcForge 安装治理的替代入口。用户要求从 GitHub/Git/本地 Skill 项目安装 skills 时，由 ArcForge 自己完成来源识别、计划、漂移、应用和关系记录。

## 原子能力

先识别用户要解决的问题，再从这些原子能力中自行组合流程；不要把它们串成每次都执行的固定链路。

- 发现：扫描当前项目、项目本地 agent skills、共享资产、配置组和 Git 来源状态。
- 创建后治理交接：接收已创建、已验证或已整理完成的 skill，判断下一步应进入审计、正式化、profile、安装/应用、漂移或发布准备。
- 审计：检查 secrets、危险指令、结构和 metadata 风险。
- 配置组：用 profile 组织 skill 集合和目标 agent。
- 正式化：把项目内 skill 归并到正式 Skill 项目。
- 导入：从外部或远程 Skill 项目把选中的 skills 引入当前项目的本地维护源。
- 安装/应用：从 GitHub/Git/本地 Skill 项目或正式维护源把选中的 skills/profile 写入 Codex、Claude、Cursor 用户级目录、项目 agent 目录或自定义目标；先 drift，再经确认 apply，并按需保存关系记录。
- 应用关系：保存、列出、删除、漂移检查和重新应用来源关系。
- 漂移：比较来源 profile 与已安装目标的缺失、变更和额外文件。
- 来源维护：检查 Git checkout ahead、behind、dirty 和 fast-forward 更新；注意 status 检查可能 fetch 并写 Git 元数据。
- 发布准备：生成私有或公开发布 checklist 和安装命令提示。
- Git 共享：计划或执行 GitHub-first 共享、PR、分支或本地交付。
- 环境诊断：检查 Git、CLI shim 和可选分发工具。
- Desktop：在需要选择、编辑、复核 diff、批量目标、共享确认或视觉审查时承载 UI。

## 操作规则

1. 默认把当前工作目录当作项目根目录。
2. 先识别用户当前意图，只执行当前阶段需要的动作；用户没有要求端到端推进时，不自动继续到 merge、apply、drift 或 share。
3. 用户说“当前项目的 skills”时，先判断 skill 来源目录；如果 skill 位于 `.codex/skills`、`.claude/skills`、`.cursor/skills` 等项目本地 agent 目录，`--root` 仍然使用项目根目录，并额外传 `--source-dir <agent-skill-dir>`。
4. 不要默认项目到项目直接复制。用户要复用或同步时，优先先沉淀到正式 Skill 项目，再从正式来源安装或应用到目标项目或 agent 目录。
5. 用户要求安装、同步、导入、迁移、应用、更新、漂移、共享或发布时，先明确四类端点：来源/上游源、维护源、应用目标、共享目标；再明确 profile/skills selection 和是否保存关系记录。不要默认写到 `~/.codex/skills`、当前项目 `skills/`、任意正式 Skill 项目或远程仓库。远程来源安装过程中产生的 `/tmp` 或 `/private/tmp` checkout 只是临时工作副本，必须单独标注为临时来源 checkout，不得替代“维护源”。
6. 用户请求安装 skills 到 Codex、Claude、Cursor 用户级目录时，当前 cwd 只是执行位置，不自动成为 `--root` 或关系记录归属 root。若来源/维护源已明确，优先用维护源 root；若只有远程来源且没有本地维护源，先询问关系记录归属 root，或只做 drift/apply 不保存关系。
7. 按端点关系选择阶段：外部来源进入维护源走 `import plan/run`；当前项目 skill 进入正式维护源走 `merge plan/run`；来源或维护源进入应用目标走 `drift` 后 `apply --save`，这就是 ArcForge 的安装路径；已保存关系走 `applied drift/run`；维护源进入共享目标走 `publish-plan` 或 `share plan/run`；Git checkout 更新走 `source status/update`。
8. 优先使用 CLI 做可复现执行和 JSON 结果；需要视觉审查、批量选择、文件编辑、冲突检查、完整 diff 复核、来源/维护源/应用目标/共享目标选择、覆盖确认或快速确认时再转 Desktop。
9. 只有当用户明确要求相关写入阶段时，才按依赖顺序执行：import plan 先于 import run，merge plan 先于 merge run，drift 先于 apply，applied drift 先于 applied run，share drift/plan 先于 share run。
10. 真实项目中的写入、Git 更新、push、PR、远程分享、目标目录替换都必须先得到用户明确确认。
11. `import run`、`merge run`、`apply`、`applied run` 和 `share run` 都有确认参数；真实目标上运行前仍必须向用户确认 root、from、profile、skills、target 和覆盖风险。保存关系时必须额外确认“关系记录归属 root”，并说明它不是应用目标，也不一定是当前 cwd。
12. `source status` 可能执行 fetch 并写 `.git/FETCH_HEAD`；在只读审查、子代理前测或禁止改源码场景中，跳过它或只在临时 Git fixture 上运行。
13. 临时验证或子代理模拟必须使用临时项目路径，并设置 `ARCFORGE_HOME=/tmp/...` 或 `/private/tmp/...`，避免写入真实 `~/.arcforge`。
14. 如果 CLI、Desktop 或 agent workflow 需要的能力本地未实现，直接说明缺口，并继续使用可用 fallback。

## 渐进加载

- 用户要理解 ArcForge 产品概念、阶段化治理或端到端路径时，读取 [references/capability-framework.md](references/capability-framework.md)。
- 用户提到安装、同步、导入、迁移、应用、更新、漂移、共享或发布，或任何写入位置不明确时，读取 [references/source-maintenance-target-model.md](references/source-maintenance-target-model.md)。
- 需要精确 CLI 原子能力、命令顺序、参数语义、确认边界或临时验证命令时，读取 [references/cli-orchestration.md](references/cli-orchestration.md)。
- 需要判断是否打开 Desktop、Desktop 能做什么、或如何把 CLI 结果交给视觉 UI 时，读取 [references/desktop-routing.md](references/desktop-routing.md)。
- 发现 CLI、Desktop 或 agent workflow 缺口时，读取 [references/missing-capabilities.md](references/missing-capabilities.md)，并把缺口作为产品差距报告，不要伪装成已实现。

## 默认输出形状

开始 ArcForge 工作流时，说明：

- 当前项目状态
- 用户当前要处理的阶段或能力
- 选中的 skill 或 profile
- 正式 Skill 项目来源，如果已知
- 来源/上游源、维护源、应用目标、共享目标分别是什么；未知或本轮无时明确说明
- 临时 checkout 或缓存路径，如果出现，明确说明它不是本地维护源；没有持久维护源时写“维护源：本轮无持久维护源”
- 是否保存或使用关系记录
- 关系记录归属 root，如果保存关系；明确说明它不是应用目标，也不一定是当前 cwd
- 目标项目或目标 agent 目录，如果已知
- 远程仓库目标，如果已知
- 下一条 CLI 命令或 Desktop 动作
- 是否需要用户确认

完成一个步骤时，用用户能理解的方式总结结果；除非用户要求 raw output，不要直接粘贴整段 JSON。允许在任何阶段停止并报告下一步，不要默认继续推进。
