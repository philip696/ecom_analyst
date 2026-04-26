/** @type {import('next').NextConfig} */
const fs = require("fs");
const path = require("path");

// Cloudflare Pages sets CF_PAGES=1 during build. NEXT_PUBLIC_* must be set on the **Pages** project
// (Workers & Pages → your *frontend* Pages project → Settings → Variables and Secrets → + Add).
// Wrangler’s “Build environment variables: (none found)” only reflects [vars] in wrangler.toml, not the dashboard.
if (process.env.CF_PAGES === "1" && !String(process.env.NEXT_PUBLIC_API_URL || "").trim()) {
  console.warn(
    "\n[Pages] NEXT_PUBLIC_API_URL is not set for this build. " +
      "Add it on your Pages project (frontend): Settings → Variables and Secrets → Production (and Preview if needed). " +
      "Value = Worker API origin, e.g. https://ecom-analyst.xxx.workers.dev (no trailing slash). " +
      "Without it, the built site will still use http://localhost:8000.\n",
  );
}

const apiUrlRaw = String(process.env.NEXT_PUBLIC_API_URL || "")
  .trim()
  .replace(/\/$/, "");
/** Same-origin proxy on Pages: avoid browser CORS to the Worker when API URL is a public https origin. */
const usePagesApiProxy =
  process.env.NEXT_PUBLIC_API_USE_PROXY !== "0" &&
  /^https:\/\//.test(apiUrlRaw) &&
  !/localhost|127\.0\.0\.1/i.test(apiUrlRaw);

const browserApiBase = usePagesApiProxy ? "" : apiUrlRaw || "http://localhost:8000";

const redirectsPath = path.join(__dirname, "public", "_redirects");
try {
  if (usePagesApiProxy) {
    const lines = [
      `/api/* ${apiUrlRaw}/api/:splat 200`,
      `/images/* ${apiUrlRaw}/images/:splat 200`,
      "",
    ].join("\n");
    fs.mkdirSync(path.dirname(redirectsPath), { recursive: true });
    fs.writeFileSync(redirectsPath, lines, "utf8");
  } else if (fs.existsSync(redirectsPath)) {
    fs.unlinkSync(redirectsPath);
  }
} catch (e) {
  console.warn("[next.config] Could not write public/_redirects:", e);
}

const nextConfig = {
  // Static export for Cloudflare Pages (or any static host)
  output: "export",
  env: {
    NEXT_PUBLIC_BROWSER_API_BASE: browserApiBase,
  },
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Canvas/force graph must never load in Node; accidental SSR resolution causes dev 500s.
      config.resolve.alias = {
        ...config.resolve.alias,
        "react-force-graph-2d": false,
        "force-graph": false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
