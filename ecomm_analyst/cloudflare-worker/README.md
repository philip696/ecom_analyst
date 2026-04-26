# E‑Commerce Analyst API on Cloudflare (Python Worker)

This directory deploys the **same FastAPI app** as `../backend/` to **Cloudflare Python Workers** (open beta). Product images are served from **R2** at `/images/*` (same URLs as the Docker/Fly setup).

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (Astral’s Python installer)
- Cloudflare account + `npx wrangler login`

### Cloudflare Workers Builds — **build** vs **deploy**

Use **two different commands**:

| Dashboard field | Command (repo root `Path` = `/`) |
|-----------------|-----------------------------------|
| **Build command** | `bash ecomm_analyst/build-cloudflare-worker.sh` |
| **Deploy command** | `bash ecomm_analyst/deploy-cloudflare-worker.sh` |

Do **not** put `deploy-cloudflare-worker.sh` in the **build** field — that runs `wrangler deploy` too early and duplicates work.

**If the log looks like yours:** build runs `deploy-cloudflare-worker.sh` (Worker uploads successfully), then **Deploy** runs plain `npx wrangler deploy` from the **repo root** → *“Could not detect a directory containing static files”*. **Fix:** set **Build** to `bash ecomm_analyst/build-cloudflare-worker.sh` only, and set **Deploy** to `bash ecomm_analyst/deploy-cloudflare-worker.sh` (never bare `npx wrangler deploy` unless you `cd ecomm_analyst/cloudflare-worker` first).

If Cloudflare’s **Path** is **`ecomm_analyst`**, use `bash build-cloudflare-worker.sh` / `bash deploy-cloudflare-worker.sh`.

### Cloudflare Workers “Build command” (details)

If the **root path** is the **repository root** (not `cloudflare-worker/`), `npm ci` will fail because `package-lock.json` is not there. Use **one** of these for **build only**:

| Root path in dashboard | Build command |
|-------------------------|---------------|
| **`ecomm_analyst/cloudflare-worker`** | `npm ci && bash scripts/sync-backend-vendor.sh && bash scripts/sync-ecommerce-db.sh` (vendor copies `backend/app` → `src/app/` so Wrangler bundles it) |
| **`/`** (clone root) | `bash ecomm_analyst/build-cloudflare-worker.sh` |
| **`ecomm_analyst`** (app folder) | `bash build-cloudflare-worker.sh` |

`npx wrangler deploy` **must run inside `cloudflare-worker/`** (where `wrangler.jsonc` is). From the repo root, use **`deploy-cloudflare-worker.sh`** in the **Deploy** field only — running `wrangler deploy` from the repo root triggers static-site auto-detect and fails.

## One-time Cloudflare setup

