---
name: skillops-skill-first
description: 当用户要求“skill first”“Skill First 开发”“skill 自迭代”“先沉淀成 skill”“把工作模式做成 skill”“新建/更新 skill 后让子代理模拟”“前测/复测 skill”“用真实任务验证 skill”“子代理发现问题后治理 skill”时使用。用于指导 agent 先创建或更新目标 skill，再用子代理模拟真实使用，基于问题报告修订 skill、reference、工具或流程，并在用户确认 skill 可用后引导进入 SkillOps 治理流程。
---

# SkillOps Skill First

使用这个技能运行 Skill First 开发闭环：

```text
先沉淀 skill -> 子代理模拟使用 -> 问题报告 -> 治理 skill、工具或流程 -> 再次模拟
```

目标是把工作模式先沉淀为 skill，再通过另一个 agent 的真实使用反馈让 skill 自迭代。把子代理当成评测面，而不是已经知道正确答案的协作者。

这个 skill 负责 skill 的创建、迭代和验证前段。用户确认新 skill 可用后，它只负责把下一步引导到 SkillOps 的治理入口；审计、正式化、profile、apply、drift、publish 或 share 的具体执行必须遵守 `skillops` skill 的规则。

## 核心规则

1. 先根据当前 agent 和当前项目寻找已有 skill，再决定读取、复制或创建目标 skill。
2. 当前 agent 对应的用户级目录、项目级目录，以及当前会话已加载 skill 列表中的路径，都视为正式 skill 来源。
3. Codex 环境优先检查项目级 `.codex/skills/`、用户级 `~/.codex/skills/`；其他 agent 按其约定检查项目级和用户级目录，例如 Claude 的 `.claude/skills/`、`~/.claude/skills/`，Cursor 的 `.cursor/skills/`、`~/.cursor/skills/`，目录不存在时跳过。
4. 如果目标来自正式 skill，读取原始路径，但不要直接修改；先完整复制到当前项目根目录 `skills/<skill-name>/`，再修改这个工作副本。
5. 如果 `skills/<skill-name>/` 已存在，把它当作本轮工作副本；修改前确认它是否已经包含用户或并发改动。
6. 目标 skill 保持简洁、过程化、可执行。
7. 目标 skill 默认使用用户当前请求语言；用户用中文提出需求时，`SKILL.md`、references 和 `agents/openai.yaml` 文案默认写中文。
8. 只有当用户明确要求英文、双语或指定语言时，才使用其他语言。
9. 当主 `SKILL.md` 变得拥挤时，把可复用细节放到同级一层 `references/` 文件中。
10. 新增 reference 时，必须在目标 `SKILL.md` 中写清楚何时读取它。
11. Skill First 执行默认必须启动子代理做前测和复测；不需要用户额外确认。
12. 传给子代理的是目标 skill 路径和真实任务，不传你的诊断、预期答案或修复思路。
13. 除非测试任务本身要求修改源码，否则要求子代理不要修改源文件。
14. 模拟项目、fixtures、输出文件使用临时路径。
15. 启动子代理前先确认当前环境是否有可用子代理工具；有可用工具时必须真实启动子代理。
16. 只有当前环境没有可用子代理工具，或工具调用失败且无法恢复时，才保存原始子代理 prompt，明确标注为“降级模拟”，并继续做问题分类、治理和复测。
17. `agents/openai.yaml` 不只写默认 prompt，还要同步目标 skill 的关键输出格式、边界规则和语言要求。
18. 把子代理或降级模拟发现的问题转化成具体的 skill、reference、工具或流程修复。
19. 有实质修复后至少再模拟一次，除非用户停止或任务明显很小。
20. 用户确认目标 skill 可用后，自动说明建议进入的 SkillOps 治理阶段，例如 audit、merge plan、profile、apply、drift 或 publish/share plan。
21. SkillOps 交接只做路由和下一步建议；不要在本 skill 中重新实现 SkillOps 的 audit、apply、drift、publish 或 share 逻辑。
22. 不要自动执行真实项目写入、目标目录替换、Git 更新、push、PR、远程分享或 registry 相关命令；这些必须交给 `skillops` workflow 并按其确认规则执行。
23. 可以建议优先从低风险的 SkillOps 阶段开始，例如 scan、audit、merge plan、publish plan 或 share plan；涉及 run、apply、update、push、share 的动作必须先说明范围和风险并等待用户确认。
24. 如果用户只要求完成 Skill First 验证，不要强行推进 SkillOps 后续流程；最终汇报中给出可选的下一步即可。

## 工作流

1. 明确目标 skill 和真实测试任务。
2. 根据当前 agent 搜索正式 skill 来源，并记录原始路径、工作副本路径和是否需要复制。
3. 如果目标是正式 skill，把完整目录复制到当前项目根 `skills/<skill-name>/`；如果没有找到正式 skill，则在该目录下创建新 skill。
4. 读取并更新工作副本中的目标 skill。
5. 运行本地结构检查。
6. 启动子代理，让它使用目标 skill 完成真实任务；只有没有可用子代理能力或工具无法恢复时，才按降级模拟记录执行。
7. 收集子代理报告。
8. 将问题分类为：skill 表述、正式 skill 来源和复制流程、缺少 reference、缺少工具或 CLI 能力、不安全流程、测试环境问题或产品决策。
9. 做范围明确的修复。
10. 使用新的临时路径再次模拟。
11. 当子代理能完成目标路径，或只剩已接受的产品缺口时，向用户确认目标 skill 是否可用。
12. 如果用户确认可用，说明建议进入的 SkillOps 治理阶段和原因；只引导到 `skillops`，不绕过它的确认规则。

## 参考文件

- 需要子代理 prompt 模板时，读取 [references/subagent-prompts.md](references/subagent-prompts.md)。
- 需要问题分类和治理规则时，读取 [references/iteration-rules.md](references/iteration-rules.md)。
- 最终汇报前，读取 [references/validation-checklist.md](references/validation-checklist.md)。
- 当前环境无法启动子代理时，也要读取上述文件，并把 prompt、模拟输出和限制说明保存到临时路径。

## 最终汇报

汇报内容包括：

- 目标 skill 路径
- 正式 skill 原始路径和工作副本路径
- 模拟任务
- 子代理运行轮次
- 发现的问题
- 已做的修复
- 剩余且已接受的缺口
- 用户是否确认目标 skill 可用
- 建议的 SkillOps 下一步，以及是否需要用户确认
- 校验命令和结果
