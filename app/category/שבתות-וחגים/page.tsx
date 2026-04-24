import { Suspense } from 'react';
import type { Metadata } from 'next';
import ShabbatHolidaysClient from './ShabbatHolidaysClient';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://yoursofer.com';
const PAGE_URL = `${BASE_URL}/category/שבתות-וחגים`;

export const metadata: Metadata = {
  title: 'שבתות וחגים — מוצרים נבחרים לשבת וחג | Your Sofer',
  description: 'מוצרים נבחרים לשבת, חג ואירוח יהודי — כלי שולחן, יודאיקה, נרות שבת, מגשים, כוסות קידוש ועוד. Your Sofer.',
  keywords: ['שבת', 'חג', 'יודאיקה', 'כלי שולחן', 'נרות שבת', 'כוס קידוש', 'מתנות לחג'],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: PAGE_URL,
    siteName: 'Your Sofer',
    title: 'שבתות וחגים — מוצרים נבחרים לשבת וחג',
    description: 'מוצרים נבחרים לשבת, חג ואירוח יהודי. Your Sofer.',
    images: [{ url: `${BASE_URL}/og-default.jpg`, width: 1200, height: 630, alt: 'שבתות וחגים' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'שבתות וחגים | Your Sofer',
    description: 'מוצרים נבחרים לשבת, חג ואירוח יהודי.',
    images: [`${BASE_URL}/og-default.jpg`],
  },
};

export default function ShabbatHolidaysPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'שבתות וחגים',
            description: 'מוצרים נבחרים לשבת, חג ואירוח יהודי',
            url: PAGE_URL,
          }),
        }}
      />
      <Suspense fallback={
        <div dir="rtl" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 16, fontFamily: "'Heebo', Arial, sans-serif" }}>
          טוען...
        </div>
      }>
        <ShabbatHolidaysClient />
      </Suspense>
    </>
  );
}
