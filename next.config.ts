import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/og/:slug.png",
        destination: "/api/og/:slug",
      },
    ];
  },
};

export default nextConfig;
