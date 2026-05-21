# 视觉设计系统规范（arckit/visual）

## 目录结构

```text
arckit/visual/
├── INDEX.md
├── CONVENTIONS.md
├── _library/
│   ├── brief.md
│   ├── design-tokens.yaml
│   ├── component-catalog.yaml
│   ├── components/
│   ├── style-preview.html
│   └── preview-server.py
├── themes/
├── _map/
└── _archive/
```

## 视觉系统规范

- `brief.md` 是风格源，定义品牌气质、信息层级、色彩角色、字体节奏、空间密度、组件性格、状态表达和主题策略。
- `design-tokens.yaml`、`component-catalog.yaml`、`components/`、`themes/` 和 `style-preview.html` 是风格源的投影。
- 线框图、流程和页面结构由 `arckit/interaction/` 维护；本目录只维护视觉语言、tokens、组件外观和主题。
- 组件规格必须引用 tokens，不在组件文件中散落新的业务色值；必要的新色值先进入 `design-tokens.yaml`。
- 卡片和工具控件默认圆角不超过 8px，指标卡和主面板可使用 10px，README 展示画布可使用更大圆角。
- 视觉实现应避免大面积渐变、装饰圆球、玻璃拟态和营销式 hero 布局。
- Token 变更后通过 `_library/style-preview.html` 和 `_library/preview-server.py` 自检。

## 拆分规则

- `component-catalog.yaml` 只作为组件组入口和索引，不承载大量组件细节。
- 组件细节按类别放入 `_library/components/`，单文件超过 300 行或组件超过 15 个时继续拆分。
- `design-tokens.yaml` 超过 300 行时拆分为 color、typography、spacing、effect 等 token 文件。

## 状态标识

- ✅ 已完成 | 🟡 进行中 | ⚪ 计划中 | 🔴 已废弃
