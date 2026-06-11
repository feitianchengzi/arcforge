#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

LOCALE="en"
for arg in "$@"; do
  if [[ "$arg" == "--locale=zh" ]]; then
    LOCALE="zh"
  fi
done

SUFFIX=""
if [[ "$LOCALE" == "zh" ]]; then
  SUFFIX="-zh"
fi

SILENT_VIDEO="arckit/showcase-video/output/arcforge-promo${SUFFIX}-silent.mp4"
MUSIC_BED="arckit/showcase-video/audio/output/arcforge-promo-signal-bed.wav"
FINAL_VIDEO="arckit/showcase-video/output/arcforge-promo${SUFFIX}.mp4"

if [[ ! -f "$SILENT_VIDEO" ]]; then
  echo "Missing silent video: $SILENT_VIDEO" >&2
  exit 1
fi

if [[ ! -f "$MUSIC_BED" ]]; then
  node arckit/showcase-video/scripts/generate-promo-music.cjs
fi

ffmpeg -y \
  -i "$SILENT_VIDEO" \
  -i "$MUSIC_BED" \
  -map 0:v:0 \
  -map 1:a:0 \
  -c:v copy \
  -c:a aac \
  -b:a 192k \
  -af "loudnorm=I=-16:TP=-1.5:LRA=8,volume=-1.2dB" \
  -ar 48000 \
  -shortest \
  -movflags +faststart \
  "$FINAL_VIDEO"

echo "Rendered $FINAL_VIDEO"
