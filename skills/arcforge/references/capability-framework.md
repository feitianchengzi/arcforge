# 能力框架

用户要理解 ArcForge 的完整产品概念、阶段化治理或端到端路径时读取本文件。本文件描述产品模型和流程组合方式，不是每次使用 `$arcforge` 都要完整跑完的固定流程。

## 产品定位

ArcForge 是 local-first、GitHub-first 的 agent skill 生命周期治理工作台。它位于分发之前，帮助用户把项目内自然产生的工作模式沉淀成 skill，并把经过验证的 skill 变成可审计、可 review、可版本化、可按 profile 应用、可检查 drift、可准备发布的团队资产。

ArcForge 不做：

- 托管 marketplace。
- 公共 registry。
- 搜索、评分或付费分发。
- agent runtime。
- 通用 prompt library。

相邻系统关系：

- GitHub：source of truth、review、release、权限控制和 PR 合作。
- ClawHub/OpenClaw：公开 registry 和生态分发目标。
- `skillshare`、`npx skills`：相邻生态工具。ArcForge 可以给出兼容性提示，但从 GitHub/Git/本地 Skill 项目安装到本地 agent 或项目目标时，由 ArcForge 自己建模、计划、drift、apply 和记录关系。
- Codex、Claude、Cursor 等 agent：消费本地 skills 的运行环境。

## 核心对象

用四个对象理解所有 workflow：

- 当前项目：用户正在工作的项目，可能包含项目本地 agent skills 或普通 `skills/` 目录。
- 正式 Skill 项目：可复用 skill 的 source of truth，通常是一个 GitHub-first 仓库 checkout。
- 目标项目或目标 agent 目录：消费来源或正式 Skill 项目 profile 的安装位置。
- 远程仓库：团队 review、版本、共享和发布准备的 Git 或 GitHub 目标。

另外有两个重要状态：

- Profile：Skill 项目中命名的 skill 集合和 agent 目标偏好。
- Applied source record：当前项目保存的“从哪个来源 profile 应用到哪个目标目录”的关系。

执行安装、同步、导入、迁移、应用、更新、漂移、共享或发布时，用更精确的四端点模型检查：来源/上游源、维护源、应用目标、共享目标。Applied source record 是关系对象，不是端点；profile/skills 是选择维度。

无显式配置时，`skills/*/SKILL.md` 会形成最小 Skill 项目，默认 `default` profile 选择全部发现的 skills。项目本地 agent skills 则通常位于 `.codex/skills/*/SKILL.md`、`.claude/skills/*/SKILL.md` 或 `.cursor/skills/*/SKILL.md`，治理 root 仍是项目根。

## 原子能力

这些能力可以独立使用，也可以在用户明确要求时组合：

- 发现：扫描 root、sourceDir、skills、共享资产、profile、audit 摘要和 Git 来源信息。
- 创建后治理交接：接收已创建、已验证或已整理完成的 skill，确认后续治理阶段和确认边界。
- 审计：检查 secrets、危险指令、危险 shell 模式、frontmatter、描述质量和 skill 写作质量。
- 配置组：创建、编辑、删除 profile，选择全部或部分 skills，记录目标 agent。
- 导入：从外部或远程 Skill 项目把选中的 skills 放进当前项目的本地维护源，并更新当前项目 profile。
- 正式化：把当前项目 skill 归并到正式 Skill 项目，并更新正式项目 profile。
- 安装/应用：从 GitHub/Git/本地 Skill 项目、当前维护源或正式 Skill 项目把 profile/skills 复制到 agent 或项目目标；这不是外部 installer 任务，必须先说明端点并检查 drift。
- 应用关系：保存、列出、删除、检查和重新应用来源关系。
- 漂移：比较来源 profile 与目标目录，报告 missing、changed、extra。
- 来源维护：检查 Git checkout ahead、behind、dirty 和 fast-forward 更新能力；status 检查可能 fetch 并写 Git 元数据。
- 发布准备：生成发布 checklist、文件清单和安装命令提示。
- 共享：把 Skill 项目同步到 GitHub/Git 仓库，支持 PR、fork PR、direct push 或 local branch。
- Desktop handoff：把需要视觉选择、编辑、diff 或确认的步骤交给桌面端。
- 环境诊断：检查 Git、CLI shim、`skillshare`、`npx`、`clawhub` 等工具状态。

## 意图路由

先判断用户当前要处理哪个阶段：

