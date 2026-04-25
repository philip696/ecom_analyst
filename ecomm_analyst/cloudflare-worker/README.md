# E‑Commerce Analyst API on Cloudflare (Python Worker)

This directory deploys the **same FastAPI app** as `../backend/` to **Cloudflare Python Workers** (open beta). Product images are served from **R2** at `/images/*` (same URLs as the Docker/Fly setup).

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (Astral’s Python installer)
- Cloudflare account + `npx wrangler login`

## One-time Cloudflare setup

1. **Create the R2 bucket** (name must match `wrangler.jsonc` → `bucket_name`, default `ecom-analyst-product-images`):

   ```bash
   npx wrangler r2 bucket create ecom-analyst-product-images
   ```

2. **Edit `wrangler.jsonc`**: set `vars.FRONTEND_URL` to your Cloudflare Pages URL (`https://….pages.dev`). Optionally change `name` (Worker hostname) and `bucket_name` if you use different names (keep the binding key `IMAGES` unless you change code).

3. **Upload images** from the repo (keys `image/<filename>` match `backend/data200/image/`):

   ```bash
   cd cloudflare-worker
   npm install
   chmod +x scripts/*.sh
   ./scripts/sync-r2-images.sh
   ```

4. **Copy the SQLite demo DB** into this folder before each deploy (file is gitignored here):

   ```bash
   ./scripts/sync-ecommerce-db.sh
   ```

## Secrets (production)

```bash
cd cloudflare-worker
npx wrangler secret put SECRET_KEY
npx wrangler secret put LLM_API_KEY   # optional, for AI insights
```

`FRONTEND_URL` is already a plain `var` in `wrangler.jsonc`; override with `wrangler secret put FRONTEND_URL` if you prefer not to commit it.

For **Postgres** instead of SQLite, set `DATABASE_URL` as a secret (and add a supported driver to `pyproject.toml` per [Python Workers packages](https://developers.cloudflare.com/workers/languages/python/packages/)).

## Install Python deps + deploy

```bash
cd cloudflare-worker
npm install
uv sync
./scripts/sync-ecommerce-db.sh
uv run pywrangler deploy
```

Dev server (local):

```bash
uv run pywrangler dev
```

## Frontend

Set **`NEXT_PUBLIC_API_URL`** on Pages to your Worker URL, e.g. `https://ecom-analyst-cf-api.<your-subdomain>.workers.dev` (exact host is shown after deploy).

## Limitations

- **Python Workers are beta**; not every PyPI package works. If `bcrypt` fails to import, passwords fall back to **pbkdf2_sha256** for *new* hashes only — existing bcrypt hashes in `ecommerce.db` would need re-registration or a migration.
- **SQLite** in the bundle is fine for demos; production should use **Postgres + Hyperdrive** (or another supported pattern).
- **Cold starts** and **CPU limits** apply; long-running jobs are a poor fit.

## Layout

| Path | Role |
|------|------|
| `src/worker.py` | R2 handler for `/images/*`, then ASGI → FastAPI |
| `../backend/app/` | Shared API implementation |
| `scripts/sync-r2-images.sh` | Upload `data200/image/*` → R2 |
| `scripts/sync-ecommerce-db.sh` | Copy `ecommerce.db` for the bundle |
