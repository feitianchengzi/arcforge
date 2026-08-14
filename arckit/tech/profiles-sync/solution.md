# 配置组同步方案

## 方案概述

配置组同步方案负责从工作区配置中选择技能，解析维护源推荐和消费端覆盖，把技能应用到用户、项目或用户级按需 catalog，并通过内容与策略比较生成漂移报告。

方案由可用性解析、应用计划、原子复制、用户级 catalog 和漂移比较组成。应用关系、桌面端、CLI 和按需入口 skill 均复用 core 能力，不各自实现策略优先级。

## 配置组选取

系统通过配置组名称查找 `ArcForgeConfig.profiles`。

配置组不存在时，系统抛出 `Profile not found` 错误。

配置组技能列表包含 `*` 时，系统选择全部已发现技能。

配置组技能列表为空时，系统选择空集合。

配置组技能列表包含具体名称时，系统只选择名称完全匹配的技能。

不存在的技能名称不会自动创建结果项。

## 维护源清单

正式 Skill 项目根目录使用 `arcforge.skill-project.json` 保存 `SkillProjectManifest`。该文件属于 Git 跟踪的维护源事实，与用户级 `ArcForgeConfig` 分离。

清单版本为 1，可声明仓库相对 `sourceDir`、项目级 `defaultMode` 和按 skill 路径维护的推荐模式、别名与项目适用性条件。Skill 路径使用相对项目根目录的 POSIX 路径；绝对路径、父目录跳转、重复路径和未命中已发现 skill 的路径产生诊断。

项目适用性条件由自然语言摘要、带稳定 ID 的 `required`、`preferred`、`excluded` 条件、证据指引和澄清问题组成。Core 只校验结构、字符串和 ID 唯一性，不解释条件内容，也不根据文件名、语言、框架或其它预置业务信号判断条件是否满足。

推荐模式是封闭枚举：

- `user-ambient`
- `project-ambient`
- `user-on-demand`

枚举不表达 `project-on-demand`，因此该非法组合不能进入清单、消费端覆盖或应用计划。

清单缺失时工作区保持可扫描。Skill 没有逐项推荐且项目没有默认推荐时产生 `UNCLASSIFIED_SKILL` error，且 availability-aware 计划中的 `effectiveMode` 保持空值。清单语法错误、路径越界或重复路径产生 error，阻止 availability-aware apply，但不阻止用户打开工作区修复清单。

## 消费端覆盖

用户级 `ArcForgeConfig.profiles[].availability` 保存消费端默认和逐 skill 覆盖。该配置仍存储于 `~/.arcforge/projects/<project-key>.json`，不写回维护源 checkout。

本次应用可以传入一次性 `availabilityOverrides`。一次性覆盖只进入本次计划和确认摘要；只有调用方同时保存应用关系时，最终模式和目标历史才进入 `AppliedSourceRecord`。

同一 skill 的最终策略按以下顺序取第一个存在的合法值：

1. 本次调用逐 skill 覆盖。
2. 消费端 profile 逐 skill 覆盖。
3. 消费端 profile 默认模式。
4. 维护源逐路径推荐。
5. 维护源项目默认推荐。
如果五级来源都不存在，解析结果记录 `policyOrigin: unclassified`，不根据 target 参数补造模式。

解析结果记录 `sourceRecommendation`、`consumerOverride`、可选 `effectiveMode` 和 `policyOrigin`。来源推荐与最终策略不同是显式覆盖，不属于 skill 文件内容漂移。Legacy direct target 仍保留独立复制语义，不进入 availability resolver。

## 来源身份

`sourceIdentity` 优先使用规范化 Git remote canonical key 和工作区相对 Git 根目录的子路径。没有 Git identity 时使用本地 realpath。

`sourceKey` 是 `sourceIdentity` 的 SHA-256 前 24 个十六进制字符。它只用于 provenance、应用关系和来源完整性，不建立公共命名空间，不参与 catalog 逻辑身份或目录层级，也不替代 Git remote 作为来源事实。

来源身份变化会产生新的 `sourceKey`，但同名 skill 仍映射到同一个用户级 catalog 逻辑身份。应用计划保留所有来源声明；来源身份变化本身不创建第二个活动副本，也不证明哪个内容更新。

App 或 provider 传入的 payload provenance 可以携带规范化上游 remote、source commit 和 payload version。该 provenance 进入来源声明和版本判断证据；解包目录 realpath 只在没有上游身份时作为来源标识，不把临时或 App 管理路径提升为新的 skill 逻辑身份。

## Skill 逻辑身份与版本

