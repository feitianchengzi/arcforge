# 视觉关系

## 源与投影

- _library/brief.md 是视觉策略源，定义品牌气质、信息层级、色彩角色、字体节奏、空间密度、组件性格、状态表达和主题策略。
- _library/design-tokens.yaml 投影 brief.md 中的色彩、字体、间距、圆角、阴影和动效策略。
- _library/component-catalog.yaml 是组件视觉目录入口，指向 _library/components/workbench-components.yaml。
- _library/components/workbench-components.yaml 使用 design-tokens.yaml 表达 AppShell、SidebarProjectItem、Button、MetricCard、Panel、ActionRow、FindingRow、StatusBadge 和 Input 的视觉规格。
- themes/light.yaml 和 themes/dark.yaml 仅覆盖 token 值，不改变 brief.md 的视觉策略。
- _library/style-preview.html 使用同一视觉策略展示预览图中的主要组件和状态。

## 与其他 ArcKit 域的关系

- arckit/interaction/ 维护结构和交互线框，arckit/visual/ 维护色彩、字体、间距、状态和组件视觉规格。
- arckit/spec/interface/desktop-app.md 描述桌面应用功能范围，arckit/visual/_library/component-catalog.yaml 描述其视觉组件规格。
- docs/assets/skillops-overview.svg 是本次视觉规范抽取的源样本，后续真实 UI 应逐步向 arckit/visual/ 投影靠拢。
