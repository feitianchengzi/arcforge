---
name: arcforge-skill-first
description: 当用户要求“skill first”“Skill First 开发”“skill 自迭代”“先沉淀成 skill”“把工作模式做成 skill”“观察/验证已有 skill 执行真实任务”“新建/更新 skill 后验证”“前测/复测 skill”“用真实任务验证 skill”，或在 skill/目标 skill/Skill First 上下文中只说“模拟测试”“做模拟测试”“测一下这个 skill”“试跑这个 skill”“让新 agent 模拟执行”时使用。用于编排目标 skill 创建/维护后的真实场景隔离验证和观察闭环；不直接完成业务任务。
---

# ArcForge Skill First

`arcforge-skill-first` 是 Skill First 编排入口。它负责把真实任务路由到目标 skill、调用 `arcforge-skill-creator` 完成目标 skill 创建或维护、发起隔离执行验证、观察归因并做治理交接。

## 硬约束

- 先治理能力入口，再执行业务任务。真实业务任务属于目标 skill；本 skill 只负责路由、目标 skill 创建或维护的发起、验证、观察、修复要求和治理交接。
- 创建、更新、维护或修复目标 skill 时，必须遵守 `arcforge-skill-creator`。如果通用 `skill-creator` 或其他 creator 类 skill 同时适用，ArcForge skill 场景先遵守 `arcforge-skill-creator`，再按需参考其他 creator 类 skill 的基础结构或工具规则。
- 用户明确提出的要求、纠错和测试反馈必须落到目标 skill 的流程门禁、硬规则、硬输出、确认点、reference 读取条件或明确边界；具体落地方式由 `arcforge-skill-creator` 承担。
- 不要让泛化 skill 抢占目标 skill。`arckit-tech`、`arckit-code`、`arckit-spec` 等只能作为辅助入口，除非它们本身足够覆盖该任务领域。
- 不直接修改正式 skill 原始路径。需要修改正式 skill 时，先复制到当前项目根 `skills/<skill-name>/` 工作副本，再修改工作副本。
- 验证默认只使用人工桥接隔离验证：主 agent 生成两段式桥接执行包，用户在新 agent 对话中先粘贴“真实任务 prompt”，任务完成、阻塞或停在确认请求后再粘贴“事后总结 prompt”，最后把总结、必要 transcript 或阻塞点贴回主会话。
- 隔离验证必须绑定到本轮目标 skill 工作副本。人工桥接执行包要说明预期目标 skill 路径、启动新 agent 的环境要求，以及回传总结中必须能看见实际读取的 skill 路径；如果实际读取的是用户级旧版或其他路径，本轮只算验证绑定失败，不能评价目标 skill 是否通过。
- 人工桥接是主 agent 发起和指挥的验证执行手段，不是停止理由。交付桥接执行包只表示进入 `awaiting_validation_transcript` 状态，不能把目标 skill 标记为验证通过或本轮闭环完成。
- 真实任务 prompt 必须像真实用户请求，只包含做什么、真实输入材料、工作区和写入边界；不得包含验证背景、目标 skill 绝对路径、诊断、观察重点、失败模式、验收标准、执行形态提示、总结格式或“你是验证执行者”这类测试控制语。
- 不得把主会话的观察重点改写成真实任务要求。除非原始业务用户本来就会提出这些要求，否则不要在第一段 prompt 中提示隔离 agent 避免某类问题；这类内容只能留给主 agent 观察归因。
- 不得把目标 skill 应自行决定的实现方式写进真实任务 prompt，例如“最小 skill 文件结构”“本地结构检查”“创建哪些文件”“先做什么校验”。除非原始业务任务本身就是要求产出某种具体文件或检查报告，否则这些内容属于验证污染。
- 不调用任何平台工具来替代人工桥接。不要把“当前不能直接调用自动代理工具”写成验证缺失原因；它与本 skill 的验证方案无关。
- 不设计人工桥接失败、无法桥接、用户不愿桥接、平台不允许桥接、transcript 回放或受限 dry run 分支；这些都不是本 skill 的验证路径。
- ArcForge 后续治理只做引导，不在本 skill 中执行 apply、share、push、目标目录覆盖、远程写入或 registry 写入；如果 `arcforge-skill-creator` 返回 `post_maintenance_handoff`，本 skill 只消费其中的验证相关部分，治理同步部分留给用户确认后交给 `arcforge`。

## 主流程

每一轮都按下面门禁顺序执行。不要跳过门禁；如果某个门禁无法完成，记录阻塞和缺少的最小信息。

### 0. 捕获用户要求

