#!/usr/bin/env bash
# Copy backend/app into cloudflare-worker/src/app/ so Wrangler bundles it.
# moduleRoot for main = src/worker.py is only the `src/` tree; sibling `vendor/` is never uploaded.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/../backend/app"
DST="$ROOT/src/app"
if [[ ! -d "$SRC" ]]; then
  echo "Missing $SRC — run from monorepo with backend/app present" >&2
  exit 1
fi
rm -rf "$DST"
mkdir -p "$ROOT/src"
cp -R "$SRC" "$DST"
echo "Vendored FastAPI app -> $DST"
