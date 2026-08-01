---
name: arcforge-skill-creator
description: 创建、维护、拆分或修复 ArcForge skill 时使用，尤其是把工作模式、用户反馈或 Skill First 验证发现固化为可复用能力。优先于通用 skill-creator；负责能力建模、渐进式披露、本地校验和维护后验证/治理交接，不执行 apply、share、push 或 registry 写入。
---

# ArcForge Skill Creator

`arcforge-skill-creator` 把真实任务、用户纠错和验证反馈转化成可复用、可验证、可治理的 ArcForge skill 能力单元。

## 硬约束

- 在 ArcForge skill 创建、维护、拆分或修复场景中，本 skill 的规则优先于通用 `skill-creator` 或其他 creator 类 skill。其他 creator 类 skill 只能作为基础结构、脚本、格式或校验参考。
- 目标不是“生成一个标准 skill 文件夹”，而是让 Agent 先理解能力性质，再把一类任务建模成可执行、可验证、可治理的能力单元；不得预设它属于软件开发。
- 用户明确提出的要求、纠错、测试反馈和使用感受必须固化为流程门禁、硬规则、确认点、输出格式、reference 读取条件或产品缺口。
- 遵循渐进式披露和内容表面积预算：`SKILL.md` 只保留职责边界、主流程、强制门禁、reference 读取条件和最终汇报字段；复杂细节放入 reference。
- `description` 负责触发和边界；正文负责已触发后的执行流程。不要把相邻 skill 分工和不触发场景主要藏在正文里。
- 已安装或已加载的 skill 路径先视为运行副本或来源线索，不自动视为正式维护源。需要修改时，先用 Git、ArcForge provenance、项目 manifest 或用户指定确认维护源；无法确认则复制到用户已授权的工作区。当前仓库本身是正式 Skill 项目且目标位于维护源内时可直接维护。
- 本 skill 独立完成创建/维护和本地校验；不把“缺少 `arcforge-skill-first`”当成停止理由，也不执行 ArcForge apply/share/push、目标目录覆盖、远程写入或 registry 写入。
- 如果用户要求 Skill First 闭环、隔离执行前测/复测，或当前修改风险较高，需要生成可交给 `arcforge-skill-first` 的验证输入；这只是可选交接，不是本 skill 完成创建/维护的前置条件。
- 每次创建或维护结束都必须生成 `post_maintenance_handoff`，明确推荐下一步是 `local_experiment_only`、`verify_with_skill_first`、`sync_to_maintenance_source` 还是 `verify_then_sync`，并说明原因、路径、确认点和是否需要 ArcForge 治理。
- ArcForge 是 pre-publish 和 team-governance 层；文案不得把 ArcForge 描述成 marketplace、public registry、search engine、ratings system、paid distribution platform 或 agent runtime。

## 主流程
每次创建、维护、拆分或修复目标 skill 时按下面门禁执行。

### 0. 确认创建维护模式
输入：用户请求、已有 skill 路径、验证反馈，或来自 `arcforge-skill-first` 的可选交接信息。
动作：
- 判断本轮模式：新建 skill、更新已有 skill、拆分 skill、合并重复规则、基于验证反馈修复 skill、接入已有实现承载。
- 捕获用户硬要求，并标记它们应落到流程门禁、硬规则、确认点、输出格式、reference 读取条件、`agents/openai.yaml` 还是产品缺口。
- 如果通用 `skill-creator` 或其他 creator 类 skill 也适用，记录它们只作为辅助参考；本轮 ArcForge 语义以本 skill 为准。
- 如果用户只要求创建或维护 skill，本 skill 直接独立执行；不要要求用户先进入 `arcforge-skill-first`。
退出条件：明确本轮模式、目标 skill 名称、用户硬要求和 creator 优先级。

