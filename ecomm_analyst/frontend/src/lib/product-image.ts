/**
 * API origin for static files and JSON (`NEXT_PUBLIC_API_URL`). Used for
 * `backend` → `/images/*` (served from `backend/data200/image/` on the server).
 */
import { getPublicApiUrl } from "./public-env";

export function getApiBaseUrl(): string {
  return getPublicApiUrl();
}

/**
 * Resolves `Product.image_url` for use in <img> or Image(): absolute URL to the API.
 * Matches the pricing `ProductImage` pattern: `{api}/images/{filename}` when the DB
 * stores bare filenames (e.g. `foo.jpg`).
 */
export function resolveProductImageUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const u = String(raw).trim();
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const base = getApiBaseUrl();
  if (u.startsWith("/images/")) {
    return `${base}${u}`;
  }
  if (u.startsWith("images/")) {
    return `${base}/${u}`;
  }
  if (u.startsWith("/")) {
    return `${base}${u}`;
  }
  return `${base}/images/${u}`;
}

export function truncateProductName(name: string, maxLen: number): string {
  const t = name.trim() || "—";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}
