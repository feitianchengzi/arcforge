# Desktop 路由

Desktop 是视觉 UI 层，不替代 SkillOps skill 或 CLI。

## 何时打开 Desktop

工作流需要以下能力时，打开或建议使用 Desktop：

- 在多个项目本地 skills 中选择。
- 编辑 `SKILL.md` 或 bundled reference 文件。
- 带文件上下文检查 audit findings。
- 审查 merge conflicts。
- 选择多个目标项目或 agent targets。
- 查看完整 drift diff。
- 远程写入前审查 share plan。
- 检查 share 执行结果和恢复选项。

如果用户已经通过 `skillops-install` 从当前仓库安装过本地环境，优先用已安装的 Desktop launcher：

```bash
skillops-desktop
```

如果 `skillops-desktop` 不在 PATH，先让用户运行安装脚本输出的 Desktop launcher 绝对路径；不要把 Desktop 说成已安装。

## 何时留在 CLI

以下任务优先留在 CLI：

- 扫描当前项目。
- 审计当前项目。
- 列出 applied source records。
- 生成 merge plan。
- 生成 publish/share plan。
- 生成 drift summary。
- 执行用户已确认的单目标 apply 或 merge。

## 期望的路由契约

当前 CLI 不保证已有稳定 Desktop 路由命令；已安装 launcher 只能真实打开 Desktop，不能保证直接打开指定页面。产品期望支持类似：

```bash
skillops desktop --root <project> --page <overview|skills|audit|profiles|targets|drift|share> \
  --skill <skill-name> \
  --profile <profile-name> \
  --from <formal-skill-project> \
  --target <target-path>
```

在这个能力实现前，告诉用户 Desktop context routing 缺失，并继续使用可用 CLI workflow。如果 Desktop 可以手动打开，说明要打开哪个 project root、哪个页面，以及要检查的上下文。

## 页面映射

- Scan result：Overview
- Skill selection 或 editing：Skills
- Audit findings：Audit
- Profile selection：Profiles
- Apply target selection：Targets
- Drift conflict 或 full diff：Drift
- Publish/share plan：Share

## Agent 行为

推荐 Desktop 时，必须说明：

- 为什么这一步适合 Desktop。
- 要打开哪个 project root。
- 使用哪个页面。
- 检查哪个 skill、profile、target 或 repo。
- 用户需要在那里做什么决定。
