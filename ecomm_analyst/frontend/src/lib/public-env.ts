/**
 * Public env (NEXT_PUBLIC_*) baked in at `next build` for static export.
 *
 * - **Local:** set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local`, or omit to default to :8000.
 * - **Cloudflare Pages:** set `NEXT_PUBLIC_API_URL` to your Worker/API HTTPS origin (no trailing slash) under
 *   Project → Settings → Environment variables for **Production** (and Preview if you use previews), then rebuild.
 */
export function getPublicApiUrl(): string {
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
