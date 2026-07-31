# Skill 写作和维护规则

在创建或更新目标 skill 时读取本文件。目标是把用户要求固化成可执行流程，并通过渐进式披露降低主文件密度。写作前先读取 `content-surface-budget.md`，确定 `description`、`SKILL.md`、reference 和 metadata 的承载分工。

## Creator 优先级

在 ArcForge skill 创建、维护、拆分或修复场景中，先遵守 `arcforge-skill-creator`。通用 `skill-creator` 或其他 creator 类 skill 只能作为基础结构、脚本、格式或校验工具参考，不能覆盖 ArcForge 的能力单元建模、治理边界、渐进式披露、本地校验和可选验证交接要求。

## 用户要求固化

用户明确提出的要求、纠错、测试反馈和使用感受不能只写进解释性段落。先判断它应落到哪里：

- 流程门禁：必须按顺序执行，不能跳过。
- 硬规则：任何同类任务都必须遵守。
- 确认点：执行前必须问用户或请求权限。
- 输出格式：最终必须包含的字段、路径、状态或证据。
- Reference 读取条件：只有到某个节点才读取细节。
- 产品缺口：当前不能落地，但必须记录触发场景、价值、输入输出和阻塞原因。

如果用户反馈“流程不硬”“主流程不清楚”“信息密度太高”“应该渐进式披露”，优先修 `SKILL.md` 的流程结构和 reference 路由，而不是只追加更多规则。

如果用户反馈“description 过长”“描述角度不对”“正文太长”“reference 没有按需披露”，必须先做内容表面积预算：决定哪些内容留在触发描述、哪些留在主流程、哪些迁移到 reference、哪些直接删除。

## 渐进式披露

`SKILL.md` 只承载：

- skill 的职责边界。
- 主流程和门禁顺序。
- 每个门禁的输入、动作和退出条件。
- 必须立即知道的硬约束。
- reference 的读取条件。
- 最终汇报字段。

以下内容默认迁移到 reference：

- 详细判断标准。
- 长清单。
- prompt 模板。
- 问题分类。
- 示例。
- CLI/server/UI/schema/状态设计细则。
- 安全检查细则。

迁移细节时必须保留可发现性：主 `SKILL.md` 要在对应流程节点写清“何时读取哪个 reference”。如果某个细节会改变执行顺序，它不能只藏在 reference 里，必须在主流程中有门禁入口。

## 主文件结构

目标 skill 的 `SKILL.md` 推荐结构：

```text
frontmatter
一句话职责
硬约束
主流程
Reference 路由
最终汇报字段
```

避免在主文件中堆叠“核心规则”长列表。规则应尽量进入具体流程节点，或进入 reference。

## Description 和正文分工

`description` 负责触发和边界：

- 什么时候使用。
- 适用范围。
- 相邻 skill 分工。
- 明确不触发场景。

它不负责说明完整执行过程、输出字段、reference 文件名、长期治理交接模板或所有相邻 skill 的详细分工。description 的角度应接近用户请求如何触发，而不是 skill 如何自我证明完整。

正文负责已触发后的执行：

- 输入怎么理解。
- 如何从真实使用场景抽取主流程和输出。
- 先后顺序。
- 何时澄清。
- 何时读取 reference。
- 何时做本地校验。
- 何时需要可选隔离执行验证交接。
- 如何汇报。

不要用正文大量解释它和其他 skill 的区别。相邻边界应前移到 `description` 或上层路由。

## 正向规则

把用户纠错和失败复盘抽象成正向规则：

- 把“不要再直接写一堆说明”改成“先把用户要求映射为流程门禁、硬规则或 reference 读取条件”。
- 把“流程不够硬”改成“每个主流程节点必须有退出条件，未满足时停止并报告阻塞”。
- 把“信息密度太高”改成“主文件只保留流程，细节迁移到按节点读取的 reference”。

安全、权限、产品方向和破坏性操作边界可以用明确禁止语句；普通执行方法优先写成正向步骤。

## 语言和范围

- 目标 skill 默认使用用户当前请求语言。
- 用户用中文提出需求时，`SKILL.md`、references 和 `agents/openai.yaml` 文案默认使用中文。
- 只有用户明确要求英文、双语或指定语言时，才切换语言。
- 修复保持范围小，不重写无关内容。
- 不添加 README、changelog 或无关文档，除非用户明确要求。

## 正式来源和工作副本

- 当前 agent 对应的用户级目录、项目级目录，以及当前会话已加载 skill 列表中的路径，都视为正式 skill 来源。
- Codex 优先检查项目级 `.codex/skills/`、用户级 `~/.codex/skills/`；其他 agent 按其约定检查项目级和用户级目录。
- 如果目标来自正式 skill，读取原始路径但不要直接修改。
- 需要修改时，先完整复制到当前项目根 `skills/<skill-name>/`，只改这个工作副本。
- 如果 `skills/<skill-name>/` 已存在，把它当作本轮工作副本；修改前注意用户或并发改动。
- 如果当前仓库本身就是正式 Skill 项目，且目标 skill 位于该项目维护源内，可以直接把该路径视为正式维护源工作区；不要额外复制到业务项目。
- 维护结束后，必须说明工作副本、正式来源和维护源之间的关系；工作副本存在不代表已经同步回维护源。

## 维护后交接

创建或维护结束后，不只判断是否需要 `arcforge-skill-first`。还要判断是否需要 `arcforge` 做正式化、审计、merge plan、drift、apply、profile、publish-plan 或 share-plan。

输出 `post_maintenance_handoff`，推荐下一步只能是：

- `local_experiment_only`
- `verify_with_skill_first`
- `sync_to_maintenance_source`
- `verify_then_sync`

不要在 `arcforge-skill-creator` 中执行治理写入；只给出交接输入、建议阶段和用户确认边界。

## Agents 元数据

`agents/openai.yaml` 不能只重复 skill 名称，也不能复述整份 `SKILL.md`。它应短促同步：

- 关键触发和边界。
- 主流程节点。
- 用户硬要求固化规则。
- 渐进式披露规则。
- 能力单元建模要求。
- 本地校验和可选验证交接要求。
- 维护后 `post_maintenance_handoff`：本地停止、Skill First 验证、ArcForge 治理同步，或先验证再同步。
- 最终汇报重点。

如果 `default_prompt` 已经列出每个门禁的完整输入、动作和退出条件，说明它过长；保留入口、主流程关键词和最重要边界，把细节交给 `SKILL.md`。
