"""
FastAPI application entry point.
Run with:  uvicorn app.main:app --reload --port 8000
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.config import cors_allow_origins, settings
from app.database import Base, engine
from app.routers import auth, comments, dashboard, engagement, insights, products, sales


# Mounted StaticFiles can omit CORS headers; canvas needs them when img.crossOrigin = "anonymous".
class StaticImagesCORSMiddleware(BaseHTTPMiddleware):
    """Ensure /images/* responses include CORS for the browser (Next.js / Pages)."""

    _allowed = frozenset(cors_allow_origins())

    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/images") and request.method == "OPTIONS":
            o = request.headers.get("origin", "")
            allow = o if o in self._allowed else settings.FRONTEND_URL
            h = {
                "Access-Control-Allow-Origin": allow,
                "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": "600",
            }
            return Response(status_code=204, headers=h)
        response = await call_next(request)
        if request.url.path.startswith("/images"):
            o = request.headers.get("origin", "")
            allow = o if o in self._allowed else settings.FRONTEND_URL
            response.headers["Access-Control-Allow-Origin"] = allow
        return response

# Create all tables on startup (fine for SQLite/dev; use Alembic for production)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="E-Commerce Analytics API",
    description="Analytics platform for marketplace sellers (Shopee, Taobao, Temu, etc.)",
    version="1.0.0",
)

# ── CORS (API JSON). Static /images also patched above for canvas + crossOrigin. ──
app.add_middleware(StaticImagesCORSMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(products.router)
app.include_router(sales.router)
app.include_router(engagement.router)
app.include_router(comments.router)
app.include_router(insights.router)



# ── Static files (product images) — backend/data200/image/ ─────────────────
# On Cloudflare Workers, /images/* is served from R2 by src/worker.py (see cloudflare-worker/).
_images_dir = os.path.join(os.path.dirname(__file__), "..", "data200", "image")
if os.environ.get("CF_WORKER") != "1" and os.path.isdir(_images_dir):
    app.mount("/images", StaticFiles(directory=_images_dir), name="images")


@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "message": "E-Commerce Analytics API is running"}
