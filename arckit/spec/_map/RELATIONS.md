# 功能关系

## 核心数据流

- workspace/discovery.md 产生工作区快照和本地 Git 信息，供 audit/rule-audit.md、profile/destination-sync.md、sources/skill-project-merge.md、share/github-sharing.md、interface/agent-skill.md、interface/desktop-app.md 和 interface/cli.md 使用。
- sources/skill-project-merge.md 复用 workspace/discovery.md 的扫描结果解析 Skill 项目，并复用 profile/destination-sync.md 的应用与漂移规则生成当前项目应用关系。
- audit/rule-audit.md 依赖 workspace/discovery.md 发现的技能列表，并把审计报告写入工作区快照。
- profile/profile-management.md 依赖 workspace/discovery.md 加载的配置和技能列表。
- profile/destination-sync.md 依赖 profile/profile-management.md 的配置组选择结果，并读取 workspace/discovery.md 发现的共享资产。
- share/github-sharing.md 依赖 workspace/discovery.md 的工作区快照，并复用 profile/profile-management.md 中的配置组信息生成 README 使用说明。
- interface/agent-skill.md 通过 coding agent 解释用户意图，并编排 interface/cli.md 的结构化执行结果与 interface/desktop-app.md 的上下文 UI。
- interface/desktop-app.md 通过 Electron 桥接调用 workspace、audit、profile、share 和技能文件编辑功能，并可作为 Agent Skill 调度的本地 UI 层。
- interface/cli.md 直接调用核心模块中的 workspace、audit、profile、publish-plan、source update、share、归并和应用关系能力，并为 Agent Skill 提供结构化执行层。

## 用户路径

- 用户在当前项目目录中通过 coding agent 调用 interface/agent-skill.md，并进入 workspace/discovery.md 的扫描流程。
- 用户也可以直接添加项目，并通过 interface/desktop-app.md 进入 workspace/discovery.md 的扫描流程。
- 扫描完成后，用户在 interface/desktop-app.md 总览、技能文件编辑器和审计页面查看并修复 audit/rule-audit.md 的结果。
- 用户在 profile/profile-management.md 中维护配置组后，可在 profile/destination-sync.md 中应用到目标目录。
- 用户在当前项目产生可复用技能后，通过 sources/skill-project-merge.md 归并到另一个 Skill 项目，并让当前项目记录为应用目标。
- 用户在当前项目维护项目内 skill 后，通过 interface/agent-skill.md 串联 audit/rule-audit.md、sources/skill-project-merge.md、profile/destination-sync.md 和 share/github-sharing.md，完成审计、归并到正式 Skill 项目、应用到目标项目、漂移检查和远程共享准备。
- 应用配置组后，用户通过 profile/destination-sync.md 的漂移报告判断目标是否与来源一致。
- 共享前，用户通过 share/github-sharing.md 生成发布计划、检测 GitHub 权限并处理 audit/rule-audit.md 中的严重发现。
- 对任何带 Git remote 的 Skill 项目，用户通过总览或 interface/cli.md 的 `source` 命令查看本地相对上游落后多少 commit，再决定是否更新当前 checkout。
