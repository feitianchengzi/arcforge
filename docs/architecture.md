# 架构说明

[English](en/architecture.md)

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

SkillOps 区分来源内容和本地用户状态。日常项目设置保存在用户级项目状态 `~/.skillops/projects`。当项目根目录存在 `skillops.config.json` 时，系统按需迁移到用户级项目状态，然后从来源 checkout 删除该文件。

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
- 检查或更新 GitHub 来源 checkout
- 创建发布计划
- 应用 profile
- 生成 drift report
- 列出、读取和写入 skill 文件
- 打开独立 skill 文件编辑窗口

桌面端打包产物也支持 `--cli`。在该模式下，Electron 不创建窗口，而是执行终端入口使用的同一套命令编排。

GitHub 来源项目通过 CLI 优先的 source 命令维护。状态命令获取上游 refs 并报告 ahead/behind commit 数；更新命令要求显式确认，并且只执行 fast-forward pull，因此桌面端可以展示同一个用户决策点，而不需要维护另一套 Git 逻辑。

应用启动时，主进程会安装或修复用户级 `skillops` shim。环境检测会报告 shim 路径、PATH 可见性、Git 可用性和可选集成工具状态。

技能文件编辑仍然保持本地优先并由主进程代理。渲染进程通过 IPC 请求工作区范围内的目录树和单个文本文件。主进程会拒绝当前工作区之外的路径、超大文件和二进制文件。独立编辑窗口接收与内置编辑器一致的文件上下文、配置组过滤、目录收起状态、语言文案和滚动位置。

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
