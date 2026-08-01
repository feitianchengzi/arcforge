# 项目适用性策略

维护 `project-ambient` skill 的适用范围，或准备把这类 skill 安装到具体项目时读取本文件。

## 边界

ArcForge 只定义通用数据结构、校验规则和 Agent 判断方法，不内置项目类型词表、技术栈枚举、文件标记探测器或业务分类器。skill 不一定服务于代码项目；它可以面向内容、设计、研究、运营、治理或其它工作场景。

`projectApplicability` 是维护源作者提供给 Agent 的稳定判断提示，不是 CLI 自动判定器。具体条件由 Agent 在维护该 skill 时读取其 `SKILL.md` 和必要 references 后动态拟定；具体项目是否满足条件，则由安装阶段的 Agent 结合目标项目真实上下文逐项分析。

正式 JSON 结构见 [skill-project-manifest.schema.json](skill-project-manifest.schema.json)。CLI 还会校验安全相对路径、condition id 唯一性及按需名称冲突等跨字段约束。

## 数据结构

```json
{
  "path": "skills/workflow-tool",
  "mode": "project-ambient",
  "projectApplicability": {
    "summary": "适用于实际采用该工作流、且需要此 skill 提供协作约束的项目。",
    "conditions": [
      {
        "id": "workflow-present",
        "kind": "required",
        "description": "目标项目实际存在该 skill 所治理的工作流。"
      },
      {
        "id": "shared-practice",
        "kind": "preferred",
        "description": "项目成员需要以一致方式执行或维护该工作流。"
      },
      {
        "id": "equivalent-capability",
        "kind": "excluded",
        "description": "目标项目已有明确维护且能力等价的约束，重复安装会造成冲突。"
      }
    ],
    "evidenceGuidance": [
      "读取目标项目自身的说明、产物和工作记录，寻找条件相关证据。",
      "区分当前事实、计划目标和仅有的口头假设。"
    ],
    "clarifyingQuestions": [
      "这个项目当前是否实际执行该工作流？"
    ]
  }
}
```

字段语义：

- `summary`：一句话说明适用边界，不写成项目类别标签。
- `conditions[].id`：稳定、唯一的小写标识，供 Agent 在判断结果中引用；它不代表预定义词表。
- `required`：缺少支持证据时不能判定为适合。
- `preferred`：支持时提高推荐程度，缺少时不单独否决。
- `excluded`：出现支持证据时不应推荐安装。
- `description`：自由自然语言条件，由 Agent 根据 skill 的真实能力动态填写。
- `evidenceGuidance`：建议查看哪些事实来源，不是固定命令或限定文件类型。
- `clarifyingQuestions`：现有证据无法判断时可向用户提出的问题，不应替代先读取可用上下文。

`projectApplicability` 只允许出现在 `project-ambient` 逐项配置中。不要把它写进 `defaultMode`，也不要用于 `user-ambient` 或 `user-on-demand`。

## 维护源填写方法

1. 完整读取目标 skill 的 `SKILL.md`，并只加载理解能力边界所需的 references。
2. 从 skill 的稳定用途、前提、协作对象和冲突边界提炼条件；不基于某个应用项目的一次性现状写死规则。
3. 用自由自然语言填写少量可判断条件。通常先覆盖必要前提和排除条件，再按需要补充偏好条件、取证提示和澄清问题。
4. 向用户展示拟写的 `projectApplicability`、依据和维护源路径，获得确认后再修改 `arcforge.skill-project.json`。
5. 写入后执行 `arcforge scan --root <maintenance-source>` 复核 diagnostics；必要时再执行只读的 availability-aware `apply plan` 检查透传结果。

`project availability plan/run` 当前负责 mode 与 aliases 的受控修改，并会保留已有 `projectApplicability`；它不生成业务条件。Agent 维护适用性内容时应做一次经过用户复核的 manifest 编辑，不能声称 CLI 已替用户推断。

## 安装前动态判断

1. 先运行 availability-aware `apply plan`，读取目标 skill 对应 item 的 `projectApplicability`。
2. 结合目标项目当前可用的文档、文件、工作产物、配置、历史记录和用户上下文进行分析。选择证据源应服从条件语义，不假设目标一定是软件代码仓库。
3. 对每个 condition 输出 `met`、`not-met` 或 `unknown`，并附具体证据；不要只给一个无依据的项目类型标签。
4. 任一 `required` 为 `not-met`，或任一 `excluded` 为 `met`，结论为 `unsuitable`。所有 required 为 `met` 且没有命中的 excluded 时，可结合 preferred 得出 `suitable`。
5. 关键 condition 为 `unknown` 时结论为 `needs-input`；先使用 `clarifyingQuestions` 中相关问题向用户确认，再决定是否进入 apply。
6. 来源未配置 `projectApplicability` 时，明确说明维护源没有提供结构化提示；Agent 可以直接阅读 skill 内容做临时分析，但不能把结果伪装成来源维护事实。
7. 用户可以在看到未决条件后显式覆盖判断，此时记录 `status: overridden`、`decidedBy: user` 及未知项；Core 不把该决定伪装成 Agent 推断。
8. 判断适合或用户覆盖也不等于授权写入。真实 `apply` 仍遵循目标路径、diff、覆盖风险和显式确认边界。

建议的 Agent 判断结果形状：

```json
{
  "skill": "workflow-tool",
  "projectRoots": ["/path/to/project"],
  "status": "suitable",
  "decidedBy": "agent",
  "summary": "现有证据满足必要条件，且未命中排除条件。",
  "conditionResults": [
    {
      "conditionId": "workflow-present",
      "outcome": "met",
      "evidence": ["目标项目的实际事实或产物"]
    }
  ],
  "evidence": ["本次判断使用的总体证据"],
  "unknowns": []
}
```

把一个或多个 assessment 组成 JSON 数组，通过 availability-aware `apply plan/run` 或 `drift` 的 `--project-assessments <file>` 传入。总体 `evidence` 和每项 condition result 的 `evidence` 都至少包含一条具体证据。`projectRoots` 必须与本次选择的目标项目根完全一致；相对路径以 consumer root 为基准。保存关系后，仅在来源、来源策略摘要、profile、Agent 目标和项目根相同的情况下复用。

这个判断结果属于本次 Agent 分析，不写回维护源，除非用户另行要求把跨项目稳定的新认识纳入 skill 来源配置。
