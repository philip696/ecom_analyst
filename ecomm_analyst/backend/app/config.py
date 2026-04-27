"""
App-wide settings loaded from .env via pydantic-settings.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./ecommerce.db"
    SECRET_KEY: str = "dev-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    # Deepseek (default) uses an OpenAI-compatible API. Set LLM_API_KEY or OPENAI_API_KEY in .env.
    LLM_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    LLM_BASE_URL: str = "https://api.deepseek.com/v1"
    LLM_MODEL: str = "deepseek-chat"
    FRONTEND_URL: str = "http://localhost:3000"
    # Comma-separated browser origins for CORS. Empty = FRONTEND_URL + local Next (3000).
    ALLOWED_CORS_ORIGINS: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()


def cors_allow_origins() -> list[str]:
    """Origins allowed for CORS (JSON API and /images)."""
    raw = settings.ALLOWED_CORS_ORIGINS.strip()
    if raw:
        parts = [x.strip() for x in raw.split(",") if x.strip()]
    else:
        parts = [
            settings.FRONTEND_URL.strip(),
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    out: list[str] = []
    seen: set[str] = set()
    for p in parts:
        if p and p not in seen:
            seen.add(p)
            out.append(p)
    return out
