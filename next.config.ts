import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.tiktokcdn.com" },
      { protocol: "https", hostname: "**.tiktok.com" },
      { protocol: "https", hostname: "p16-oec-va.tiktokcdn.com" },
    ],
  },
};

export default nextConfig;
