# E‑Commerce Analyst — Cloudflare Worker (JavaScript gateway)

This Worker is a **small JavaScript** script (`src/gateway.js`) so it stays reliable on **Workers Free** and avoids Python-on-the-edge / Pyodide issues that showed up as opaque **1101** errors.

1. **`/images/*`** — objects from **R2** (`image/<filename>` keys, same as Fly/local).
2. **Everything else** — **`fetch(new Request(upstream, request))`** to **`API_UPSTREAM`** (Fly: `https://ecom-analyst-api.fly.dev` by default in `wrangler.jsonc`).

The **FastAPI** app runs on **Fly** only; this Worker is a CDN + reverse proxy in front of it.

## Prerequisites

- Node.js 20+
- Cloudflare account, R2 enabled, `npx wrangler login`

## Workers Builds (dashboard)

| Field | Command (repo clone root, `Path` = `/`) |
|-------|----------------------------------------|
| **Build** | `bash ecomm_analyst/build-cloudflare-worker.sh` |
| **Deploy** | `bash ecomm_analyst/deploy-cloudflare-worker.sh` |

If **Path** is `ecomm_analyst`, use `bash build-cloudflare-worker.sh` / `bash deploy-cloudflare-worker.sh`.

## Configuration

Edit **`wrangler.jsonc`**:

- **`vars.API_UPSTREAM`** — HTTPS origin for FastAPI (no trailing slash).
- **`vars.FRONTEND_URL`** — your Pages URL (used for `/images` CORS).

**Fly** must be deployed and reachable at `API_UPSTREAM`.

## Frontend

Set **`NEXT_PUBLIC_API_URL`** on Pages to this Worker’s URL. Pages `_redirects` can still proxy `/api/*` to the same origin if you use that pattern.

## R2 images

```bash
cd cloudflare-worker
npm ci
./scripts/sync-r2-images.sh
```

Bucket name must match `wrangler.jsonc` → `r2_buckets[].bucket_name`.

## Optional legacy scripts

| Script | Purpose |
|--------|---------|
| `scripts/sync-backend-vendor.sh` | Only if you experiment with an **in-Worker** Python API again (not used by default). |
| `scripts/sync-ecommerce-db.sh` | Same — bundled SQLite was for the old Python Worker. |

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| **503** API_UPSTREAM | Set **`API_UPSTREAM`** in `wrangler.jsonc` or Dashboard → Variables. |
| **502** from proxy | Fly app down, wrong URL, or TLS — check `fly status` and the var. |
| **CORS** | Set **`FRONTEND_URL`** on Fly to your Pages origin (see `backend/app/main.py`). |
| **Images 404** | Run R2 sync; keys are `image/<slug>.jpg`. |

## Layout

| Path | Role |
|------|------|
| `src/gateway.js` | R2 `/images/*` + proxy to `API_UPSTREAM` |
| `wrangler.jsonc` | Vars + R2 binding `IMAGES` |
