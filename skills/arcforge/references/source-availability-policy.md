# 维护源 Skill 类型策略

用户要在具体 Skill 项目中长期维护 skill 的安装与发现方式时读取本文件。配置属于维护源推荐，不是某次应用目标的强制状态。

## 持久配置

在维护源根目录维护 `arcforge.skill-project.json`：

```json
{
  "version": 1,
  "sourceDir": "skills",
  "availability": {
    "defaultMode": "user-ambient",
    "skills": [
      {
        "path": "skills/project-tool",
        "mode": "project-ambient",
        "projectApplicability": {
          "summary": "适用于实际采用该工作流的项目。",
          "conditions": [
            { "id": "workflow-present", "kind": "required", "description": "目标项目实际存在该工作流。" }
          ]
        }
      },
      { "path": "skills/rare-tool", "mode": "user-on-demand", "aliases": ["rare"] }
    ]
  }
}
```

三种合法模式：

- `user-ambient`：安装到所选 agent 的用户级发现目录，适合日常普遍使用。
- `project-ambient`：安装到明确项目的 agent skill 目录，适合项目专属能力。
- `user-on-demand`：只保存到用户级 ArcForge catalog，由 `arcforge-on-demand` 在用户显式调用后解析；不使用项目级按需目录。

`defaultMode` 是未逐项配置 skill 的来源推荐。`skills` 中的条目按相对路径覆盖默认值。`aliases` 只用于 `user-on-demand` 条目，并应保持短、稳定且无重复；所有最终属于用户按需模式的 skill 名称和 aliases 按大小写不敏感规则保持唯一，包括由 `defaultMode` 覆盖的 skill。

`projectApplicability` 只用于 `project-ambient` 逐项条目。它保存由 Agent 根据 skill 真实能力动态填写的自然语言条件，不保存固定技术栈或项目类型枚举；具体字段、维护方法和安装前判断见 [project-applicability-policy.md](project-applicability-policy.md)，正式结构见 [skill-project-manifest.schema.json](skill-project-manifest.schema.json)。

## 维护流程

1. 明确维护源根目录；它必须是要长期提交 `arcforge.skill-project.json` 的 Skill 项目，而不是临时 checkout、应用目标或当前命令的偶然 cwd。
2. 先扫描并查看当前 manifest diagnostics。名称不唯一时使用 skill 相对路径。
3. 执行只读计划，复核 `before`、`proposed`、`changes`、未分类 skill、陈旧路径和 `planDigest`。若要维护项目适用性，Agent 先阅读目标 skill 并另行提出 `projectApplicability` manifest diff；不要把业务条件硬编码进 CLI 参数或探测器。
4. 向用户列出维护源路径、默认模式变化、逐项变化和按需别名变化；获得明确确认后，用同一组参数及计划返回的 digest 执行 `run --plan-digest <digest> --confirm`。digest 不匹配或写入前 manifest 快照已经变化时，必须复核 fresh plan，不能继续写入。
5. 写入后重新 `scan`；需要验证应用位置时再执行 availability-aware `apply plan`，不要自动 apply。

## CLI

查看或预览修改：

```bash
arcforge project availability plan \
  --root /path/to/skill-project \
  --default-mode user-ambient \
  --set project-tool=project-ambient,rare-tool=user-on-demand \
  --aliases 'rare-tool=rare|special-review'
```

确认后写入：

```bash
arcforge project availability run \
  --root /path/to/skill-project \
  --default-mode user-ambient \
  --set project-tool=project-ambient,rare-tool=user-on-demand \
  --aliases 'rare-tool=rare|special-review' \
  --plan-digest <digest-from-reviewed-plan> \
  --confirm
```

调整现有策略：

- `--default-mode none`：移除项目默认推荐。
- `--remove skill-a,skills/group/skill-b`：移除逐项推荐，不删除 skill 源码。
- `--aliases 'rare-tool='`：清空按需别名。
- `--source-dir <dir>`：manifest 尚不存在时指定 skill 来源目录；规范化路径及其已存在祖先的真实路径都必须位于维护源内部，不能通过符号链接跳出 root。既有 manifest 传入该参数会阻断，sourceDir 迁移应显式修改并单独复核全部相对路径。

计划若包含 error diagnostics，`run` 必须停止。陈旧条目可用精确相对路径配合 `--remove` 修复；aliases 与非按需模式不一致时，可通过改成 `user-on-demand` 或清空 aliases 修复。无法解析的 JSON、非法模式、不安全路径或未知字段必须先手工修复，不能用新计划静默覆盖或丢弃数据。

## 生效优先级

应用时按以下顺序解析最终模式：本次命令 `--availability` 覆盖、profile 逐项覆盖、profile 默认值、维护源逐项推荐、维护源默认推荐。没有任何配置时返回 `unclassified` 并阻断写入，不按目标类型或历史兼容规则猜测。维护源配置是长期默认事实，但使用方仍可在 profile 或一次调用中明确覆盖。

`apply/drift --availability` 只影响本次解析，不会更新 `arcforge.skill-project.json`。要长期维护类型，始终使用 `project availability plan/run`。

`project availability plan/run` 管理 mode 与 aliases，并保留已有 `projectApplicability`，但不会生成适用性条件。经过用户复核的适用性 manifest 编辑写入后，使用 `scan` 校验，再由 availability-aware `apply plan` 把结构透传给 Agent 判断。
