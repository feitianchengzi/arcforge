---
name: arcforge-skill-first
description: 当用户要求“skill first”“Skill First 开发”“skill 自迭代”“先沉淀成 skill”“把工作模式做成 skill”“观察/验证已有 skill 执行真实任务”“新建/更新 skill 后验证”“前测/复测 skill”“用真实任务验证 skill”时使用。作为元 skill，先判断真实任务是否已有足够匹配的目标 skill；没有时创建或更新目标 skill。随后使用隔离执行验证目标 skill：当前默认由用户人工桥接到新 agent 对话执行，主 agent 观察 transcript、归因、修订 skill/reference/工具/流程，并在用户确认可用后引导进入 ArcForge 治理。
---

# ArcForge Skill First

`arcforge-skill-first` 是元 skill。它不直接完成业务任务，而是把用户要做的工作沉淀或验证成目标 skill，并用隔离执行记录驱动迭代。

## 硬约束

- 先治理能力入口，再执行业务任务。真实业务任务属于目标 skill；本 skill 只负责路由、创建或维护目标 skill、验证、观察、修复和治理交接。
- 用户明确提出的要求、纠错和测试反馈必须转化成目标 skill 的硬流程、硬门禁、硬输出或明确边界；不要只写成提醒性文字。
- 遵循渐进式披露：`SKILL.md` 只保留主流程、强制门禁和 reference 读取条件；细节放入 reference，并且只在对应节点读取。
- 不要让泛化 skill 抢占目标 skill。`arckit-tech`、`arckit-code`、`arckit-spec` 等只能作为辅助入口，除非它们本身足够覆盖该任务领域。
- 不直接修改正式 skill 原始路径。需要修改正式 skill 时，先复制到当前项目根 `skills/<skill-name>/` 工作副本，再修改工作副本。
- 验证默认只使用人工桥接隔离验证：主 agent 生成可复制的 executor prompt，指挥用户把它粘贴到新的 agent 对话中执行，再把 transcript 或最终报告贴回主会话。
- 人工桥接是主 agent 发起和指挥的验证执行手段，不是停止理由。交付 executor prompt 只表示进入 `awaiting_validation_transcript` 状态，不能把目标 skill 标记为验证通过或本轮闭环完成。
- 不调用任何平台工具来替代人工桥接。不要把“当前不能直接调用自动代理工具”写成验证缺失原因；它与本 skill 的验证方案无关。
- ArcForge 后续治理只做引导，不在本 skill 中执行 apply、share、push、目标目录覆盖、远程写入或 registry 写入。

## 主流程

每一轮都按下面门禁顺序执行。不要跳过门禁；如果某个门禁无法完成，记录阻塞和缺少的最小信息。

### 0. 捕获用户要求

输入：用户的真实任务、纠错、测试反馈、期望体验和限制。

动作：
- 提取用户本轮的硬要求，特别是“必须”“不要”“流程不够硬”“需要交互验证”“需要渐进式披露”等反馈。
- 判断这些要求应落到主流程门禁、目标 skill 规则、reference 读取条件、验证协议、输出格式还是治理边界。
- 如果用户要求会改变 skill 写法或流程结构，本轮必须修改对应 skill，而不是只解释。

退出条件：列出本轮硬要求和它们的落点。

### 1. 判定模式和入口集合

输入：用户任务和硬要求。

动作：
- 判断本轮模式：创建或更新 skill、新领域任务先建 skill、观察已有 skill 执行真实任务。
- 识别入口集合：元入口、本轮目标 skill、辅助入口、验证入口、治理入口。
- 判断候选目标 skill 是否足够匹配。需要适配阈值或能力单元判断时，读取 [references/software-capability-unit.md](references/software-capability-unit.md)。

退出条件：明确本轮模式、目标 skill、辅助入口和不使用泛化 skill 接管的理由。

### 2. 定位来源和工作副本

输入：目标 skill 名称或候选路径。

动作：
- 检查当前 agent 的项目级和用户级 skill 目录；不存在的目录跳过。
- 如果目标 skill 来自正式来源且需要修改，复制完整目录到当前项目根 `skills/<skill-name>/` 后再改。
- 如果 `skills/<skill-name>/` 已存在，把它当作工作副本，修改前注意用户或并发改动。
- 如果没有足够匹配目标 skill，创建新的工作副本。

退出条件：记录正式原始路径、工作副本路径和写入边界。

### 3. 做能力单元建模

输入：目标 skill 工作副本或新建目标。

动作：
- 读取 [references/software-capability-unit.md](references/software-capability-unit.md)。
- 判断目标 skill 需要的最小承载：`SKILL.md`、reference、CLI、server、UI、状态、schema、测试 fixture、回传机制。
- 先发现已有实现承载，再判断接入、维护、包装还是新建。
- 如果可能已有仓库、CLI、服务、UI、MCP、脚本或 schema，但当前上下文无法确认，向用户询问入口。

退出条件：说明本轮采用的承载策略和暂不落地的产品缺口。

### 4. 创建或更新目标 skill

输入：用户硬要求、目标 skill 工作副本、能力单元建模结果。

