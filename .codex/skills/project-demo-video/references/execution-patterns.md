# Execution Patterns

Use this reference after the user approves the demo story.

## Capture Strategy

Pick one primary capture path. Avoid mixing tools unless it improves reliability.

### Web App

Use this when the product has a local browser UI.

1. Identify the dev command and port from project scripts.
2. Start the server and wait for the route to respond.
3. Use Playwright, Puppeteer, or an existing browser automation stack to navigate the planned scenes.
4. Prefer deterministic state: seeded fixtures, local storage setup, query parameters, or mock data.
5. Capture either a video or ordered PNG frames.

Good outputs:

- MP4 from browser video capture when interactions matter.
- GIF from ordered screenshots when the README needs a compact loop.

### Desktop App

Use this when the product is Electron, Tauri, native macOS, Windows, or Linux desktop.

1. Prefer an existing project screenshot GIF backend when `arckit/demo-video/plan.json` and a capture script exist; otherwise scaffold a backend for the target app.
2. Capture only the application window where the OS supports it.
3. Keep the window size stable before every frame.
4. Use keyboard navigation or app-level test hooks when possible; use coordinates only when stable.
5. If OS privacy permissions block capture, stop and tell the user which permission is missing.

For macOS, common primitives are `screencapture -x -l <window_id>`, AppleScript activation, and app-specific automation scripts.

#### Screenshot GIF Backend

Use this backend for repeatable desktop walkthrough GIFs. It provides:

- target-window capture instead of full-screen capture;
- a single `arckit/demo-video/plan.json` for app metadata, frame order, click targets, locale variants, output paths, and README replacements;
- source frames under `arckit/demo-video/frames/<purpose-or-locale>/`;
- temporary files under `arckit/demo-video/work/`;
- final GIFs under `arckit/demo-video/output/`;
- frame-size and effective-window-bounds validation before GIF encoding;
- explicit frame ordering, with no unordered glob expansion.

Run the project capture script with `--dry-run` when it supports dry-run mode. Refresh only the requested locale or variant when possible. Do not create a separate legacy capture workspace.

### CLI Or TUI

Use this when the product value is command-line workflow.

1. Use a clean fixture directory.
2. Fix terminal width and height.
3. Prefer scripted command replay over live typing unless typing animation is part of the story.
4. Redact absolute personal paths if shown.
5. Render with a terminal recorder if available, otherwise capture text frames and compose them.

### HTML Animation

Use this as the default backend for promo MP4s, launch videos, explainers, and website hero videos. Build a complete browser-previewable animation before rendering.

1. Put source files under `arckit/demo-video/html/<name>/`.
2. Implement `window.demoVideoSpec = { width, height, fps, duration, outputName }`.
3. Implement `window.renderFrame(timeSeconds)` so capture can seek deterministically.
4. Preview the HTML locally and ask for confirmation before expensive rendering when practical.
5. Capture frames under `arckit/demo-video/frames/html-<name>/`.
6. Render a silent MP4 under `arckit/demo-video/output/<name>-silent.mp4`.
7. Add music or voiceover only after the silent master is accepted.

Use the project HTML capture script with `--dry-run` to verify the animation capture plan. Choose the capture runtime from what the target project already has: Electron for Electron apps, Playwright or Puppeteer for browser projects, or another local browser automation tool when available. Do not add a heavy dependency without user approval.

### Remotion

Use Remotion only when a video needs long-term component reuse, multiple variants, shared themes, or batch rendering. Remotion means a React-based video project, not a simple HTML preview. Avoid adding Remotion dependencies for one-off promo videos unless the user requests it.

### Static Storyboard

Use this when the app cannot run locally or capture would be brittle.

1. Build frames from existing screenshots, docs, and locally generated UI states.
2. Keep labels factual and short.
3. Use ffmpeg to combine frames into MP4/GIF.
4. Mark the output as storyboard-based in the reproduction notes.

## Render Choices

- `ffmpeg`: default for stitching frames, trimming, scaling, converting MP4 to GIF, basic captions, looping or normalizing background music, and muxing audio into MP4s.
- `gifski`: use for high-quality GIF encoding if available.
- `ImageMagick`: useful for frame inspection and simple labels if available.
- HTML/CSS capture: default for deterministic browser-native promo animation, UI mockups, kinetic type, and preview-before-render workflows.
- Remotion: use for React-based product explainers, reusable scenes, variants, and batch rendering when HTML animation is not enough.

