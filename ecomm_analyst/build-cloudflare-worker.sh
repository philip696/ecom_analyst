#!/usr/bin/env bash
# Run from Git repo root (Path = / in Cloudflare). Installs npm deps for the slim Python Worker.
# No vendored FastAPI / SQLite — the Worker proxies API traffic to Fly (see wrangler API_UPSTREAM).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/cloudflare-worker"
npm ci
