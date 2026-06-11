---
name: arcforge-skill-first
description: 当用户要求“skill first”“Skill First 开发”“skill 自迭代”“先沉淀成 skill”“把工作模式做成 skill”“新建/更新 skill 后让子代理模拟”“前测/复测 skill”“用真实任务验证 skill”“子代理发现问题后治理 skill”时使用。用于指导 agent 先创建或更新目标 skill，再用子代理模拟真实使用，基于问题报告修订 skill、reference、工具或流程，并在用户确认 skill 可用后引导进入 ArcForge 治理流程。
---

# ArcForge Skill First

使用这个技能运行 Skill First 开发闭环：

```text
任务意图 -> 识别所需 skill 入口 -> 定位 skill 来源 -> 能力包实现建模 -> 接入、维护或新建实现承载 -> 子代理模拟使用 -> 问题报告 -> 治理 skill、工具或流程 -> 再次模拟
```

目标是把用户的工作模式先理解为一个软件能力单元，再沉淀为 skill，并通过另一个 agent 的真实使用反馈让 skill 自迭代。把子代理当成评测面，而不是已经知道正确答案的协作者。

这里的 skill 不是一堆 Markdown 文档，也不是本地脚本清单。skill 是 agent 面向某类任务的交互入口和工作流契约；CLI、server、UI、状态文件、schema、测试 fixture、回传机制和治理流程都可以成为这个能力单元的一部分。不是每个 skill 都需要完整软件栈，但维护 skill 时必须先知道这些承载方式，再根据用户意图选择最小但完整的能力形态。

做一件事时，先识别需要哪些 skill 入口；如果需要多个 skill，先说明主 skill、辅助 skill、验证 skill 或治理 skill 的分工，再逐个定位和维护。CLI、server、UI、MCP、脚本或内部服务不是和 skill 并列的入口，而是某个 skill 的实现承载、依赖或底层能力；只有在分析具体 skill 如何实现时，才判断这些能力是否已经存在、应接入、应维护，还是需要新建。

`skill-creator` 适合创建标准 skill 文件夹、基础 `SKILL.md`、`agents/openai.yaml` 和 `scripts/references/assets` 资源结构。使用 `arcforge-skill-first` 时不能停在通用创建指南层：要继续把目标 skill 放进真实用户任务中验证，判断它作为能力入口是否清楚、实现承载是否合适、已有实现是否应接入，并基于子代理反馈迭代。

这个 skill 负责 skill 的创建、迭代和验证前段。用户确认新 skill 可用后，它只负责把下一步引导到 ArcForge 的治理入口；审计、正式化、profile、apply、drift、publish 或 share 的具体执行必须遵守 `arcforge` skill 的规则。

## 核心规则

