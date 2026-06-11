# 执行模式

用户批准演示叙事后再读取本文件。

## 捕获策略

选择一个主要捕获路径。只有能提高可靠性时，才混合使用多种工具。

### Web App

产品有本地浏览器 UI 时使用。

1. 从项目脚本识别 dev command 和端口。
2. 启动服务器，等待目标路由可访问。
3. 用 Playwright、Puppeteer 或项目已有浏览器自动化栈进入规划场景。
4. 优先保证确定性状态：seed fixture、local storage 设置、query 参数或 mock 数据。
5. 捕获视频或有序 PNG 帧。

推荐输出：

- 交互重要时，从浏览器录制生成 MP4。
- README 需要紧凑 loop 时，用有序截图生成 GIF。

### Desktop App

产品是 Electron、Tauri、原生 macOS、Windows 或 Linux 桌面应用时使用。

1. 如果已有 `arckit/showcase-video/plan.json` 和捕获脚本，优先复用 screenshot GIF 后端；否则为目标 app scaffold 后端。
2. 操作系统支持时，只捕获应用窗口。
3. 每一帧前保持窗口尺寸稳定。
4. 优先使用键盘导航或应用级 test hook；只有坐标稳定时才用坐标。
5. 如果系统隐私权限阻止捕获，停止并说明缺失的权限。

macOS 常用基础能力包括 `screencapture -x -l <window_id>`、AppleScript 激活和应用专属自动化脚本。

#### Screenshot GIF 后端

用于可重复桌面 walkthrough GIF。它提供：

- 目标窗口捕获，而不是全屏捕获；
- 单一 `arckit/showcase-video/plan.json`，记录 app metadata、帧顺序、点击目标、语言变体、输出路径和 README 替换；
- 源帧目录 `arckit/showcase-video/frames/<purpose-or-locale>/`；
- 临时文件目录 `arckit/showcase-video/work/`；
- 最终 GIF 目录 `arckit/showcase-video/output/`；
- GIF 编码前的帧尺寸和有效窗口边界验证；
- 显式帧顺序，避免无序 glob 展开。

项目捕获脚本支持 `--dry-run` 时先 dry-run。尽量只刷新用户要求的语言或变体。不要创建新的 legacy capture workspace。

### CLI 或 TUI

产品价值主要体现在命令行流程时使用。

1. 使用干净 fixture 目录。
2. 固定终端宽度和高度。
3. 优先使用脚本化命令回放；只有输入动画本身是叙事的一部分时才模拟 live typing。
4. 如果输出里显示绝对个人路径，进行脱敏。
5. 有 terminal recorder 时优先使用；否则捕获文本帧再合成。

### HTML Animation

宣传 MP4、发布视频、解释视频和网站 hero 视频默认使用该后端。先做完整、浏览器可预览的动画，再渲染。

1. 源文件放在 `arckit/showcase-video/html/<name>/`。
2. 实现 `window.demoVideoSpec = { width, height, fps, duration, outputName }`。
3. 实现 `window.renderFrame(timeSeconds)`，让捕获可确定性 seek 到每一帧。
4. 可行时先本地预览 HTML，并等待确认再做昂贵渲染。
5. 帧写入 `arckit/showcase-video/frames/html-<name>/`。
6. 静音 MP4 写入 `arckit/showcase-video/output/<name>-silent.mp4`。
7. 静音母版被接受后，才添加音乐或旁白。

使用项目 HTML 捕获脚本的 `--dry-run` 验证计划。捕获运行时优先使用目标项目已有工具：Electron 项目用 Electron，浏览器项目用 Playwright/Puppeteer，其他情况使用已有本地浏览器自动化工具。没有用户批准前，不添加重依赖。

### Remotion

只有视频需要长期组件复用、多变体、共享主题或批量渲染时使用 Remotion。Remotion 指 React 视频项目，不是简单 HTML 预览。除非用户要求，不为一次性宣传片添加 Remotion 依赖。

### 静态 Storyboard

应用无法本地运行或捕获会很脆弱时使用。

1. 从已有截图、文档和本地生成 UI 状态构建帧。
2. 标签保持事实性、短句。
3. 用 ffmpeg 合成 MP4/GIF。
4. 在复现说明中标记该输出基于 storyboard，而非真实运行捕获。

## 渲染选择

- `ffmpeg`：默认用于拼接帧、裁剪、缩放、MP4 转 GIF、基础字幕、loop 或 normalize 背景音乐、mux 音频到 MP4。
- `gifski`：可用时用于高质量 GIF 编码。
- `ImageMagick`：可用于帧检查和简单标签。
- HTML/CSS capture：默认用于确定性浏览器原生宣传动画、UI mockup、kinetic type 和先预览后渲染流程。
- Remotion：HTML animation 不够时，用于 React 产品解释视频、可复用场景、多变体和批量渲染。

