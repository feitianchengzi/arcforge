# Agent Skill 接口

## 功能概述

Agent Skill 接口是 ArcForge 面向 coding agent 的默认交互入口。用户位于当前项目目录时，可以通过 ArcForge skill 调用 CLI 和按需进入桌面端，完成项目内 skill 的审计、正式化、跨项目应用、漂移检查和远程共享。

ArcForge skill 在当前项目根目录的 `skills/arcforge/` 下维护。该 skill 是产品自举资产，用于沉淀 ArcForge 自身的 agent 使用方式，并作为后续 CLI 与桌面端优化的场景基准。

## Agent 与确定性执行层职责边界

ArcForge 把事实采集、来源数据、运行时语义判断和写入执行分成四个边界清晰的层次。

- 确定性核心采集路径、Git、文件摘要、来源关系、目标能力和现有目录状态，并负责 schema 校验、路径安全、冲突检测、事务、回滚和漂移比较。
- Skill 项目在仓库内维护可版本控制的数据结构。数据可以包含自然语言条件、证据指引和维护者推荐，但不要求代码理解具体业务领域。
- Agent 在当前任务和项目上下文中解释维护源数据，分析项目适用性、维护源角色、canonical owner、清理条件、验证方式和发布准备要求。Agent 输出结论、证据、不确定项和需要用户确认的选择。
- CLI 与 Desktop 只执行已显式确定的计划。执行层校验计划引用的路径、摘要、来源证据和确认状态，不重新推断业务语义。

没有足够证据时，系统返回未分类、候选或待判断状态。目录名称相同、内容摘要相同、目录中存在 `SKILL.md` 或用户选择了某类目标，都不能单独证明维护源角色、canonical ownership、临时副本属性或项目适用性。

根目录 `arckit` 是 ArcForge 项目明确保留的规格资产目录，工作区通用发现默认忽略该目录。安装器推荐 `arckit` 与 `arckit-code` 是 ArcForge 自带的产品示例和维护者推荐，不作为从任意仓库动态推断推荐项目的通用规则。

## 最小闭环

Agent Skill 第一阶段只覆盖一个闭环：用户在当前项目中维护了项目内 skill，并希望把它同步到其他项目，再共享到远程仓库。

该闭环包含四个角色：

- 当前项目：项目内 skill 的产生地和编辑地。
- 正式 Skill 项目：可复用 skill 的来源项目。
- 目标项目：消费正式 Skill 项目的其他项目。
- 远程仓库：用于团队 review、共享和发布准备的 GitHub 或 Git 仓库。

默认路径是：

```text
当前项目内 skill -> 审计 -> 归并到正式 Skill 项目 -> 应用到目标项目 -> 漂移检查 -> 共享正式 Skill 项目到远程仓库
```

系统默认不把当前项目内 skill 直接复制到其他项目。跨项目同步必须优先经过正式 Skill 项目，除非用户明确要求一次性临时复制并接受不会形成持久来源关系。

## 同步到其他项目

当用户要求把当前项目内 skill 同步到其他项目时，Agent Skill 先扫描当前项目，识别可用 skills、配置组和已保存的应用关系。

当项目内 skill 存放在 `.codex/skills` 等 agent 目录中时，Agent Skill 保持当前项目为工作区根目录，并使用 CLI 的 `--source-dir` 指定该 agent skill 目录。

用户选择或系统识别目标 skill 后，Agent Skill 执行审计，并说明严重风险、警告和是否适合继续归并。

当当前项目已经保存应用关系时，Agent Skill 优先把对应来源 Skill 项目作为正式 Skill 项目。没有明确来源时，系统要求用户选择一个本地或远程 Skill 项目作为正式来源。

Agent Skill 使用归并计划说明目标路径、新增项、一致项和冲突项。存在冲突时，流程停止在冲突审阅环节；无冲突时，用户确认后系统执行归并。

归并目标路径表示正式 Skill 项目中的父级目录。系统会在父级目录下追加 skill 名称，因此 `project-showcase-video` 的标准归并目标是 `skills`，不是 `skills/project-showcase-video`。

归并完成后，Agent Skill 从正式 Skill 项目把配置组应用到目标项目的 agent skill 目录或自定义目标目录。应用完成后，系统立即执行漂移检查，并说明目标项目是否与正式来源一致。

## 共享到远程仓库

