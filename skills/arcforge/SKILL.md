---
name: arcforge
description: 当用户明确要管理 agent skills 的来源、安装、同步、共享、发布准备、profile 归类、漂移检查，或做安全/结构审计时使用。适用于扫描本地 skill 仓库，整理 .codex/.claude/.cursor skills，把已创建并验证过的项目内 skill 归并或正式化到 Skill 项目，维护团队或项目 profile，应用、安装或同步到本地 agent 或项目目标，检查来源与已安装副本漂移，准备 GitHub/ClawHub/OpenClaw 发布清单，或判断相关工作流应走 CLI 还是 Desktop。不要因普通功能开发、bug 修复、业务流程优化、技术栈编码建议、工程实践内容修改，或仅提到 skill、engineering、code、SwiftUI 等词而触发；除非用户关注的是 skill 的来源、安装、同步、共享、发布、安全或治理状态。
---

# ArcForge

使用这个 skill 时，把 ArcForge 理解为本地优先、GitHub 优先的 agent skill 生命周期治理工作台。`arcforge-skill-first` 负责 skill 的创建、迭代和子代理验证；这个 `arcforge` skill 负责接住验证后的治理工作，包括审计、正式化、profile、应用、漂移和发布准备。

ArcForge 不是 marketplace、公共 registry、搜索引擎、评分系统、付费分发平台或 agent runtime。GitHub 是 review、版本、release 和权限控制来源；ClawHub/OpenClaw、`skillshare`、`npx skills` 等是分发或安装相邻系统。

## 原子能力

先识别用户要解决的问题，再从这些原子能力中自行组合流程；不要把它们串成每次都执行的固定链路。

- 发现：扫描当前项目、项目本地 agent skills、共享资产、配置组和 Git 来源状态。
- Skill First 交接：接收 `arcforge-skill-first` 验证通过的 skill，判断下一步应进入审计、正式化、profile、应用、漂移或发布准备。
- 审计：检查 secrets、危险指令、结构和 metadata 风险。
- 配置组：用 profile 组织 skill 集合和目标 agent。
- 正式化：把项目内 skill 归并到正式 Skill 项目。
- 应用：把来源 Skill 项目的 profile 复制到 agent 或项目目标。
- 应用关系：保存、列出、删除、漂移检查和重新应用来源关系。
- 漂移：比较来源 profile 与已安装目标的缺失、变更和额外文件。
- 来源维护：检查 Git checkout ahead、behind、dirty 和 fast-forward 更新；注意 status 检查可能 fetch 并写 Git 元数据。
- 发布准备：生成私有或公开发布 checklist 和安装命令提示。
- Git 共享：计划或执行 GitHub-first 共享、PR、分支或本地交付。
- 环境诊断：检查 Git、CLI shim 和可选分发工具。
- Desktop：在需要选择、编辑、复核 diff、批量目标、共享确认或视觉审查时承载 UI。

## 操作规则

1. 默认把当前工作目录当作项目根目录。
2. 先识别用户当前意图，只执行当前阶段需要的动作；用户没有要求端到端推进时，不自动继续到 merge、apply、drift 或 share。
3. 用户说“当前项目的 skills”时，先判断 skill 来源目录；如果 skill 位于 `.codex/skills`、`.claude/skills`、`.cursor/skills` 等项目本地 agent 目录，`--root` 仍然使用项目根目录，并额外传 `--source-dir <agent-skill-dir>`。
4. 不要默认项目到项目直接复制。用户要复用或同步时，优先先沉淀到正式 Skill 项目，再从正式来源应用到目标项目或 agent 目录。
5. 优先使用 CLI 做可复现执行和 JSON 结果；需要视觉审查、批量选择、文件编辑、冲突检查、完整 diff 复核或共享确认时再转 Desktop。
6. 只有当用户明确要求相关写入阶段时，才按依赖顺序执行：merge 先于 apply，apply 先于 drift，share drift/plan 先于 share run。
7. 真实项目中的写入、Git 更新、push、PR、远程分享、目标目录替换都必须先得到用户明确确认。
8. `apply` 当前没有 `--confirm` 参数，但它会写入目标目录；真实目标上运行前仍必须向用户确认 root、from、profile、target 和覆盖风险。
9. `source status` 可能执行 fetch 并写 `.git/FETCH_HEAD`；在只读审查、子代理前测或禁止改源码场景中，跳过它或只在临时 Git fixture 上运行。
10. 临时验证或子代理模拟必须使用临时项目路径，并设置 `ARCFORGE_HOME=/tmp/...` 或 `/private/tmp/...`，避免写入真实 `~/.arcforge`。
11. 如果 CLI、Desktop 或 agent workflow 需要的能力本地未实现，直接说明缺口，并继续使用可用 fallback。

## 渐进加载

- 用户要理解 ArcForge 产品概念、阶段化治理或端到端路径时，读取 [references/capability-framework.md](references/capability-framework.md)。
- 需要精确 CLI 原子能力、命令顺序、参数语义、确认边界或临时验证命令时，读取 [references/cli-orchestration.md](references/cli-orchestration.md)。
- 需要判断是否打开 Desktop、Desktop 能做什么、或如何把 CLI 结果交给视觉 UI 时，读取 [references/desktop-routing.md](references/desktop-routing.md)。
- 发现 CLI、Desktop 或 agent workflow 缺口时，读取 [references/missing-capabilities.md](references/missing-capabilities.md)，并把缺口作为产品差距报告，不要伪装成已实现。

## 默认输出形状

开始 ArcForge 工作流时，说明：

- 当前项目状态
- 用户当前要处理的阶段或能力
- 选中的 skill 或 profile
- 正式 Skill 项目来源，如果已知
- 目标项目或目标 agent 目录，如果已知
- 远程仓库目标，如果已知
- 下一条 CLI 命令或 Desktop 动作
- 是否需要用户确认

完成一个步骤时，用用户能理解的方式总结结果；除非用户要求 raw output，不要直接粘贴整段 JSON。允许在任何阶段停止并报告下一步，不要默认继续推进。
