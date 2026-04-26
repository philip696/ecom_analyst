/** @type {import('next').NextConfig} */
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