0. **Turn on R2 for your account** (required or deploy fails with `code: 10042` *“Please enable R2 through the Cloudflare Dashboard”*): [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2** → **Purchase R2** / enable (free tier exists; you must accept product terms once). Your **API token** for CI needs **Account → Workers R2 Storage → Edit** (or equivalent) so Workers Builds can create/bind buckets.

1. **Create the R2 bucket** (name must match `wrangler.jsonc` → `bucket_name`, default `ecom-analyst-product-images`):

   ```bash
   npx wrangler r2 bucket create ecom-analyst-product-images
   ```

2. **Edit `wrangler.jsonc`**: set `vars.FRONTEND_URL` to your Cloudflare Pages URL (`https://….pages.dev`). The Worker **`name`** is **`ecom-analyst`** so it matches Workers Builds when your Cloudflare project is named `ecom-analyst`. Change `bucket_name` if you use a different R2 bucket (keep binding key **`IMAGES`** unless you change `src/worker.py`).

3. **Upload images** from the repo (keys `image/<filename>` match `backend/data200/image/`).  
   **R2 does not limit you to 100 files** — buckets allow [unlimited objects](https://developers.cloudflare.com/r2/platform/limits/). If a run stopped around 100, it was almost certainly **API throttling** or **transient errors** from many sequential `wrangler r2 object put` calls; the sync script retries and spaces requests. Re-run `./scripts/sync-r2-images.sh` to fill in any missing keys.

```bash
cd cloudflare-worker
npm ci   # package-lock.json is committed for Cloudflare/Git CI
chmod +x scripts/*.sh
./scripts/sync-r2-images.sh
```

**Faster bulk upload (200+ files):** use the **S3-compatible API** (R2 → *Manage R2 API Tokens*) with `aws s3 sync`, e.g. map local folder to the `image/` prefix:

```bash
export AWS_ACCESS_KEY_ID="…"
export AWS_SECRET_ACCESS_KEY="…"
export AWS_ENDPOINT_URL="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
aws s3 sync ../backend/data200/image/ "s3://${R2_BUCKET}/image/" --only-show-errors
```

Use the same bucket name as in `wrangler.jsonc` (`ecom-analyst-product-images` by default).

4. **Vendor the FastAPI app** into `src/app/` before deploy (required: Wrangler’s Python `moduleRoot` is only `src/`, so code outside `src/` — including an old `vendor/` tree — is **not** uploaded):

   ```bash
   ./scripts/sync-backend-vendor.sh
   ```

5. **Copy the SQLite demo DB** into this folder before each deploy (file is gitignored here):

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
npm ci
uv sync
./scripts/sync-backend-vendor.sh
./scripts/sync-ecommerce-db.sh
uv run pywrangler deploy
```

Dev server (local):

```bash
uv run pywrangler dev
```

## Frontend

Set **`NEXT_PUBLIC_API_URL`** on Pages to your Worker URL, e.g. `https://ecom-analyst.<your-subdomain>.workers.dev` (exact host is shown after deploy).

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| **1101 Worker threw exception** on first API hit | Ensure **`sync-backend-vendor.sh`** ran before deploy. The FastAPI package must live under **`src/app/`** (Wrangler only bundles `src/**/*.py` when `main` is `src/worker.py`). A copy under `vendor/` is never uploaded. |
| **1101 after DB shows in upload** | Bundled `ecommerce.db` is not a real disk path in the isolate. The worker copies it to **`/tmp/ecom-analyst-worker.sqlite3`** and sets `DATABASE_URL` before importing FastAPI. Set `DATABASE_URL` yourself (secret) to skip that. |
| **`ModuleNotFoundError: No module named 'fastapi'`** | Deploy must use **`uv run pywrangler deploy`** (see `deploy-cloudflare-worker.sh`). Plain **`npx wrangler deploy`** uploads your `src/` code only and **does not** bundle `pyproject.toml` dependencies. |

## Limitations

- **Python Workers (Pyodide)** cannot install **bcrypt**; the worker bundle omits it and uses **pbkdf2_sha256** only. `deploy-cloudflare-worker.sh` runs the **`sqlite3` CLI** (not Python’s `sqlite3` module — Cloudflare’s build Python often lacks `_sqlite3`) to set a fixed **pbkdf2** hash for `demo@example.com` / `demo1234`. Other users seeded with bcrypt would need a similar migration or re-register.
- **SQLite** in the bundle is fine for demos; production should use **Postgres + Hyperdrive** (or another supported pattern).
- **Cold starts** and **CPU limits** apply; long-running jobs are a poor fit.

## Layout

| Path | Role |
|------|------|
| `src/worker.py` | R2 handler for `/images/*`, then ASGI → FastAPI |
| `src/app/` | Vendored copy of `../backend/app` (must be under `src/` for Wrangler to upload) |
| `../backend/app/` | Source of truth; copy via `scripts/sync-backend-vendor.sh` |
| `scripts/sync-r2-images.sh` | Upload `data200/image/*` → R2 |
| `scripts/sync-backend-vendor.sh` | Copy FastAPI package into `src/app/` |
| `scripts/sync-ecommerce-db.sh` | Copy `ecommerce.db` → `src/ecommerce.db` (must ship inside `src/` + `rules` Data `**/*.db`) |
