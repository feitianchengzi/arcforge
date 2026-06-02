---
name: project-demo-video
description: Understand the current software project, confirm a demo story, pause for visual preview approval, then capture and generate README-ready GIFs or promotional MP4 videos using screenshot GIF, HTML animation, optional Remotion, and optional audio layers. Use when asked to make a software demo, product walkthrough, launch video, promo video, app GIF, README animation, feature tour, or usage video from the current repository or local app.
---

# Project Demo Video

Create software demo GIFs and promotional videos from the current project. The skill owns the full loop: understand the product locally, propose a story, ask only necessary clarifying questions, pause at explicit human decision gates, generate the asset after approval, and verify it.

Keep the workflow local-first. Do not use hosted video generators, public upload services, or external registries unless the user explicitly asks.

## Core Contract

- Start from the repository and local project context, not from a blank creative prompt.
- Confirm the demo story before recording or rendering.
- Treat story approval, visual-preview approval, audio approval, and final-render approval as separate decisions when they materially apply.
- After the required approvals for the current phase, proceed autonomously until blocked by missing credentials, missing local permissions, unavailable dependencies, or an ambiguous product path.
- Prefer accurate product footage over generic mockups.
- Produce concrete artifacts, not only a storyboard.
- Keep all intermediate and final artifacts in the project workspace, normally under `arckit/demo-video/` or a user-specified path.

## Human Decision Gates

Use explicit approval gates. A casual "ok", "可以", or "go" only approves the gate you just presented; it does not automatically approve later gates.

Required gates:

- **Story Gate**: before modifying demo files, recording, rendering, or adding audio, summarize the deliverable, audience, story arc, backend, duration, aspect ratio, audio plan, and output paths. Wait for approval.
- **Visual Preview Gate**: before any long render or final MP4/GIF export from HTML, Remotion, generated frames, or a visually revised capture, provide a preview route: a local HTML URL/file path, a short preview render, or first/middle/final stills. Ask whether to proceed to final rendering.
- **Audio Gate**: before generating, importing, or muxing music/voiceover, confirm the audio mode and direction unless the user has already explicitly requested that exact audio layer.
- **Audio Direction Gate**: when the user asks for new or revised background music, do not jump straight to generation from vague adjectives such as "cool", "dynamic", or "not busy". First summarize the intended musical brief: style, energy, density, whether it should follow visible motion or remain a background bed, and whether it may replace the current final mix. Wait for approval of that brief.
- **Final Render Gate**: after visual and audio previews are accepted, state exactly which variants will be rendered, then render and verify.

Return to the relevant gate when the user gives visual or pacing feedback. For example, layout, captions, language, speed, scene composition, or animation-continuity feedback returns to the Visual Preview Gate, not directly to final rendering.

## Workflow

### 1. Understand The Project

Inspect the local project before asking questions:

- Read high-signal docs: `README*`, `docs/`, `CHANGELOG*`, `AGENTS.md`, product/spec files, and app screenshots or existing demo assets.
- Inspect scripts and app shape: package manifests, CLI entry points, Electron/Tauri configs, web routes, test fixtures, and demo data.
- Identify the likely audience, core workflow, product vocabulary, brand tone, and run commands.
- Find existing capture assets such as `docs/assets/`, `public/`, screenshots, GIFs, videos, or `arckit/demo-video/`.

Do not over-scan dependency directories. Avoid `node_modules`, build outputs, release bundles, and cache directories unless the project stores demo assets there.

### 2. Propose A Demo Story

Summarize the proposed direction in a short confirmation message:

