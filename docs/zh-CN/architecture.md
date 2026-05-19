# 架构说明

## 技术栈

- Electron 作为桌面壳
- React + TypeScript 构建渲染进程
- TypeScript core 同时供桌面端和 CLI 使用
- Node.js 文件系统 API 处理本地工作区
- MVP 阶段没有后端服务

## 目录

```text
src/core/       SkillOps 领域逻辑
src/electron/   Electron 主进程和 preload bridge
src/ui/         React 桌面 UI
src/cli/        命令行入口
src/shared/     共享 TypeScript 类型
```

## 数据模型

`skillops.config.json` 是工作区控制文件。

```json
{
  "version": 1,
  "sourceDir": "skills",
  "teamRepo": "github.com/acme/team-skills",
  "profiles": [
    {
      "name": "default",
      "skills": ["*"],
      "targets": ["claude", "codex", "cursor"]
    }
  ]
}
```

## 安全模型

渲染进程不能直接访问 Node.js。它通过 preload 暴露的窄 API 与主进程通信：

- 选择工作区
- 扫描工作区
- 初始化配置
- 创建发布计划
- 应用 profile
- 生成 drift report

MVP 的审计引擎是本地规则引擎，能检测：

- 常见 secret
- 危险 agent 指令
- 缺失或薄弱的 skill 元数据
- 对 `.env`、凭据、自动 push 等风险行为的引用

未来可以加入可插拔审计规则和 CI annotation。

## 集成策略

SkillOps 应该编排已有工具，而不是替代它们。

计划集成：

- `skillshare`：多 agent 同步
- `npx skills`：公开安装兼容
- GitHub CLI 或 GitHub API：仓库创建和 release
- GitHub Actions：审计检查
