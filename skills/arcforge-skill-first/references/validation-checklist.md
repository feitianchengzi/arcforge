# 校验清单

最终汇报前使用本清单。

## Skill 结构

- `SKILL.md` 有 YAML frontmatter，并包含 `name` 和 `description`。
- `description` 同时说明 skill 做什么、什么时候使用。
- `SKILL.md` 先引导 agent 判断用户任务需要哪些 skill 入口，再逐个定位目标 skill 来源。
- `SKILL.md` 明确区分创建/更新 skill、新领域任务先建 skill、观察已有 skill 执行真实任务三种模式。
- 用户显式使用 `skill first:` 时，`SKILL.md` 说明 Skill First 是元入口，真实任务所需 skill 是目标 skill、辅助入口、验证入口或治理入口。
- `SKILL.md` 明确 `arcforge-skill-first` 是元 skill，不直接完成业务任务；它先判断、创建或维护目标 skill。
- `SKILL.md` 明确新领域任务缺少足够匹配目标 skill 时，默认先创建目标 skill，而不是直接执行业务任务。
- `SKILL.md` 有候选目标 skill 的适配阈值，能避免泛化 skill 因“最接近”而抢占目标 skill。
- 当用户用 `$arcforge-skill-first` 或 `skill first:` 提出新领域任务且没有足够匹配目标 skill 时，流程默认创建新目标 skill 工作副本。
- `SKILL.md` 说明 `arckit-tech`、`arckit-code`、`arckit-spec` 等宽泛 skill 只能作为辅助入口，除非它们本身就是足够匹配的目标 skill。
- `SKILL.md` 引导 agent 把目标 skill 理解为软件能力单元，而不是默认只维护 Markdown。
- `SKILL.md` 或 reference 说明本轮选择了哪些承载：文档、CLI、server、UI、状态、schema、测试或回传机制。
- 如果本轮暂不需要 CLI、server 或 UI，原因是基于用户意图和风险判断，而不是遗漏。
- `SKILL.md` 或 reference 要求在目标 skill 的实现层发现已有承载，再判断接入已有实现、维护已有实现、包装进 skill 或新建最小实现。
- 如果目标 skill 可能已有实现承载但当前上下文无法确认，流程会引导 agent 向用户询问仓库、路径、服务、CLI、UI、MCP、schema 或脚本入口。
- 流程可以借鉴 `skill-creator` 的结构和校验，但不会停在标准 skill 文件夹、资源清单或通用创建指南层。
- `SKILL.md`、references、`agents/openai.yaml` 的主要文案语言与用户当前请求语言一致，除非用户明确指定其他语言。
- 正文使用直接的过程化指令。
- references 位于 skill 目录下一层。
- 每个 reference 都在 `SKILL.md` 中有明确读取条件或入口。
- 没有添加 README、changelog 或无关文档。
- `agents/openai.yaml` 的 default prompt 提到 `$skill-name`。
- `agents/openai.yaml` 的 default prompt 同步了关键输出格式、边界规则、语言要求、任务到 skill 分工、元入口/执行入口分工、能力单元建模要求和已有实现承载发现要求。
- `agents/openai.yaml` 的 default prompt 使用 `$arcforge-skill-first`，并说明验证通过后只引导进入 `arcforge` 治理流程。
- 如果目标来自正式 skill，已记录原始路径，并且只修改当前项目根 `skills/<skill-name>/` 工作副本。
- 当前 agent 对应的用户级目录和项目级目录已检查；不存在的目录已跳过而不是硬失败。

## 前测完整性

- 子代理收到了目标 skill 路径和真实任务。
- 子代理没有收到你的预期答案或诊断。
- 子代理没有收到问题分类、修复思路、架构评估要求或“判断 skill 是否需要优化”的任务。
- 子代理被要求作为普通使用者执行任务，并记录步骤、命令、路径、错误、确认点和卡点。
- 主 agent 负责评估任务是否需要一个或多个 skill，并确认元入口、目标 skill、辅助入口和本轮目标 skill 是否清楚。
- 主 agent 负责判断候选目标 skill 是否足够匹配；子代理不负责决定是否创建新 skill。
- 如果真实任务属于新领域，子代理收到的是新建或更新后的目标 skill，而不是泛化辅助 skill。
- 主 agent 负责评估目标 skill 是否清楚表达软件能力单元形态，而不把该判断交给子代理。
- 主 agent 负责判断目标 skill 是否作为能力入口可用、是否需要 CLI/server/UI/状态/schema/测试或回传机制、是否存在已有实现承载。
- 子代理 prompt 明确要求创建或更新 skill 时使用用户当前请求语言。
- 有可用子代理工具时已真实启动子代理，没有把用户额外确认作为前置条件。
- 启动子代理前已确认当前环境是否有可用子代理工具；不可用时记录了检查结果。
- 只有没有可用子代理工具，或工具调用失败且无法恢复时，才走降级模拟。
- 如果无法启动子代理，已保存原始 prompt，并明确标注为降级模拟。
- 复测使用了新的临时路径。
- 复测验证的是更新后的 skill，而不是旧假设。
- 子代理完成后已关闭。
- 主 agent 基于子代理执行记录完成观察和问题分类，而不是直接采纳子代理的优化判断。

## 安全性

- 破坏性、远程、凭证相关或大范围写入操作需要确认。
- 临时模拟尽量避免写入真实用户级状态。
- UI、server、CLI 或状态设计没有绕过写入确认边界。
- UI handoff 如涉及用户确认，说明了用户确认结果如何结构化回传，以及取消时如何停止。
- 不直接修改用户级或项目级正式 skill 原始路径；需要修改时先复制到当前项目根 `skills/`。
- 工作流说明了认证、沙箱或依赖缺口出现时怎么处理。
- 在 shell 命令中检查 `$skill-name` 时使用单引号或转义，避免 `$` 被 shell 展开。
- 没有 revert 用户已有修改。

## ArcForge 交接

- 用户确认目标 skill 可用后，已说明建议进入哪个 ArcForge 治理阶段。
- 建议的下一步没有绕过 `arcforge` skill 的规则。
- 没有在 Skill First 流程里自动执行真实项目写入、目标目录替换、Git 更新、push、PR、远程分享或 registry 写入。
- 对 apply、merge run、source update、share run 等写入动作，已明确需要交给 `arcforge` 并等待用户确认。
- 如果用户没有要求继续治理，只把 ArcForge 后续作为可选下一步报告。

## 最终回复

包含：

- 创建或更新了哪个 skill
- 正式 skill 原始路径和工作副本路径
- 任务需要的 skill 入口集合、本轮模式和本轮目标 skill
- 候选目标 skill 的适配判断，以及哪些泛化 skill 只作为辅助入口
- 软件能力单元建模结果，包括本轮选择和暂不选择的承载
- 已检查或待用户补充的目标 skill 实现承载来源
- 本轮策略是观察已有执行、接入已有实现、维护已有实现、包装进 skill，还是新建最小实现
- 运行了哪些子代理模拟
- 主 agent 基于执行记录发现了什么问题
- 做了什么修复
- 复测结果如何
- 用户是否确认目标 skill 可用
- 建议的 ArcForge 下一步和确认要求
- 运行了哪些校验，或为什么不能运行