Catalog 逻辑身份是规范化后的 `SkillSummary.name`。规范化使用去除首尾空白后的大小写不敏感比较，安装目录使用已校验的规范名称；同一 catalog 不允许两个不同活动条目共享该身份。

`SkillSummary.version` 来自 `SKILL.md` frontmatter 的 `version`。合法版本使用 Semantic Versioning，并在 availability plan、catalog 来源声明、候选投影和漂移结果中原样携带。版本不从 `installedAt`、文件 mtime、source commit、sourceKey 或路径推导；source commit 只作为 provenance，不提供跨分支的全序关系。

同名输入按以下规则得到一个 catalog 决议：

- 内容摘要相同：合并来源声明和应用关系，活动内容不重复复制。
- 内容摘要不同且两侧版本合法且不相等：选择较高版本；低版本输入记录为 `downgrade-blocked`，不能覆盖活动副本。
- 内容摘要不同且版本相同：记录 `same-version-content-conflict`。
- 内容摘要不同且任一侧没有合法版本：记录 `version-unknown-conflict`。

冲突保留一个逻辑 catalog record 和全部来源声明，状态为 `conflict`。Resolver 对冲突 fail closed。Agent 或用户通过 `CatalogSourceSelection` 显式选择当前计划的传入来源；选择携带 skill、传入 sourceKey、传入内容摘要和选择时观察到的当前 catalog 摘要。Fresh plan 只有在四项证据仍匹配时产生 `source-selected`，否则返回 stale selection 阻断；Core 不用安装时间、目录顺序或来源类型自动裁决。

## 可用性应用计划

`createSkillAvailabilityPlan` 是所有 availability-aware apply 和 drift 的只读入口，返回 `SkillAvailabilityPlan`。

计划输入包括来源、profile、可选 skills、agent targets、project targets、一次性覆盖和可选 `projectAssessments`。计划对每个 skill 记录策略来源、可选最终模式、项目适用性条件、Agent 或用户提供的评估、内容摘要和全部目标，并列出 loader targets、diagnostics 与 cleanup。

`projectAssessments` 是调用方提供的语义决定，不由 core 生成。评估包含状态、决定者、摘要、逐条件结果、证据和未决项。Core 校验 skill 名、condition ID、非空证据、字段结构和目标上下文；相对项目根以 consumer root 为基准规范化。`project-ambient` skill 没有评估或显式人工覆盖时产生待评估诊断，评估为不适合或仍需输入时阻止执行。

保存应用关系时，从已验证的计划项持久化实际采用的 assessment，而不是只保存本次调用参数；因此复用既有 assessment 的 reapply 不会丢失它。自动复用只发生在来源、来源策略摘要、profile、Agent 目标和规范化项目根全部一致时；来源策略变化后必须由 Agent 重新判断或由用户显式覆盖。

目标映射规则为：

- `user-ambient`：每个选中 agent 的用户级原生 skill 目录。
- `project-ambient`：每个选中 agent 与每个项目根目录组成的项目级原生 skill 目录。
- `user-on-demand`：`~/.arcforge/catalog/<skill-name>/`。

未分类、`project-ambient` 没有项目目标、常驻模式没有 agent target、同一来源出现重复 skill 名、别名无法唯一解析、项目适用性未通过或清单含 error 时，计划包含阻塞诊断。包含 error 的计划不能执行。

计划始终返回 `requiresConfirm: true`。Plan 不创建目录、不写 catalog、不安装 loader，也不删除旧目标。

## 目标解析与兼容模式

Availability-aware 目标通过 agent 目录映射和应用计划解析为绝对路径。

CLI 传入单一 `targetDir` 时进入 legacy direct 模式。Direct 模式保留现有复制语义，把选中 skill 视为目标目录中的 ambient 副本，不读取 catalog 目标，也不创建来源策略历史。

桌面端 availability-aware 模式使用 agent target 和 project target 组合。自定义目录仍属于 direct 模式，不被推断为用户级、项目级或按需目标。

归并生成的旧应用关系默认目标路径仍可为 `.arcforge/skills`。首次 availability-aware apply 必须通过来源策略或显式覆盖补齐逐 skill 模式，不能从旧目标路径反向生成来源推荐。

## 已安装 Skill 整理

`scanInstalledSkills` 只输出根目录、skill 元数据、文件摘要、同名分组、插件信息和不可修改标记。

`createInstalledSkillOrganizePlan` 接收调用方显式提供的 decisions。每个 decision 包含 skill 名、canonical path、动作、理由和证据。Core 校验 canonical 与动作路径都来自最新库存、摘要未变化、动作目标位于允许根目录、插件缓存与系统 skill 不可修改，并拒绝循环链接、跨 skill 动作和未确认删除。

