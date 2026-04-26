// eslint-disable-next-line @typescript-eslint/no-require-imports -- shared with next.config.js
const { DEPLOY_WORKER_API_ORIGIN } = require("../../deploy-urls.js") as {
  DEPLOY_WORKER_API_ORIGIN: string;
};

/**
 * Public env (NEXT_PUBLIC_*) baked in at `next build` for static export.
 *
 * - **Defaults:** `deploy-urls.js` → Worker `https://ecom-analyst.workers.dev`; production builds use it unless
 *   `NEXT_PUBLIC_API_URL` is set. `next.config.js` may use same-origin `_redirects` (empty browser base).
 * - **Local API:** `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local`.
 * - **Direct-to-Worker:** `NEXT_PUBLIC_API_USE_PROXY=0` on the Pages build.
 */
export function getPublicApiUrl(): string {
  const baked =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_BROWSER_API_BASE : undefined;
  if (baked !== undefined) {
    return String(baked).replace(/\/$/, "");
  }

  const raw = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL : undefined;
  const u = (raw ?? "").trim();
  if (u) return u.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    return DEPLOY_WORKER_API_ORIGIN.replace(/\/$/, "");
  }
  return "http://localhost:8000";
}
