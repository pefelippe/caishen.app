import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@caishen/ui",
    "@caishen/theme",
    "@caishen/services",
    "@caishen/types",
  ],
  async rewrites() {
    return [
      // Better Auth handler (mounted at /api/auth on the backend).
      {
        source: "/api/auth/:path*",
        destination: `${API_URL}/api/auth/:path*`,
      },
      // Everything else under /api → backend routers (/subscriptions, /ai, ...).
      {
        source: "/api/:path*",
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
