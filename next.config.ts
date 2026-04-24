import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'firebasestorage.googleapis.com' },
      { hostname: 'res.cloudinary.com' },
      { hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/category/%D7%A9%D7%91%D7%AA%D7%95%D7%AA-%D7%97%D7%92%D7%99%D7%9D',
        destination: '/category/%D7%A9%D7%91%D7%AA%D7%95%D7%AA-%D7%95%D7%97%D7%92%D7%99%D7%9D',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
