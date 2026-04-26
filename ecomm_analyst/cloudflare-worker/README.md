# E‑Commerce Analyst — Cloudflare Worker (JavaScript gateway)

This Worker is a **small JavaScript** script (`src/gateway.js`) for **Cloudflare Workers**.

**Deployed URL:** `https://ecom-analyst.philip-dewanto.workers.dev/` (script name **`ecom-analyst`** on account **`philip-dewanto.workers.dev`**; see `wrangler.jsonc` → `name`).

1. **`/images/*`** — objects from **R2** (`image/<filename>` keys, same as local Docker).
2. **Everything else** — **`fetch(new Request(upstream, request))`** to **`API_UPSTREAM`**.

The **FastAPI** app is **not** bundled here. Run it wherever you host the Python API (container, another URL, etc.), then set **`API_UPSTREAM`** in the Worker to that **HTTPS base URL** (no trailing slash). The repo ships **`API_UPSTREAM` empty** in `wrangler.jsonc` so you set it in the **Cloudflare dashboard** (Worker → **Variables and secrets**) or in your CI secrets—avoid committing a real API URL.

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

Edit **`wrangler.jsonc`** or the Worker dashboard:

- **`API_UPSTREAM`** — HTTPS origin for FastAPI (no trailing slash). **Required** for `/api/*` and `/` proxying. Example shape: `https://api.yourdomain.com` (your real host).
- **`FRONTEND_URL`** — your **Pages** site origin (used for `/images` CORS and should match **`FRONTEND_URL`** on the API for JSON CORS).

**Before relying on the Worker:** open **`API_UPSTREAM`** in a browser or `curl -sI` it and confirm **200** from FastAPI.

### Cloudflare **1016** (“Origin DNS error”) on subrequests

If the Worker’s **`fetch(API_UPSTREAM + …)`** fails with **1016**, Cloudflare could not resolve the **origin hostname** you set. Fix DNS for that host, or correct **`API_UPSTREAM`** to a hostname that actually exists and serves your API.

## Frontend (Pages)

Set **`NEXT_PUBLIC_API_URL`** on Pages to **`https://ecom-analyst.philip-dewanto.workers.dev`** (no trailing slash), or rely on **`frontend/deploy-urls.js`** which already defaults to that origin. Pages `_redirects` can proxy `/api/*` to the Worker if you use that pattern.

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
| `scripts/sync-backend-vendor.sh` | Legacy experiments only (vendored Python app under `src/app/`). |
| `scripts/sync-ecommerce-db.sh` | Same — not used by the default JS gateway. |

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| **503** API_UPSTREAM | Set **`API_UPSTREAM`** (Wrangler `vars`, dashboard variable, or **secret**), redeploy Worker. |
| **502** from proxy | Origin down, wrong URL, or TLS — verify the API host directly. |
| **1016** on proxy | Origin hostname does not resolve — fix DNS or **`API_UPSTREAM`**. |
| **CORS** | Set **`FRONTEND_URL`** on the **FastAPI** host to your Pages origin (`backend/app/main.py`). |
| **Images 404** | Run R2 sync; keys are `image/<slug>.jpg`. |

## Layout

| Path | Role |
|------|------|
| `src/gateway.js` | R2 `/images/*` + proxy to `API_UPSTREAM` |
| `wrangler.jsonc` | Vars + R2 binding `IMAGES` |
