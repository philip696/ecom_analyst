/**
 * Slim gateway Worker (JavaScript): R2 at /images/* + reverse proxy to API_UPSTREAM (Fly).
 *
 * The previous Python entrypoint hit opaque 1101 errors in production (Pyodide/FFI edge cases).
 * This module uses standard Workers fetch/R2 and stays tiny for the Free plan.
 */

export default {
  /**
   * @param {Request} request
   * @param {{ IMAGES: R2Bucket, FRONTEND_URL?: string, ALLOWED_CORS_ORIGINS?: string, API_UPSTREAM?: string }} env
   * @param {ExecutionContext} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let path = url.pathname || "/";
    if (!path.startsWith("/")) path = `/${path}`;

    if (path.startsWith("/images")) {
      return handleImages(request, env, path);
    }

    const base = (env.API_UPSTREAM || "").toString().trim().replace(/\/+$/, "");
    if (!base) {
      return new Response(
        "Worker misconfigured: set wrangler var API_UPSTREAM (e.g. https://ecom-analyst-api.fly.dev).",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    }

    const target = `${base}${path}${url.search}`;
    return fetch(new Request(target, request));
  },
};

/** @param {Request} request @param {*} env */
function allowedOrigins(env) {
  const raw = (env.ALLOWED_CORS_ORIGINS || "").toString().trim();
  const fe = (env.FRONTEND_URL || "").toString().trim();
  /** @type {Set<string>} */
  const out = new Set();
  if (raw) {
    for (const x of raw.split(",")) {
      const t = x.trim();
      if (t) out.add(t);
    }
  } else {
    if (fe) out.add(fe);
    out.add("http://localhost:3000");
    out.add("http://127.0.0.1:3000");
  }
  return out;
}

/** @param {Request} request @param {*} env */
function corsAllowOrigin(request, env) {
  const allowed = allowedOrigins(env);
  const o = request.headers.get("Origin") || "";
  if (allowed.has(o)) return o;
  const fe = (env.FRONTEND_URL || "").toString().trim();
  return fe || "*";
}

/** @param {Request} request @param {*} env */
function imageCorsHeaders(request, env) {
  const allow = corsAllowOrigin(request, env);
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Max-Age": "600",
  };
}

/** @param {string} path */
function r2KeyForPath(path) {
  if (!path.startsWith("/images/")) return null;
  let tail = path.slice("/images/".length).replace(/^\/+/, "");
  if (!tail || tail.includes("..")) return null;
  try {
    tail = decodeURIComponent(tail);
  } catch {
    return null;
  }
  return `image/${tail}`;
}

/** @param {string} key */
function guessContentType(key) {
  const lower = key.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

/**
 * @param {Request} request
 * @param {*} env
 * @param {string} path
 */
async function handleImages(request, env, path) {
  const h = imageCorsHeaders(request, env);
  if (request.method === "OPTIONS") {
    return new Response("", { status: 204, headers: h });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: h });
  }

  const key = r2KeyForPath(path);
  if (!key) {
    return new Response("Not Found", { status: 404, headers: h });
  }

  const obj = await env.IMAGES.get(key);
  if (!obj) {
    return new Response("Not Found", { status: 404, headers: h });
  }

  const headers = new Headers(h);
  const ctype = guessContentType(key);
  headers.set("Content-Type", ctype);
  if (obj.httpEtag) headers.set("etag", obj.httpEtag);

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(obj.body, { status: 200, headers });
}
