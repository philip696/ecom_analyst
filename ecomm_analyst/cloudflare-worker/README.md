# E‑Commerce Analyst — Cloudflare Worker (JavaScript gateway)

This Worker is a **small JavaScript** script (`src/gateway.js`) for **Cloudflare Workers**.

**Deployed URL:** `https://ecom-analyst.philip-dewanto.workers.dev/` (script name **`ecom-analyst`** on account **`philip-dewanto.workers.dev`**; see `wrangler.jsonc` → `name`).

1. **`/images/*`** — objects from **R2** (`image/<filename>` keys, same as local Docker).
2. **`/api/*`** — proxied to **`API_UPSTREAM`** (your FastAPI host).
3. **All other paths** — **Workers [static assets](https://developers.cloudflare.com/workers/static-assets/)** from the Next **`out/`** build (`wrangler.jsonc` → `assets.directory`), with **`not_found_handling: single-page-application`** so client routes work.

So one Worker can ship **UI + gateway** on the same `*.workers.dev` hostname; FastAPI still runs at **`API_UPSTREAM`** (any HTTPS host) or, if you adopt it separately, **[Cloudflare Containers](https://developers.cloudflare.com/containers/)**.

### Deploy (UI + Worker together)

From repo root:

```bash
bash ecomm_analyst/deploy-cloudflare-worker.sh
```

That runs **`frontend` → `npm ci` && `npm run build`**, then **`wrangler deploy`** from `cloudflare-worker/`. To redeploy only the gateway script (skip the Next build): **`SKIP_FRONTEND=1 bash ecomm_analyst/deploy-cloudflare-worker.sh`**.

**`wrangler dev`:** build the frontend first so **`../frontend/out`** exists: `cd ../frontend && npm ci && npm run build`.

**CORS / canvas:** if users open the app at **`*.workers.dev`** instead of Pages, set **`FRONTEND_URL`** (and optional **`ALLOWED_CORS_ORIGINS`**) to include that origin so `/images` CORS and API **`FRONTEND_URL`** stay aligned.

The **FastAPI** app is **not** bundled here. Run it wherever you host the Python API (container, another URL, etc.), then set **`API_UPSTREAM`** in the Worker to that **HTTPS base URL** (no trailing slash). The repo ships **`API_UPSTREAM` empty** in `wrangler.jsonc` so you set it in the **Cloudflare dashboard** or via Wrangler—avoid committing a real API URL.

### API_UPSTREAM missing (503)

You must define **`API_UPSTREAM`** on the deployed Worker (empty string in `wrangler.jsonc` is intentional).

**Option A — Dashboard:** [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **`ecom-analyst`** → **Settings** → **Variables and secrets** → **Add** → name **`API_UPSTREAM`**, value your FastAPI base (e.g. `https://api.example.com`, no trailing slash). Use type **Secret** if you prefer it hidden in the UI. Save; Worker environment updates apply without a new deployment in most cases.

**Option B — CLI (recommended):** from `cloudflare-worker/` after `npx wrangler login`:

```bash
npx wrangler secret put API_UPSTREAM
```

Paste your FastAPI base URL when prompted (https, no trailing slash). Redeploy if your pipeline overwrites vars:

```bash
bash ../deploy-cloudflare-worker.sh
```

**Local `wrangler dev`:** copy **`.dev.vars.example`** to **`.dev.vars`** and set **`API_UPSTREAM`** there (`.dev.vars` is gitignored).

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

- **`API_UPSTREAM`** — HTTPS origin for FastAPI (no trailing slash). **Required** for **`/api/*`** proxying (the HTML UI is served from static assets, not from FastAPI). Example: `https://api.yourdomain.com`.
- **`FRONTEND_URL`** — your **Pages** site origin (used for `/images` CORS and should match **`FRONTEND_URL`** on the API for JSON CORS).

**Before relying on the Worker:** open **`API_UPSTREAM`** in a browser or `curl -sI` it and confirm **200** from FastAPI.

### Cloudflare **1016** (“Origin DNS error”) on subrequests

If the Worker’s **`fetch(API_UPSTREAM + …)`** fails with **1016**, Cloudflare could not resolve the **origin hostname** you set. Fix DNS for that host, or correct **`API_UPSTREAM`** to a hostname that actually exists and serves your API.

## Frontend (Pages **or** this Worker)

- **All-in-one Worker:** `deploy-cloudflare-worker.sh` bakes the Next app into the Worker. Open **`https://ecom-analyst.philip-dewanto.workers.dev/`** — use **same-origin** `/api` (build already sets empty browser API base when proxy mode targets that Worker URL).
- **Cloudflare Pages only:** set **`NEXT_PUBLIC_API_URL`** to the Worker origin; **`_redirects`** proxies `/api/*` to the Worker. You can keep both Pages and Worker-hosted UI if you want; pick one primary URL for **`FRONTEND_URL`** on the API.

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
