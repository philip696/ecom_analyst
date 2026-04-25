#!/usr/bin/env bash
# Run from Git repo root. Must execute wrangler in cloudflare-worker/ (where wrangler.jsonc lives).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/cloudflare-worker"
npm ci
if [[ ! -f ecommerce.db ]]; then
  bash scripts/sync-ecommerce-db.sh
fi
exec npx wrangler deploy
