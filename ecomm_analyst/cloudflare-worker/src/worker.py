"""
Cloudflare Python Worker: serve product images from R2 at /images/*,
then forward all other traffic to the existing FastAPI app (ASGI).
"""
from __future__ import annotations

import mimetypes
import os
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

from workers import WorkerEntrypoint, Response

_WORKER_ROOT = Path(__file__).resolve().parents[1]
_REPO_ROOT = _WORKER_ROOT.parent
_BACKEND = _REPO_ROOT / "backend"
sys.path.insert(0, str(_BACKEND))

_DB = _WORKER_ROOT / "ecommerce.db"

_fastapi_app = None


def _sync_os_environ_from_bindings(env) -> None:
    """Wrangler vars/secrets live on `env`; pydantic reads os.environ."""
    for key in (
        "FRONTEND_URL",
        "ALLOWED_CORS_ORIGINS",
        "SECRET_KEY",
        "DATABASE_URL",
        "LLM_API_KEY",
        "OPENAI_API_KEY",
        "LLM_BASE_URL",
        "LLM_MODEL",
        "CF_WORKER",
    ):
        val = getattr(env, key, None)
        if val is not None and str(val).strip():
            os.environ[key] = str(val)
    os.environ.setdefault("CF_WORKER", "1")
    if _DB.is_file():
        os.environ.setdefault("DATABASE_URL", f"sqlite:///{_DB}")


def _load_fastapi_app(env):
    global _fastapi_app
    if _fastapi_app is not None:
        return _fastapi_app
    _sync_os_environ_from_bindings(env)
    from app.main import app as _loaded  # noqa: E402

    _fastapi_app = _loaded
    return _fastapi_app


def _allowed_origins(env) -> set[str]:
    """Match backend `cors_allow_origins`: FRONTEND_URL + localhost, or ALLOWED_CORS_ORIGINS list."""
    raw = (getattr(env, "ALLOWED_CORS_ORIGINS", None) or os.environ.get("ALLOWED_CORS_ORIGINS") or "").strip()
    fe = (getattr(env, "FRONTEND_URL", None) or os.environ.get("FRONTEND_URL", "")).strip()
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
    fe = getattr(env, "FRONTEND_URL", None) or os.environ.get("FRONTEND_URL", "")
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

        import asgi

        app = _load_fastapi_app(self.env)
        return await asgi.fetch(app, request.js_object, self.env)
