---
name: project-showcase-video
description: 从当前软件项目出发，梳理演示叙事，经过故事、视觉预览、音频和最终渲染审批后，生成 README 可用 GIF、产品 walkthrough、发布宣传 MP4、功能 tour 或本地应用使用视频。适用于用户要求制作项目演示、产品展示视频、宣传片、应用 GIF、README 动画、功能导览、发布视频，或希望把当前仓库/本地应用转成可验证的视频资产时。
---

# Project Showcase Video

为当前软件项目制作演示 GIF、产品展示视频和宣传 MP4。这个 skill 负责完整闭环：先理解本地项目，再提出叙事方向，只问必要问题，在关键节点等待明确审批，审批后生成资产并验证结果。

保持本地优先。除非用户明确要求，不使用托管视频生成器、公共上传服务或外部 registry。

## 核心约定

- 从仓库和本地项目上下文开始，而不是从空白创意提示开始。
- 录制、渲染或添加音频前，先确认演示叙事。
- 故事审批、视觉预览审批、音频审批和最终渲染审批是独立决策；只有确实适用时才逐项执行。
- 当前阶段所需审批完成后，持续推进，直到遇到缺失凭据、缺失本地权限、依赖不可用或产品路径不明确。
- 优先使用真实产品画面，不用泛化 mockup 代替真实价值。
- 产出具体文件，而不是只交 storyboard。
- 中间文件和最终文件默认放在项目内 `arckit/showcase-video/`，除非用户指定其他路径。

## 人工决策点

使用明确审批。用户随口说 “ok”、“可以” 或 “go”，只代表批准刚刚展示的那个决策点，不自动批准后续阶段。

- **故事审批**：修改演示文件、录制、渲染或加音频前，说明交付物、受众、叙事结构、后端路线、时长、画幅、音频计划和输出路径，并等待批准。
- **视觉预览审批**：从 HTML、Remotion、生成帧或修订后的捕获结果导出长渲染/最终 MP4/GIF 前，先给出预览入口，例如本地 HTML 文件、短预览或首帧/中间帧/尾帧截图，并询问是否进入最终渲染。
- **音频审批**：生成、导入或 mux 音乐/旁白前，确认音频模式和方向，除非用户已经明确要求该音频层。
- **音乐方向审批**：用户要求新背景音乐或修改音乐时，不要直接按 “酷一点”“动态一点”“不要太满” 这类模糊词生成。先总结音乐 brief：风格、能量、密度、是否跟随画面运动、是否替换当前最终混音，并等待批准。
- **最终渲染审批**：视觉和音频预览通过后，明确要渲染哪些变体，再渲染并验证。

用户提出视觉或节奏反馈时，回到对应决策点。例如布局、字幕、语言、速度、场景组合或动画连续性反馈应回到视觉预览审批，而不是直接最终渲染。

## 工作流

### 1. 理解项目

先检查本地项目，再提问：

- 阅读高信号文档：`README*`、`docs/`、`CHANGELOG*`、`AGENTS.md`、产品/spec 文件、应用截图和已有演示资产。
- 查看脚本和应用形态：package manifest、CLI 入口、Electron/Tauri 配置、Web 路由、测试 fixture 和 demo 数据。
- 识别可能的受众、核心流程、产品术语、品牌语气和运行命令。
- 查找已有捕获资产，例如 `docs/assets/`、`public/`、截图、GIF、视频或 `arckit/showcase-video/`。

不要过度扫描依赖目录。除非项目把演示资产放在那里，否则避开 `node_modules`、build output、release bundle 和缓存目录。

### 2. 提出演示叙事

用简短确认消息说明建议方向：

