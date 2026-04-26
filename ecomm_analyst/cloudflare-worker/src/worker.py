"""
Cloudflare Python Worker (slim, free-tier friendly):

- Serve product images from R2 at /images/* (same keys as local/Fly).
- Forward all other requests to **API_UPSTREAM** (Fly or any HTTPS origin) via fetch.

Bundling FastAPI + Pydantic + SQLAlchemy in the Worker exceeds the Workers Free gzip limit (~3 MiB);
run the API on Fly (see ../backend/fly.toml) and set `API_UPSTREAM` in wrangler vars.
"""
from __future__ import annotations

import mimetypes
from urllib.parse import unquote, urlparse

from js import Request, fetch
from workers import WorkerEntrypoint, Response


def _upstream_base(env) -> str:
    raw = getattr(env, "API_UPSTREAM", None) or ""
    return str(raw).strip().rstrip("/")


def _allowed_origins(env) -> set[str]:
    raw = (getattr(env, "ALLOWED_CORS_ORIGINS", None) or "").strip()
    fe = (getattr(env, "FRONTEND_URL", None) or "").strip()
    out: set[str] = set()
    if raw:
        for x in raw.split(","):
            x = x.strip()
            if x:
                out.add(x)
    else:
        if fe:
            out.add(fe)
        out.update(["http://localhost:3000", "http://127.0.0.1:3000"])
    return {x for x in out if x}


def _cors_allow_origin(request, env) -> str:
    allowed = _allowed_origins(env)
    o = request.headers.get("origin", "") if request.headers else ""
    if o in allowed:
        return o
    fe = getattr(env, "FRONTEND_URL", None) or ""
    return fe or "*"


def _image_cors_headers(request, env) -> dict[str, str]:
    allow = _cors_allow_origin(request, env)
    return {
        "Access-Control-Allow-Origin": allow,
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "600",
    }


def _r2_key_for_path(path: str) -> str | None:
    if not path.startswith("/images/"):
        return None
    tail = path.removeprefix("/images/").lstrip("/")
    if not tail or ".." in tail:
        return None
    return f"image/{unquote(tail)}"


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        url = urlparse(str(request.url))
        path = url.path or "/"

        if path.startswith("/images"):
            if request.method == "OPTIONS":
                return Response("", status=204, headers=_image_cors_headers(request, self.env))

            if request.method not in ("GET", "HEAD"):
                return Response("Method Not Allowed", status=405, headers=_image_cors_headers(request, self.env))

            key = _r2_key_for_path(path)
            if not key:
                return Response("Not Found", status=404, headers=_image_cors_headers(request, self.env))

            obj = await self.env.IMAGES.get(key)
            if obj is None:
                return Response("Not Found", status=404, headers=_image_cors_headers(request, self.env))

            ctype, _ = mimetypes.guess_type(key)
            h = _image_cors_headers(request, self.env)
            h.setdefault("Content-Type", ctype or "application/octet-stream")
            if hasattr(obj, "httpEtag") and obj.httpEtag:
                h["etag"] = str(obj.httpEtag)

            if request.method == "HEAD":
                return Response("", status=200, headers=h)

            body = obj.body if hasattr(obj, "body") else None
            return Response(body, status=200, headers=h)

        base = _upstream_base(self.env)
        if not base:
            return Response(
                "Worker misconfigured: set wrangler var API_UPSTREAM to your HTTPS API "
                "(e.g. https://ecom-analyst-api.fly.dev).",
                status=503,
                headers={"Content-Type": "text/plain; charset=utf-8"},
            )

        tail = path or "/"
        qs = ("?" + url.query) if url.query else ""
        target = f"{base}{tail}{qs}"
        new_req = Request.new(target, request)
        return await fetch(new_req)
