import { Suspense } from 'react';
import type { Metadata } from 'next';
import EventKippotClient from './EventKippotClient';
import PageFaqSection from '@/app/components/faq/PageFaqSection';

const BASE_URL = 'https://your-sofer.com';
const PAGE_URL = `${BASE_URL}/event-kippot`;

export const metadata: Metadata = {
  title: 'מזכרות ומתנות לאירועים - כיפות בהדפסה אישית',
  description: 'מזכרות ומתנות לאירועים במקום אחד: כיפות בהדפסה אישית לבר מצווה, חתונות ובריתות — שם, תאריך ולוגו. הדמיה מיידית, מחירים מדורגים ומשלוח לכל הארץ.',
  keywords: ['מזכרות לאירועים', 'מתנות לאירועים', 'כיפות לאירועים', 'כיפות מודפסות', 'הדפסת כיפות', 'כיפות בר מצווה', 'כיפות חתונה', 'כיפות בכמות', 'הדפסה על כיפות'],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: PAGE_URL,
    siteName: 'Your Sofer',
    title: 'מזכרות ומתנות לאירועים - כיפות בהדפסה אישית | Your Sofer',
    description: 'מזכרות ומתנות לאירועים: כיפות בהדפסה אישית לבר מצווה, חתונות ובריתות. הדמיה מיידית, מחירים מדורגים.',
    images: [{ url: `${BASE_URL}/og-default.jpg`, width: 1200, height: 630, alt: 'כיפות לאירועים' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'מזכרות ומתנות לאירועים | Your Sofer',
    description: 'מזכרות וכיפות בהדפסה אישית לבר מצווה, חתונות ואירועים.',
    images: [`${BASE_URL}/og-default.jpg`],
  },
};

export default function EventKippotPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'מזכרות ומתנות לאירועים - כיפות בהדפסה אישית',
            description: 'מזכרות וכיפות בהדפסה אישית לבר מצווה, חתונות ואירועים.',
            url: PAGE_URL,
            provider: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
          }),
        }}
      />
      <Suspense
        fallback={
          <div
            dir="rtl"
            style={{
              minHeight: '60vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#888',
              fontSize: 16,
              fontFamily: "'Heebo', Arial, sans-serif",
            }}
          >
            טוען...
          </div>
        }
      >
        <EventKippotClient />
      </Suspense>

      {/* FAQ ממוקד — נשען על מקור האמת המרכזי data/faq.ts */}
      <PageFaqSection
        pageKey="event-kippot"
        title="שאלות נפוצות על כיפות בהדפסה אישית"
        max={10}
        showStartDesignCta
      />
    </>
  );
}