当用户要求共享到远程仓库时，Agent Skill 先确认共享对象是正式 Skill 项目。

如果用户当前只维护了项目内 skill，系统先要求完成归并，把项目内 skill 收敛到正式 Skill 项目。

Agent Skill 从正式 Skill 项目生成发布或共享计划。核心提供文件、manifest、远端、权限和集成事实；Agent 基于这些事实生成 readiness、安装命令候选、检查项、证据与未知项。共享交付方式仍受目标和权限事实约束。

远程写入必须由用户显式确认。确认内容包含远程仓库、配置组、技能列表、目标路径模式、分支、提交信息、交付方式和是否创建 Pull Request。

共享执行完成后，Agent Skill 返回分支、提交、推送、Pull Request 链接和失败恢复入口。

## Skill 结构

ArcForge skill 使用一个主 skill，而不是多个分散 skill。主文件 `skills/arcforge/SKILL.md` 保存通用规则和 workflow 选择，详细流程放在同级 `references/` 文件中。

该结构避免用户和 agent 在审计、归并、应用、漂移和共享之间选择多个入口。后续如果某个场景形成独立、稳定且高频的工作流，可以再从 reference 中拆分为独立 skill。

## Skill First 能力模型

Skill First 是 ArcForge 中用于创建、更新和验证 agent skill 的前段工作方式。它不替代 ArcForge 的审计、归并、配置组、应用、漂移和共享治理，也不自动串联执行 ArcForge 工作流。

Skill First 把 skill 视为 Agent 面向任务的能力入口，而不是单纯的 Markdown 文档目录。Agent 先判断它属于知识、方法、内容、工具集成、软件支撑还是混合能力；目标 skill 可以只包含 `SKILL.md` 和引用文件，也可以按真实需要组合 CLI、API/MCP、server、UI、脚本、状态、schema、测试 fixture 和回传机制。

用户提出一个任务时，Agent Skill 先识别该任务需要哪些 skill 入口。任务需要多个 skill 时，系统说明主 skill、辅助 skill、验证 skill 或治理 skill 的分工，并逐个定位目标 skill 来源。CLI、server、UI、MCP、脚本和内部服务不作为绕过 skill 的并行入口，它们属于某个目标 skill 的实现承载或依赖。

目标 skill 的来源定位优先于实现建模。系统先检查当前 agent 的用户级目录、项目级目录、会话已加载 skill 路径、Git 信息、来源清单和已保存应用关系。发现的路径先作为观察到的副本；只有来源清单、应用关系、Git 证据或用户确认能够证明时，Agent 才把它认定为维护源。需要修改已安装副本时，Agent 在用户授权的工作区中选择工作副本位置，不把当前项目根 `skills/<skill-name>/` 当作所有场景的固定位置。

工作副本读取完成后，系统判断目标 skill 的最小完整能力形态。判断内容包括交互入口、执行层、状态层、UI handoff、结构化回传、测试方式和治理边界。实现承载可能已经存在于当前项目、其他仓库、CLI、server、Desktop/Web UI、MCP、脚本、内部服务、schema 或 fixture 中。当前 skill 目录没有某项实现时，系统不直接判定实现缺失；上下文不足且存在重复建设风险时，系统向用户索要路径、仓库、服务、命令、UI、MCP 或数据模型入口。

Skill First 可以借鉴通用 `skill-creator` 的命名、frontmatter、目录结构、`scripts/references/assets` 资源组织和基础校验规则，但不会停留在标准 skill 文件夹或资源清单层。Agent 先判断目标能力是知识、研究、内容、设计、软件执行、运营协作还是混合类型，再选择必要的承载。Skill First 使用真实任务和隔离执行反馈验证目标 skill 是否作为能力入口可用，并把发现的问题转化为 skill 文案、reference、必要实现承载、状态模型、UI handoff、回传机制或流程修复。

隔离验证使用统一的任务、环境、证据和回传契约。Agent 根据当前平台能力和用户约束选择平台原生隔离 Agent、外部 runner 或人工桥接；人工桥接是稳定 fallback，不是唯一执行方式。

Skill First 完成目标 skill 验证后，只说明建议进入的 ArcForge 治理阶段，例如 scan、audit、merge plan、profile、apply、drift 或 publish/share plan。ArcForge 治理动作仍由 ArcForge skill 按确认规则执行。

## Skill 写作质量模型

