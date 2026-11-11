import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

const config: NextConfig = {
  // The browser only ever talks to this origin; /api/* is forwarded to the NestJS API.
  // That keeps the auth cookie first-party and means the API needs no public CORS access.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/:path*` }];
  },
  poweredByHeader: false,
};

export default config;
