# 校验清单

最终汇报前使用本清单。

## Skill 结构

- `SKILL.md` 有 YAML frontmatter，并包含 `name` 和 `description`。
- `description` 同时说明 skill 做什么、什么时候使用。
- `SKILL.md`、references、`agents/openai.yaml` 的主要文案语言与用户当前请求语言一致，除非用户明确指定其他语言。
- 正文使用直接的过程化指令。
- references 位于 skill 目录下一层。
- 每个 reference 都在 `SKILL.md` 中有明确读取条件或入口。
- 没有添加 README、changelog 或无关文档。
- `agents/openai.yaml` 的 default prompt 提到 `$skill-name`。
- `agents/openai.yaml` 的 default prompt 同步了关键输出格式、边界规则和语言要求。
- `agents/openai.yaml` 的 default prompt 使用 `$arcforge-skill-first`，并说明验证通过后只引导进入 `arcforge` 治理流程。
- 如果目标来自正式 skill，已记录原始路径，并且只修改当前项目根 `skills/<skill-name>/` 工作副本。
- 当前 agent 对应的用户级目录和项目级目录已检查；不存在的目录已跳过而不是硬失败。

## 前测完整性

- 子代理收到了目标 skill 路径和真实任务。
- 子代理没有收到你的预期答案或诊断。
- 子代理 prompt 明确要求创建或更新 skill 时使用用户当前请求语言。
- 有可用子代理工具时已真实启动子代理，没有把用户额外确认作为前置条件。
- 启动子代理前已确认当前环境是否有可用子代理工具；不可用时记录了检查结果。
- 只有没有可用子代理工具，或工具调用失败且无法恢复时，才走降级模拟。
- 如果无法启动子代理，已保存原始 prompt，并明确标注为降级模拟。
- 复测使用了新的临时路径。
- 复测验证的是更新后的 skill，而不是旧假设。
- 子代理完成后已关闭。

## 安全性

- 破坏性、远程、凭证相关或大范围写入操作需要确认。
- 临时模拟尽量避免写入真实用户级状态。
- 不直接修改用户级或项目级正式 skill 原始路径；需要修改时先复制到当前项目根 `skills/`。
- 工作流说明了认证、沙箱或依赖缺口出现时怎么处理。
- 在 shell 命令中检查 `$skill-name` 时使用单引号或转义，避免 `$` 被 shell 展开。
- 没有 revert 用户已有修改。

## ArcForge 交接

- 用户确认目标 skill 可用后，已说明建议进入哪个 ArcForge 治理阶段。
- 建议的下一步没有绕过 `arcforge` skill 的规则。
- 没有在 Skill First 流程里自动执行真实项目写入、目标目录替换、Git 更新、push、PR、远程分享或 registry 写入。
- 对 apply、merge run、source update、share run 等写入动作，已明确需要交给 `arcforge` 并等待用户确认。
- 如果用户没有要求继续治理，只把 ArcForge 后续作为可选下一步报告。

## 最终回复

包含：

- 创建或更新了哪个 skill
- 正式 skill 原始路径和工作副本路径
- 运行了哪些子代理模拟
- 首轮发现了什么问题
- 做了什么修复
- 复测结果如何
- 用户是否确认目标 skill 可用
- 建议的 ArcForge 下一步和确认要求
- 运行了哪些校验，或为什么不能运行
