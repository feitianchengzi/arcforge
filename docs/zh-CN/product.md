# 产品说明

## 定位

SkillOps 是面向个人开发者和小团队的 GitHub 优先 SkillOps 工作台。

它帮助用户把 AI agent skills 从个人经验沉淀为团队可用资产：可审计、可版本化、可按项目分组，并且可以用于团队私有共享或公开发布。

SkillOps 是发布前和团队治理层。它应该位于 GitHub releases、ClawHub/OpenClaw、`skillshare`、`npx skills` 和各类 agent runtime 的上游，而不是替代它们。

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

1. 我写了一个 skill，想知道它是否适合共享。
2. 我希望不同项目使用不同 skill 集合。
3. 我希望队友使用同一个批准版本。
4. 我想公开发布，但不想泄露内部上下文。
5. 我需要 CLI 在 CI 里做检查。
6. 我希望在应用或共享前，直接在工作台里查看和编辑 skills。

## MVP 功能

- 扫描 Git workspace 中的 `SKILL.md`
- 审计 skill 的质量和安全风险
- 以文件树方式查看和编辑工作区 `skills/`，并支持按配置组过滤
- 将命名 profile 应用到目标目录
- 报告 profile 源目录与目标目录之间的漂移
- 生成私有/公开发布计划
- 提供 JSON CLI 输出，方便自动化

## 差异化

大多数已有产品关注公开发现、安装、registry 托管或 runtime 集成。SkillOps 关注的是 skill 被项目采用或发布到公开渠道之前的私有生命周期：

```text
草稿 -> 审计 -> 配置组 -> 共享 -> 发布 -> 维护
```

产品坚持 GitHub 优先，因为小团队已经用 GitHub 处理 review、release、issue 和权限。

相邻系统应该被视为分发目标或安装适配器：

- ClawHub/OpenClaw：公开 registry 和生态分发。
- GitHub releases：source of truth、版本和团队 review。
- `skillshare` 和 `npx skills`：安装与同步路径。
- Agent runtimes：执行行为和本地 skill 加载。
