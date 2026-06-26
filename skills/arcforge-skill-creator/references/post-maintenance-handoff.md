# 维护后交接

创建或维护目标 skill 后读取本文件。目标是把工作副本、验证和 ArcForge 治理分开，避免“改完 skill 但不知道下一步”。

## 基本原则

- 当前项目 `skills/<skill-name>/` 通常是工作副本，不自动等于正式维护源。
- 工作副本保留价值：它让业务场景中的 skill 优化先低风险落地、结构校验和必要验证，再决定是否回源。
- 如果当前仓库本身就是正式 Skill 项目，且目标 skill 位于该项目维护源内，可以直接把该路径视为维护源工作区；不要为了规则而额外复制。
- 任何写回维护源、应用到 agent 目录、同步到项目 agent 目录、push、share 或 registry 相关动作，都不在 `arcforge-skill-creator` 内执行，必须交给 `arcforge` 并经用户确认。
- 本地结构校验通过不等于真实隔离执行验证通过；工作副本存在也不等于已经同步回维护源。

## 推荐下一步

`post_maintenance_handoff.recommended_next_step` 只能使用下面四个值：

- `local_experiment_only`：本轮只是当前业务项目里的试验、一次性适配、低风险文案调整，用户没有表达复用或回源意图。
- `verify_with_skill_first`：修改影响触发、流程门禁、确认点、工具调用、复杂交互、状态、CLI/server/UI 承载、人工桥接或真实任务执行路径，需要隔离验证。
- `sync_to_maintenance_source`：修改清楚、低风险，主要是结构、metadata、reference 链接、边界补充或用户明确要求回源，可以进入 ArcForge 正式化、审计、merge plan、drift 或 apply 前准备。
- `verify_then_sync`：修改既有复用价值又存在执行风险，或者用户明确希望优化后的 skill 成为正式能力。先交给 `arcforge-skill-first` 验证，再交给 `arcforge` 做正式化或同步治理。

判断时优先保守：只要改动会改变 agent 做事顺序、写入边界、确认点或工具承载，就不要直接推荐同步；先推荐验证或先验证再同步。

## 结构化输出

最终汇报必须包含：

```yaml
post_maintenance_handoff:
  recommended_next_step: local_experiment_only | verify_with_skill_first | sync_to_maintenance_source | verify_then_sync
  reason: ""
  formal_source_path: ""
  working_copy_path: ""
  maintenance_source_path: ""
  validation_required: true|false
  governance_required: true|false
  arcforge_action_hint: audit | merge-plan | drift | apply | profile | publish-plan | share-plan | none
  user_confirmation_required: true|false
```

字段规则：

- `formal_source_path`：本轮读取到的原始正式来源；未知时写 `unknown`。
- `working_copy_path`：本轮实际修改的路径；如果直接在正式 Skill 项目内维护，写同一个路径并说明原因。
- `maintenance_source_path`：建议回写或正式化的维护源；未知时写 `unknown`，不要猜。
- `validation_required`：只要推荐值包含验证就为 `true`。
- `governance_required`：只要推荐值包含回源、正式化、同步、profile、apply、share 或 publish readiness 就为 `true`。
- `arcforge_action_hint`：只给阶段建议，不执行动作；如果端点不明，优先写 `audit`、`merge-plan` 或 `none`。
- `user_confirmation_required`：需要验证桥接、维护源写入、目标覆盖、保存关系、push、share 或 publish 时为 `true`。

## 给 Skill First 的交接

推荐 `verify_with_skill_first` 或 `verify_then_sync` 时，附加：

- 目标 skill 路径。
- 真实验证任务。
- 工作区。
- 允许写入边界。
- 临时路径建议。
- 已知产品缺口。
- 需要观察的关键行为。

不要在这里声明验证通过；只有收到隔离执行记录并完成观察归因后，才能由 `arcforge-skill-first` 判断验证结论。

## 给 ArcForge 的交接

推荐 `sync_to_maintenance_source` 或 `verify_then_sync` 时，附加：

- 工作副本。
- 正式维护源或候选维护源。
- 应用目标或共享目标；未知时明确写未知。
- 建议阶段：`audit`、`merge-plan`、`drift`、`apply`、`profile`、`publish-plan` 或 `share-plan`。
- 是否需要先审计结构、安全、secrets、metadata 和 skill 写作质量。
- 是否可能需要保存应用关系记录。
- 哪些写入、覆盖、push 或 share 必须由用户确认。

ArcForge 的治理目标是 pre-publish 和 team-governance。交接文案不要把 ArcForge 描述成 marketplace、public registry、search engine、ratings system、paid distribution platform 或 agent runtime。
