# 路线图

SkillOps 会按真实需求推进。`0.x` 系列应该保持很小，只做让当前 local-first 工作流可靠闭环所必需的事情。更大的工作流只有在出现足够真实使用、star、issue 或 PR 时，才值得继续投入维护成本。

这里没有固定日期。star、具体 issue 和有用的 PR，是决定下一步做什么的主要信号。

## 方向

SkillOps 应该继续作为 AI agent skills 的发布前准备和团队治理层：

```text
编写 skill -> 审计 -> 组成 profile -> 应用到目标 -> 检查 drift -> 发布准备
```

它应该保持 local-first 和 GitHub-first。Git 继续作为 review、历史、release 和团队共享的 source of truth。

SkillOps 不应该变成托管 marketplace、公开 registry、公开搜索、评分系统、付费分发平台或 agent runtime。发现、分发和运行时加载已经有 registry 和 installer 负责。SkillOps 负责更早的环节。

## 0.x - 必须的本地工作流

目标：让当前产品在不扩大范围的情况下变得真正可用。

- 保持工作区扫描对文档中的 `skills/` 项目结构可靠
- 保持审计输出足够清楚，可用于共享前检查
- 保持 profile apply 和 drift report 能用于本地 agent 目录
- 保持 publish plan 能作为 GitHub/ClawHub 发布 checklist 使用
- 保持 JSON CLI 足够稳定，可用于轻量 CI 检查
- 根据用户遇到的问题改进 README、示例、截图和故障排查
- 在增加新界面前，优先修 bug 和打磨现有流程

可能进入 `0.x` 的小项，仅在确实需要时做：

- 更安全的 UI 配置编辑
- 更清楚的首次使用和空状态引导
- 针对无效配置、缺失 skills、Git 命令失败、目标写入失败的错误提示
- 最小化的本地已有 skills 导入流程
- 基于真实误报或漏报的小范围审计规则调整

## 1.x - 稳定的个人和小团队使用

目标：让个人开发者或小团队可以依赖 SkillOps，而不需要担心本地项目状态结构频繁破坏。

- 稳定用户级项目状态结构和迁移行为
- 稳定核心 CLI 命令和 JSON 输出结构
- 提供更顺畅的 profile 编辑流程
- 提供更清楚的应用前 diff 和回滚说明
- 改进私有 GitHub 共享和发布准备
- 文档化推荐的 GitHub review 工作流
- 给出与 `skillshare`、`npx skills`、ClawHub/OpenClaw 和 agent 原生 skill 目录的集成建议
- 所有工作流继续不依赖托管 SkillOps 服务

## 2.x - 由需求驱动的扩展

目标：只有在真实用户需求足够明确时才扩展。

候选方向：

- 更完整的 GitHub 自动化，例如 PR 创建、release/tag helper、README/install 区块生成
- 可配置审计规则、suppressions 和 CI annotations
- profile owner、review status，以及由 GitHub 支撑的轻量团队 metadata
- 跨多个本地目标的 drift dashboard
- 面向公开 registry 的发布就绪助手，但 registry 逻辑不进入 SkillOps 核心
- 以 adapter 方式集成 installer，而不是替代 installer

这些都应该是可选层，不应该把 SkillOps 做成 marketplace、registry 或 runtime。

## 除非需求很强，否则不做

- 托管账号或云同步
- 公开 skill 浏览或搜索
- 评分、评论、公开 marketplace 或付费分发
- 完整企业 RBAC
- 通用 prompt library 管理
- agent runtime 执行或激活逻辑

## 反馈信号

项目会优先根据这些信号安排后续工作：

- star，这是判断这个问题是否不只属于我一个人的最简单信号
- 能描述具体 skill 管理流程的 issue
- 能改进 local-first、GitHub-first 工作流且不扩大范围的 PR
- 团队在 Git 中管理 skills 时遇到当前工具缺口的真实例子

如果这些信号很少，SkillOps 就应该继续保持很小。
