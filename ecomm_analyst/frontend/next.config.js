/** @type {import('next').NextConfig} */
const fs = require("fs");
const path = require("path");

const { DEPLOY_WORKER_API_ORIGIN } = require("./deploy-urls.js");

// Optional override: NEXT_PUBLIC_API_URL on Pages / .env.local. Otherwise production builds use deploy-urls.js.
const fromEnv = String(process.env.NEXT_PUBLIC_API_URL || "")
  .trim()
  .replace(/\/$/, "");
const useDeployDefault =
  !fromEnv && (process.env.NODE_ENV === "production" || process.env.CF_PAGES === "1");
const apiUrlRaw = fromEnv || (useDeployDefault ? DEPLOY_WORKER_API_ORIGIN : "");
const effectiveApiUrl = apiUrlRaw || "http://localhost:8000";

/** Same-origin proxy on Pages: avoid browser CORS to the Worker when API URL is a public https origin. */
const usePagesApiProxy =
  process.env.NEXT_PUBLIC_API_USE_PROXY !== "0" &&
  /^https:\/\//.test(effectiveApiUrl) &&
  !/localhost|127\.0\.0\.1/i.test(effectiveApiUrl);

const browserApiBase = usePagesApiProxy ? "" : effectiveApiUrl;

const redirectsPath = path.join(__dirname, "public", "_redirects");
try {
  if (usePagesApiProxy) {
    const lines = [
      `/api/* ${effectiveApiUrl}/api/:splat 200`,
      `/images/* ${effectiveApiUrl}/images/:splat 200`,
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