- 目标交付物：GIF、MP4 或两者；
- 目标受众和用途：README、docs、landing page、release post 或社交短片；
- 叙事结构：3-6 个场景，包含可见用户动作或产品状态；
- 后端选择：真实 UI 演示用 screenshot GIF，宣传/解释型 MP4 用 HTML animation，复杂可复用视频系统用 Remotion，浏览器渲染不可用时才 fallback 到帧脚本；
- 音频层：`none` 或 `music`；GIF 永远无音频，README MP4 默认无音频，宣传或发布 MP4 可使用 `music`；
- 选择 `music` 时说明音乐方向：情绪、BPM 或节奏、能量曲线、是否可 loop、是否复用已有本地音乐资产；
- 粗略时长、画幅、输出路径；
- 可能需要的依赖或权限。

最多问三个澄清问题。只问会实质改变产物的问题。默认足够合理时，直接列出默认值并请求批准。

### 3. 等待批准

用户批准前，不录制、不渲染、不安装依赖、不修改 docs。

批准可以是 “go”、“approved”、“use this direction” 或直接要求生成。如果用户修改叙事，更新计划并再次确认。

### 4. 制作预览

批准后选择最简单可靠的路线：

- Web app：启动本地 dev server，用 Playwright/Puppeteer 或已有浏览器工具驱动路由并截图或录屏。
- Desktop app：使用应用专用自动化、窗口捕获，或复用 `arckit/showcase-video/plan.json` 驱动的 screenshot GIF 后端。
- CLI/TUI：用确定性命令、fixture 和稳定终端尺寸录制输出。
- 无法运行的应用：从已有截图、文档和本地生成静态帧制作 storyboard，再用 ffmpeg 或轻量动画栈渲染。
- 精修宣传片：优先使用 HTML animation 后端，让用户在浏览器中预览完整动画后再渲染。只有复杂、可复用、React 组件化视频系统才使用 Remotion。直接 SVG/PNG 帧脚本只作为 fallback。

预览完成后停在视觉预览审批。HTML animation 应提供预览文件路径或本地 URL，并说明可用 query 参数，例如 locale 或 capture mode。非交互预览应提供代表性 stills 或短预览。用户批准前，不运行长 capture/render 命令。

选择或实现捕获/渲染路径时读取 [references/execution-patterns.md](references/execution-patterns.md)。目标项目还没有 `arckit/showcase-video/` 工作区或后端脚本时读取 [references/scaffold.md](references/scaffold.md)。

### 5. 生成输出

默认工作区结构：

- `arckit/showcase-video/demo.md`：唯一持久说明文档，原地更新，不创建按日期、版本、归档或每次运行分裂出的文档。
- `arckit/showcase-video/plan.json`：唯一机器可读捕获/渲染计划，原地更新。
- `arckit/showcase-video/frames/`：捕获或生成的源帧，按用途或语言变体分子目录。
- `arckit/showcase-video/work/`：临时 manifest、浏览器录制、渲染输入和日志。
- `arckit/showcase-video/html/`：可预览的 HTML animation 源文件。
- `arckit/showcase-video/scripts/`：项目专属捕获或渲染脚本。
- `arckit/showcase-video/audio/`：可复用和本次渲染使用的背景音乐、旁白资产。
- `arckit/showcase-video/output/`：最终 GIF 和 MP4，可同时存在。

生成的中间文件放在 `work/`，可复用源帧放在 `frames/`。GIF 使用显式有序帧列表，不依赖无序 glob 展开。渲染 MP4 时，先保留类似 `arckit/showcase-video/output/<name>-silent.mp4` 的静音母版，再添加背景音乐，便于复用或重新混音。

预览和最终输出规则：

- 候选渲染使用明确预览名，例如 `<name>-preview.mp4`、`<name>-audio-preview.mp4` 或 `<name>-<candidate>-preview.mp4`。
- 用户明确选择预览或要求设为最终版前，不覆盖 `<name>.mp4`、`<name>-zh.mp4` 这类最终文件。
- 用户选择候选前，不把默认 mux 脚本、embed 路径、README 链接或最终文件名改到新候选上。
- 候选被选中后，把它一致应用到所有请求的最终变体，然后验证最终文件。

