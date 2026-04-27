# Marketplace logo assets

Place image files here. They are served by the API at:

**`{API_ORIGIN}/marketplace-assets/{slug}.{ext}`**

Supported extensions (tried in order): **`.png` → `.svg` → `.webp`**

## Slugs (filename without extension)

| Slug | Used for |
|------|-----------|
| `taobao` | Taobao |
| `jd` | JD / JD.com |
| `shopee` | Shopee |
| `temu` | Temu |
| `facebook_marketplace` | Facebook Marketplace |
| `lazada` | Lazada (settings / integrations) |

**`all` channels** has no logo file; the UI uses the globe emoji only.

Use square or wide logos; the frontend displays them with `object-contain` (typically 20–32px).

After adding or changing files, restart the FastAPI server if it does not pick up new files (StaticFiles reads from disk per request).