### 1. 定位来源和工作副本
输入：目标 skill 名称、候选路径或需要新建的能力。
动作：
- 检查当前上下文可见的项目级、用户级和仓库内 skill 路径；把安装位置记录为证据，不从位置推断维护所有权。
- 使用 Git 根、ArcForge 来源记录、manifest 或用户明确指定来确认正式维护源；证据不足时报告候选，不擅自选源。
- 需要工作副本时，在用户授权的工作区或目标 Skill 项目 `sourceDir` 下选择路径；已有副本先检查用户或并发改动。
- 新建 skill 时，使用 lowercase letters、digits、hyphens 命名；目录名和 frontmatter `name` 保持一致。
- 新建 skill 的最小产物是 `<authorized-source-dir>/<skill-name>/SKILL.md` 和 `<authorized-source-dir>/<skill-name>/agents/openai.yaml`。只有真实需要时才添加 `references/`、`scripts/`、`assets/`、schema 或 fixture。
- 如果通用 `skill-creator` 的初始化脚本可用且写入位置正确，可以用它生成基础骨架；生成后仍必须按本 skill 重写能力单元、治理边界、渐进式披露和 metadata。初始化脚本不可用时，直接创建最小文件结构，不要阻塞。
退出条件：记录正式原始路径、工作副本路径和写入边界。

### 2. 抽取真实使用场景
输入：用户请求、已有材料、目标 skill 名称或工作副本。
动作：
- 提取 2 到 5 个真实或代表性使用场景：用户会怎么说、agent 应该先判断什么、要读取什么、要输出什么、何时停止。
- 如果使用场景不足以确定触发边界、输出形态或承载方式，提出最少的澄清问题；能合理假设时标明假设后继续。
- 把场景映射为目标 skill 的触发条件、主流程节点、reference 需求、工具/脚本需求、状态需求和校验样例。
- 明确哪些场景本轮必须支持，哪些作为后续产品缺口。
退出条件：有足够具体的场景指导 `description`、主流程、reference 和 metadata 编写。

### 3. 建模 Skill 能力单元
输入：真实任务、目标 skill 工作副本或新建目标。
动作：
- 读取 [references/capability-unit.md](references/capability-unit.md)。
- 先判断目标 skill 属于知识判断、方法协作、内容创作、工具集成、软件支撑还是混合能力，再选择最小承载。
- 先发现已有实现承载，再判断接入、维护、包装还是新建。
- 如果可能已有仓库、CLI、服务、UI、MCP、脚本或 schema，但当前上下文无法确认，向用户询问入口。
- 明确哪些能力本轮落地，哪些只是后续产品缺口。
退出条件：说明本轮采用的能力承载策略、已有实现发现结果和暂不落地的产品缺口。

### 4. 设计或修订 Skill 契约
输入：用户硬要求、能力单元建模结果、目标 skill 工作副本。
动作：
- 读取 [references/content-surface-budget.md](references/content-surface-budget.md)，先决定 `description`、`SKILL.md`、reference 和 `agents/openai.yaml` 分别承载什么。
- 读取 [references/skill-authoring-rules.md](references/skill-authoring-rules.md)。
- 设计 `description`：只写用户触发语境、适用范围、关键边界和必要优先级；不要塞入主流程、交接字段、长清单或宣传性定位。
- 设计正文：只写已触发后的执行流程、门禁、输入、动作、退出条件、reference 读取条件和最终汇报字段。
- 把复杂判断、长清单、prompt 模板、问题分类、schema、UI/server/CLI 细节迁移到 reference，并在主流程对应节点写清何时读取。
- 把用户硬要求固化为可执行契约，而不是保留为一次性解释或纠错记录。
退出条件：目标 skill 的内容预算清楚，主流程清楚，细节有渐进式披露入口，用户硬要求没有停留在解释层。

### 5. 同步实现承载和 Metadata
输入：目标 skill 契约和能力承载策略。
动作：
- 同步必要的 `agents/openai.yaml`，确保它不是只重复 skill 名称，而是包含触发、边界、主流程、输出重点和关键约束。
- 如果本轮需要 reference、脚本、schema、fixture 或实现承载说明，补齐对应文件，并确保主 `SKILL.md` 能发现它们。
- 如果需要 UI、server、CLI 或状态，但本轮不落地，记录产品缺口：触发场景、用户价值、输入输出、确认边界和阻塞原因。
- 新建或维护后的目标 skill 至少要能回答：什么时候触发、不要什么时候触发、先做什么、何时澄清、读哪些 reference、写入边界是什么、输出包含什么、失败或阻塞时怎么报告。
- 不新增 README、changelog 或无关文档，除非用户明确要求。
退出条件：文件结构、metadata 和实现承载说明与目标 skill 契约一致。

