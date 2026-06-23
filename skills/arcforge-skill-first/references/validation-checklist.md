# Skill First 编排校验清单

最终汇报前使用本清单。目标是确认 `arcforge-skill-first` 只承担编排、验证、观察和治理交接，不重新吞回 skill 创建维护职责。

## 编排边界

- 已明确本轮模式：创建或更新 skill、新领域任务先建 skill、观察已有 skill 执行真实任务、拆分/重构 skill、验证已有修改。
- 已明确入口集合：元入口 `arcforge-skill-first`、目标 skill、辅助入口、创建维护入口 `arcforge-skill-creator`、验证入口、治理入口。
- 没有直接完成真实业务任务；真实任务被路由到目标 skill。
- 没有让 `arckit-tech`、`arckit-code`、`arckit-spec` 等泛化 skill 抢占目标 skill。
- 创建、更新、维护、拆分或修复目标 skill 时，已使用 `arcforge-skill-creator`，没有把它的规则复制回本 skill。
- 如果通用 `skill-creator` 或其他 creator 类 skill 同时适用，已说明它们只作为基础结构、脚本或校验参考。

## 来源和写入边界

- 已记录目标 skill 的正式原始路径、工作副本路径和允许写入边界。
- 如果目标来自正式 skill，未直接修改原始路径。
- 如果 `skills/<skill-name>/` 已存在，已把它当作工作副本并注意用户或并发改动。
- 没有执行 apply、share、push、目标目录覆盖、远程写入或 registry 写入。

## 验证完整性

- 已使用唯一验证路径：人工桥接隔离验证。
- 没有调用平台工具替代人工桥接。
- 没有设计人工桥接失败、无法桥接、用户不愿桥接、平台不允许桥接、transcript 回放或受限 dry run 分支。
- 没有把“当前会话不能直接调用自动代理工具”写成未验证原因。
- 如果使用人工桥接，已给用户人工桥接执行包：目标 skill 路径、工作区、写入边界、临时路径、用户操作步骤、当前状态 `awaiting_validation_transcript`、第一段真实任务 prompt、第二段事后总结 prompt，以及事后总结/必要 transcript/阻塞点回传要求。
- 第一段真实任务 prompt 只包含真实用户会说的任务、必要输入、工作区和写入边界；没有包含验证背景、诊断、观察重点、总结格式、目标 skill 绝对路径或“你是验证执行者”这类测试控制语。
- 第二段事后总结 prompt 只在隔离 agent 完成、阻塞或停在确认请求后发送，用于收集实际触发的 skill、读取文件、命令、路径、用户交互点、错误和阻塞。
- 交付人工桥接执行包后，没有把目标 skill 写成验证通过、闭环完成或可进入 ArcForge 治理交接。
- 隔离执行者没有收到主 agent 的预期答案、诊断、问题分类、修复思路或“判断 skill 是否需要优化”的任务。
- 未收到事后总结、必要 transcript 或阻塞点时，流程状态仍是 `awaiting_validation_transcript`。
- 收到执行记录后，主 agent 自己完成观察、分类和归因；没有直接采纳隔离执行者的修复判断。

## 修复归属

- 如果问题来自目标 skill 的能力单元建模、写法、渐进式披露、用户硬要求固化、metadata 或结构检查，已交回 `arcforge-skill-creator` 修复。
- 如果问题来自人工桥接 prompt、验证状态判断、观察归因或 ArcForge 治理交接，才在 `arcforge-skill-first` 中修复。
- 有实质修复后已准备复测；除非用户停止或只剩已接受的产品缺口。

## ArcForge 交接

- 用户确认目标 skill 可用后，只建议进入合适的 `arcforge` 治理阶段，例如 scan、audit、merge plan、profile、drift、publish/share plan。
- 建议的下一步没有绕过 `arcforge` 的确认规则。
- 如果用户没有要求继续治理，只把 ArcForge 后续作为可选下一步报告。

## 最终回复

包含：

- 目标 skill 路径、正式原始路径和工作副本路径。
- 用户硬要求及其落点。
- 本轮模式、入口集合、候选目标 skill 适配判断。
- `arcforge-skill-creator` 的创建或维护摘要。
- 验证任务、验证模式、运行轮次和是否人工桥接。
- 如果状态是 `awaiting_validation_transcript`，说明用户需要执行第一段真实任务 prompt、完成或阻塞后执行第二段事后总结 prompt，并回传总结、必要 transcript 或阻塞点。
- 主 agent 基于执行记录发现的问题、修复内容和剩余缺口。
- 用户是否确认目标 skill 可用。
- 建议的 ArcForge 下一步和确认要求。
- 校验命令和结果。
