# 产品说明

## 定位

SkillOps 是面向个人开发者和小团队的 GitHub 优先 SkillOps 工作台。

它帮助用户把 AI agent skills 从个人经验沉淀为团队可用资产：可审计、可版本化、可按项目分组，并且可以从 GitHub 发布。

## 目标用户

- 同时使用多个 AI coding agent 的个人开发者
- 不想搭建 registry、但需要共享私有 skills 的小团队
- 从 GitHub 发布 Agent Skills 的开源作者
- 需要在采用 skill 前做轻量 review 和审计的团队

## 非目标

- 托管 marketplace
- 完整企业 RBAC
- 云同步
- 替代 `skillshare`、`npx skills` 或 agent 运行时
- 通用 prompt library 管理

## 核心任务

1. 我写了一个 skill，想知道它是否适合共享。
2. 我希望不同项目使用不同 skill 集合。
3. 我希望队友使用同一个批准版本。
4. 我想公开发布，但不想泄露内部上下文。
5. 我需要 CLI 在 CI 里做检查。

## MVP 功能

- 扫描 Git workspace 中的 `SKILL.md`
- 审计 skill 的质量和安全风险
- 将命名 profile 应用到目标目录
- 报告 profile 源目录与目标目录之间的漂移
- 生成私有/公开发布计划
- 提供 JSON CLI 输出，方便自动化

## 差异化

大多数已有产品关注发现、安装和同步 skills。SkillOps 关注的是从创建到采用之间的生命周期：

```text
草稿 -> 审计 -> 配置组 -> 共享 -> 发布 -> 维护
```

产品坚持 GitHub 优先，因为小团队已经用 GitHub 处理 review、release、issue 和权限。
