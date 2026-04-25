#!/usr/bin/env bash
# Upload backend/data200/image/* to R2 with keys image/<filename>.
#
# R2 does NOT cap buckets at 100 images (see https://developers.cloudflare.com/r2/platform/limits/).
# If only ~100 uploaded before, Wrangler API throttling or transient errors usually stopped the script.
# This version retries each PUT and adds a short delay between objects.
#
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

put_with_retry() {
  local bucket_key="$1" file="$2" ct="$3"
  local attempt=1 max=5 wait=2
  while (( attempt <= max )); do
    if npx wrangler r2 object put "$bucket_key" --file="$file" --content-type="$ct" --remote; then
      return 0
    fi
    echo "  retry $attempt/$max for $(basename "$file")..." >&2
    sleep "$wait"
    wait=$((wait * 2))
    attempt=$((attempt + 1))
  done
  return 1
}

total=$(find "$IMG" -maxdepth 1 -type f | wc -l | tr -d ' ')
ok=0
fail=0
i=0
while IFS= read -r f; do
  [[ -f "$f" ]] || continue
  i=$((i + 1))
  bn=$(basename "$f")
  case "$bn" in
    *.jpg|*.jpeg|*.JPG|*.JPEG) ct="image/jpeg" ;;
    *.png|*.PNG) ct="image/png" ;;
    *.webp|*.WEBP) ct="image/webp" ;;
    *.gif|*.GIF) ct="image/gif" ;;
    *) ct="application/octet-stream" ;;
  esac
  echo "[$i/$total] PUT $BUCKET/image/$bn"
  if put_with_retry "$BUCKET/image/$bn" "$f" "$ct"; then
    ok=$((ok + 1))
  else
    echo "FAILED: $bn" >&2
    fail=$((fail + 1))
  fi
  sleep 0.12
done < <(find "$IMG" -maxdepth 1 -type f | LC_ALL=C sort)

echo "Done. ok=$ok fail=$fail total=$total"
if (( fail > 0 )); then
  exit 1
fi
