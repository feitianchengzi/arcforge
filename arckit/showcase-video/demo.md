# Project Showcase Video

这是项目展示 GIF 和宣传视频的唯一全局规划与复现文档。请原地更新；不要在这个工作区中创建按版本、日期、归档或每次运行分裂出的文档副本。

## 当前方向

使用 `project-showcase-video` 作为统一的项目展示视频 skill。真实桌面 UI walkthrough 继续使用 screenshot GIF 后端；精修宣传 MP4 默认使用 HTML animation 后端。当前宣传片方向包含原创本地背景音乐床，同时保留可复用静音母版。Remotion 只为未来复杂、可复用的 React 视频系统保留。旧的直接 SVG/PNG 宣传脚本仅作为 fallback。

## 后端策略

- 真实 UI / README 演示：screenshot GIF 后端，使用 `arckit/showcase-video/plan.json` 和 `arckit/showcase-video/scripts/capture-demo.sh`。
- 宣传 / 发布 / 解释视频：HTML animation 后端，使用 `arckit/showcase-video/html/promo/` 和 `arckit/showcase-video/scripts/capture-html-promo.sh`。
- 复杂可复用视频系统：只有明确需要时才使用 Remotion 后端。
- 应急 fallback：只有浏览器渲染不可用时，才使用直接 SVG/PNG 帧脚本。

## 场景计划

当前宣传片是一个 18 秒固定中心舞台的动态 walkthrough，不是静态 dashboard 或 carousel。移动的 `SKILL.md` token 是主角，但镜头不再横移穿过大世界。中部工作区保持固定，场景元素围绕 token 重组。阶段标签居中显示在顶部，不使用进度条；解释性文字作为底部居中字幕出现，不覆盖主体内容。

时间结构：

1. Opening：2.2 秒，用于 ArcForge 定位和 token 引入。
2. Main demo：约 12.8 秒，展示 Source、Scan、Audit、Profile、Apply 和 Release。
3. Closing：3 秒，展示完成链路和价值主张。

场景：

1. Source：`SKILL.md` token 从本地 skill repo 出现。
2. Scan：token 触发扫描光束，扫过 source files 和 project metadata。
3. Audit：token 通过 audit gate，同时风险行被审查并修复。
4. Profile：已批准 skill cards 聚合成面向项目和团队的 profile。
5. Apply and drift：token 驱动本地目标同步和 drift detection。
6. Release：token 进入 GitHub handoff 场景，publish-readiness 项被勾选。

## 音频计划

- Mode: music
- Voiceover language: none
- Voiceover script: none
- Music direction: 原创本地 modern technical bed，约 118 BPM，克制但有能量，包含 intro、main bed、transition lift 和 outro。当前视频使用更快的 18 秒剪辑。
- Source assets: `arckit/showcase-video/audio/library/music/arcforge-circuit-bed.wav`，由 `arckit/showcase-video/scripts/generate-promo-music.cjs` 生成。
- Mix notes: mux 前保留静音母版；最终 AAC 音频按实用在线宣传片响度做 normalize。
- Silent master: `arckit/showcase-video/output/arcforge-promo-silent.mp4`
- Final audio output: `arckit/showcase-video/output/arcforge-promo.mp4`

## 输出

- HTML preview: `arckit/showcase-video/html/promo/index.html`
- HTML frames: `arckit/showcase-video/frames/html-promo/`
- Silent promo MP4: `arckit/showcase-video/output/arcforge-promo-silent.mp4`
- Final promo MP4 with audio: `arckit/showcase-video/output/arcforge-promo.mp4`
- Background music bed: `arckit/showcase-video/audio/output/arcforge-promo-bed.wav`
- Desktop GIF outputs: `arckit/showcase-video/output/arcforge-desktop-demo-en.gif`, `arckit/showcase-video/output/arcforge-desktop-demo-zh-CN.gif`

## 复现说明

预览宣传动画：

```text
arckit/showcase-video/html/promo/index.html
```

Dry-run 捕获计划：

```bash
bash arckit/showcase-video/scripts/capture-html-promo.sh --dry-run
```

渲染静音 MP4：

```bash
bash arckit/showcase-video/scripts/capture-html-promo.sh
```

生成背景音乐并 mux 最终 MP4：

```bash
node arckit/showcase-video/scripts/generate-promo-music.cjs
bash arckit/showcase-video/scripts/mux-promo-audio.sh
```

刷新真实桌面 GIF：

```bash
bash arckit/showcase-video/scripts/capture-demo.sh --dry-run
bash arckit/showcase-video/scripts/capture-demo.sh --variant en
bash arckit/showcase-video/scripts/capture-demo.sh --variant zh-CN
```
