#!/usr/bin/env bash
# Run from Git repo root. Executes inside cloudflare-worker/ (wrangler.jsonc + pyproject.toml).
#
# Slim Worker: R2 /images + fetch() proxy to API_UPSTREAM (Fly). Uses pywrangler so the Python
# runtime is bundled correctly; pyproject.toml has no heavy PyPI deps (fits Workers Free ~3 MiB gzip).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/cloudflare-worker"
npm ci

_ensure_uv() {
  export PATH="${HOME}/.local/bin:${HOME}/.cargo/bin:${PATH}"
  if command -v uv >/dev/null 2>&1; then
    return 0
  fi
  echo "Installing uv (needed for pywrangler)..." >&2
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="${HOME}/.local/bin:${HOME}/.cargo/bin:${PATH}"
  command -v uv >/dev/null 2>&1
}

_ensure_uv
uv sync --group dev
exec uv run pywrangler deploy
