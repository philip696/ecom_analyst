/** @type {import('next').NextConfig} */
// Cloudflare Pages sets CF_PAGES=1 during build — require API URL so the static bundle does not call localhost:8000.
if (process.env.CF_PAGES === "1" && !String(process.env.NEXT_PUBLIC_API_URL || "").trim()) {
  throw new Error(
    "Cloudflare Pages: set NEXT_PUBLIC_API_URL to your deployed API (e.g. https://ecom-analyst.xxx.workers.dev) " +
      "under Settings → Environment variables, then redeploy.",
  );
}

const nextConfig = {
  // Static export for Cloudflare Pages (or any static host)
  output: "export",
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
