# 功能关系

## 核心数据流

- workspace/discovery.md 产生工作区快照，供 audit/rule-audit.md、profile/destination-sync.md、share/github-sharing.md、interface/desktop-app.md 和 interface/cli.md 使用。
- audit/rule-audit.md 依赖 workspace/discovery.md 发现的技能列表，并把审计报告写入工作区快照。
- profile/profile-management.md 依赖 workspace/discovery.md 加载的配置和技能列表。
- profile/destination-sync.md 依赖 profile/profile-management.md 的配置组选择结果，并读取 workspace/discovery.md 发现的共享资产。
- share/github-sharing.md 依赖 workspace/discovery.md 的工作区快照，并复用 profile/profile-management.md 中的配置组信息生成 README 使用说明。
- interface/desktop-app.md 通过 Electron 桥接调用 workspace、audit、profile、share 和技能文件编辑功能。
- interface/cli.md 直接调用核心模块中的 workspace、audit、profile 和 publish-plan 功能。

## 用户路径

- 添加项目后，用户进入 workspace/discovery.md 的扫描流程。
- 扫描完成后，用户在 interface/desktop-app.md 总览、技能文件编辑器和审计页面查看并修复 audit/rule-audit.md 的结果。
- 用户在 profile/profile-management.md 中维护配置组后，可在 profile/destination-sync.md 中应用到目标目录。
- 应用配置组后，用户通过 profile/destination-sync.md 的漂移报告判断目标是否与来源一致。
- 共享前，用户通过 share/github-sharing.md 生成发布计划并处理 audit/rule-audit.md 中的严重发现。
