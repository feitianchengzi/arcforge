---
name: skillops
description: 当用户在项目目录中想审计项目本地 SKILL.md、搭建或完善本地 skill 治理能力、沉淀正式 Skill 项目、同步到其他项目或 agent 目标、检查漂移、准备 GitHub/远程分享，或判断 SkillOps 工作流应走 CLI 还是 Desktop 时使用。
---

# SkillOps

使用这个 skill 时，把 SkillOps 理解为本地优先、GitHub 优先的 agent skill 治理工作台。它服务于一组可以独立使用、也可以按需组合的能力面：

- 发现本地 skill 仓库和项目本地 agent skills。
- 审计 skills 是否适合团队共享或公开发布前准备。
- 把可复用 skill 沉淀到正式 Skill 项目。
- 用 profile 组织项目或团队需要的 skill 集合。
- 把 profile 应用到本地 agent 或项目目标。
- 检查正式来源和已安装副本之间的漂移。
- 生成 GitHub、ClawHub/OpenClaw 等发布准备清单和命令提示。

不要把这些能力串成默认推进的固定链路。用户可能只需要扫描、审计、计划、漂移检查、正式化、应用、分享准备或产品能力建设中的任一阶段。

SkillOps 的产品边界是 local-first、GitHub-first。不要把它描述成 marketplace、公共 registry、评分系统、付费分发平台或 agent runtime。

## 操作规则

1. 默认把当前工作目录当作项目根目录。
2. 先识别用户当前意图，只执行当前阶段需要的动作；不要因为存在端到端能力路线就自动推进到 merge、apply、drift 或 share。
3. 如果 skill 位于 `.codex/skills`、`.claude/skills`、`.cursor/skills` 等项目本地 agent 目录，`--root` 仍然使用项目根目录，并额外传 `--source-dir <agent-skill-dir>`。
4. 不要默认把项目本地 skill 直接复制到另一个项目；用户要复用或同步时，优先先沉淀到正式 Skill 项目，再从正式来源应用到目标项目或 agent 目录。
5. 优先使用 CLI 做可复现执行和 JSON 结果；需要视觉审查、批量选择、冲突检查或 diff 复核时再转 Desktop。
6. 只有当用户明确要求相关写入阶段时，才按依赖顺序执行：merge 先于 apply，apply 先于 drift。
7. 真实项目中的写入、Git 更新、push、PR、远程分享、目标目录替换都必须先得到用户明确确认。
8. `apply` 当前没有 `--confirm` 参数，但它会写入目标目录；真实目标上运行前仍必须向用户确认 root、from、profile、target 和覆盖风险。
9. 临时验证或子代理模拟必须使用临时项目路径，并设置 `SKILLOPS_HOME=/tmp/...` 或 `/private/tmp/...`，避免写入真实 `~/.skillops`。
10. 如果 Desktop context routing、target resolver、project init 等能力本地未实现，直接说明缺口，并继续使用可用 CLI fallback。

## 工作流选择

- 用户要围绕产品能力建设、阶段化治理或端到端路径搭框架时，读取 [references/capability-framework.md](references/capability-framework.md)。
- 需要精确 CLI 顺序、确认边界、临时验证命令时，读取 [references/cli-orchestration.md](references/cli-orchestration.md)。
- 需要判断是否打开 Desktop 或如何交接视觉审查时，读取 [references/desktop-routing.md](references/desktop-routing.md)。
- 发现 CLI、Desktop 或 agent 结果缺口时，读取 [references/missing-capabilities.md](references/missing-capabilities.md)，并把缺口作为产品差距报告，不要伪装成已实现。

## 默认输出形状

开始 SkillOps 工作流时，说明：

- 当前项目状态
- 用户当前要处理的阶段或能力
- 选中的 skill 或 profile
- 正式 Skill 项目来源，如果已知
- 目标项目或目标 agent 目录，如果已知
- 远程仓库目标，如果已知
- 下一条 CLI 命令或 Desktop 动作
- 是否需要用户确认

完成一个步骤时，用用户能理解的方式总结结果；除非用户要求 raw output，不要直接粘贴整段 JSON。允许在任何阶段停止并报告下一步，不要默认继续推进。