- “看看这个项目有什么 skills”：发现。
- “这个工作模式已经沉淀成 skill 并需要进入治理”：创建后治理交接；确认它是否要审计、正式化、进入 profile、安装/应用、漂移或发布准备。
- “适不适合共享/发布”：审计，必要时发布准备。
- “整理一组给前端/团队使用”：配置组。
- “从 GitHub/远程仓库安装 skills 到 Codex/Claude/Cursor/项目目标”：安装/应用；必须先明确来源/上游源、应用目标、profile/skills、是否保存关系记录，并在写入前运行 drift。
- “从 GitHub/远程仓库安装 skills 到当前项目维护”：导入；必须先明确来源/上游源、维护源、目标 profile，以及本轮是否还有应用目标或共享目标。
- “从本地 Skill 项目安装到 Codex/Claude/Cursor/项目目标”：安装/应用；必须先明确本地来源、应用目标、profile/skills、是否保存关系记录，并在写入前运行 drift。
- “从本地 Skill 项目导入到当前项目维护”：导入；必须先明确本地来源、当前项目维护目录、目标 profile，以及本轮是否还有应用目标或共享目标。
- “把这个项目里的 skill 沉淀出去”：正式化。
- “安装/同步到 Codex/Claude/Cursor/另一个项目”：安装/应用。
- “已经安装的和来源是否一致”：漂移或应用关系漂移。
- “以后从同一个来源更新”：应用关系。
- “这个 GitHub skill 项目是否落后”：来源维护；如果当前任务禁止写源码，只在临时 Git fixture 或用户确认后检查。
- “准备发 GitHub/ClawHub/OpenClaw”：发布准备和共享计划。
- “需要看 diff、选多个目标、编辑文件”：Desktop handoff。
- “CLI/Desktop 还缺什么”：缺口报告。

## 阶段化治理

当用户只要求某一阶段时，只处理该阶段：

- 扫描现状：运行 scan，报告本地 skills、shared assets、audit 摘要和 Git 状态。
- 创建后治理交接：确认用户已经认为新 skill 可用，再建议 audit、merge plan、profile、apply、drift 或 publish/share plan；写入阶段仍按 `arcforge` 的确认规则执行。
- 审计 skill：运行 audit，解释 findings、风险和修复建议；同时检查是否存在边界后置、纠错泄漏、业务耦合或正文负向补救。
- 整理 profile：读取或编辑 profile，不自动写入目标。
- 正式化 skill：先生成 merge plan；只有用户确认后才执行 merge run。
- 导入外部 skill：先生成 import plan；只有用户确认远程同步源、本地维护目录、目标 profile 和冲突状态后才执行 import run。
- 安装/应用到目标：先说明来源/上游源、维护源是否存在、root、from、profile、skills、target、关系记录和覆盖风险；先运行 drift，只有用户确认后才运行 apply。
- 检查漂移：运行 drift 或 applied drift，报告 missing、changed、extra。
- 准备分享：先运行 publish/share plan；无 GitHub 登录或无写权限时保留 plan 并解释 fallback delivery，只有用户确认后才运行 share run。
- 维护来源：先说明 `source status` 可能写 Git 元数据；允许后运行 status，只有用户确认后才运行 source update。

## 端到端推进

只有用户明确要求“从项目本地 skill 一路正式化、同步并准备分享”这类端到端目标时，才把阶段串起来：

1. 扫描当前项目。
2. 识别要处理的项目本地 skill 和真实 sourceDir。
3. 审计选中的 skill。
4. 检查 applied source record 是否已经指向正式 Skill 项目。
5. 如果没有正式来源，询问或推断正式 Skill 项目路径或远程。
6. 生成 merge plan。
7. 如果 merge plan 有冲突，停止并建议 Desktop 或手动 review。
8. 如果 merge plan 干净，说明写入范围并等待用户确认。
9. 用户确认后执行 merge run。
10. 说明目标 root、from、profile、target 和覆盖风险，并等待用户确认 apply。
11. 用户确认后从正式 Skill 项目 apply 到目标项目的 agent skill 目录或自定义 target。
12. 运行 drift，报告目标是否与正式来源一致。
13. 如用户要远程分享，再从正式 Skill 项目生成 publish/share plan。

不要默认项目到项目直接复制。只有用户明确要求临时一次性复制，并理解这不会建立 durable source relationship 时，才可以直接复制。

## 停止条件

以下情况必须在写入前停止：

- audit 有 critical findings，且用户没有接受风险。
- merge plan 报告冲突。
- 目标路径无法安全解析。
- target drift 显示目标内存在可能被覆盖的本地修改。
- Git checkout 脏状态会影响 update 或 share。
- 正式 Skill 项目不是 Git 仓库，但用户要做远程分享。
- GitHub 认证或权限检查失败。

停止时给出具体下一步：在 Desktop 检查、修复 audit finding、选择正式 Skill 项目、解决冲突、选择目标目录、初始化 Git 仓库，或完成 GitHub 登录后重试。

## Skill 写作质量审计

ArcForge 的审计不替代 `arcforge-skill-first` 的创建和迭代闭环；它只在治理阶段报告风险，帮助用户决定是否回到 Skill First 修订后再正式化、共享或发布。

检查以下质量问题：

- 边界后置：`description` 没有承担触发条件、适用范围、相邻 skill 分工和不触发场景，导致执行正文用路由说明补救。
- 纠错泄漏：正文直接包含用户纠错、失败复盘、“不要再……”口吻或一次协作中的修正痕迹。
- 业务耦合：通用 skill 写入具体项目、客户、临时策略或一次性业务上下文，降低复用性。
- 正文负向补救：执行型 skill 正文大量解释“先用 A / 不用 B / 与 C 的区别”，而不是正向说明被触发后如何执行。

报告时区分质量风险和硬阻断。secrets、危险指令、破坏性命令或权限问题可能是 critical；写作质量问题通常是 warning，除非它会导致 agent 大概率误触发、错误写入或绕过确认。建议修复路径是回到 `arcforge-skill-first` 更新目标 skill，再重新 audit。
