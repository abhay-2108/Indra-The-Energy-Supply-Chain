import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allow production builds to successfully complete even if the project has type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow production builds to successfully complete even if the project has ESLint errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
