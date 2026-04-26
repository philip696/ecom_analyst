#!/usr/bin/env bash
# Copy backend/app into cloudflare-worker/src/app/ (legacy: in-Worker Python API experiments only).
# Default deploy uses src/gateway.js and does not bundle this tree.
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
