#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

if [[ " ${*:-} " == *" --dry-run "* ]]; then
  node arckit/showcase-video/scripts/inspect-html-promo.mjs "$@"
  exit 0
fi

ELECTRON_BIN="${ROOT_DIR}/node_modules/.bin/electron"
if [[ ! -x "$ELECTRON_BIN" ]]; then
  echo "Missing Electron binary at node_modules/.bin/electron. Run npm install first." >&2
  exit 1
fi

"$ELECTRON_BIN" arckit/showcase-video/scripts/capture-html-promo.cjs "$@"
