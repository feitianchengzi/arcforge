# SkillOps

[English](../../README.md)

面向个人开发者和小团队的 GitHub 优先 SkillOps 工作台。

SkillOps 帮你把个人写的 AI Agent Skills 变成可复用的团队资产。它同时提供桌面端和 CLI，用于从 Git 仓库中审计、分组、同步和发布 Agent Skills。

## 为什么需要

AI agent skill 很容易写出来，但不容易运营起来。

个人和小团队通常会遇到这些问题：

- skills 分散在不同 agent 的目录里
- 团队不知道哪个版本是批准过的
- 公开发布时可能泄露内部信息
- 风险指令很难在 review 时被发现
- 不同项目的 skill 组合会逐渐漂移

SkillOps 关注的是 skill 初稿之后的工作流：

```text
编写 skill -> 审计 -> 按项目配置组分组 -> 团队共享 -> 从 GitHub 发布 -> 监控漂移
```

## MVP 范围

- Electron + React + TypeScript 桌面应用
- 桌面端和 CLI 共享 TypeScript core
- 本地扫描 `skills/**/SKILL.md`
- 针对常见风险做安全和质量审计
- 使用项目配置组将 skill 集合应用到目标目录
- 检查源 skills 与目标项目之间的漂移
- 生成 GitHub 优先的发布计划、安装命令和检查清单
- 提供 CLI，方便 CI 和自动化使用

项目当前不内置托管 registry。GitHub 是 source of truth。

## 快速开始

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
npm start
```

打安装包：

```bash
npm run package:mac:x64
npm run package:mac:arm64
npm run package:win:x64
npm run package:linux:x64
```

安装包基础信息统一在 `app.manifest.json` 中管理，包括 `appId`、
`packageName`、`productName`、`version` 和各平台安装包目标。打包配置通过
以下命令生成：

```bash
npm run package:config
```

GitHub Actions 中也提供了手动触发的 `Manual Package` workflow，会分别生成
macOS Intel、macOS Apple Silicon、Windows 和 Linux 构建产物。workflow
输入主版本号和次版本号后，会根据已有 tag 自动递增补丁版本号，创建 `vX.Y.Z`
tag，并把安装包发布到 GitHub Releases。

构建后的 CLI：

```bash
npm run build
node dist/cli/index.js scan --root .
node dist/cli/index.js audit --root .
node dist/cli/index.js publish-plan --root . --visibility public
```

## 工作区结构

SkillOps 期望仓库结构如下：

```text
my-skills/
  skillops.config.json
  skills/
    code-review/
      SKILL.md
      references/
      scripts/
    release-writer/
      SKILL.md
```

初始化配置：

```bash
skillops init --root .
```

配置示例：

```json
{
  "version": 1,
  "sourceDir": "skills",
  "teamRepo": "github.com/acme/team-skills",
  "profiles": [
    {
      "name": "frontend",
      "description": "Frontend projects use these skills.",
      "skills": ["code-review", "release-writer"],
      "targets": ["claude", "codex", "cursor"]
    }
  ]
}
```

使用 `"skills": ["*"]` 可以包含所有发现的 skills。

## CLI

```bash
skillops init [--root <dir>]
skillops scan [--root <dir>]
skillops audit [--root <dir>]
skillops publish-plan [--root <dir>] [--visibility private|public]
skillops drift [--root <dir>] [--profile default] [--target .skillops/skills]
skillops apply-profile [--root <dir>] [--profile default] [--target .skillops/skills]
```

所有 CLI 命令都返回 JSON，方便在 CI 或脚本中使用。

## 定位

SkillOps 不试图替代 skill registry、包管理器或 agent 运行时工具。

它是一个工作流层：

- 用 GitHub 管理源码和发布
- 用现有 agent 工具处理安装和运行时行为
- 用 SkillOps 做审计、配置组管理、漂移检查和发布计划

## 项目状态

早期 MVP。`1.0` 之前 API 和配置结构可能会变化。

更多文档：

- [产品说明](product.md)
- [架构说明](architecture.md)
- [路线图](roadmap.md)
- [对比说明](comparison.md)
