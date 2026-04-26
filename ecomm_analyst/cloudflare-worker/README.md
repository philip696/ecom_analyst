# E‑Commerce Analyst — Cloudflare Worker (slim)

This Worker is intentionally **small** so it fits **Workers Free** (~3 MiB gzip):

1. **`/images/*`** — objects from **R2** (same `image/<slug>.jpg` keys as Fly/local).
2. **Everything else** — **`fetch()` proxy** to **`API_UPSTREAM`** (your **Fly** API by default: `https://ecom-analyst-api.fly.dev`).

The FastAPI app is **not** bundled here. Running **FastAPI + Pydantic v2 + SQLAlchemy** inside a Python Worker produces a **~5+ MiB gzip** upload (`pydantic_core` alone is ~4 MiB), which exceeds the free tier. To colocate the full API on Workers you need **Workers Paid** (10 MiB) and would restore a vendored `src/app/` + full `pyproject.toml` dependencies (see git history before the slim proxy switch).

## Prerequisites

- Node.js 20+
- [uv](https://docs.astral.sh/uv/) (for `pywrangler deploy`)
- Cloudflare account, R2 enabled, `npx wrangler login`

## Workers Builds (dashboard)

| Field | Command (repo clone root, `Path` = `/`) |
|-------|----------------------------------------|
| **Build** | `bash ecomm_analyst/build-cloudflare-worker.sh` |
| **Deploy** | `bash ecomm_analyst/deploy-cloudflare-worker.sh` |

If **Path** is `ecomm_analyst`, use `bash build-cloudflare-worker.sh` / `bash deploy-cloudflare-worker.sh`.

## Configuration

Edit **`wrangler.jsonc`**:

- **`vars.API_UPSTREAM`** — HTTPS origin for the FastAPI app (no trailing slash). Must match your Fly app name or custom domain.
- **`vars.FRONTEND_URL`** — your Pages URL (CORS for `/images` and forwarded API responses rely on Fly’s CORS config, which should list this origin).

**Fly must be deployed** (`fly deploy` from `backend/`) so `API_UPSTREAM` responds. Set the same **`FRONTEND_URL`** / **`SECRET_KEY`** / DB secrets on Fly as before.

## Frontend

Set **`NEXT_PUBLIC_API_URL`** on Pages to this Worker’s URL, e.g. `https://ecom-analyst.<subdomain>.workers.dev`. The browser talks only to the Worker; the Worker proxies `/api/*` to Fly and serves `/images/*` from R2.

## R2 images

See **`scripts/sync-r2-images.sh`** (upload `backend/data200/image/` → `image/` prefix). Bucket name must match `wrangler.jsonc` → `r2_buckets[].bucket_name`.

## Optional scripts (not used by default CI)

| Script | Purpose |
|--------|---------|
| `scripts/sync-backend-vendor.sh` | Legacy: copy `../backend/app` → `src/app/` for an **in-Worker** FastAPI experiment (paid tier / large bundle only). |
| `scripts/sync-ecommerce-db.sh` | Legacy: copy SQLite into `src/` for that same experiment. |

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| **503** *set wrangler var API_UPSTREAM* | Set **`API_UPSTREAM`** in `wrangler.jsonc` or Dashboard → Worker → Settings → Variables. |
| **502 / fetch failed** from proxy | Fly app stopped, wrong URL, or TLS issue — `fly status`, check `API_UPSTREAM`. |
| **CORS** on API from Pages | Ensure Fly has **`FRONTEND_URL`** (or `ALLOWED_CORS_ORIGINS`) matching your Pages origin. |
| **Images 404** | Run R2 sync; keys are `image/<filename>.jpg`. |

## Layout

| Path | Role |
|------|------|
| `src/worker.py` | R2 `/images/*` + `Request.new` + `fetch` proxy to `API_UPSTREAM` |
| `wrangler.jsonc` | `API_UPSTREAM`, `FRONTEND_URL`, R2 binding `IMAGES` |
