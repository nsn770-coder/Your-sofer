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
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.google.com https://*.gstatic.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob:",
      "object-src 'none'",
      "frame-src https://your-sofer.firebaseapp.com https://accounts.google.com https://*.google.com",
      "frame-ancestors 'self'",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://your-sofer.firebaseapp.com https://accounts.google.com https://*.google.com https://res.cloudinary.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
    ].join('; ');

    return [
      {
        // CSP — applied to all routes
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
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
    ];
  },
};

export default nextConfig;
