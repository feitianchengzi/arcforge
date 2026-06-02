# 交互设计文档规范

## 源-投影原则

`interaction.md` 中的「交互策略」是同一页面的交互源。策略定义核心任务、主路径、决策点、信息揭示、状态流、反馈恢复和输入输出边界。

`default.html` 是交互策略的线框投影。线框必须体现策略中的核心任务、主路径、决策点和状态流。

`interaction.md` 的页面状态、页面导航、交互行为、弹窗、错误处理和加载策略是交互策略的规范投影。

## 变更类型

投影变更只调整布局、控件表达、状态展示或局部规则。投影变更保持交互策略不变。

源变更改变核心任务、主路径、决策点、状态流、反馈机制、异常恢复或输入输出边界。源变更先更新交互策略，再同步更新线框和规范章节。

源缺失时，文档先补齐最小必要交互策略，再执行线框或规范更新。

## 目录结构

```text
arckit/interaction/
├── INDEX.md
├── CONVENTIONS.md
├── wireframe-style.css
├── [page-name]/
│   ├── default.html
│   └── interaction.md
└── _archive/
```

一级目录严格代表页面，不代表流程、功能域、模块组或任务域。跨页面关系写入 `_map/RELATIONS.md`，同一页面中过多的弹窗或状态可拆为该页面目录内的子视图 HTML。

## 线框图规范

所有 HTML 线框图使用极简线框图风格。线框图只使用 `wireframe-style.css` 中的灰度变量、线框、占位符和结构表达。

HTML 禁止使用品牌色、主题色、彩色内联样式和业务逻辑脚本。

每个 `default.html` 覆盖页面关键状态。加载中、成功、空状态、错误状态、弹窗或差异窗口按页面策略需要作为状态内结构直接渲染。

每个状态保持模板结构：`details > summary > state-content > state-description + wireframe-canvas + component-list + interactions`。

`.wireframe-canvas` 内有且仅有一个直接子元素 `.device-frame`。所有业务 UI、导航、内容区、弹窗占位和反馈区域都在 `.device-frame` 内部。

关键语义容器使用 `data-kit` 标注。弹窗必须标注 `data-kit="Sheet"`、`data-kit="Alert"` 或等价展示方式。

## 样式维护

`wireframe-style.css` 是 interaction 根目录唯一线框样式。新样式必须是通用组件类，不按具体业务命名。

扩写前先搜索已有 class，避免重复定义。新增规则只使用现有灰度变量。

## 状态标识

✅ 已完成 | 🟡 进行中 | ⚪ 计划中 | 🔴 已废弃
