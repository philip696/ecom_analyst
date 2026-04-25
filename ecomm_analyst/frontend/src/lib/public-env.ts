/**
 * Public env vars (NEXT_PUBLIC_*) for browser + SSR.
 * Set in `frontend/.env.local` (see `.env.local.example`). Rebuild after changes.
 */
export function getPublicApiUrl(): string {
  const raw = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL : undefined;
  const u = (raw ?? "").trim();
  if (u) return u.replace(/\/$/, "");
  return "http://localhost:8000";
}