没有 decisions 时计划只返回 inventory evidence、内容冲突和 `decision-required` 信息，actions 为空。Core 不维护目录优先级评分，不默认使用 `~/.agents/skills`，也不向所有发现的 Agent 根生成链接。

## 应用配置组

应用操作确保计划中的目标父目录存在。

Availability-aware apply 在写入前重新计算计划，拒绝调用方提交的过期目标集合。`confirm: true` 只授权计划中的新增和替换；删除旧路径还要求 `cleanupPaths` 与新计划 cleanup 精确匹配。

每个选中技能复制到目标目录下以技能名称命名的子目录。目标中已存在同名技能目录时，系统用来源目录替换目标侧旧目录。

复制技能时，系统先复制到目标同级临时目录，复制成功后再替换目标目录。复制失败时，目标侧旧目录保留。

应用结果模型为 `ApplyProfileResult`。Availability-aware 结果包含实际使用的计划、逐目标写入状态、catalog 是否更新和已确认清理路径。

应用关系保存 `sourceKey`、来源策略摘要、每个 skill 的最终模式、策略来源与目标路径。旧关系没有这些字段时仍按 direct 模式读取。

## 共享资产

可用性策略只分类 skill。共享资产不进入用户级按需 catalog，也不由按需入口动态加载。

Availability-aware apply 把共享资产复制到计划中去重后的 ambient 目标根。只有 `user-on-demand` skill 且不存在 ambient 目标时，共享资产标记为 skipped 并说明没有可解析的 ambient 目标。需要按需 skill 使用的资源必须位于该 skill 目录内。

## 用户级按需 Catalog

Catalog 索引固定为 `~/.arcforge/catalog/index.json`，skill 活动副本位于 `~/.arcforge/catalog/<skill-name>/`。

`UserSkillCatalog` v2 条目以规范化 skill 名唯一。`qualifiedName` 保留为兼容字段并等于稳定 catalog 名称，不再编码 sourceKey。条目保存活动版本、活动来源 key、状态、安装路径、内容摘要、别名、简短描述、聚合应用关系 ID 和全部来源声明；每个来源声明保存 sourceKey、来源根、可选 remote/commit、源内路径、版本、内容摘要和自己的应用关系 ID。

同名同内容 skill 被多个来源或 profile 使用时共享一个物理副本，并合并 provenance 与 `appliedRecordIds`。只有最后一个应用关系移除且 cleanup 明确确认后才能删除条目和目录。较低版本来源关系仍保留 provenance，但 reapply 不得使活动副本降级。

目录复制和 index 更新组成一个可回滚提交：先准备同级临时目录，校验内容摘要，再替换 skill 目录并原子替换 index。任一步失败时恢复旧目录和旧索引。

读取 v1 index 时，迁移器按规范化 skill 名聚合条目。摘要相同的条目直接合并；摘要不同的条目使用显式版本规则。无法自动选择时保留现有目录作为 cleanup evidence，写入单一 `conflict` record 并停止 resolver 加载，不静默删除或按 `installedAt` 选择。只要来源声明对应的旧 `<sourceKey>/<skill-name>` 路径仍存在，v1 或 v2 index 的后续计划都会继续把它作为 cleanup candidate；它只通过已确认 cleanup 移除。

## 按需入口与解析

ArcForge 分发一个固定名称的用户级入口 skill。Availability plan 只要包含 `user-on-demand` 项，就为每个选中 agent 生成一个用户级 loader target。入口 skill 本身不进入 catalog。

计划读取固定入口的来源摘要和现有目标，将 loader target 标记为 `missing`、`same`、`managed-update` 或 `conflict`。缺失目标可以新增；内容完全一致的目标可以复用；只有同一用户目录、同一 agent 的已保存 on-demand 应用关系才能证明内容不同的旧入口归 ArcForge 管理并允许升级。其它同名目标产生 `ON_DEMAND_LOADER_CONFLICT` 阻断诊断，ArcForge 不替换未知内容。执行在提交任何目录前再次校验目标仍与计划时的缺失状态或内容摘要一致，避免计划后被替换的入口遭到覆盖。

入口只在用户显式调用后读取 catalog。用户明确给出 catalog 名称、兼容限定名称、skill 名或别名时，入口直接执行 `arcforge catalog resolve`。用户给出任意任务意图时，入口先执行 `arcforge catalog list`，只获取 name、qualifiedName、version、status 和 summary；当前 Agent 根据完整意图做语义适配，选中一个 `qualifiedName` 后再 exact resolve。

