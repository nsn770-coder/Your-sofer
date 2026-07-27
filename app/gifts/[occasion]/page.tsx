import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OCCASIONS, getOccasion } from '@/data/occasions';
import OccasionPage from '../_components/OccasionPage';

const BASE_URL = 'https://your-sofer.com';

// ⚠️ חייב להישאר ליטרל מספרי. Next מנתח את revalidate סטטית בזמן הבילד
// ונכשל על ערך מיובא/מחושב. שווה ל-MOMENT_REVALIDATE ב-fetchMomentProducts —
// אם משנים שם, לשנות גם כאן.
export const revalidate = 600;

export function generateStaticParams() {
  return OCCASIONS.map(o => ({ occasion: o.slug }));
}

// כתובות שאינן ברשימה מחזירות 404 במקום להיבנות כעמוד ריק.
export const dynamicParams = false;

export async function generateMetadata(
  { params }: { params: Promise<{ occasion: string }> },
): Promise<Metadata> {
  const { occasion: slug } = await params;
  const occ = getOccasion(slug);
  if (!occ) return {};

  const pageUrl = `${BASE_URL}/gifts/${occ.slug}`;
  const ogImage = `${BASE_URL}/og-default.png`;

  return {
    // absolute — כדי לעקוף את ה-template '%s | Your Sofer' של ה-layout,
    // שאחרת היה מייצר כותרת כפולת-מותג.
    title: { absolute: occ.metaTitle },
    description: occ.metaDescription,
    keywords: occ.keywords,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'website',
      locale: 'he_IL',
      url: pageUrl,
      siteName: 'Your Sofer',
      title: occ.metaTitle,
      description: occ.metaDescription,
      images: [{ url: ogImage, width: 1200, height: 630, alt: occ.h1 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: occ.metaTitle,
      description: occ.metaDescription,
      images: [ogImage],
    },
  };
}

export default async function GiftOccasionRoute(
  { params }: { params: Promise<{ occasion: string }> },
) {
  const { occasion: slug } = await params;
  const occ = getOccasion(slug);
  if (!occ) notFound();

  const pageUrl = `${BASE_URL}/gifts/${occ.slug}`;

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: occ.h1,
    description: occ.metaDescription,
    url: pageUrl,
    inLanguage: 'he-IL',
    isPartOf: { '@type': 'WebSite', name: 'Your Sofer', url: BASE_URL },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'דף הבית', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'מתנות לאירועים', item: `${BASE_URL}/gifts` },
      { '@type': 'ListItem', position: 3, name: occ.navLabel, item: pageUrl },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <OccasionPage occasion={occ} />
    </>
  );
}
