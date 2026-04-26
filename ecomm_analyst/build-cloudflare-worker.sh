#!/usr/bin/env bash
# Run from Git repo root (Path = / in Cloudflare). Installs npm deps and copies demo DB for the Python Worker.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/cloudflare-worker"
npm ci
bash scripts/sync-backend-vendor.sh
bash scripts/sync-ecommerce-db.sh
node scripts/prepare-worker-sqlite.mjs src/ecommerce.db
