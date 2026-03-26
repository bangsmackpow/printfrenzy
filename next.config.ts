import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'static.wixstatic.com' },
      { protocol: 'https', hostname: 'pub-0a9a68a0e7bd45fd90bf38ff3ec0e00b.r2.dev' }
    ]
  }
};

export default nextConfig;
