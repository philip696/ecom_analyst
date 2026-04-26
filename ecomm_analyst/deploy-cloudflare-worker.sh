#!/usr/bin/env bash
# Run from Git repo root. Builds the Next static export, then deploys the Worker with
# **Workers Static Assets** (UI from ../frontend/out) + gateway.js for /api/* and /images/*.
#
# Set SKIP_FRONTEND=1 to deploy only gateway changes without running `next build`.
#
# R2 /images + fetch() proxy to API_UPSTREAM (set in Wrangler / dashboard).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
if [[ "${SKIP_FRONTEND:-}" != "1" ]]; then
  cd "$HERE/frontend"
  npm ci
  npm run build
fi
cd "$HERE/cloudflare-worker"
npm ci
exec npx wrangler deploy
