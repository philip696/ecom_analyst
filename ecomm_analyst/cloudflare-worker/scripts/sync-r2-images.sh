#!/usr/bin/env bash
# Upload backend/data200/image/* to R2 with keys image/<filename>.
# Requires: npm install in cloudflare-worker/, wrangler logged in (npx wrangler login).
# Usage: R2_BUCKET=ecom-analyst-product-images ./scripts/sync-r2-images.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMG="$ROOT/../backend/data200/image"
BUCKET="${R2_BUCKET:-ecom-analyst-product-images}"
cd "$ROOT"
if [[ ! -d "$IMG" ]]; then
  echo "Missing image dir: $IMG" >&2
  exit 1
fi
shopt -s nullglob
for f in "$IMG"/*; do
  [[ -f "$f" ]] || continue
  bn=$(basename "$f")
  case "$bn" in
    *.jpg|*.jpeg|*.JPG|*.JPEG) ct="image/jpeg" ;;
    *.png|*.PNG) ct="image/png" ;;
    *.webp|*.WEBP) ct="image/webp" ;;
    *.gif|*.GIF) ct="image/gif" ;;
    *) ct="application/octet-stream" ;;
  esac
  echo "PUT s3://$BUCKET/image/$bn ($ct)"
  npx wrangler r2 object put "$BUCKET/image/$bn" --file="$f" --content-type="$ct" --remote
done
echo "Done."
