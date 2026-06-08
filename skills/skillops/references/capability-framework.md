# 能力框架

用户要以产品建设视角搭建或完善 SkillOps 时读取本文件。这里描述的是能力框架和阶段化建设顺序，不是每次使用 `$skillops` 都要完整跑完的固定流程。

## 核心模型

使用四个对象组织产品能力：

- 当前项目：skill 被创建、编辑或安装的位置。
- 正式 Skill 项目：可复用的 source of truth。
- 目标项目：消费正式 Skill 项目的另一个项目或 agent 目标。
- 远程仓库：用于团队 review、版本管理、分享和发布准备的 GitHub 或 Git 仓库。

围绕这些对象逐步补齐能力：

- 发现：扫描当前项目、项目本地 agent skills、正式 Skill 项目和已应用来源。
- 审计：在团队共享或公开发布前发现结构、安全和元数据风险。
- 组织：用 profile 表达项目、团队或场景需要的 skill 集合。
- 正式化：把值得复用的项目本地 skill 合并到正式 Skill 项目。
- 应用：把正式来源中的 profile 安装到本地 agent 或项目目标。
- 漂移：比较正式来源和已安装副本，发现缺失、变更和多余文件。
- 分享准备：生成 GitHub-first 的发布、PR、恢复和 registry 命令提示。

这些能力可以独立使用，也可以在用户明确要求端到端推进时串联使用。

## 阶段化治理

当用户只要求某一阶段时，只处理该阶段：

- 扫描现状：运行 scan，报告本地 skills、shared assets、audit 摘要和 Git 状态。
- 审计 skill：运行 audit，解释 findings、风险和修复建议。
- 整理 profile：检查或规划 profile，不自动写入目标。
- 正式化 skill：先生成 merge plan；只有用户确认后才执行 merge run。
- 应用到目标：先说明 root、from、profile、target 和覆盖风险；只有用户确认后才运行 apply。
- 检查漂移：运行 drift 或 applied drift，报告 missing、changed、extra。
- 准备分享：从正式 Skill 项目运行 publish/share plan；只有用户确认后才运行 share run。

## 端到端推进

只有用户明确要求“从项目本地 skill 一路正式化、同步并准备分享”这类端到端目标时，才把阶段串起来：

1. 扫描当前项目。
2. 识别要处理的项目本地 skill。
3. 审计选中的 skill。
4. 检查 applied source record 是否已经指向正式 Skill 项目。
5. 如果没有正式来源，询问或推断正式 Skill 项目路径或远程。
6. 生成 merge plan。
7. 如果 merge plan 有冲突，停止并建议 Desktop 或手动 review。
8. 如果 merge plan 干净，说明写入范围并等待用户确认。
9. 用户确认后执行 merge run。
10. 说明目标 root、from、profile、target 和覆盖风险，并等待用户确认 apply。
11. 用户确认后从正式 Skill 项目 apply 到目标项目的 agent skill 目录或自定义 target。
12. 运行 drift，报告目标是否与正式来源一致。
13. 如用户要远程分享，再从正式 Skill 项目生成 publish/share plan。

不要默认项目到项目直接复制。只有用户明确要求临时一次性复制，并理解这不会建立 durable source relationship 时，才可以直接复制。

如果选中的 skill 位于 `.codex/skills`、`.claude/skills`、`.cursor/skills` 等项目本地 agent 目录，当前项目仍是 root，agent skill 目录作为 `--source-dir`。正式来源关系属于项目，不属于隐藏 agent 子目录。

## 远程分享前提

远程分享应从正式 Skill 项目执行，而不是从原始项目本地草稿执行。

真实远程分享前：

1. 确认 skill 已合并到正式 Skill 项目。
2. 确认正式 Skill 项目位于 Git 仓库中；`source status` 在非 Git 目录会失败。
3. 从正式 Skill 项目运行 audit、publish plan 和 share plan。
4. 报告 blocking risks、warnings、文件列表摘要和推荐 delivery mode。
5. 远程写入前确认 repository、profile、branch、delivery mode、commit message 和覆盖风险。
6. 用户确认后才运行 share run。

## 停止条件

以下情况必须在写入前停止：

- audit 有 critical findings，且用户没有接受风险。
- merge plan 报告冲突。
- 目标路径无法安全解析。
- target drift 显示目标内存在可能被覆盖的本地修改。
- Git checkout 脏状态会影响 update 或 share。
- 正式 Skill 项目不是 Git 仓库，但用户要做远程分享。
- GitHub 认证或权限检查失败。

停止时给出具体下一步：在 Desktop 检查、修复 audit finding、选择正式 Skill 项目、解决冲突、选择目标目录、初始化 Git 仓库，或完成 GitHub 登录后重试。