- target deliverable: GIF, MP4, or both;
- target audience and use: README, docs, landing page, release post, or social clip;
- story arc: 3-6 scenes with visible user actions or product states;
- backend choice: screenshot GIF for real UI demos, HTML animation for promo or explainer MP4s, Remotion for complex reusable video systems, or fallback frame scripting only when browser rendering is unavailable;
- audio layer decision: `none` or `music`; GIFs are always `none`, README MP4s default to `none`, and promo or release MP4s may use `music`;
- background music direction when `music` is selected: mood, BPM or pacing, intensity curve, loopability, and whether to reuse a prior local music asset;
- rough duration, aspect ratio, and output paths;
- dependencies or permissions likely needed.

Ask at most three clarifying questions. Only ask questions that change the artifact materially. If defaults are reasonable, state the defaults and ask for approval.

### 3. Wait For Approval

Do not record, render, install dependencies, or modify docs until the user approves the proposed direction.

Approval can be explicit, such as "go", "approved", "use this direction", or a direct instruction to generate. If the user changes the story, update the plan and confirm again.

### 4. Build A Preview

After approval, choose the simplest reliable route:

- Web app: start the local dev server, use Playwright/Puppeteer or existing browser tooling to drive the route and capture screenshots or video.
- Desktop app: use app-specific automation, window capture, or the screenshot GIF backend driven by `arckit/demo-video/plan.json` when present.
- CLI/TUI: record terminal output with deterministic commands, fixtures, and stable dimensions.
- No runnable app: build a storyboard from existing screenshots, docs, and generated static frames, then render with ffmpeg or a lightweight animation stack.
- Polished promo: prefer the HTML animation backend so the user can preview the full animation in a browser before rendering. Use Remotion only for complex, reusable, React-component video systems. Use direct SVG/PNG frame scripting only as a fallback when browser rendering is unavailable.

Stop at the Visual Preview Gate after the preview is ready. For HTML animation, provide the preview file path or local server URL and mention any available query parameters such as locale or capture mode. For non-interactive previews, provide representative stills or a short low-cost preview render. Do not run the long capture/render command until the user approves this preview.

Read [references/execution-patterns.md](references/execution-patterns.md) when selecting or implementing the capture/render path. Read [references/scaffold.md](references/scaffold.md) when the target project does not yet have an `arckit/demo-video/` workspace or backend scripts.

### 5. Generate Outputs

Default artifact workspace, scaffolded per project when missing:

- `arckit/demo-video/demo.md` as the only persistent document in this workspace. Update this file in place; do not create dated, versioned, archived, or per-run document copies.
- `arckit/demo-video/plan.json` as the single machine-readable capture/render plan. Update it in place.
- `arckit/demo-video/frames/` for captured or generated source frames, with subfolders by purpose or locale.
- `arckit/demo-video/work/` for temporary manifests, browser recordings, render inputs, and logs.
- `arckit/demo-video/html/` for previewable HTML animation sources.
- `arckit/demo-video/scripts/` for project-specific capture or render scripts.
- `arckit/demo-video/audio/` for reusable and per-render background music and voiceover assets.
- `arckit/demo-video/output/` for final GIF and MP4 assets that may coexist.

Keep generated intermediates inside `arckit/demo-video/work/` unless they are reusable source frames, which belong in `arckit/demo-video/frames/`. Keep documents global and singular: update `arckit/demo-video/demo.md` instead of creating `v1`, date-stamped, draft, history, archive, or iteration docs. Keep the plan global and singular too: update `arckit/demo-video/plan.json` in place. Use explicit ordered frame lists. Do not rely on unordered glob expansion for GIFs. GIF and MP4 outputs are expected to coexist in `arckit/demo-video/output/` when both are useful. When rendering MP4, preserve a silent master such as `arckit/demo-video/output/<name>-silent.mp4` before adding any background music so the visual layer can be reused or remixed.

Preview and final output rules:

- Candidate renders use explicit preview names such as `<name>-preview.mp4`, `<name>-audio-preview.mp4`, or `<name>-<candidate>-preview.mp4`.
- Do not overwrite final outputs such as `<name>.mp4` or `<name>-zh.mp4` until the user explicitly selects a preview or says to make that candidate final.
- Do not update default mux scripts, embed paths, README links, or final filenames to a new audio/video candidate until the user selects it.
- When a candidate is selected, apply it consistently to all requested final variants, then verify those final files.

