// next.config.ts
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Prefer an env var; fall back to localhost.
// Trim trailing slash to avoid '//' in the rewrite destination.
const RAW_BACKEND_URL = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '');

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${BACKEND_URL}/:path*` }];
  },
  webpack(config) {
    config.module.rules.push({ test: /\.svg$/, use: ['@svgr/webpack'] });
    return config;
  },
  // Explicit (still useful even with App Router)
  reactStrictMode: true,
};

// Helpful in dev to confirm the proxy target
if (process.env.NODE_ENV !== 'production') {
   
  console.log(`[next.config] API proxy target: ${BACKEND_URL}`);
}

export default withNextIntl(nextConfig);
