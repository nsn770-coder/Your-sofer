import { Suspense } from 'react';
import type { Metadata } from 'next';
import AllProductsClient from './AllProductsClient';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://your-sofer.com';
const PAGE_URL  = `${BASE_URL}/category/הכל`;

export const metadata: Metadata = {
  title: 'כל המוצרים | כיפות, מתנות, מזכרות לאירועים ויודאיקה | Your Sofer',
  description: 'כל מוצרי החנות — כיפות בעיצוב אישי, מזכרות ומתנות לאירועים, יודאיקה, כלי שולחן, מזוזות ותפילין. Your Sofer.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website', locale: 'he_IL', url: PAGE_URL,
    siteName: 'Your Sofer',
    title: 'כל המוצרים | Your Sofer',
    description: 'כל מוצרי החנות — מזוזות, תפילין, כיפות, יודאיקה ועוד.',
    images: [{ url: `${BASE_URL}/og-default.jpg`, width: 1200, height: 630, alt: 'כל המוצרים' }],
  },
};

export default function AllProductsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'כל המוצרים',
            description: 'כל מוצרי החנות — סת"מ, כיפות, יודאיקה וכלי שולחן',
            url: PAGE_URL,
          }),
        }}
      />
      <Suspense fallback={
        <div dir="rtl" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 16, fontFamily: "'Heebo', Arial, sans-serif" }}>
          טוען...
        </div>
      }>
        <AllProductsClient />
      </Suspense>
    </>
  );
}
