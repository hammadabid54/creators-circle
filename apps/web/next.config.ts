import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.CC_NEXT_DIST_DIR || '.next',
  // Avoid syncing huge build folders to OneDrive (excludes .next from sync)
  outputFileTracingExcludes: {
    '*': ['.next/cache/**', 'node_modules/**'],
  },
};

export default nextConfig;
