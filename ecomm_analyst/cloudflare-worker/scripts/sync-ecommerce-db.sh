#!/usr/bin/env bash
# Copy demo SQLite DB into cloudflare-worker/ before deploy (file is gitignored here).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/../backend/ecommerce.db"
DST="$ROOT/ecommerce.db"
if [[ ! -f "$SRC" ]]; then
  echo "Missing $SRC — run backend once or restore ecommerce.db" >&2
  exit 1
fi
cp "$SRC" "$DST"
echo "Copied to $DST"
