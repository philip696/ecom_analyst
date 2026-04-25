/** @type {import('next').NextConfig} */
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