Skill First 把目标 skill 定义为可复用的执行契约，而不是一次对话的纠错记录。目标 skill 描述同类任务中的稳定工作方式，并让新的 agent 在没有隐藏上下文的情况下重复执行。

目标 skill 的 `description` 承担触发层职责。它描述使用时机、适用范围、不适用场景、相邻 skill 的边界，以及该 skill 在元入口、目标 skill、辅助入口、验证入口或治理入口中的角色。

目标 skill 的正文承担执行层职责。正文从 skill 已经被正确触发的前提出发，说明输入如何理解、上下文如何收集、步骤如何推进、何时澄清、如何验证、如何输出和如何交接。

用户反馈、纠错和失败复盘不会以原始口吻进入通用 skill。系统先把这些反馈抽象成正向规则，例如输入检查、澄清条件、输出约束、验证步骤或交接边界，再写入目标 skill。

执行型 skill 正文不解释它与其他 skill 的差异。相邻 skill 的差异、触发优先级和不触发场景前移到 `description`、Skill First 的路由判断或上层入口分工中。正文不使用“先用 A / 不用 B / 与 C 的区别”来补救触发层不清晰。

安全、权限、产品方向和破坏性操作边界属于硬边界，可以使用明确禁止语句。普通执行流程使用正向步骤描述，不依赖纠错式否定语句表达工作方法。

当目标 skill 出现边界后置、纠错泄漏、业务耦合或正文负向补救时，Skill First 将其归类为可修复的 skill 质量问题，并通过更新 `description`、正文、reference、`agents/openai.yaml` 或实现承载来修正。

## CLI 能力分工

CLI 是 Agent Skill 的结构化执行层。当前闭环复用已有命令：扫描、审计、应用关系、归并计划、归并执行、配置组应用、漂移检查、发布计划、共享计划、共享执行和来源状态检查。

Agent Skill 默认对无副作用查询使用 CLI。扫描、审计、应用关系列表、归并计划、漂移检查、发布计划和共享计划属于默认可执行查询。

Agent Skill 对写入、替换目标目录、归并执行、Git 更新、推送分支和创建 Pull Request 的动作要求显式确认。

Agent Skill 串联写入步骤时必须顺序执行。归并完成前不应用到目标项目，应用完成前不执行漂移检查。

当前闭环暴露出的 CLI 优化方向包括当前项目分类、目标 agent 目录解析、最小闭环计划命令和更适合 agent 摘要的结果字段。

## Desktop 能力分工

桌面端保留已有能力，不做缩减。桌面端在当前闭环中承担本地 UI 层：查看和编辑技能文件、审阅审计结果、选择目标、查看完整漂移差异、审阅共享计划和查看执行结果。

Agent Skill 在信息密度高、需要人工选择或需要可视化审阅时建议进入桌面端。桌面端不是默认起点，也不替代 CLI 执行层。

当前闭环暴露出的桌面端优化方向包括从 Agent Skill 打开到指定项目、指定页面和指定 workflow context，并在桌面端和 agent 对话之间保持同一份扫描、漂移或共享计划上下文。

## 缺口与补充

Agent Skill 当前可以通过已有 CLI 串联最小闭环，但缺少三个关键补充能力。

第一，当前项目分类能力。系统需要稳定判断当前目录是普通项目、Skill 项目、单 skill 目录还是目标项目，并推荐下一步。

第二，目标解析能力。系统需要把“同步到某项目的 Codex/Claude/Cursor skill”解析为安全的目标目录，减少用户手写隐藏目录路径。

第三，桌面端上下文调度能力。系统需要稳定命令或 deep link，把桌面端打开到项目、页面、skill、profile、来源和目标上下文。

这些缺口不阻断最小闭环。缺口存在时，Agent Skill 继续使用已有 CLI 命令，并向用户说明需要手动提供的目录、页面或确认信息。

## 成功标准

用户能够在当前项目目录中通过 ArcForge skill 完成项目内 skill 的审计、归并、应用、漂移检查和远程共享准备。

用户能够把一个项目内 skill 收敛到正式 Skill 项目，并从该正式来源同步到至少一个其他项目。

用户能够从正式 Skill 项目生成共享计划，并在确认后共享到远程仓库。

Agent Skill 能够明确说明何时使用 CLI、何时建议打开桌面端，以及当前缺少哪些上下文路由或目标解析能力。
