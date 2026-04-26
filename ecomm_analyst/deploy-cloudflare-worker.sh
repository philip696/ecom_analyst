#!/usr/bin/env bash
# Run from Git repo root. Must execute inside cloudflare-worker/ (where wrangler.jsonc + pyproject.toml live).
#
# Use **pywrangler** (not plain `wrangler deploy`) so PyPI deps from pyproject.toml (FastAPI, SQLAlchemy, …)
# are bundled. `npx wrangler deploy` only uploads Python sources → ModuleNotFoundError: fastapi at runtime.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/cloudflare-worker"
npm ci
if [[ ! -d src/app ]]; then
  bash scripts/sync-backend-vendor.sh
fi
if [[ ! -f src/ecommerce.db ]]; then
  bash scripts/sync-ecommerce-db.sh
fi

_ensure_uv() {
  export PATH="${HOME}/.local/bin:${HOME}/.cargo/bin:${PATH}"
  if command -v uv >/dev/null 2>&1; then
    return 0
  fi
  echo "Installing uv (needed for pywrangler + Python dependency bundle)..." >&2
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="${HOME}/.local/bin:${HOME}/.cargo/bin:${PATH}"
  command -v uv >/dev/null 2>&1
}

_ensure_uv
uv sync --group dev
# Pyodide has no bcrypt wheel; vendored security.py uses pbkdf2_sha256. Rehash demo user
# so login still works (demo@example.com / demo1234) after copying backend/ecommerce.db.
uv run python scripts/rehash_demo_password_pyodide.py src/ecommerce.db
exec uv run pywrangler deploy