输入：用户的真实任务、纠错、测试反馈、期望体验和限制。

动作：
- 提取用户本轮的硬要求，特别是“必须”“不要”“流程不够硬”“需要交互验证”“需要渐进式披露”“只拆分不丢机制”等反馈。
- 判断这些要求应落到 Skill First 编排、目标 skill 创建或维护、验证协议、输出格式还是 ArcForge 治理边界。
- 如果要求会改变目标 skill 的写法、能力边界或维护流程，本轮必须进入 `arcforge-skill-creator`，而不是只解释。

退出条件：列出本轮硬要求和它们的落点。

### 1. 判定模式和入口集合

输入：用户任务和硬要求。

动作：
- 判断本轮模式：创建或更新 skill、新领域任务先建 skill、观察已有 skill 执行真实任务、拆分/重构 skill、验证已有修改。
- 识别入口集合：元入口 `arcforge-skill-first`、目标 skill、辅助入口、创建维护入口 `arcforge-skill-creator`、验证入口、治理入口。
- 判断候选目标 skill 是否足够匹配。需要适配阈值、能力单元或 skill 写法判断时，交给 `arcforge-skill-creator` 的能力建模规则。
- 明确哪些泛化 skill 只能辅助读取项目上下文、技术约束或文档背景，不能接管整轮任务。

退出条件：明确本轮模式、目标 skill、辅助入口、是否需要 `arcforge-skill-creator`，以及不使用泛化 skill 接管的理由。

### 2. 定位来源和工作副本

输入：目标 skill 名称或候选路径。

动作：
- 检查当前 agent 的项目级和用户级 skill 目录；不存在的目录跳过。
- 如果目标 skill 来自正式来源且需要修改，复制完整目录到当前项目根 `skills/<skill-name>/` 后再改。
- 如果 `skills/<skill-name>/` 已存在，把它当作工作副本，修改前注意用户或并发改动。
- 如果没有足够匹配目标 skill，准备在当前项目根 `skills/<skill-name>/` 创建新的工作副本。

退出条件：记录正式原始路径、工作副本路径和写入边界。

### 3. 调用目标 Skill 创建或维护入口

输入：用户硬要求、目标 skill 工作副本、入口集合、写入边界。

动作：
- 使用 `arcforge-skill-creator` 创建、更新、拆分或维护目标 skill。
- 要求 `arcforge-skill-creator` 处理能力单元建模、渐进式披露、用户硬要求固化、`description` 与正文分工、`agents/openai.yaml` 同步、已有实现承载发现、本地结构检查和维护后 `post_maintenance_handoff`。
- 如果通用 `skill-creator` 也触发，只把它作为基础结构和校验参考；ArcForge skill 的能力建模、治理边界和验证衔接以 `arcforge-skill-creator` 为准。
- 保持本 skill 只记录创建/维护结果，不把 `arcforge-skill-creator` 的完整写作规则复制回来。

退出条件：目标 skill 已由 `arcforge-skill-creator` 创建或维护完成，且返回修改摘要、结构检查结果、剩余产品缺口、`post_maintenance_handoff` 和需要验证的真实任务。

### 4. 验证准备检查

输入：目标 skill 工作副本和 `arcforge-skill-creator` 的维护结果。

动作：
- 确认目标 skill 路径、真实验证任务、工作区、允许写入边界和临时路径。
- 确认目标 skill 的主流程、reference 读取条件和 `agents/openai.yaml` 已足够让隔离执行者发现正确入口。
- 确认隔离执行环境能使用目标 skill 工作副本，而不是同名用户级旧版或其他安装副本。不能确认时，在执行包中标明需要用户启动新 agent 时绑定的目标 skill 路径。
- 如果创建/维护结果缺少必要信息，回到门禁 3 修复；不要带着已知结构缺口进入验证。

退出条件：验证输入完整，或明确阻塞原因。

### 5. 隔离执行验证

输入：更新后的目标 skill、真实任务、写入边界。

动作：
- 读取 [references/validation-execution.md](references/validation-execution.md)。
- 默认生成人工桥接执行包，让用户新开 agent 对话执行，并把事后总结、必要 transcript 或阻塞点贴回主会话。
- 人工桥接执行包必须包含目标 skill 路径、预期读取路径、工作区、允许写入边界、临时路径、用户操作步骤、当前状态 `awaiting_validation_transcript`、第一段真实任务 prompt 和第二段事后总结 prompt。
- 第一段真实任务 prompt 只能模拟用户真实会说的话；如果预期显式触发 skill，可写“执行 `<skill-name>` 做 `<task>`”，如果预期自动触发，就只写任务本身。生成前先剥离主会话中的诊断、失败模式、期望修复点、验收口径和执行形态提示。
- 第二段事后总结 prompt 只能在执行 agent 完成、阻塞或停在确认请求后发送，用于收集实际触发的 skill、读取文件、命令、路径、用户交互点、错误和阻塞。
- 不要尝试调用任何平台工具来替代人工桥接；也不要把这类工具是否可用写进验证模式判断。

