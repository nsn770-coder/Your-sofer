import type { Metadata } from 'next';
import FaqClient from './FaqClient';
import { FAQ_ITEMS } from '@/data/faq';

const BASE_URL = 'https://your-sofer.com';
const PAGE_URL = `${BASE_URL}/faq`;

export const metadata: Metadata = {
  title: 'שאלות ותשובות | Your Sofer',
  description:
    'תשובות מהירות על כיפות בהדפסה אישית, משלוחים, הקדשות, מועדון הלקוחות, מוצרי סת״ם, סטטוס הזמנה, תשלומים והחזרות.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: PAGE_URL,
    siteName: 'Your Sofer',
    title: 'שאלות ותשובות | Your Sofer',
    description:
      'תשובות מהירות על כיפות בהדפסה אישית, משלוחים, מועדון הלקוחות, מוצרי סת״ם ועוד.',
    images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630, alt: 'Your Sofer' }],
  },
};

/**
 * FAQPage JSON-LD — נבנה מאותו מקור אמת (data/faq.ts) שמזין את העמוד,
 * ולכן כולל אך ורק שאלות שמוצגות בפועל למשתמש.
 * מרונדר בצד השרת כ-script סטטי — ללא בעיות Hydration.
 */
function buildFaqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.fullAnswer,
      },
    })),
  };
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'דף הבית', item: BASE_URL },
    { '@type': 'ListItem', position: 2, name: 'שאלות נפוצות', item: PAGE_URL },
  ],
};

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <FaqClient />
    </>
  );
}
