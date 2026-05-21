# 路线图

## 方向

SkillOps 应该保持小而清晰：local-first 的私有/团队 skill 治理，以及面向 GitHub 和 ClawHub/OpenClaw 等公开 registry 的发布前准备。

不要做托管 marketplace、公开 registry、公开搜索、评分、评论、付费分发或完整 agent runtime。这些是分发层和执行层。SkillOps 负责更早的环节：审计、profiles、drift、发布准备和轻量自动化。

## 0.1 MVP

- 桌面工作区扫描
- 审计报告
- profile 应用和 drift report
- 发布计划
- JSON CLI
- 开源项目文档

## 0.2 易用性

- 在 UI 中编辑 `skillops.config.json`
- 从模板创建新 skill
- 应用前展示 skill diff
- 检测已安装工具及其 skill 目录
- 导入本地已有 agent skills
- 标记 profile 为 private、team 或 publish-ready

## 0.3 GitHub 工作流

- GitHub repo 连接流程
- 为团队 skill 更新生成 pull request
- release/tag helper
- 私有/公开发布模式
- README 和安装 badge 生成器
- ClawHub/OpenClaw 发布就绪 checklist 和 dry-run 命令提示

## 0.4 审计

- 可配置审计规则
- allowlist 和 suppressions
- CI annotations
- 公开发布脱敏检查
- registry 就绪检查：metadata、license、README、examples 和内部引用
- 按 release 追踪评分趋势

## 0.5 团队

- profile ownership 元数据
- 版本漂移面板
- onboarding bundle 生成
- GitHub-backed 团队 metadata，不要求托管 SkillOps 服务

## 开放问题

- 哪些同步目标应该由 SkillOps 直接处理，哪些应该委托给 `skillshare`、`npx skills` 或 agent 原生 installer？
- 在要求 GitHub auth 前，应该内置多少 GitHub 自动化？
- 项目 profiles 应该映射 agent targets、项目目录，还是两者都支持？
- `1.0` 前配置兼容性应该如何承诺？
- ClawHub/OpenClaw 支持应该只停留在 checklist，还是提供一等的 publish-prep 命令？
