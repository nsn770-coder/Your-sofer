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
    // Keep console.error and console.warn in production for server-side log visibility
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  async rewrites() {
    return [
      // Firebase Auth handler proxy — serves /__/auth/* from our own domain so
      // the Google sign-in popup/redirect is first-party (not blocked by
      // third-party-cookie / storage-partitioning in Chrome & Safari).
      // Requires: authDomain = 'your-sofer.com' in firebase-app.ts, and
      // https://your-sofer.com/__/auth/handler added to the OAuth client's
      // Authorized redirect URIs in Google Cloud Console.
      {
        source: '/__/auth/:path*',
        destination: 'https://your-sofer.firebaseapp.com/__/auth/:path*',
      },
      {
        source: '/__/firebase/:path*',
        destination: 'https://your-sofer.firebaseapp.com/__/firebase/:path*',
      },
    ];
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
      // כיסוי תפילין → סט טלית תפילין (category merged 2026-06-04)
      {
        source: '/category/%D7%9B%D7%99%D7%A1%D7%95%D7%99%20%D7%AA%D7%A4%D7%99%D7%9C%D7%99%D7%9F',
        destination: '/category/%D7%A1%D7%98%20%D7%98%D7%9C%D7%99%D7%AA%20%D7%AA%D7%A4%D7%99%D7%9C%D7%99%D7%9F',
        permanent: true,
      },
      // כלי שולחן והגשה, הגשה ואירוח, עיצוב הבית — categories removed 2026-06-10
      // All three redirect to יודאיקה — confirmed active category with 300+ products
      {
        source: '/category/%D7%9B%D7%9C%D7%99%20%D7%A9%D7%95%D7%9C%D7%97%D7%9F%20%D7%95%D7%94%D7%92%D7%A9%D7%94',
        destination: '/category/%D7%99%D7%95%D7%93%D7%90%D7%99%D7%A7%D7%94',
        permanent: true,
      },
      {
        source: '/category/%D7%94%D7%92%D7%A9%D7%94%20%D7%95%D7%90%D7%99%D7%A8%D7%95%D7%97',
        destination: '/category/%D7%99%D7%95%D7%93%D7%90%D7%99%D7%A7%D7%94',
        permanent: true,
      },
      {
        source: '/category/%D7%A2%D7%99%D7%A6%D7%95%D7%91%20%D7%94%D7%91%D7%99%D7%AA',
        destination: '/category/%D7%99%D7%95%D7%93%D7%90%D7%99%D7%A7%D7%94',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
