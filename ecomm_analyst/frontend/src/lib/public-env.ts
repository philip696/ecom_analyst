/**
 * Public env (NEXT_PUBLIC_*) baked in at `next build` for static export.
 *
 * - **Local:** set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local`, or omit to default to :8000.
 * - **Cloudflare Pages:** set `NEXT_PUBLIC_API_URL` to your Worker HTTPS origin (no trailing slash). When it is a
 *   non-local `https://` URL, `next.config.js` emits `public/_redirects` so `/api/*` and `/images/*` proxy to the
 *   Worker same-origin (no CORS). The client uses an empty base URL in that mode (`NEXT_PUBLIC_BROWSER_API_BASE`).
 * - **Direct-to-Worker (CORS must allow your Pages origin):** set `NEXT_PUBLIC_API_USE_PROXY=0` on the Pages build.
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
    console.warn(
      "[config] NEXT_PUBLIC_API_URL is unset — browser requests will use http://localhost:8000. " +
        "Set NEXT_PUBLIC_API_URL before `next build` (e.g. on Cloudflare Pages env vars).",
    );
  }
  return "http://localhost:8000";
}