动作：
- 读取 [references/skill-authoring-rules.md](references/skill-authoring-rules.md)。
- 把用户硬要求固化为流程门禁、规则、输出格式、确认点或 reference 读取条件。
- 保持目标 `SKILL.md` 聚焦主流程；把复杂细节迁移到 reference，并在主流程对应节点写清读取条件。
- 同步必要的 `agents/openai.yaml`、reference、脚本说明、schema、测试 fixture 或实现承载说明。

退出条件：目标 skill 的主流程清楚，细节有渐进式披露入口，用户硬要求没有停留在解释层。

### 5. 本地结构检查

输入：更新后的目标 skill。

动作：
- 检查 frontmatter、reference 链接、语言一致性、旧术语残留、路径和写入边界。
- 对 YAML、JSON、脚本或 schema 做可用的本地解析检查。
- 最终汇报前读取 [references/validation-checklist.md](references/validation-checklist.md)。

退出条件：结构检查结果明确；无法检查时说明原因。

### 6. 隔离执行验证

输入：更新后的目标 skill、真实任务、写入边界。

动作：
- 读取 [references/validation-execution.md](references/validation-execution.md)。
- 默认生成人工桥接执行包，让用户新开 agent 对话执行，并把 transcript、最终报告或阻塞点贴回主会话。
- 人工桥接执行包必须包含 executor prompt、目标 skill 路径、真实任务、工作区、允许写入边界、临时路径、用户操作步骤、回传格式和当前状态 `awaiting_validation_transcript`。
- 不要尝试调用任何平台工具来替代人工桥接；也不要把这类工具是否可用写进验证模式判断。
- 只有用户明确不愿人工桥接、任务无法桥接、已有 transcript 可回放，或平台连人工桥接提示都不允许时，才使用 transcript 回放或受限主会话 dry run。
- 如果只能做受限主会话 dry run，保存或展示本应发送的 executor prompt，并明确标注客观性不足。

退出条件：得到 transcript、最终报告或阻塞点；或已交付人工桥接执行包并明确状态为 `awaiting_validation_transcript`。`awaiting_validation_transcript` 不是完成状态，不能进入“验证通过”或治理交接，只能等待用户回传后继续门禁 7。

### 7. 观察、归因和修复

输入：隔离执行记录或受限 dry run 记录。

动作：
- 读取 [references/iteration-rules.md](references/iteration-rules.md)。
- 如果当前状态是 `awaiting_validation_transcript` 且尚未收到 transcript、最终报告或阻塞点，停止归因和修复，只提醒用户按执行包回传结果。
- 主 agent 负责分类和归因；不要直接采纳隔离执行者的修复判断。
- 如果问题来自目标 skill 表述、流程门禁、用户硬要求缺失、渐进式披露不足、实现承载、验证协议或治理边界，做范围明确的修复。
- 有实质修复后再次进入门禁 5 和 6，生成复测执行包，除非用户停止或只剩已接受的产品缺口。用户明确要求 Skill First 验证闭环时，不能因为任务很小跳过验证发起或复测发起。

退出条件：执行路径跑通，或剩余缺口已明确并被用户接受。

### 8. 汇报和治理交接

输入：最终工作副本、验证结果、剩余缺口。

动作：
- 汇报本轮目标 skill、原始路径、工作副本、模式、入口集合、承载策略、修改内容、验证模式、观察结论、校验结果和剩余缺口。
- 如果状态是 `awaiting_validation_transcript`，最终响应不能说目标 skill 已验证通过、闭环已完成或可以进入治理交接；必须以要求用户执行人工桥接执行包并回传 transcript、最终报告或阻塞点收尾。
- 用户确认目标 skill 可用后，只建议进入合适的 `arcforge` 治理阶段，例如 scan、audit、merge plan、profile、drift、publish/share plan。
- 不自动执行真实写入、apply、share、push、目标目录覆盖或 registry 动作。

退出条件：用户知道改了什么、验证到什么、还缺什么，以及下一步是否需要 ArcForge 治理。

## Reference 路由

- 能力单元、目标 skill 适配阈值、已有实现承载、CLI/server/UI/状态/schema 选择：读 [references/software-capability-unit.md](references/software-capability-unit.md)。
- skill 写法、用户硬要求固化、渐进式披露、正式来源和工作副本规则：读 [references/skill-authoring-rules.md](references/skill-authoring-rules.md)。
- 隔离执行 prompt、人工桥接、transcript 回放、受限 dry run：读 [references/validation-execution.md](references/validation-execution.md)。
- 验证记录后的问题分类、归因和修复策略：读 [references/iteration-rules.md](references/iteration-rules.md)。
- 最终汇报前的结构、安全、验证和治理检查：读 [references/validation-checklist.md](references/validation-checklist.md)。

## 最终汇报字段

- 目标 skill 路径，正式原始路径，工作副本路径。
- 用户硬要求及其落点。
- 本轮模式、入口集合、候选目标 skill 适配判断。
- 软件能力单元建模结果和承载策略。
- 本轮修改内容。
- 验证任务、验证模式、运行轮次和是否人工桥接。
- 如果已发起人工桥接但未收到回传，说明状态是 `awaiting_validation_transcript`，并再次给出用户需要执行和回传的内容。
- 如果只能做 transcript 回放或受限 dry run，说明原因和客观性限制。
- 主 agent 基于执行记录发现的问题、修复内容和剩余缺口。
- 用户是否确认目标 skill 可用。
- 建议的 ArcForge 下一步和确认要求。
- 校验命令和结果。
