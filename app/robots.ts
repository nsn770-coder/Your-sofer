import { MetadataRoute } from 'next';

const BASE_URL = 'https://yoursofer.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/shaliach-dashboard',
          '/sofer-dashboard',
          '/checkout',
          '/cart',
          '/thank-you',
          '/join/apply',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
