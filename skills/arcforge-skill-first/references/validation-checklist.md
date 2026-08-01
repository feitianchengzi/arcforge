# Skill First 编排校验清单

最终汇报前使用。确认 `arcforge-skill-first` 只承担编排、验证、观察和治理交接，没有把动态语义判断错误下沉到固定代码或固定业务规则。

## 编排边界

- 已明确模式、目标 skill、辅助能力、创建维护入口、验证入口和治理入口。
- 候选是否匹配由 Agent 根据领域、工作流、输入输出与不确定性处理判断，没有业务 skill 黑白名单。
- 创建、更新、维护、拆分或修复已交给 `arcforge-skill-creator`。
- 真实业务任务由目标 skill 执行，Skill First 没有越权完成。

## 来源和写入

- 已记录安装/可见副本、维护源证据、工作副本和允许写入边界。
- 没有凭用户级、项目级或 plugin 路径推断正式维护源。
- 没有执行 apply、share、push、目标覆盖、远程写入或 registry 写入。

## 验证通道

- 已按运行时能力依次评估原生隔离 agent/sub-agent、runner/harness 和人工桥接 fallback。
- 通道满足上下文隔离、目标工作副本绑定、工作区/写入限制和结构化报告要求。
- 通道选择和验证控制信息没有泄漏进真实任务 prompt。
- 真实任务 prompt 只包含真实任务、自然输入、工作区和写入边界；没有诊断、观察点、失败模式、验收口径、总结格式或指定内部实现形态。
- 实际读取的目标 skill 路径与预期一致；不一致时结论是 `validation_binding_failed`。
- 自动异步通道在结果返回前保持 `awaiting_validation_result`；人工桥接在回传前保持 `awaiting_validation_transcript`。
- 人工桥接作为 fallback 时包含两段式 prompt、环境绑定说明、用户步骤与回传要求。
- 所有通道的报告都覆盖任务理解、skill 与路径、文件/reference、命令/工具、读写路径、问答、首个失败或确认点、原始错误、预期写入点和最终结果。
- 执行者只报告事实；观察、问题分类和修复判断由主 Agent 完成。

## 修复与复测

- 能力建模、契约、metadata 或结构问题交回 `arcforge-skill-creator`；通道协议、prompt 污染和状态问题才在本 skill 修复。
- 有实质修复后，用新临时路径和同一任务语义复测；修复点没有进入 prompt。
- 等待状态没有被写成验证通过、闭环完成或可治理。

## 交接与最终回复

- 说明目标路径、维护源证据、工作副本、用户要求落点、模式和入口集合。
- 说明 creator 维护摘要、验证任务、所选通道、运行轮次、绑定结果、观察结论和剩余缺口。
- 若仍在等待，清楚说明等待的结果或用户回传动作。
- 只有收到有效执行记录并完成归因后才给验证结论。
- ArcForge 后续只建议合适的 scan、audit、merge plan、profile、drift、publish/share plan，并保留确认规则。
