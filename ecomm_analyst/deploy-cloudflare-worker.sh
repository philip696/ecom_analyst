#!/usr/bin/env bash
# Run from Git repo root. Executes inside cloudflare-worker/ (wrangler.jsonc).
#
# Slim **JavaScript** Worker: R2 /images + fetch() proxy to API_UPSTREAM (Fly). No Python/Pyodide.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/cloudflare-worker"
npm ci
exec npx wrangler deploy
