import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';

const BASE_URL = 'https://yoursofer.com';

export const metadata: Metadata = {
  title: 'Your Sofer — חנות סת"מ | מזוזות, תפילין וספרי תורה',
  description:
    'רכישת מזוזות, תפילין, מגילות וספרי תורה מסופרים מוסמכים — עם תמונת הקלף האמיתי, בדיקה לפני מכירה, ושקיפות מלאה. Your Sofer.',
  alternates: { canonical: BASE_URL },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: BASE_URL,
    siteName: 'Your Sofer',
    title: 'Your Sofer — חנות סת"מ | מזוזות, תפילין וספרי תורה',
    description:
      'רכישת מזוזות, תפילין, מגילות וספרי תורה מסופרים מוסמכים — עם שקיפות מלאה.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Your Sofer' }],
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: 'Your Sofer',
  url: BASE_URL,
  description: 'חנות סת"מ — מזוזות, תפילין, מגילות וספרי תורה מסופרים מוסמכים',
  inLanguage: 'he',
  currenciesAccepted: 'ILS',
  priceRange: '₪₪',
  areaServed: 'IL',
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <HomePageClient />
    </>
  );
}
