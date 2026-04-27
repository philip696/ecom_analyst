/**
 * Public env (NEXT_PUBLIC_*) baked in at `next build` for static export.
 *
 * - **API URL:** Prefer `NEXT_PUBLIC_API_URL` (see `frontend/.env.local`). `next.config.js` sets
 *   `NEXT_PUBLIC_BROWSER_API_BASE` for the client; this file reads that when present.
 * - **Direct API (no same-origin proxy):** `NEXT_PUBLIC_API_USE_PROXY=0` if you use a static host
 *   that does not use `_redirects` forwarding.
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

  return "http://localhost:8000";
}
