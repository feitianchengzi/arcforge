# Desktop 路由

需要判断是否打开 Desktop、Desktop 能做什么、或如何把 CLI 结果交给视觉 UI 时读取本文件。Desktop 是本地 UI 层，不替代 ArcForge skill 或 CLI。

## 何时打开 Desktop

以下工作流适合打开或建议使用 Desktop：

- 在多个本地或远程 Skill 项目中选择。
- 查看项目健康度、recent workspaces、target history。
- 编辑 `SKILL.md`、references、scripts 或共享资产文件。
- 按 profile 过滤文件树和检查 skill 内容。
- 复核 audit findings 并定位文件。
- 管理 profile，选择全部或部分 skills。
- 从远程或外部 Skill 项目安装或导入 skills 前，选择远程同步源、source profile、skills、本地维护目录或应用目标。
- 选择多个 agent 目标、项目目标或自定义目标。
- 应用前检查目标组合和覆盖范围。
- 查看完整 drift diff。
- 复核 merge/import/share 冲突或计划。
- 配置共享目标、检查共享 drift、确认 GitHub 共享交付方式。
- 检查 Git、CLI shim 和可选工具状态。

以下任务优先留在 CLI：

- 扫描当前项目。
- 审计当前项目。
- 列出 applied source records。
- 生成 merge plan。
- 生成 publish/share plan。
- 生成 drift summary。
- 执行用户已确认的单目标 apply、merge、source update 或 share。

## Desktop 原子能力

Desktop 通过 Electron 主进程调用同一套 core 能力。当前 UI 页签：

- Overview：项目摘要、skill 数、共享资产数、audit 分数、critical/warning 数、最近目标历史、Git 来源状态检查和 fast-forward 更新确认。
- Skills：按 `sourceDir` 展示文件树，按 profile 过滤，读取、编辑、保存 skill 文件，打开独立文件编辑窗口，预览归并、安装或导入相关上下文；导入时承载远程/本地来源、source profile、skills、本地维护目录和目标 profile 的选择。
- Profiles：新增、删除、命名、描述 profile，选择全部或部分 skills，选择 Codex、Claude、Cursor 目标。
- Destinations：维护应用目标组合，选择用户级 agent 目标、项目内 agent 目标或自定义目标，检查 drift，应用 profile，查看 applied source records，基于 applied source 检查和重新应用。
- Share：维护共享目标，选择远程仓库或同仓库共享，选择 direct/namedProject target mode，检查共享 drift，生成共享计划，确认 PR、fork PR、direct push 或 local branch 交付。
- Audit：展示 audit score、findings、规则代码、文件路径、行号和审计能力边界说明。

主进程还支持：

- 选择 workspace 或目录。
- 打开 workspace folder。
- 下载远程 Skill 项目并作为本地 workspace 打开。
- 保存 project config、app state、target history 和 page state。
- 获取 default targets、environment status、安装 CLI shim。
- 打开完整 drift diff 窗口。
- 列出、读取、写入 skill/workspace 文件。

## CLI 到 Desktop 的交接

推荐 Desktop 时，必须说明：

- 为什么这一步适合 Desktop。
- 要打开哪个 project root。
- 使用哪个页面。
- 需要检查哪个来源/上游源、维护源、应用目标、共享目标、skill、profile、repo、drift report 或 finding。
- 用户需要在那里做什么决定。
- 回到 agent 后要重新运行哪条 CLI 命令确认结果。

示例交接：

```text
建议打开 Desktop：
- root: /path/to/project
- page: Destinations
- context: profile=default, target=.codex/skills, drift has 2 changed files
- action: 查看完整 diff，确认是否允许 apply 覆盖目标
确认后我会重新运行 arcforge drift/apply。
```

远程安装到 agent 或项目目标的推荐交接：

```text
建议打开 Desktop：
- root: <target-project>
- page: Destinations
- context: remote source=<github-or-git-url>, source profile=default, target=<agent-or-project-dir>, skills=<selection>
- action: 加载远程 Skill 项目，选择要安装的 skills，检查目标 drift 和完整 diff，确认是否允许写入并保存关系记录
确认后我会重新运行 arcforge drift/apply。
```

远程导入到当前项目维护源的推荐交接：

```text
建议打开 Desktop：
- root: <current-project>
- page: Skills/Import
- context: remote source=<github-or-git-url>, source profile=default, targetDir=<local-maintenance-source>, targetProfile=default
- action: 加载远程 Skill 项目，勾选要导入的 skills，确认写入当前项目哪个维护源目录，并预览 import plan
确认后我会重新运行 arcforge import plan/run，或按你的选择继续到 Destinations 检查应用目标。
```

应用到 Codex/Claude/Cursor 或项目目标前的推荐交接：

```text
建议打开 Desktop：
- root: <target-project>
- page: Destinations
- context: from=<formal-skill-project>, profile=<profile>, target=<agent-or-project-dir>
- action: 选择应用目标，检查 drift 和完整 diff，确认是否允许覆盖目标
确认后我会重新运行 arcforge drift/apply。
```

共享目标确认场景的推荐交接：

```text
建议打开 Desktop：
- root: <maintenance-source>
- page: Share
- context: profile=<profile>, repo=<github-or-git-repo>, delivery=<target-pr|fork-pr|direct-push|local-branch>, branch=<branch>
- action: 确认共享目标、交付方式、权限和计划；如有 drift 或冲突先复核
确认后我会重新运行 arcforge share plan/run。
```

## 当前 launcher 限制

已安装环境优先使用：

```bash
arcforge-desktop
```

如果 `arcforge-desktop` 不在 PATH，先让用户运行安装脚本输出的 Desktop launcher 绝对路径；不要把 Desktop 说成已安装。

需要把 Desktop 打开到某个项目和页面时，使用页面级 context open。`--root` 优先传绝对路径，`--page` 支持 `overview`、`skills`、`profiles`、`destinations`、`share`、`audit`：

```bash
arcforge-desktop --root /path/to/project --page destinations
```

这个入口只承载 root 和页面，不承载具体 skill/profile/target/diff 结果。交接时仍要在对话里说明要检查的上下文；用户完成决策后，agent 重新运行对应 CLI plan/drift/run。

## 页面映射

- scan result：Overview。
- source status/update：Overview。
- skill selection 或 editing：Skills。
- remote/local skill install：Destinations；需要先纳入维护时再用 Skills 的导入面板。
- remote/local skill import：Skills 的导入面板。
- audit findings：Audit 或 Skills 文件编辑窗口。
- profile selection：Profiles。
- apply target selection：Destinations。
- applied source records：Destinations。
- drift conflict 或 full diff：Destinations 的完整 diff 窗口。
- publish/share plan：Share。
- GitHub access、delivery method、PR confirmation：Share。
- same-repository share：Share；需要用户特别复核 remote、branch、push 权限和 direct push 风险。
