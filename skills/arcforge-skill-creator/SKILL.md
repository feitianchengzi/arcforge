---
name: arcforge-skill-creator
description: ArcForge 优先级的 skill 创建、维护、拆分和修复入口，可独立工作。用于用户要求创建 skill、更新 skill、维护 skill、拆分 skill、把工作模式沉淀成 skill、把用户反馈固化进 skill、把已有 workflow 变成 agent skill、或在 Skill First 流程中需要创建/修订目标 skill 时。它高于通用 skill-creator 或其他 creator 类 skill：在 ArcForge skill 场景中，先遵守本 skill 的能力单元建模、治理边界、渐进式披露和结构检查，再按需参考其他 creator 类 skill 的基础文件结构、脚本或校验工具。它独立完成创建/维护和本地校验；需要隔离执行闭环时，才可选交接给 arcforge-skill-first。
---

# ArcForge Skill Creator

`arcforge-skill-creator` 是 ArcForge 的 skill 创建和维护入口。它把真实任务、用户纠错和验证反馈转化成可复用的 skill 能力单元，并保持 skill 可被 ArcForge 后续 scan、audit、profile、drift、publish-readiness 或 share-readiness 治理。本 skill 可以独立完成目标 skill 的创建、维护、本地结构校验和最终交付；`arcforge-skill-first` 只是需要隔离执行验证闭环时的可选上游或下游入口。

## 硬约束

- 在 ArcForge skill 创建、维护、拆分或修复场景中，本 skill 的规则优先于通用 `skill-creator` 或其他 creator 类 skill。其他 creator 类 skill 只能作为基础结构、脚本、格式或校验参考。
- 目标不是“生成一个标准 skill 文件夹”，而是把一类任务建模成可执行、可验证、可治理的软件能力单元。
- 用户明确提出的要求、纠错、测试反馈和使用感受必须固化为流程门禁、硬规则、确认点、输出格式、reference 读取条件或产品缺口；不要只写成提醒性文字。
- 遵循渐进式披露：`SKILL.md` 只保留职责边界、主流程、强制门禁、reference 读取条件和最终汇报字段；复杂细节放入 reference，并且只在对应节点读取。
- `description` 负责触发和边界；正文负责已触发后的执行流程。不要把相邻 skill 分工和不触发场景主要藏在正文里。
- 不直接修改正式 skill 原始路径。需要修改正式 skill 时，先复制到当前项目根 `skills/<skill-name>/` 工作副本，再修改工作副本。
- 本 skill 独立完成创建/维护和本地校验。不要把“缺少 `arcforge-skill-first`”当成停止理由。
- 不在本 skill 内执行 ArcForge apply/share/push、目标目录覆盖、远程写入或 registry 写入。
- 如果用户要求 Skill First 闭环、隔离执行前测/复测，或当前修改风险较高，需要生成可交给 `arcforge-skill-first` 的验证输入；这只是可选交接，不是本 skill 完成创建/维护的前置条件。
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
- 检查当前 agent 的项目级和用户级 skill 目录；不存在的目录跳过。
- 如果目标 skill 来自正式来源且需要修改，复制完整目录到当前项目根 `skills/<skill-name>/` 后再改。
- 如果 `skills/<skill-name>/` 已存在，把它当作工作副本，修改前注意用户或并发改动。
- 新建 skill 时，使用 lowercase letters、digits、hyphens 命名；目录名和 frontmatter `name` 保持一致。
- 新建 skill 的最小产物是 `skills/<skill-name>/SKILL.md` 和 `skills/<skill-name>/agents/openai.yaml`。只有真实需要时才添加 `references/`、`scripts/`、`assets/`、schema 或 fixture。
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

### 3. 建模软件能力单元

输入：真实任务、目标 skill 工作副本或新建目标。

动作：
- 读取 [references/software-capability-unit.md](references/software-capability-unit.md)。
- 判断目标 skill 需要的最小承载：`SKILL.md`、reference、CLI、server、UI、状态、schema、测试 fixture、回传机制。
- 先发现已有实现承载，再判断接入、维护、包装还是新建。
- 如果可能已有仓库、CLI、服务、UI、MCP、脚本或 schema，但当前上下文无法确认，向用户询问入口。
- 明确哪些能力本轮落地，哪些只是后续产品缺口。

退出条件：说明本轮采用的能力承载策略、已有实现发现结果和暂不落地的产品缺口。

### 4. 设计或修订 Skill 契约

输入：用户硬要求、能力单元建模结果、目标 skill 工作副本。

动作：
- 读取 [references/skill-authoring-rules.md](references/skill-authoring-rules.md)。
- 设计 `description`：写清触发条件、适用范围、相邻 skill 分工、不触发场景，以及本 skill 相对通用 creator 的优先级（如适用）。
- 设计正文：只写已触发后的执行流程、门禁、输入、动作、退出条件、reference 读取条件和最终汇报字段。
- 把复杂判断、长清单、prompt 模板、问题分类、schema、UI/server/CLI 细节迁移到 reference，并在主流程对应节点写清何时读取。
- 把用户硬要求固化为可执行契约，而不是保留为一次性解释或纠错记录。

退出条件：目标 skill 的主流程清楚，细节有渐进式披露入口，用户硬要求没有停留在解释层。

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

### 7. 独立交付和可选验证交接

输入：目标 skill 工作副本、结构检查结果、剩余缺口。

动作：
- 独立汇报目标 skill 已创建或维护到什么程度、通过了哪些本地检查、剩余哪些缺口。
- 如果用户没有要求隔离执行闭环，可以把目标 skill 标记为“本地结构校验通过”，但不要写成“已通过真实隔离执行验证”。
- 如果用户要求 Skill First 闭环、需要隔离执行，或修改涉及复杂交互/确认/工具承载，生成可选验证交接包：目标 skill 路径、真实验证任务、工作区、允许写入边界、临时路径建议、已知产品缺口和需要观察的关键行为。
- 不在本 skill 中执行 ArcForge apply、share、push、目标目录覆盖、远程写入或 registry 写入。

退出条件：用户可以直接使用目标 skill，或知道需要补充哪些最小信息；如需要隔离验证，用户也能把交接包交给 `arcforge-skill-first`。

## Reference 路由

- 能力单元、目标 skill 适配阈值、已有实现承载、CLI/server/UI/状态/schema 选择：读 [references/software-capability-unit.md](references/software-capability-unit.md)。
- skill 写法、用户硬要求固化、渐进式披露、正式来源和工作副本规则：读 [references/skill-authoring-rules.md](references/skill-authoring-rules.md)。
- 最终结构、安全、metadata 和 ArcForge 治理边界检查：读 [references/validation-checklist.md](references/validation-checklist.md)。

## 最终汇报字段

- 目标 skill 路径，正式原始路径，工作副本路径。
- 本轮模式：新建、更新、拆分、修复、接入、维护或包装。
- 用户硬要求及其落点。
- 为什么本轮优先遵守 `arcforge-skill-creator`，以及其他 creator 类 skill 是否只作为辅助参考。
- 软件能力单元建模结果和承载策略。
- 已发现或待用户补充的实现承载来源。
- 本轮修改内容。
- 本地结构检查结果和无法检查项。
- 剩余产品缺口。
- 是否需要隔离执行验证；如果需要，给出可选交接给 `arcforge-skill-first` 的验证任务、写入边界和观察重点。