1. 先理解用户任务需要哪些 skill 入口，而不是先找工具或直接写文档；任务复杂时列出主 skill、辅助 skill、验证 skill 或治理 skill 的分工。
2. 对每个目标 skill，先根据当前 agent 和当前项目寻找已有 skill，再决定读取、复制或创建目标 skill。
3. 找到或创建工作副本后，再把该 skill 映射成软件能力单元：它要解决什么任务、谁来使用、哪些步骤适合 agent 对话、哪些步骤需要 CLI、server、UI、状态、schema、测试或回传机制承载。
4. CLI、server、UI、MCP、脚本、内部服务、配置、schema、测试 fixture 或历史文档，都是某个 skill 的实现承载或依赖；不要把它们当作绕过 skill 的并行入口。
5. 分析具体 skill 的实现承载时，先发现已有实现承载，再判断缺口。不要把“当前 skill 目录里没有”误判为“实现不存在”。
6. 如果本地上下文无法确认某个实现承载是否已存在，适时向用户询问路径、仓库、服务、命令、UI、MCP 或数据模型入口。
7. 根据发现结果判断本轮是在接入已有实现、维护更新已有实现、把已有实现包装进该 skill，还是新建最小实现能力。
8. 不要一开始就把维护目标缩窄为 `SKILL.md` 文案。先判断该 skill 最小但完整的能力形态；如果能力缺失，明确记录为工具、CLI、server、UI 或产品缺口。
9. 能用文档说明清楚且低频低风险的流程，保持轻量；需要可复现执行、批量操作、状态追踪、视觉确认或复杂选择时，主动考虑软件承载。
10. 可以借鉴 `skill-creator` 的结构、命名、frontmatter、资源目录和基础校验规则，但不要退回“只生成 skill 文件夹和资源清单”的心智；Skill First 必须包含真实任务验证和迭代。
11. 当前 agent 对应的用户级目录、项目级目录，以及当前会话已加载 skill 列表中的路径，都视为正式 skill 来源。
12. Codex 环境优先检查项目级 `.codex/skills/`、用户级 `~/.codex/skills/`；其他 agent 按其约定检查项目级和用户级目录，例如 Claude 的 `.claude/skills/`、`~/.claude/skills/`，Cursor 的 `.cursor/skills/`、`~/.cursor/skills/`，目录不存在时跳过。
13. 如果目标来自正式 skill，读取原始路径，但不要直接修改；先完整复制到当前项目根目录 `skills/<skill-name>/`，再修改这个工作副本。
14. 如果 `skills/<skill-name>/` 已存在，把它当作本轮工作副本；修改前确认它是否已经包含用户或并发改动。
15. 目标 skill 保持简洁、过程化、可执行；复杂细节应放进 reference、工具或底层能力，而不是堆进主文件。
16. 目标 skill 默认使用用户当前请求语言；用户用中文提出需求时，`SKILL.md`、references 和 `agents/openai.yaml` 文案默认写中文。
17. 只有当用户明确要求英文、双语或指定语言时，才使用其他语言。
18. 当主 `SKILL.md` 变得拥挤时，把可复用细节放到同级一层 `references/` 文件中。
19. 新增 reference 时，必须在目标 `SKILL.md` 中写清楚何时读取它。
20. 如果需要 UI，必须说明 UI 承载什么决策、输入或预览，以及 UI 结果如何以结构化数据回到 agent 对话上下文、本地状态或下一条 CLI/server 动作。
21. Skill First 执行默认必须启动子代理做前测和复测；不需要用户额外确认。
22. 传给子代理的是目标 skill 路径和真实任务，不传你的诊断、预期答案或修复思路。
23. 除非测试任务本身要求修改源码，否则要求子代理不要修改源文件。
24. 模拟项目、fixtures、输出文件使用临时路径。
25. 启动子代理前先确认当前环境是否有可用子代理工具；有可用工具且平台策略允许时必须真实启动子代理。
26. 只有当前环境没有可用子代理工具，或工具调用失败且无法恢复，或当前平台策略明确禁止未授权子代理时，才保存原始子代理 prompt，明确标注为“降级模拟”，并继续做问题分类、治理和复测。
27. `agents/openai.yaml` 不只写默认 prompt，还要同步目标 skill 的关键输出格式、边界规则、语言要求、能力单元建模要求和已有实现承载发现要求。
28. 把子代理或降级模拟发现的问题转化成具体的 skill、reference、工具、CLI、server、UI、状态模型、已有实现接入或流程修复。
29. 有实质修复后至少再模拟一次，除非用户停止或任务明显很小。
30. 用户确认目标 skill 可用后，自动说明建议进入的 ArcForge 治理阶段，例如 audit、merge plan、profile、apply、drift 或 publish/share plan。
31. ArcForge 交接只做路由和下一步建议；不要在本 skill 中重新实现 ArcForge 的 audit、apply、drift、publish 或 share 逻辑。
32. 不要自动执行真实项目写入、目标目录替换、Git 更新、push、PR、远程分享或 registry 相关命令；这些必须交给 `arcforge` workflow 并按其确认规则执行。
33. 可以建议优先从低风险的 ArcForge 阶段开始，例如 scan、audit、merge plan、publish plan 或 share plan；涉及 run、apply、update、push、share 的动作必须先说明范围和风险并等待用户确认。
34. 如果用户只要求完成 Skill First 验证，不要强行推进 ArcForge 后续流程；最终汇报中给出可选的下一步即可。

