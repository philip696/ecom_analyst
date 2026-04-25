# FastAPI is not on Cloudflare Workers; run this on Fly.io, Railway, Render, Google Cloud Run, etc.
# Point NEXT_PUBLIC_API_URL in Cloudflare Pages to the public API URL. Set CORS: FRONTEND_URL on the API.
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY data200 ./data200
COPY data_200 ./data_200
# Demo SQLite DB (optional locally); baked in so Fly boots with data without a volume
COPY ecommerce.db ./ecommerce.db
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