Candidate and rollback rules:

- Track each candidate with a short id in `demo.md`, `plan.json`, or the audio index when those files are in use.
- If a candidate is rejected, keep or delete it according to local usefulness, but do not treat it as the active default.
- If the user asks to "回退", "undo", or "go back", revert only the most recent unaccepted candidate unless they explicitly ask to revert confirmed video, audio, or documentation.

### 6. Verify Before Finishing

Validate the artifact before reporting completion:

- file exists and is non-empty;
- expected dimensions, duration, and frame rate;
- first, middle, and final frames are not blank;
- visible UI text is readable at target size;
- no private keys, tokens, personal file paths, or unintended windows are visible;
- README/docs embeds point to existing project-relative paths if docs were updated.
- MP4s with background music have an audio stream, matching or slightly exceeding video duration, no clipping, and no unintended long silence.

For videos, use `ffprobe` when available. For audio, use `ffprobe`, `volumedetect`, or `loudnorm` when available to inspect duration, stream presence, peak level, and approximate loudness. For GIFs, inspect dimensions with `ffprobe`, ImageMagick, or another available local tool. If validation cannot run, say exactly why.

## Backend Selection

Choose the backend after the story is approved:

- Screenshot GIF backend: use for real desktop UI walkthroughs, README GIFs, locale variants, and repeatable app-window captures.
- HTML animation backend: use by default for promo MP4s, launch videos, explainers, website hero videos, and any video that benefits from browser preview before rendering.
- Remotion backend: use only when the project needs a maintained React video system with reusable components, variants, or batch rendering. Do not introduce Remotion for a one-off promo unless the user asks.
- Direct SVG/PNG frame scripting: fallback only. Do not keep it as the primary route when HTML or Remotion is available.

## Optional Audio Layer

Audio is a third layer after story and visuals. It is optional and must not become a default dependency for demo generation.

- Story layer: product narrative, scenes, captions, and visible actions.
- Visual layer: GIF, silent MP4, captured frames, HTML animation, or promo visuals.
- Audio layer: `none`, background `music`, `voiceover`, or `music+voiceover`.

Only add background music when the requested deliverable is an MP4, social clip, launch video, or other audio-capable asset. GIFs are always silent. README MP4s default to silent or autoplay-friendly. Promo and release MP4s may use background music when it improves the artifact. Tutorial MP4s should use music only when it stays quiet and does not compete with the screen content.

If audio was not already approved in the Story Gate, stop at the Audio Gate before generating or muxing audio. If the user later changes pacing, duration, language variants, or the final edit, re-check whether the music bed still fits before muxing.

For background music iteration:

- Generate at most one or two candidates per user-approved brief.
- When a user rejects a candidate, summarize the likely reason from their feedback before generating the next candidate.
- Prefer changing the brief before changing the implementation. For example, distinguish "too busy", "too soft", "not synced", "too theatrical", "too generic", and "wrong genre".
- A music preview may be a standalone audio file and, when useful, a non-destructive preview mux against the current silent video. Do not re-render the visual layer just to audition audio.

Update `arckit/demo-video/demo.md` with an `Audio Plan` section whenever a story is approved:

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

Treat background music as a reusable production asset, not a throwaway render side effect:

