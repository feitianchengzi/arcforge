---
name: arcforge
description: 当用户明确要管理 agent skills 的来源、维护源类型配置、项目适用性、安装、同步、共享、发布准备、profile 归类、漂移检查，或做安全/结构审计时使用。适用于扫描本地 skill 仓库，长期维护 skill 的用户常驻、项目常驻或用户按需来源推荐，从 GitHub/Git/本地 Skill 项目安装或同步 skills 到 Codex/Claude/Cursor 用户级目录或项目 agent 目录，把已创建并验证过的项目内 skill 正式化到 Skill 项目，维护团队或项目 profile，检查来源与已安装副本漂移，以及准备发布清单。不要因普通功能开发、bug 修复、业务流程优化、技术栈编码建议，或仅提到 skill、engineering、code、SwiftUI 等词而触发；除非用户关注的是 skill 的来源、类型策略、安装、同步、共享、发布、安全或治理状态。
---

# ArcForge

使用这个 skill 时，把 ArcForge 理解为本地优先、GitHub 优先的 agent skill 生命周期治理工作台。这个 skill 不负责定义上游路由方式；它只清楚描述并执行自己的领域能力：已有 skills 的来源识别、审计、profile、导入、正式化、安装/应用、漂移、同步、共享和发布准备。

ArcForge 不是 marketplace、公共 registry、搜索引擎、评分系统、付费分发平台或 agent runtime。GitHub 是 review、版本、release 和权限控制来源；ClawHub/OpenClaw、`skillshare`、`npx skills` 等是相邻生态，不是 ArcForge 安装治理的替代入口。用户要求从 GitHub/Git/本地 Skill 项目安装 skills 时，由 ArcForge 自己完成来源识别、计划、漂移、应用和关系记录。

ArcForge 不负责替代 Skill First 创作或重写目标 skill；它在治理阶段检查已创建或已验证 skill 是否适合进入团队共享、正式化、profile、应用目标或发布准备。审计时把 skill 结构质量作为风险项：`description` 应承担触发边界和相邻 skill 分工，正文应承担正向执行流程；用户纠错、失败复盘、业务临时上下文或正文中解释其他 skill 差异，都应报告为需要回到 Skill First 修订的质量问题。

## 原子能力

先识别用户要解决的问题，再从这些原子能力中自行组合流程；不要把它们串成每次都执行的固定链路。

