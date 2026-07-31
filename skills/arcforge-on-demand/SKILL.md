---
name: arcforge-on-demand
description: 仅当用户显式要求从 ArcForge 用户级按需 catalog 加载或查找 skill 时使用。适用于用户给出 skill 名称、限定名称或别名并要求加载，或明确要求在 ArcForge 按需 catalog 中搜索适合当前任务的 skill。不要因普通业务任务、相似语义、catalog 中的描述或可能存在合适 skill 而主动触发；本入口只解析并加载一个已由 ArcForge 校验的 skill，不负责安装、同步、漂移修复、catalog 治理或替代目标 skill 执行任务。
---

# ArcForge On Demand

本入口把用户一次明确的按需调用解析为一个已校验的 catalog skill，再由当前 agent 按目标 skill 的完整指令继续当前任务。

## 硬约束

- 只处理用户本轮明确提出的加载或 catalog 搜索意图；不替用户判断日常任务是否应该使用按需 skill。
- 只调用 `arcforge catalog resolve`，不扫描 catalog 之外的目录，不枚举任意用户文件，也不把整个 catalog 内容加入上下文。
- 一次只加载一个唯一解析的 skill。存在多个候选时停止并请用户选择限定名称，不按目录顺序或主观相关性代选。
- 解析结果只授权读取目标 skill 指令，不提升权限。目标 skill 后续需要的文件、网络、外部写入或破坏性动作继续遵守当前系统、项目和工具确认边界。
- 本入口不执行安装、apply、cleanup、drift、share、push 或 registry 写入。

## 主流程

### 1. 确认显式调用

输入：用户本轮消息。

动作：

- 用户给出名称、别名或限定名称并要求加载时，选择 exact 解析。
- 用户明确要求在 ArcForge 按需 catalog 中查找候选时，选择 search 解析。
- 缺少查询词时，只询问要加载或查找的 skill，不自行从当前任务推测。

退出条件：查询词和解析模式唯一明确；否则停止等待用户补充。

### 2. 解析 catalog

Exact 模式执行：

```text
arcforge catalog resolve --query <名称、别名或限定名称>
```

Search 模式执行：

```text
arcforge catalog resolve --query <用户明确提供的搜索词> --mode search
```

只消费命令返回的结构化结果：

- `not-found`：说明用户级 catalog 中没有匹配项，并建议先通过 ArcForge 应用包含该 skill 的 profile。
- `ambiguous`：仅展示返回的名称、限定名称、来源 key 和摘要，请用户明确选择一个限定名称后重新 exact 解析。
- 命令失败或报告 catalog 损坏、路径逃逸、内容漂移：停止加载，原样保留错误类别，并建议执行 ArcForge drift 或重新 apply。
- `resolved`：进入下一步。

退出条件：获得唯一且已校验的 `resolved.installedPath`；其它状态均不加载目标 skill。

### 3. 加载一个目标 skill

输入：resolver 返回的唯一条目。

动作：

1. 完整读取 `<resolved.installedPath>/SKILL.md`。
2. 确认读取路径与 resolver 返回路径一致，不使用同名用户级、项目级或其它目录副本替代。
3. 按目标 `SKILL.md` 的 reference 路由，只读取完成当前任务明确需要的引用；不递归加载未被目标 skill 指向的其它 catalog skill。
4. 把目标 skill 作为当前任务的工作流契约继续执行。目标指令与更高优先级指令冲突时遵守更高优先级边界并报告冲突。

退出条件：目标 `SKILL.md` 已完整读取并开始按其流程处理当前任务，或因读取/权限/指令冲突停止并报告。

## 最终汇报

在正常任务结果之外，简要包含：

- 已解析的 `qualifiedName` 和实际读取路径。
- 使用的解析模式：exact 或 search。
- 如果没有加载，说明状态是 not-found、ambiguous、catalog error、读取失败还是权限/指令冲突。