## Optional Audio Layer Pattern

Use this only for MP4 or other audio-capable outputs. Keep GIFs silent. Keep README MP4s silent by default unless the user explicitly wants a music-enabled variant.

1. Render or preserve the visual layer first as `arckit/demo-video/output/<name>-silent.mp4`.
2. Update `arckit/demo-video/demo.md` with an `Audio Plan` section using `Mode: none` or `Mode: music`.
3. If `Mode: music`, check `arckit/demo-video/audio/index.json` and `arckit/demo-video/audio/library/music/` for reusable local music before generating anything new.
4. If the user provides music, prefer it when the source is clear and the file can be adapted to the video duration.
5. If generating music, create or render a structured track with multiple layers and preserve useful source artifacts under `arckit/demo-video/audio/library/`.
6. Create the per-video music bed under `arckit/demo-video/audio/output/`, matched to the final video duration.
7. Mux the music bed into the silent video and keep the final MP4 under `arckit/demo-video/output/`.
8. Verify both video and audio streams before reporting completion.

Minimal `demo.md` section:

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

Good reusable asset metadata in `audio/index.json`:

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
        "mix": "arckit/demo-video/audio/library/music/project-tech-bed-001.wav",
        "recipe": "arckit/demo-video/audio/library/recipes/project-tech-bed-001.json"
      },
      "reuse": "recommended"
    }
  ]
}
```

## Common Commands

Adjust paths and dimensions to the approved plan.

```bash
ffmpeg -y -framerate 1 -i "arckit/demo-video/frames/%03d.png" \
  -vf "scale=1280:-1:flags=lanczos,fps=12" \
  "arckit/demo-video/project-demo.gif"
```

```bash
bash arckit/demo-video/scripts/<html-capture-script>.sh --dry-run
```

```bash
bash arckit/demo-video/scripts/<html-capture-script>.sh
```

Loop or trim a reusable music bed to the exact video duration:

```bash
ffmpeg -y -stream_loop -1 -i "arckit/demo-video/audio/library/music/project-tech-bed-001.wav" \
  -t 30 -af "afade=t=in:st=0:d=0.5,afade=t=out:st=29.2:d=0.8" \
  "arckit/demo-video/audio/output/project-promo-music.wav"
```

Mux music into a silent MP4:

```bash
ffmpeg -y -i "arckit/demo-video/output/project-promo-silent.mp4" \
  -i "arckit/demo-video/audio/output/project-promo-music.wav" \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k \
  -shortest -movflags +faststart \
  "arckit/demo-video/output/project-promo.mp4"
```

```bash
ffprobe -v error -show_entries format=duration,size \
  -show_entries stream=width,height,r_frame_rate \
  -of default=nw=1 "arckit/demo-video/output/project-promo.mp4"
```

Check audio stream duration and peak level when background music is present:

```bash
ffprobe -v error -select_streams a:0 \
  -show_entries stream=codec_name,sample_rate,channels,duration \
  -of default=nw=1 "arckit/demo-video/output/project-promo.mp4"
```

```bash
ffmpeg -hide_banner -i "arckit/demo-video/output/project-promo.mp4" \
  -af volumedetect -f null -
```

## Workspace Document Rule

Keep exactly one persistent document in `arckit/demo-video/`: `demo.md`. Use it for the approved story, scene list, captions, output paths, and reproduction notes. Update it in place across runs. Do not create versioned, date-stamped, archived, draft, or per-run markdown files in this workspace. Keep exactly one persistent machine-readable plan too: `plan.json`.

## README Embed Patterns

Use project-relative paths.

```markdown
![Project demo](arckit/demo-video/output/project-demo.gif)
```

```markdown
<video src="arckit/demo-video/output/project-promo.mp4" controls muted playsinline></video>
```

Prefer GIF for GitHub README compatibility. Use MP4 for docs sites, landing pages, and release posts.

## Quality Bar

- The demo should show real product value within the first three seconds.
- Every scene should have one focal action or state.
- Avoid long loading states, cursor wandering, and repeated navigation.
- Keep captions short enough to read at normal playback speed.
- Do not show private workspaces, API keys, access tokens, local usernames, unrelated browser tabs, or notification banners.