## 工作流

1. 明确用户任务、真实测试任务和用户期待的工作体验。
2. 识别任务需要的 skill 入口集合；如果不止一个，说明每个 skill 的分工，并确定本轮要创建或维护的目标 skill。
3. 根据当前 agent 搜索每个目标 skill 的正式来源，并记录原始路径、工作副本路径和是否需要复制。
4. 如果目标是正式 skill，把完整目录复制到当前项目根 `skills/<skill-name>/`；如果没有找到正式 skill，则在该目录下创建新 skill。
5. 读取工作副本后，对该 skill 做软件能力单元实现建模：列出交互入口、执行层、状态层、UI handoff、回传机制、测试方式和治理边界；只选择本轮需要落地的最小能力。
6. 在该 skill 的实现层发现已有承载：检查当前项目、已知仓库、可用工具和用户提供的线索；上下文不足时，向用户询问是否已有相关仓库、服务、CLI、UI、MCP、脚本或数据模型。
7. 判断本轮策略：接入已有实现、维护更新已有实现、把已有实现包装进该 skill，或新建最小实现能力；说明选择理由。
8. 读取并更新工作副本中的目标 skill；必要时同步 reference、`agents/openai.yaml`、脚本、CLI 说明、server/UI handoff 说明、schema、测试 fixture 或已有实现接入说明。
9. 运行本地结构检查。
10. 启动子代理，让它使用目标 skill 完成真实任务；只有没有可用子代理能力、工具无法恢复或平台策略不允许时，才按降级模拟记录执行。
11. 收集子代理报告。
12. 将问题分类为：任务到 skill 分工、能力包实现建模、已有实现承载发现、skill 表述、正式 skill 来源和复制流程、缺少 reference、缺少工具或 CLI/server/UI 能力、缺少状态或回传机制、不安全流程、测试环境问题或产品决策。
13. 做范围明确的修复。
14. 使用新的临时路径再次模拟。
15. 当子代理能完成目标路径，或只剩已接受的产品缺口时，向用户确认目标 skill 是否可用。
16. 如果用户确认可用，说明建议进入的 ArcForge 治理阶段和原因；只引导到 `arcforge`，不绕过它的确认规则。

## 参考文件

- 需要建立软件能力单元心智、判断 CLI/server/UI/状态/回传机制是否必要时，读取 [references/software-capability-unit.md](references/software-capability-unit.md)。
- 需要子代理 prompt 模板时，读取 [references/subagent-prompts.md](references/subagent-prompts.md)。
- 需要问题分类和治理规则时，读取 [references/iteration-rules.md](references/iteration-rules.md)。
- 最终汇报前，读取 [references/validation-checklist.md](references/validation-checklist.md)。
- 当前环境无法启动子代理时，也要读取上述文件，并把 prompt、模拟输出和限制说明保存到临时路径。

## 最终汇报

汇报内容包括：

- 目标 skill 路径
- 正式 skill 原始路径和工作副本路径
- 任务需要的 skill 入口集合和本轮目标 skill
- 软件能力单元建模结果
- 已发现或待用户补充的实现承载
- 本轮策略：接入已有实现、维护已有实现、包装进 skill，还是新建最小实现
- 模拟任务
- 子代理运行轮次
- 发现的问题
- 已做的修复
- 剩余且已接受的缺口
- 用户是否确认目标 skill 可用
- 建议的 ArcForge 下一步，以及是否需要用户确认
- 校验命令和结果
