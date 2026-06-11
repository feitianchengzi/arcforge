# Scaffold 指南

目标项目还没有 `arckit/showcase-video/`，或已有工作区不完整时读取本文件。只 scaffold 项目专属文件；不要复制另一个项目的产品文案、窗口坐标、截图、视频或输出名。

## 必需工作区

在目标项目中创建：

```text
arckit/showcase-video/
  demo.md
  plan.json
  frames/
  work/
  html/
  scripts/
  audio/
    index.json
  output/
```

只保留一个持久文档：`arckit/showcase-video/demo.md`。只保留一个机器可读计划：`arckit/showcase-video/plan.json`。两者都原地更新。不要创建按日期、版本、归档、draft 或每次运行分裂出的 markdown 文档。

## demo.md 模板

```markdown
# Project Showcase Video

这是项目展示 GIF 和宣传视频的唯一全局规划与复现文档。请原地更新。

## Current Direction

Pending.

## Backend Strategy

- Real UI / README demo:
- Promo / launch / explainer video:
- Complex reusable video system:
- Fallback:

## Scene Plan

Pending.

## Audio Plan

- Mode: none | music | voiceover | music+voiceover
- Voiceover language:
- Voiceover script:
- Music direction:
- Source assets:
- Mix notes:
- Silent master:
- Final audio output:

## Outputs

Pending.

## Reproduction Notes

Pending.
```

## plan.json 模板

按目标项目调整。故事批准前，字段可以留空或省略不需要的 section。

```json
{
  "project": {
    "name": "project-name",
    "type": "web | desktop | cli | mixed",
    "description": ""
  },
  "backends": {
    "realUiDemo": "screenshot-gif",
    "defaultPromo": "html-animation",
    "advancedReusableVideo": "remotion",
    "fallback": "svg-png-frames"
  },
  "outputs": {
    "directory": "arckit/showcase-video/output"
  },
  "variants": []
}
```

桌面 screenshot GIF 后端需要补充 app metadata、帧顺序、必要语言变体和输出路径。HTML animation 后端需要补充源路径、捕获脚本、帧目录、静音输出和最终输出。

## HTML Animation 后端 Scaffold

创建 `arckit/showcase-video/html/<name>/index.html`、`styles.css` 和 `animation.js`。

动画必须暴露：

```js
window.demoVideoSpec = {
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 30,
  outputName: "project-promo"
};

window.renderFrame = function renderFrame(timeSeconds) {
  // Set the entire visual state deterministically from timeSeconds.
};
```

预览模式可以用 `requestAnimationFrame`，但 capture mode 必须通过 `renderFrame(timeSeconds)` 确定性还原。

从目标项目可用工具中选择捕获脚本：

- 已安装 Electron 的 Electron app：使用 Electron `BrowserWindow.capturePage()`。
- 已安装 Playwright 或 Puppeteer 的 Web project：使用浏览器截图或视频捕获。
- 没有浏览器自动化：添加依赖前先询问，或使用更简单 fallback。

## Screenshot GIF 后端 Scaffold

真实桌面 app walkthrough 使用该后端。

计划字段通常包括：

- app owner 或 executable name；
- window title 或 selector；
- 稳定窗口尺寸；
- frame id 和导航动作；
- 语言变体，如需要；
- `arckit/showcase-video/output/` 下的输出路径；
- 用户要求时需要更新的 README/docs 路径。

OS 专属捕获逻辑只写进项目脚本。macOS 可考虑 `screencapture`、AppleScript、Swift 或 CoreGraphics。其他平台选择对应本地能力。权限阻止捕获时，停止并说明缺失权限。

## 音频 Scaffold

创建 `arckit/showcase-video/audio/index.json`：

```json
{
  "assets": []
}
```

不要添加版权不清或来源未知的音乐/语音资产。可复用资产放在 `audio/library/`，当前视频 mix 放在 `audio/output/`，临时分析或渲染文件放在 `audio/work/`。

## 可移植性检查

把 scaffold 用到另一个项目之前检查：

- `demo.md`、`plan.json`、HTML 文案、脚本、输出名或 README alt text 中没有旧项目名；
- 没有绝对本地用户路径；
- 捕获脚本使用目标项目可用工具，或明确记录 setup 步骤；
- 可行时，dry-run mode 不启动重型 GUI 工具也能工作；
- 输出名是项目专属的，但不绑定到另一个仓库。
