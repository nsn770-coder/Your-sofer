import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'firebasestorage.googleapis.com' },
      { hostname: 'res.cloudinary.com' },
      { hostname: 'lh3.googleusercontent.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react',
      '@headlessui/react',
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  async headers() {
    return [
      {
        // COOP/COEP — allows Firebase Auth popup to communicate with opener
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
        ],
      },
      {
        // Hashed filenames — safe to cache for 1 year
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Public images — cache for 7 days
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
      {
        // Google/Meta product feeds
        source: '/api/google-feed',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // www → apex redirect (301)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.your-sofer.com' }],
        destination: 'https://your-sofer.com/:path*',
        permanent: true,
      },
      {
        source: '/category/%D7%A9%D7%91%D7%AA%D7%95%D7%AA-%D7%97%D7%92%D7%99%D7%9D',
        destination: '/category/%D7%A9%D7%91%D7%AA%D7%95%D7%AA-%D7%95%D7%97%D7%92%D7%99%D7%9D',
        permanent: true,
      },
      {
        source: '/category/%D7%9E%D7%96%D7%95%D7%96%D7%95%D7%AA',
        destination: '/category/%D7%91%D7%AA%D7%99%20%D7%9E%D7%96%D7%95%D7%96%D7%94',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
