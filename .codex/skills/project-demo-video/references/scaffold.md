# Scaffold Guide

Use this when a target project does not yet have `arckit/demo-video/` or when the existing workspace is incomplete. Scaffold project-specific files; do not copy another project's product copy, window coordinates, screenshots, videos, or output names.

## Required Workspace

Create this structure in the target project:

```text
arckit/demo-video/
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

Keep exactly one persistent document: `arckit/demo-video/demo.md`. Keep exactly one persistent machine-readable plan: `arckit/demo-video/plan.json`. Update both in place. Do not create dated, versioned, archived, draft, or per-run markdown documents.

## demo.md Template

```markdown
# Demo Video

This is the single global planning and reproduction document for project demo GIFs and promotional videos. Update this file in place.

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

## plan.json Template

Adapt this to the target project. Leave fields empty or omit sections until the approved story needs them.

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
    "directory": "arckit/demo-video/output"
  },
  "variants": []
}
```

For a desktop screenshot GIF backend, add app metadata, frame order, locale variants if needed, and output paths. For an HTML animation backend, add source path, capture script, frames directory, silent output, and final output.

## HTML Animation Backend Scaffold

Create `arckit/demo-video/html/<name>/index.html`, `styles.css`, and `animation.js`.

The animation must expose:

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

Preview mode may use `requestAnimationFrame`, but capture mode must be deterministic through `renderFrame(timeSeconds)`.

Choose the capture script from the target project's available tools:

- Electron app with Electron installed: use Electron `BrowserWindow.capturePage()`.
- Web project with Playwright or Puppeteer installed: use browser screenshots or video capture.
- No browser automation available: ask before adding dependencies, or use a simpler fallback.

## Screenshot GIF Backend Scaffold

Use this for real desktop app walkthroughs.

Plan fields usually include:

- app owner or executable name;
- window title or selector;
- stable window dimensions;
- frame ids and navigation actions;
- locale variants, if relevant;
- output paths under `arckit/demo-video/output/`;
- README/docs paths to update, if requested.

Use OS-specific capture only inside project scripts. For macOS, `screencapture`, AppleScript, Swift, or CoreGraphics may be appropriate. For other platforms, choose local equivalents. If permissions block capture, stop and report the missing permission.

## Audio Scaffold

Create `arckit/demo-video/audio/index.json`:

```json
{
  "assets": []
}
```

Do not add copyrighted or provenance-unknown music or voice assets. Keep reusable assets under `audio/library/`, per-video mixes under `audio/output/`, and temporary analysis or renders under `audio/work/`.

## Portability Checks

Before using a scaffold in another project, check:

- no old project name remains in `demo.md`, `plan.json`, HTML copy, scripts, output names, or README alt text;
- no absolute local user paths remain;
- capture scripts use tools available in the target project or have documented setup steps;
- dry-run mode works without launching heavy GUI tools when possible;
- output names are project-specific but not tied to another repository.
