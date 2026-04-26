#!/usr/bin/env bash
# Copy backend/app into cloudflare-worker/vendor/backend/ so deploy bundles the FastAPI package
# (the Workers isolate does not include repo-parent ../backend by default).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/../backend/app"
DST="$ROOT/vendor/backend/app"
if [[ ! -d "$SRC" ]]; then
  echo "Missing $SRC — run from monorepo with backend/app present" >&2
  exit 1
fi
rm -rf "$ROOT/vendor/backend"
mkdir -p "$ROOT/vendor/backend"
cp -R "$SRC" "$DST"
echo "Vendored FastAPI app -> $DST"