候选和回退规则：

- 在 `demo.md`、`plan.json` 或音频索引中用短 id 记录候选。
- 候选被拒绝时，可按本地价值保留或删除，但不能当作当前默认。
- 用户要求 “回退”、“undo” 或 “go back” 时，只回退最近一个未接受候选，除非用户明确要求回退已确认的视频、音频或文档。

### 6. 完成前验证

报告完成前验证资产：

- 文件存在且非空；
- 尺寸、时长、帧率符合预期；
- 首帧、中间帧、尾帧不是空白；
- 目标尺寸下 UI 文字可读；
- 未暴露私钥、token、个人路径或无关窗口；
- 如果更新了 README/docs，embed 指向存在的项目相对路径；
- 带背景音乐的 MP4 有音频流，音频时长匹配或略长于视频，没有 clipping 或明显长时间静音。

视频优先用 `ffprobe` 验证。音频可用 `ffprobe`、`volumedetect` 或 `loudnorm` 检查时长、流、峰值和大致响度。GIF 可用 `ffprobe`、ImageMagick 或本地可用工具检查尺寸。验证无法运行时，明确说明原因。

## 后端选择

- Screenshot GIF：用于真实桌面 UI walkthrough、README GIF、多语言变体和可重复窗口捕获。
- HTML animation：默认用于宣传 MP4、发布视频、解释视频、网站 hero 视频，以及需要浏览器预览再渲染的视频。
- Remotion：仅在项目需要长期维护的 React 视频系统、可复用组件、多变体或批量渲染时使用。不要为一次性宣传片引入 Remotion，除非用户要求。
- 直接 SVG/PNG 帧脚本：只作为 fallback。HTML 或 Remotion 可用时，不把它当主路径。

## 可选音频层

音频是故事和视觉之后的第三层。它是可选项，不能成为演示生成的默认依赖。

- 故事层：产品叙事、场景、字幕和可见动作。
- 视觉层：GIF、静音 MP4、捕获帧、HTML animation 或宣传视觉。
- 音频层：`none`、背景 `music`、`voiceover` 或 `music+voiceover`。

只有 MP4、社交短片、发布视频等支持音频的交付物才添加背景音乐。GIF 永远静音。README MP4 默认静音或 autoplay 友好。教程 MP4 的音乐必须保持低干扰，不能压过屏幕内容。

如果故事审批时未批准音频，生成或 mux 音频前停在音频审批。用户后续修改节奏、时长、语言变体或最终剪辑时，mux 前重新检查音乐床是否仍匹配。

背景音乐迭代：

- 每个已批准 brief 最多生成一到两个候选。
- 用户拒绝候选时，先根据反馈总结可能原因，再生成下一个候选。
- 优先修改 brief，再修改实现。区分 “太满”、“太弱”、“不同步”、“太戏剧化”、“太泛化”、“风格不对”。
- 音乐预览可以是独立音频文件；必要时可非破坏性 mux 到当前静音视频上试听。不要为了试听音频重新渲染视觉层。

故事批准后，在 `arckit/showcase-video/demo.md` 维护 `Audio Plan`：

```markdown
## Audio Plan

- Mode: none | music | voiceover | music+voiceover
- Voiceover language:
- Voiceover script:
- Music direction:
- Source assets:
- Mix notes:
- Silent master:
- Final audio output:
```

把背景音乐当作可复用生产资产：

