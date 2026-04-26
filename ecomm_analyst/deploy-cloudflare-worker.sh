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
# Pyodide has no bcrypt wheel; vendored security.py uses pbkdf2_sha256. The copied DB still
# has bcrypt hashes — rewrite demo user with a fixed pbkdf2_sha256 hash for demo1234.
# Cloudflare build Python often has no _sqlite3, so use the OS sqlite3 CLI (not stdlib).
if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "sqlite3 CLI required to rehash demo password for worker bundle" >&2
  exit 1
fi
# Regenerate if you change the demo password: python3 -c "from passlib.context import CryptContext as C; c=C(schemes=['pbkdf2_sha256'],deprecated='auto'); print(c.hash('YOUR_PLAIN'))"
sqlite3 src/ecommerce.db "UPDATE users SET hashed_password = '\$pbkdf2-sha256\$29000\$E0LofW8NgbA2ptRai5HS.g\$Q2bCxS9/m/lrdJExBAXUY0KbDf9mVVLh2YOSVRxIXrI' WHERE email = 'demo@example.com';"
exec uv run pywrangler deploy
