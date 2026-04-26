#!/usr/bin/env bash
# Run from Git repo root (Path = / in Cloudflare). Installs npm deps for the slim JS Worker (gateway.js).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/cloudflare-worker"
npm ci
