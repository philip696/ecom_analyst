#!/usr/bin/env bash
# Copy demo SQLite DB into src/ before deploy (gitignored). Wrangler only bundles under moduleRoot `src/`;
# a DB at the worker repo root is never uploaded, which breaks SQLAlchemy at runtime (Worker 1101).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/../backend/ecommerce.db"
DST="$ROOT/src/ecommerce.db"
if [[ ! -f "$SRC" ]]; then
  echo "Missing $SRC — run backend once or restore ecommerce.db" >&2
  exit 1
fi
mkdir -p "$ROOT/src"
cp "$SRC" "$DST"
echo "Copied to $DST"