Core 不根据任务 prompt 生成关键词、分数或排名，也不把 search 子串匹配伪装成语义选择。`catalog-resolve` exact 模式按 catalog 名称、skill 名、兼容限定名称和别名匹配；不同逻辑 skill 的别名冲突返回 ambiguous。同名来源差异由 catalog 决议处理，不作为多个候选返回。Search 模式只保留为对 name、alias 和 summary 的确定性子串过滤。

List 和 Resolver 只读取 catalog index，不扫描任意目录。List 严格校验 index 结构并返回排序稳定的最小候选，不暴露 sourceRoot、installedPath、contentDigest 或完整 `SKILL.md`。Resolver 只接受 `ready` 条目；返回 resolved 前校验 installedPath realpath 等于 catalog 根内预期的 `<skill-name>` 目录，并重新计算内容摘要。冲突、路径逃逸、索引损坏或内容摘要不一致时停止，不把目标 `SKILL.md` 返回给入口。

Resolver 不执行 skill。入口拿到唯一且已校验的路径后读取 `SKILL.md` 和其明确引用，当前 agent 继续执行并沿用原有权限边界。

## 漂移签名

漂移检查为来源目录和目标目录分别生成目录签名。

目录签名由相对文件路径和 SHA-256 哈希组成。签名生成使用递归文件列表，忽略 `.git`、`node_modules` 和 `dist` 目录。

文件路径使用 POSIX 风格相对路径，保证跨平台展示稳定。

## 内容漂移

目标目录不存在时，漂移项状态为 `missing`，来源目录内所有文件标记为缺失。

来源存在而目标不存在的文件标记为 `missing`。来源和目标都存在但哈希不同的文件标记为 `changed`。目标存在而来源不存在的文件标记为 `extra`。

没有文件级差异时，该项状态为 `same`。存在任一差异时，该项状态为 `changed`。

共享资产以同一逻辑参与漂移检查，并在漂移项中标记为 `asset`。

## 策略漂移

Availability-aware drift 使用与 apply-plan 相同的 resolver 计算当前有效模式和目标，再与 `AppliedSourceRecord.availabilityItems` 比较。

Availability-aware 关系同时保存标准化的 agent targets、project targets、调用覆盖和 homeDir。`applied drift` 与 `applied run` 必须使用这组上下文重算 fresh plan，不从已安装路径猜测目标，也不把 availability 关系降级为 legacy `targetDir` 比较。

来源推荐、消费端覆盖、agent targets 或 project targets 变化导致最终模式或目标集合变化时，结果进入 `DriftReport.policyDrift`。Policy drift 不修改内容 diff，也不移动目录。

策略状态为：

- `same`：记录模式和目标集合与当前计划一致。
- `changed`：最终模式或目标集合不同。
- `unclassified`：维护源、profile 和本次调用均未声明有效模式；该状态阻断写入，不再通过兼容规则推断。

从 ambient 改为 on-demand、从 on-demand 改为 ambient 或改变常驻作用域时，旧路径进入计划 cleanup。Drift 只报告；apply 只有收到精确 cleanup 确认后删除。

当 apply/reapply 要同时更新保存的 availability 关系时，计划中的旧目标必须全部以精确 `cleanupPaths` 得到确认；否则停止保存和写入，避免最新关系覆盖历史目标后丢失后续 cleanup 证据。不保存关系的一次性 apply 仍只处理调用方明确选择的 cleanupPaths。

## 目标根额外项

漂移检查还扫描目标根目录的直接子项。当前来源技能和共享资产集合之外的目标项不会混入某个 skill 的文件级 diff，而是进入 `DriftReport.targetExtras`。

目标根额外项分类为：

- `managed-stale`：名称存在于应用关系历史 managed 集合中，但不在当前来源选择中。
- `uncertain`：目标项是带 `SKILL.md` 的 skill 目录，但不在当前来源选择或历史 managed 集合中。
- `unrelated`：目标项不是当前来源选择，也不是可确认属于当前关系的 skill 目录。

漂移检查只报告分类，不删除目标目录。删除 `managed-stale` 必须由调用方列出具体路径并获得用户确认；`uncertain` 和 `unrelated` 不作为当前来源旧 skill 删除。

## 关联契约

该方案由 `apply-plan`、`apply-run`、`apply-drift` 和 `catalog-resolve` 契约暴露。

CLI 的 `apply plan`、`apply run`、`drift`、`applied drift`、`applied run` 和 `catalog resolve` 命令复用该方案并输出 JSON。Legacy `apply --target` 和 `drift --target` 保留 direct 模式。