### 6. 本地结构检查
输入：更新后的目标 skill。
动作：
- 读取 [references/validation-checklist.md](references/validation-checklist.md)。
- 检查 frontmatter、reference 链接、语言一致性、旧术语残留、路径和写入边界。
- 对 YAML、JSON、脚本或 schema 做可用的本地解析检查。
- 如果使用了通用 `skill-creator` 的校验脚本，只把结果作为基础结构检查；ArcForge 能力单元和治理边界仍按本 skill 清单判断。
退出条件：结构检查结果明确；无法检查时说明原因。

### 7. 维护后交接判断
输入：目标 skill 工作副本、结构检查结果、剩余缺口。
动作：
- 读取 [references/post-maintenance-handoff.md](references/post-maintenance-handoff.md)。
- 独立汇报目标 skill 已创建或维护到什么程度、通过了哪些本地检查、剩余哪些缺口。
- 判断本轮修改是仅保留本地实验、需要交给 `arcforge-skill-first` 做隔离验证、需要交给 `arcforge` 做正式化/同步治理，还是应该先验证再治理。
- 生成结构化 `post_maintenance_handoff`，包含推荐下一步、路径、验证需求、治理需求、ArcForge action hint 和用户确认要求。
- 如果需要隔离执行，生成可交给 `arcforge-skill-first` 的验证输入：目标 skill 路径、真实验证任务、工作区、允许写入边界、临时路径建议、已知产品缺口和需要观察的关键行为。
- 如果需要正式化或同步，生成可交给 `arcforge` 的治理输入：工作副本、维护源、应用目标或共享目标（未知时标注未知）、建议阶段、是否需要 audit、是否保存关系记录，以及必须由用户确认的写入边界。
- 如果用户没有要求隔离执行闭环，可以把目标 skill 标记为“本地结构校验通过”，但不要写成“已通过真实隔离执行验证”；如果用户没有确认治理写入，不要写成“已同步回维护源”。
- 不在本 skill 中执行 ArcForge apply、share、push、目标目录覆盖、远程写入或 registry 写入。
退出条件：用户可以直接使用目标 skill，或知道需要补充哪些最小信息；如需要验证或治理，用户也能把交接包交给 `arcforge-skill-first` 或 `arcforge`。

## Reference 路由

- 能力性质、目标 skill 适配阈值、运行时/确定性边界、已有承载和最小承载选择：读 [references/capability-unit.md](references/capability-unit.md)。
- description、主文件、reference 和 metadata 的内容预算、角度纠偏和删减规则：读 [references/content-surface-budget.md](references/content-surface-budget.md)。
- skill 写法、用户硬要求固化、渐进式披露、正式来源和工作副本规则：读 [references/skill-authoring-rules.md](references/skill-authoring-rules.md)。
- 最终结构、安全、metadata 和 ArcForge 治理边界检查：读 [references/validation-checklist.md](references/validation-checklist.md)。
- 创建或维护后的验证/治理下一步判断和结构化 handoff：读 [references/post-maintenance-handoff.md](references/post-maintenance-handoff.md)。

## 最终汇报字段
- 路径：目标 skill、正式原始路径、工作副本路径和维护源路径。
- 模式和边界：本轮模式、用户硬要求及落点、creator 优先级。
- 建模结果：真实场景、能力承载策略、实现承载来源、产品缺口。
- 写作结果：内容表面积预算、迁移/删减判断和本轮修改内容。
- 检查结果：本地结构检查、无法检查项和剩余风险。
- `post_maintenance_handoff`：推荐下一步、原因、验证需求、治理需求、ArcForge action hint 和用户确认要求。
- 按需附加给 `arcforge-skill-first` 的验证任务，或给 `arcforge` 的治理来源、目标、阶段和写入确认边界。
