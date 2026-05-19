# 路线图

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

## 0.3 GitHub 工作流

- GitHub repo 连接流程
- 为团队 skill 更新生成 pull request
- release/tag helper
- 私有/公开发布模式
- README 和安装 badge 生成器

## 0.4 审计

- 可配置审计规则
- allowlist 和 suppressions
- CI annotations
- 公开发布脱敏检查
- 按 release 追踪评分趋势

## 0.5 团队

- profile ownership 元数据
- 版本漂移面板
- onboarding bundle 生成
- 可选托管元数据服务

## 开放问题

- SkillOps 应该自己处理同步，还是始终委托给 `skillshare`？
- 在要求 GitHub auth 前，应该内置多少 GitHub 自动化？
- 项目 profiles 应该映射 agent targets、项目目录，还是两者都支持？
- `1.0` 前配置兼容性应该如何承诺？
