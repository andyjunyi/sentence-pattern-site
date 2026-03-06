import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        // Restrict callers to your own deployment.
        // Set NEXT_PUBLIC_SITE_URL in Vercel env vars if your domain differs.
        {
          key: 'Access-Control-Allow-Origin',
          value:
            process.env.NEXT_PUBLIC_SITE_URL ??
            'https://sentence-pattern-site.vercel.app',
        },
        { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
      ],
    },
  ],
}

export default nextConfig