## 可选音频层模式

只用于 MP4 或其他支持音频的输出。GIF 保持静音。README MP4 默认静音，除非用户明确要音乐版本。

1. 先渲染或保留视觉层：`arckit/showcase-video/output/<name>-silent.mp4`。
2. 在 `arckit/showcase-video/demo.md` 中维护 `Audio Plan`，模式为 `none` 或 `music`。
3. 如果是 `music`，先检查 `arckit/showcase-video/audio/index.json` 和 `audio/library/music/` 是否有可复用本地音乐。
4. 用户提供音乐时，在来源清楚且文件可适配视频时优先使用。
5. 生成音乐时，制作多层结构化 track，并把有用源材料保存在 `audio/library/`。
6. 为当前视频生成匹配最终时长的音乐床，放在 `arckit/showcase-video/audio/output/`。
7. 把音乐床 mux 到静音视频，最终 MP4 放在 `arckit/showcase-video/output/`。
8. 汇报完成前验证视频和音频流。

`demo.md` 最小段落：

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

`audio/index.json` 中推荐的可复用资产 metadata：

```json
{
  "assets": [
    {
      "id": "project-tech-bed-001",
      "kind": "background_music",
      "title": "Focused Product Bed 001",
      "duration": 30.0,
      "bpm": 100,
      "key": "A minor",
      "moods": ["focused", "modern", "restrained"],
      "source": "local_procedural_synthesis",
      "provenance": "Generated locally for this project; no external samples.",
      "files": {
        "mix": "arckit/showcase-video/audio/library/music/project-tech-bed-001.wav",
        "recipe": "arckit/showcase-video/audio/library/recipes/project-tech-bed-001.json"
      },
      "reuse": "recommended"
    }
  ]
}
```

## 常用命令

根据已批准计划调整路径和尺寸。

```bash
ffmpeg -y -framerate 1 -i "arckit/showcase-video/frames/%03d.png" \
  -vf "scale=1280:-1:flags=lanczos,fps=12" \
  "arckit/showcase-video/output/project-showcase.gif"
```

```bash
bash arckit/showcase-video/scripts/<html-capture-script>.sh --dry-run
```

```bash
bash arckit/showcase-video/scripts/<html-capture-script>.sh
```

裁剪或 loop 可复用音乐床到目标视频时长：

```bash
ffmpeg -y -stream_loop -1 -i "arckit/showcase-video/audio/library/music/project-tech-bed-001.wav" \
  -t 30 -af "afade=t=in:st=0:d=0.5,afade=t=out:st=29.2:d=0.8" \
  "arckit/showcase-video/audio/output/project-promo-music.wav"
```

把音乐 mux 到静音 MP4：

```bash
ffmpeg -y -i "arckit/showcase-video/output/project-promo-silent.mp4" \
  -i "arckit/showcase-video/audio/output/project-promo-music.wav" \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k \
  -shortest -movflags +faststart \
  "arckit/showcase-video/output/project-promo.mp4"
```

```bash
ffprobe -v error -show_entries format=duration,size \
  -show_entries stream=width,height,r_frame_rate \
  -of default=nw=1 "arckit/showcase-video/output/project-promo.mp4"
```

检查带背景音乐视频的音频流和峰值：

```bash
ffprobe -v error -select_streams a:0 \
  -show_entries stream=codec_name,sample_rate,channels,duration \
  -of default=nw=1 "arckit/showcase-video/output/project-promo.mp4"
```

```bash
ffmpeg -hide_banner -i "arckit/showcase-video/output/project-promo.mp4" \
  -af volumedetect -f null -
```

## 工作区文档规则

`arckit/showcase-video/` 下只保留一个持久说明文档：`demo.md`。用它记录已批准叙事、场景列表、字幕、输出路径和复现说明，并在每次运行中原地更新。不要创建按版本、日期、归档、draft 或每次运行分裂出来的 markdown 文件。机器可读计划也只保留一个：`plan.json`。

## README 嵌入模式

使用项目相对路径。

```markdown
![Project showcase](arckit/showcase-video/output/project-showcase.gif)
```

```markdown
<video src="arckit/showcase-video/output/project-promo.mp4" controls muted playsinline></video>
```

GitHub README 兼容性优先用 GIF。docs site、landing page 和 release post 可用 MP4。

## 质量线

- 演示在前三秒展示真实产品价值。
- 每个场景只有一个焦点动作或状态。
- 避免长加载、光标游移和重复导航。
- 字幕短到正常播放速度下可读。
- 不展示私有工作区、API key、access token、本地用户名、无关浏览器标签页或通知横幅。