- 先检查 `arckit/showcase-video/audio/index.json` 和 `arckit/showcase-video/audio/library/music/` 是否已有合适本地资产。
- 用户提供音乐时，先检查格式、时长和来源说明，再作为优先源资产。
- 有合适可复用资产时，裁剪、loop 或轻量 remix，而不是重新生成。
- 本地生成新音乐时，制作有结构的多层 arrangement，例如鼓、贝斯、和声、旋律、texture、riser 或 impact。除非用户明确要求 ambient sound design，不用单一 sine tone、drone 或无结构测试音当背景音乐。
- 优先使用工作区可用的本地乐器、SoundFont、sample library、MIDI renderer、DAW 或确定性合成。
- 只有用户明确要求或允许，才使用托管音乐生成服务。
- 不使用版权不清或来源未知的音乐/语音资产。保留资产必须在 `audio/index.json` 中记录来源或 license。
- 保留后续可能复用的源材料：最终 mix、可用 stems、生成 recipe 或 MIDI/config。
- 在 `audio/index.json` 记录 id、标题、时长、BPM、key、mood tag、source method、文件路径、license/provenance 和复用建议。

推荐音频工作区：

```text
arckit/showcase-video/audio/
  index.json
  library/
    music/
    stems/
    sfx/
    recipes/
  work/
  output/
```

`audio/library/` 存放跨视频复用资产，`audio/work/` 存放临时渲染和分析文件，`audio/output/` 存放当前视频实际使用的音乐床或最终音频轨。不要因为新视频渲染就覆盖可复用音乐资产；确实修订时创建新 id 或更新索引。

背景音乐质量线：

- 匹配产品语气和受众；操作型软件通常应听起来聚焦、现代、克制，而不是戏剧化。
- 有清楚结构：intro、main bed、transition、outro 或记录 loop point。
- 按实际视频时长裁剪、loop、延展或编曲，不要突兀截断。
- 导出适合视频的 stereo 音频，最终 MP4 mux 优先 48 kHz。
- 避免 clipping；工具允许时 peak 保持在约 `-1 dB` 以下。
- `loudnorm` 可用时，音乐型宣传片通常以 `-16 LUFS` 到 `-14 LUFS` 为实用目标。
- UI 细节重要的演示中，混音必须不抢信息。旁白脚本必须先确认再生成或录制。

## 默认值

- README GIF：8-15 秒，宽 1280 px，无音频，只在必要时加短标签。
- 宣传 MP4：20-45 秒，默认 16:9，默认 HTML animation 后端，可选字幕，可按需加背景音乐或旁白。
- 社交裁剪：只有用户要求时才做竖版或方形变体。
- 风格：跟随产品现有 UI 和文档语气；不要给操作型软件强行发明花哨品牌语言。
- 隐私：使用 demo 数据、本地 fixture 或脱敏样例。

## Desktop Screenshot GIF 后端

当已批准叙事需要可重复桌面应用 walkthrough 时，使用 screenshot GIF 后端。如果已有 `arckit/showcase-video/plan.json` 和项目捕获脚本，优先复用；否则根据目标 app scaffold 项目专属计划和脚本再捕获。这个后端负责稳定窗口捕获、多语言变体、有序源帧、帧一致性检查、GIF 编码和 README 图片替换。

该后端是本 skill 内的执行路径，不是独立 skill。计划、脚本、帧、临时文件和 GIF 输出都保存在目标项目的 `arckit/showcase-video/`。

## HTML Animation 后端

默认使用该后端制作宣传视频。把确定性 HTML animation 放在 `arckit/showcase-video/html/<name>/`，暴露 `window.demoVideoSpec`，并实现 `window.renderFrame(timeSeconds)`，让捕获脚本能 seek 到精确帧时间。渲染前先让用户在浏览器中预览 HTML。使用已有项目捕获脚本，例如 `arckit/showcase-video/scripts/<html-capture-script>.sh`；目标项目缺脚本时，只在预览审批后 scaffold。脚本应把帧写入 `arckit/showcase-video/frames/html-<name>/`，并把静音 MP4 写入 `arckit/showcase-video/output/`。

修订已有 HTML animation 时，编辑 HTML/CSS/JS，运行低成本语法或 dry-run 检查，然后回到视觉预览审批。不要把用户对反馈的认可当作允许启动完整渲染；除非用户明确批准从预览进入渲染。

如果安装了专门的 Remotion 或视频编辑 skill，只在故事批准后使用，并且只用于渲染实现。
