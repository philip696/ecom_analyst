# Deploy MarketLens to Cloudflare (and the API elsewhere)

Cloudflare **Pages** hosts the **static Next.js** app. The **Python FastAPI** API does not run on Workers; deploy it to any container host and connect with `NEXT_PUBLIC_API_URL`.

## GitHub Actions (optional)

A workflow in `.github/workflows/cloudflare-pages.yml` runs on pushes to `main` that touch `frontend/`. Add repository **variables** and **secrets**:

- **Variable** `NEXT_PUBLIC_API_URL` — your live API `https` origin (baked in at build time for GHA; empty falls back to `http://localhost:8000` in `api.ts` at runtime only if unset).
- **Secrets** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (see [Direct Upload / CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)).
- The deploy command uses `--project-name=ecomm-analyst-frontend`; create that Pages project in Cloudflare or change the name in the workflow.

## 1. Frontend — Cloudflare Pages

The app is built as a static export (`next.config.js` → `output: "export"`). The `out/` directory is the deployable site.

### Environment variables (Pages)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Public URL of the FastAPI backend, e.g. `https://api.yourdomain.com` (no trailing slash) |

Set these under **Pages project → Settings → Environment variables** for **Production** and **Preview** as needed.

### Build settings (dashboard)

For this repository, the Next app and `package-lock.json` live under **`ecomm_analyst/frontend`** (not the repo root).

- **Root directory:** `ecomm_analyst/frontend` (required here; use `frontend` only if your clone has no `ecomm_analyst/` wrapper)
- **Build command:** `npm ci && npm run build` (needs `package-lock.json` in the root directory above — if you omit the path, `npm ci` fails)
- **Build output directory:** `out`

### Troubleshooting

| Symptom | Fix |
|--------|-----|
| `npm ci` … no `package-lock.json` | Set **Root directory** to `ecomm_analyst/frontend`, or use `npm install && npm run build` (less reproducible than `npm ci`). |
| Clone: `should have been pointers` for `ecommerce.db` | `.gitattributes` must not mark `*.db` as Git LFS unless every `.db` is actually stored as an LFS pointer. This repo keeps the demo DB as a normal Git file. |

### CLI deploy (optional)

```bash
cd frontend
cp .env.production.example .env.production   # and edit NEXT_PUBLIC_API_URL, or set in dashboard only
npm run build
npx --yes wrangler@3 pages deploy out --project-name=YOUR_PROJECT_NAME
```

`wrangler.toml` in `frontend/` documents the `out` output path.

## 2. Backend — not on Cloudflare

Run FastAPI in a **container** or PaaS, for example:

- **Fly.io, Railway, Render, Google Cloud Run, AWS App Runner, DigitalOcean App Platform**

A sample **`backend/Dockerfile`** is provided. Set environment variables in that platform, for example:

| Variable | Description |
|----------|-------------|
| `FRONTEND_URL` | Your Cloudflare Pages site, e.g. `https://your-app.pages.dev` (used for CORS) |
| `DATABASE_URL` | Production: use PostgreSQL, e.g. `postgresql+psycopg2://...` (see `backend/database.py`) |
| `SECRET_KEY` | Strong random string for JWT |
| `LLM_API_KEY` / `OPENAI_API_KEY` | If using AI Insights (Deepseek by default) |

For product images, include **`data200/image/`** in the image or mount a volume; CSV seed data is under `data_200/`.

## 3. CORS

The API already allows origins from `app/main.py` (see `CORSMiddleware` and `settings.FRONTEND_URL`). Set **`FRONTEND_URL`** to the exact **Pages URL** (including `https://`).

## 4. Checklist

- [ ] `NEXT_PUBLIC_API_URL` in Cloudflare Pages  
- [ ] `FRONTEND_URL` and `DATABASE_URL` (and `SECRET_KEY`) on the API host  
- [ ] API publicly reachable with HTTPS (Mixed Content if the page is `https://`)  
- [ ] Re-seed or migrate DB in production as needed
