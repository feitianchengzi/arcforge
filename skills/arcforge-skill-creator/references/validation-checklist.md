# ArcForge Skill Creator 校验清单

最终汇报前使用本清单。目标是确认目标 skill 被建模为可复用、可维护、可治理的软件能力单元，而不是只生成了一个标准文件夹。本清单支持 `arcforge-skill-creator` 独立完成创建/维护；只有需要隔离执行闭环时，才准备可选交接给 `arcforge-skill-first`。

## 触发和优先级

- `SKILL.md` 有 YAML frontmatter，并包含 `name` 和 `description`。
- `description` 同时覆盖创建、更新、维护、拆分、修复或基于反馈固化规则的场景。
- 如果目标属于 ArcForge skill 创建或维护，`description` 或正文已说明本 skill 高于通用 `skill-creator` 或其他 creator 类 skill。
- 如果参考了其他 creator 类 skill，已记录它们只提供基础结构、脚本、格式或校验帮助，不覆盖 ArcForge 能力单元建模和治理边界。
- `description` 承担触发条件、适用边界、相邻 skill 分工和不触发场景。
- 正文从 skill 已触发的前提出发，使用过程化指令说明如何执行任务。

## 能力单元建模

- 已说明用户真正要完成的任务，而不是只说明要创建什么文件。
- 已抽取 2 到 5 个真实或代表性使用场景，能指导触发、主流程、输入、输出、停止条件和 reference 设计。
- 如果场景不足，已提出最少澄清问题，或记录明确假设后继续。
- 已判断任务需要一个 skill 还是多个 skill 协作。
- 已明确目标 skill、辅助 skill、可选验证入口和治理入口。
- 已判断目标 skill 的最小承载：`SKILL.md`、reference、CLI、server、UI、状态、schema、测试 fixture、回传机制。
- 如果本轮只落地 Markdown 和 reference，原因基于用户意图、频率、风险和复用需求，而不是遗漏。
- 已先发现已有实现承载，再判断接入、维护、包装还是新建。
- 如果可能已有仓库、CLI、服务、UI、MCP、脚本或 schema，但当前上下文无法确认，已向用户询问入口或记录待补信息。
- 对当前不能落地但必要的承载，已记录产品缺口：触发场景、用户价值、输入输出、确认边界和阻塞原因。

## Skill 契约

- `SKILL.md` 主体清楚呈现主流程、门禁顺序、每个门禁的输入、动作和退出条件。
- 用户本轮明确要求、纠错或测试反馈已转化为流程门禁、硬规则、确认点、输出格式、reference 读取条件或产品缺口。
- `SKILL.md` 遵循渐进式披露：主文件不堆叠长清单、模板和详细判断标准，细节按节点迁移到 reference。
- 每个 reference 都在 `SKILL.md` 中有明确读取条件或入口。
- 如果某个 reference 细节会改变执行顺序，`SKILL.md` 中有对应门禁，而不是只把关键流程藏在 reference。
- `description` 管触发和边界，正文管已触发后的执行步骤。
- 正文没有把用户纠错、失败复盘、“不要再……”口吻或一次协作中的修正痕迹当成规则原文。
- 正文没有把具体项目、客户、临时策略或一次性业务上下文写成通用执行规则。
- 执行型 skill 正文没有靠相邻 skill 差异说明补救路由不清；必要边界已前移到 `description` 或上层路由。
- 必要的安全、权限、产品方向和破坏性操作边界表达清楚。

## 文件结构和 Metadata

- skill 目录名、frontmatter `name` 和 `agents/openai.yaml` 中提到的 `$skill-name` 一致。
- `agents/openai.yaml` 的 `display_name`、`short_description` 和 `default_prompt` 与 `SKILL.md` 同步。
- `agents/openai.yaml` 的 `default_prompt` 提到 `$skill-name`。
- `agents/openai.yaml` 不只是重复 skill 名称，而是同步关键触发、边界、主流程、输出重点和约束。
- references 位于 skill 目录下一层。
- 没有添加 README、changelog 或无关文档，除非用户明确要求。
- 目标 skill 的主要内容语言与用户当前请求语言一致，除非用户明确指定其他语言。
- 对 YAML、JSON、脚本或 schema 做了可用的本地解析检查；无法检查时说明原因。

## 来源和写入边界

- 已记录正式 skill 原始路径和工作副本路径。
- 如果目标来自正式 skill，未直接修改原始路径。
- 如果 `skills/<skill-name>/` 已存在，已把它当作工作副本并注意用户或并发改动。
- 没有 revert 用户已有修改。
- 没有执行 ArcForge apply、share、push、目标目录覆盖、远程写入或 registry 写入。
- 文案描述 ArcForge 为 pre-publish 和 team-governance 层，没有把它描述成 marketplace、public registry、search engine、ratings system、paid distribution platform 或 agent runtime。

## 独立校验和可选验证交接

- 已说明目标 skill 是本地结构校验通过、仍有产品缺口，还是需要后续隔离执行验证。
- 没有把本地结构校验通过写成真实隔离执行验证通过。
- 如果用户要求 Skill First 闭环、修改风险较高或需要隔离执行，已生成可选交接给 `arcforge-skill-first` 的验证输入：目标 skill 路径、真实验证任务、工作区、允许写入边界、临时路径建议和观察重点。
- 没有在本 skill 中执行 ArcForge apply、share、push、目标目录覆盖、远程写入或 registry 写入。
- 如果仍缺少验证所需最小信息，已明确阻塞和需要用户补充的内容。

## 最终回复

包含：

- 目标 skill 路径、正式原始路径和工作副本路径。
- 本轮模式：新建、更新、拆分、修复、接入、维护或包装。
- 用户硬要求及其落点。
- 为什么本轮优先遵守 `arcforge-skill-creator`，以及其他 creator 类 skill 是否只作为辅助参考。
- 真实使用场景摘要。
- 软件能力单元建模结果和承载策略。
- 已发现或待用户补充的实现承载来源。
- 本轮修改内容。
- 本地结构检查结果和无法检查项。
- 剩余产品缺口。
- 是否需要隔离执行验证；如果需要，给出可选交接给 `arcforge-skill-first` 的验证任务、写入边界和观察重点。
