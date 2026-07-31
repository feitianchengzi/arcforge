# 内容表面积预算

创建或维护 skill 的契约前读取本文件。目标是先决定信息放在哪里，再开始写，避免 `description`、`SKILL.md` 和 `agents/openai.yaml` 因为“都很重要”而同时膨胀。

## 常见失败原因

- 只要求“渐进式披露”，但没有先分配主文件、reference 和 metadata 的职责。
- 把真实场景分析过程写进 `SKILL.md`，而不是只把分析结果转成门禁。
- 把相邻 skill、治理边界、交接字段和长清单塞进 `description`，导致触发角度变成内部流程说明。
- `agents/openai.yaml` 复述整份 `SKILL.md`，而不是只给 agent 一个短的入口提示。
- 校验只检查“有没有”，没有检查“是否过长、重复、角度错误或应该迁移”。

## 写作前预算

写正文前先给四类内容分配承载：

- `description`：用户什么时候会需要这个 skill、它覆盖什么任务、关键边界或优先级是什么。
- `SKILL.md`：已触发后的职责边界、硬约束、门禁顺序、reference 读取条件和最终汇报字段。
- `references/`：详细判断标准、长清单、示例、模板、问题分类、实现承载细节和校验细则。
- `agents/openai.yaml`：一句短说明加一个紧凑入口提示，帮助 agent 发现和正确进入 skill。

默认预算：

- `description` 控制在 1 到 2 句；优先覆盖触发语境和关键边界，不写执行步骤。
- 简单 skill 的 `SKILL.md` 目标是 40 到 90 行；复杂编排型 skill 目标是 90 到 140 行。超过目标时必须说明为什么不能继续拆分。
- `硬约束` 默认不超过 10 条。长规则进入流程节点或 reference。
- 每个主流程节点只保留输入、动作、退出条件；详细判断放到对应 reference。
- `agents/openai.yaml` 的 `default_prompt` 保持为一个短段落，覆盖入口、主流程关键词和最重要的禁止项；不要复述完整门禁。

预算不是机械字数限制。若某条内容会改变执行顺序，它必须在 `SKILL.md` 有门禁入口；若只是帮助判断或举例，放入 reference。

## Description 角度

`description` 从用户触发角度写，不从 skill 自我介绍角度写。

保留：

- 用户会说出的任务类型，例如创建、维护、拆分、修复、固化反馈、验证后修订。
- 适用范围和相邻入口，例如 ArcForge skill 创建维护优先于通用 creator。
- 不触发或禁止边界中最关键的一条，例如不执行 apply、share、push 或 registry 写入。

移走或删除：

- 完整主流程。
- 输出字段清单。
- 所有 reference 名称。
- 多个相邻 skill 的详细分工。
- “专业、完整、强大”等不会帮助触发的定位词。
- 已在正文或 metadata 中重复的解释。

自检问题：

- 这句话能帮助系统判断是否触发 skill 吗？
- 这句话能帮助系统避免误触发吗？
- 如果答案都是否，就移到正文、reference，或直接删除。

## 主文件删减规则

写完 `SKILL.md` 后做一次删减：

- 同一规则同时出现在硬约束、流程节点和 reference 时，只保留执行必须看到的一处，其余改为引用。
- 能用“读取某 reference 并按其清单检查”表达的长清单，不要复制到主文件。
- 真实场景摘要用于指导设计，不作为长期规则逐条保留，除非它们代表稳定触发边界。
- 一次性用户纠错要转成正向规则，避免把协作痕迹写进通用 skill。
- 最终汇报字段只列必须稳定回传的字段；解释、样例和模板进入 reference。

## Metadata 删减规则

`agents/openai.yaml` 不是第二份 `SKILL.md`。

它应该包含：

- `display_name`
- `short_description`
- 提到 `$skill-name` 的紧凑 `default_prompt`
- 关键触发、主流程关键词、最重要边界和最终交接要求

它不应该包含：

- 每个门禁的完整输入、动作和退出条件。
- 所有 reference 文件名。
- 结构化 handoff 的完整字段。
- 与 `description` 或 `SKILL.md` 完全重复的长段落。

## 校验红旗

出现以下情况时，回到契约设计节点重写，而不是继续补规则：

- `description` 需要滚动阅读。
- `description` 主要在讲 skill 自己如何工作，而不是用户何时需要它。
- `SKILL.md` 的硬约束变成长规则清单。
- 主流程节点里出现多段背景解释、模板或案例。
- `agents/openai.yaml` 的 `default_prompt` 长到接近主流程摘要。
- 新增 reference 后，主文件仍保留了被迁移细节的完整版本。