- First check `arckit/demo-video/audio/index.json` and `arckit/demo-video/audio/library/music/` for an existing local asset that fits the story.
- If the user provides music, treat it as the preferred source asset after checking the format, duration, and provenance notes.
- If a reusable asset fits, trim, loop, or lightly remix it instead of generating a new track.
- If generating new music locally, create a real arrangement with multiple layers such as drums, bass, harmony, melody, texture, risers, or impacts. Do not use a single sine tone, drone, or unstructured test sound as background music unless the user explicitly asks for ambient sound design.
- Prefer local instruments, SoundFonts, sample libraries, MIDI renderers, DAWs, or deterministic synthesis available in the workspace before any external service.
- Use hosted music generators only if the user explicitly requests or permits them.
- Do not use copyrighted or provenance-unknown music or voice assets. Every kept asset needs a source or license note in `audio/index.json`.
- Preserve source material that may be useful later: final mix, stems when available, and the generation recipe or MIDI/config data needed to reproduce the track.
- Record reusable assets in `arckit/demo-video/audio/index.json` with id, title, duration, BPM when known, key when known, mood tags, source method, file paths, license or provenance notes, and reuse recommendation.

Recommended audio workspace:

```text
arckit/demo-video/audio/
  index.json
  library/
    music/
    stems/
    sfx/
    recipes/
  work/
  output/
```

Use `audio/library/` for assets worth keeping across videos. Use `audio/work/` for temporary renders and analysis files. Use `audio/output/` for the exact music bed or final audio track used by the current video. Do not overwrite a reusable music asset just because a new video is rendered; create a new id or update `index.json` if the asset is intentionally revised.

Production quality bar for background music:

- Match the product tone and audience; operational software should usually sound focused, modern, and restrained rather than theatrical.
- Build a clear structure: intro, main bed, transition, outro, or a documented loop point.
- Fit the video edit by trimming, looping, extending, or arranging to the actual duration instead of abruptly cutting.
- Export stereo audio suitable for video, preferably 48 kHz for final MP4 muxing.
- Avoid clipping; keep true or sample peak below roughly `-1 dB` when tools allow.
- Target practical online-video loudness, usually around `-16 LUFS` to `-14 LUFS` for music-only promo clips when `loudnorm` is available.
- Keep the mix non-intrusive for demos where UI details matter. Voiceover scripts must be confirmed before audio generation or recording.

## Defaults

- README GIF: 8-15 seconds, 1280 px wide, no audio, concise labels only when needed.
- Promo MP4: 20-45 seconds, 16:9 by default, HTML animation backend by default, optional captions, optional background music or voiceover when requested.
- Social crop: only create vertical or square variants if requested.
- Style: follow the product's existing UI and documentation tone; do not invent a flashy brand language for operational software.
- Privacy: use demo data, local fixtures, or sanitized examples.

## Desktop Screenshot GIF Backend

Use the screenshot GIF backend when the approved story needs a repeatable desktop-app walkthrough. If `arckit/demo-video/plan.json` and a project capture script already exist, reuse them. If they do not exist, scaffold project-specific plan and scripts from the target app context before capturing. This backend owns stable app-window capture, locale variants when applicable, ordered source frames, frame consistency checks, GIF encoding, and README image replacement.

The backend is an execution path inside this skill, not a separate skill. Keep its plan, scripts, frames, temporary files, and GIF outputs inside the target project's `arckit/demo-video/`.

## HTML Animation Backend

Use this as the default promo-video backend. Build a deterministic HTML animation under `arckit/demo-video/html/<name>/`, expose `window.demoVideoSpec`, and implement `window.renderFrame(timeSeconds)` so capture can seek to exact frame times. Preview the HTML in a browser for user confirmation before rendering. Render with an existing project capture script such as `arckit/demo-video/scripts/<html-capture-script>.sh`, or scaffold one for the target project only after preview approval. The script should capture frames under `arckit/demo-video/frames/html-<name>/` and write a silent MP4 to `arckit/demo-video/output/`.

For visual revisions to an existing HTML animation, edit the HTML/CSS/JS, run cheap syntax or dry-run checks, then return to the Visual Preview Gate. Do not treat feedback approval as permission to launch the full render unless the user explicitly approves the preview-to-render step.

If a dedicated Remotion or video-editing skill is installed, use it only after the story is approved and only for the render implementation.
