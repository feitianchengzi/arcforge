# 产品说明

## 定位

SkillOps 是面向个人开发者和小团队的项目内 AI agent skill 生命周期治理层。

用户默认在项目目录中通过 coding agent 使用 SkillOps。SkillOps skill 编排 CLI 自动化能力，并在工作流需要可视化审阅、结构化选择、编辑或确认时打开桌面 UI。

它帮助用户把 AI agent skills 从个人经验或项目内改进沉淀为团队可用资产：可创建和验证、可审计、可通过 GitHub 版本化、可按项目分组、可应用到本地 agent 目标，并且可以用于团队私有共享或公开发布。

SkillOps 是 skill 生命周期治理层和发布前准备层。它应该位于 GitHub releases、ClawHub/OpenClaw、`skillshare`、`npx skills` 和各类 agent runtime 的上游，而不是替代它们。

## 目标用户

- 同时使用多个 AI coding agent 的个人开发者
- 不想搭建 registry、但需要共享私有 skills 的小团队
- 准备从 GitHub 或 ClawHub 发布 Agent Skills 的开源作者
- 需要在采用 skill 前做轻量 review 和审计的团队

## 非目标

- 托管 marketplace
- 公开 skill registry
- 完整企业 RBAC
- 云同步
- 替代 ClawHub/OpenClaw、`skillshare`、`npx skills` 或 agent 运行时
- 通用 prompt library 管理

## 核心任务

1. 我希望先把一个工作模式沉淀成 skill，并通过子代理真实任务验证它是否可用。
2. 我在当前项目里优化了一个项目内 skill，想先审计它，再决定是否共享或让其他项目采用。
3. 我希望把当前项目里有价值的 skill 归并到可复用的 Skill 项目。
4. 我希望把正式 Skill 项目中的版本应用到另一个项目，并验证是否存在漂移。
5. 我希望把正式 Skill 项目共享到远程 GitHub 或 Git 仓库。
6. 我希望不同项目使用不同的已批准 skill 集合。
7. 我希望队友使用 GitHub 中同一个已 review 的版本。
8. 我想公开发布，但不想泄露内部上下文。
9. 我需要 CLI 支持 CI 检查和 agent 编排。
10. 我希望桌面 UI 在 skill 工作流需要可视化审阅、编辑或批量确认时出现。
11. 我从 GitHub 打开了 skill 项目，希望先知道本地是否落后上游，再决定是否更新。

## MVP 功能

- 扫描 Git workspace 中的 `SKILL.md`
- 提供 `skillops-skill-first`，把工作模式沉淀成 skill，并通过子代理前测和复测验证
- 提供面向 agent 的 SkillOps skill，从当前项目编排 CLI 和桌面工作流
- 审计 skill 的质量和安全风险
- 以文件树方式查看和编辑工作区 `skills/`，并支持按配置组过滤
- 将命名 profile 应用到目标目录
- 报告 profile 源目录与目标目录之间的漂移
- 通过 CLI 优先命令检查并快进更新 GitHub 来源的 skill 项目
- 生成私有/公开发布计划
- 提供 JSON CLI 输出，方便自动化
- 在需要可视化审阅或确认时，把桌面 UI 打开到具体工作流上下文

## 差异化

大多数已有产品关注公开发现、安装、registry 托管或 runtime 集成。SkillOps 关注的是 skill 被项目采用或发布到公开渠道之前的私有生命周期：

```text
创建/迭代 -> 验证 -> 审计 -> 配置组 -> 共享 -> 发布 -> 维护
```

产品坚持 GitHub 优先，因为小团队已经用 GitHub 处理 review、release、issue 和权限。

相邻系统应该被视为分发目标或安装适配器：

- ClawHub/OpenClaw：公开 registry 和生态分发。
- GitHub releases：source of truth、版本和团队 review。
- `skillshare` 和 `npx skills`：安装与同步路径。
- Agent runtimes：执行行为和本地 skill 加载。