- 发现：扫描当前项目、项目本地 agent skills、共享资产、配置组和 Git 来源状态。
- 创建后治理交接：接收已创建、已验证或已整理完成的 skill，判断下一步应进入审计、正式化、profile、安装/应用、漂移或发布准备。
- 审计：检查 secrets、危险指令、结构、metadata 和 skill 写作质量风险。
- 配置组：用 profile 组织 skill 集合和目标 agent。
- 来源类型策略：在具体维护源根目录持久维护 skill 的 `user-ambient`、`project-ambient` 或 `user-on-demand` 来源推荐和按需别名。
- 项目适用性：在维护源保存通用自然语言条件，由 Agent 在安装前结合目标项目真实上下文动态判断；不内置项目类型词表或检测器。
- 正式化：把项目内 skill 归并到正式 Skill 项目。
- 导入：从外部或远程 Skill 项目把选中的 skills 引入当前项目的本地维护源。
- 安装/应用：从 GitHub/Git/本地 Skill 项目或正式维护源把选中的 skills/profile 写入 Codex、Claude、Cursor 用户级目录、项目 agent 目录或自定义目标；先 drift，再经确认 apply，并按需保存关系记录。
- 应用关系：保存、列出、删除、漂移检查和重新应用来源关系。
- 漂移：比较来源 profile 与已安装目标的缺失、变更和额外文件。
- 来源维护：检查 Git checkout ahead、behind、dirty 和 fast-forward 更新；注意 status 检查可能 fetch 并写 Git 元数据。
- 已安装副本整理：扫描用户级与 plugin 提供的副本并输出重复/冲突证据；canonical 与整理动作由 Agent 或用户明确决定。
- 发布准备：收集文件、来源 manifest、远端与集成事实，并接收 Agent 生成的发布判断、安装命令候选和 checklist。
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
8. 用户要求在维护源中设置或调整 skill 类型时，读取 `references/source-availability-policy.md`；先确认维护源根目录并执行 `project availability plan`，只把结果作为来源推荐写入 `arcforge.skill-project.json`，复核具体 diff 并记录 `planDigest` 后，才能用同一组参数执行带 `--plan-digest <digest> --confirm` 的 `run`；digest 不一致时必须重新复核。本次 `--availability` 覆盖不能替代维护源配置。
9. 维护或安装 `project-ambient` skill 时，读取 `references/project-applicability-policy.md`。来源中的 `projectApplicability` 由 Agent 阅读 skill 后动态拟写；安装前由 Agent 逐条件检查目标项目证据，并通过 `--project-assessments <json-file>` 提交与目标根绑定的判断。CLI 只校验和透传，不按技术栈、文件标记或固定项目类别自动判定。结论为 `unsuitable` 或 `needs-input` 时不要进入 apply；用户可在 Desktop 明确 override，但核心只记录决定。
10. 用户说“同步所有 skills”“应用所有 skills”或等价表达时，收口不能只覆盖当前来源集合。完成 drift/apply 后必须检查目标根目录的额外项，把它们分类为 `managed-stale`、`uncertain` 或 `unrelated`：只有历史应用关系管理过、但当前来源已不存在的名称才是 `managed-stale`；目标里的其它 skill 目录必须视为可能来自其它来源的有效 skill，只能标为 `uncertain`；非当前来源且非 skill 的目标项是 `unrelated`。真实目标上的 `managed-stale` 也不能自动删除；即使用户要求清理旧名称，也必须先列出具体目录并获得明确确认后才能删除。
11. 优先使用 CLI 做可复现执行和 JSON 结果；需要视觉审查、批量选择、文件编辑、冲突检查、完整 diff 复核、来源/维护源/应用目标/共享目标选择、覆盖确认或快速确认时再转 Desktop。
12. 只有当用户明确要求相关写入阶段时，才按依赖顺序执行：import plan 先于 import run，merge plan 先于 merge run，drift 先于 apply，applied drift 先于 applied run，share drift/plan 先于 share run。
13. 真实项目中的写入、Git 更新、push、PR、远程分享、目标目录替换都必须先得到用户明确确认。
14. `import run`、`merge run`、`project availability run`、`apply`、`applied run` 和 `share run` 都有确认参数；真实目标上运行前仍必须确认相应 root、来源、选择项、目标和覆盖风险。保存关系时必须额外确认“关系记录归属 root”，并说明它不是应用目标，也不一定是当前 cwd。
15. `source status` 可能执行 fetch 并写 `.git/FETCH_HEAD`；在只读审查、子代理前测或禁止改源码场景中，跳过它或只在临时 Git fixture 上运行。
16. 临时验证或子代理模拟必须使用临时项目路径，并设置 `ARCFORGE_HOME=/tmp/...` 或 `/private/tmp/...`，避免写入真实 `~/.arcforge`。
17. 如果 CLI、Desktop 或 agent workflow 需要的能力本地未实现，直接说明缺口，并继续使用可用 fallback。
18. 做审计、正式化、共享或发布准备时，检查 skill 是否存在边界后置、纠错泄漏、业务耦合或正文负向补救；这些问题不自动阻断所有治理动作，但必须在结果中作为质量风险报告，并建议回到 `arcforge-skill-first` 修订。
19. 整理已安装 skills 时，先运行 `installed scan` 或无 decisions 的 `installed organize plan` 收集事实，再由 Agent 根据 provenance、应用关系、目标 Agent 能力和用户偏好生成 decisions JSON；核心不自动选择 canonical、迁移到 generic root、创建链接或删除副本。
20. 发布准备时，核心输出事实且 `assessmentStatus` 默认为 `not-supplied`。Agent 分析后可用 `--readiness-assessment <json-file>` 提交 summary、evidence、unknowns、安装命令候选和 checklist；不要把核心 plan 说成语义审查结论。

## 渐进加载

- 用户要理解 ArcForge 产品概念、阶段化治理或端到端路径时，读取 [references/capability-framework.md](references/capability-framework.md)。
- 用户提到安装、同步、导入、迁移、应用、更新、漂移、共享或发布，或任何写入位置不明确时，读取 [references/source-maintenance-target-model.md](references/source-maintenance-target-model.md)。
- 用户要在维护源中查看、设置、调整或移除 skill 类型推荐和按需别名时，读取 [references/source-availability-policy.md](references/source-availability-policy.md)。
- 用户要维护项目适用条件，或判断 `project-ambient` skill 是否适合具体项目时，读取 [references/project-applicability-policy.md](references/project-applicability-policy.md)；结构定义见同目录的 `skill-project-manifest.schema.json`。
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
- `project-ambient` skill 的适用性结论、逐条件证据和未决问题，如果本轮涉及项目级安装
- 远程仓库目标，如果已知
- 下一条 CLI 命令或 Desktop 动作
- 是否需要用户确认

完成一个步骤时，用用户能理解的方式总结结果；除非用户要求 raw output，不要直接粘贴整段 JSON。允许在任何阶段停止并报告下一步，不要默认继续推进。