退出条件：得到事后总结、必要 transcript 或阻塞点；或已交付人工桥接执行包并明确状态为 `awaiting_validation_transcript`。`awaiting_validation_transcript` 不是完成状态，不能进入“验证通过”或治理交接，只能等待用户回传后继续门禁 6。

### 6. 观察、归因和修复

输入：人工桥接回传的事后总结、必要 transcript 或阻塞点。

动作：
- 读取 [references/iteration-rules.md](references/iteration-rules.md)。
- 如果当前状态是 `awaiting_validation_transcript` 且尚未收到事后总结、必要 transcript 或阻塞点，停止归因和修复，只提醒用户按执行包回传结果。
- 主 agent 负责分类和归因；不要直接采纳隔离执行者的修复判断。
- 如果问题来自目标 skill 表述、流程门禁、用户硬要求缺失、渐进式披露不足、实现承载、`agents/openai.yaml` 或结构检查，回到门禁 3，由 `arcforge-skill-creator` 做范围明确的修复。
- 如果问题来自验证协议、人工桥接 prompt、状态判断或 ArcForge 治理边界，在本 skill 中修复。
- 如果回传记录显示隔离 agent 读取的目标 skill 路径不是本轮工作副本，把问题归为验证绑定失败，修复执行包的环境绑定说明后重新发起验证；不要把产物好坏归因到目标 skill。
- 有实质修复后再次进入门禁 4 和 5，生成复测执行包，除非用户停止或只剩已接受的产品缺口。用户明确要求 Skill First 验证闭环时，不能因为任务很小跳过验证发起或复测发起。

退出条件：执行路径跑通，或剩余缺口已明确并被用户接受。

### 7. 汇报和治理交接

输入：最终工作副本、验证结果、剩余缺口。

动作：
- 读取 [references/validation-checklist.md](references/validation-checklist.md)，确认本 skill 没有重新吞回创建维护职责，且验证状态判断正确。
- 汇报本轮目标 skill、原始路径、工作副本、模式、入口集合、`arcforge-skill-creator` 创建/维护摘要、验证模式、观察结论、校验结果和剩余缺口。
- 如果状态是 `awaiting_validation_transcript`，最终响应不能说目标 skill 已验证通过、闭环已完成或可以进入治理交接；必须以要求用户执行人工桥接执行包并回传事后总结、必要 transcript 或阻塞点收尾。
- 用户确认目标 skill 可用后，结合 `post_maintenance_handoff` 只建议进入合适的 `arcforge` 治理阶段，例如 scan、audit、merge plan、profile、drift、publish/share plan。
- 不自动执行真实写入、apply、share、push、目标目录覆盖或 registry 动作。

退出条件：用户知道改了什么、验证到什么、还缺什么，以及下一步是否需要 ArcForge 治理。

## Reference 路由

- 隔离执行 prompt 和人工桥接：读 [references/validation-execution.md](references/validation-execution.md)。
- 验证记录后的问题分类、归因和修复策略：读 [references/iteration-rules.md](references/iteration-rules.md)。
- 最终汇报前的编排、验证状态和治理交接检查：读 [references/validation-checklist.md](references/validation-checklist.md)。
- 目标 skill 的能力单元建模、创建、维护、渐进式披露、结构检查和 `agents/openai.yaml` 同步：使用 `arcforge-skill-creator`。

## 最终汇报字段

- 目标 skill 路径，正式原始路径，工作副本路径。
- 用户硬要求及其落点。
- 本轮模式、入口集合、候选目标 skill 适配判断。
- 是否调用 `arcforge-skill-creator`，以及它完成的创建/维护摘要。
- 本轮修改内容。
- 验证任务、验证模式、运行轮次和是否人工桥接。
- 如果已发起人工桥接但未收到回传，说明状态是 `awaiting_validation_transcript`，并再次给出用户需要执行和回传的内容。
- 主 agent 基于执行记录发现的问题、修复内容和剩余缺口。
- 用户是否确认目标 skill 可用。
- 建议的 ArcForge 下一步和确认要求。
- 校验命令和结果。
