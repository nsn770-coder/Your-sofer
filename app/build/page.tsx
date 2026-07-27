import type { Metadata } from 'next';
import { ALL_BUNDLE_CATEGORIES, BUNDLE_META } from '@/data/bundleBuilder';
import { fetchMomentProducts } from '@/app/moment/[id]/fetchMomentProducts';
import BundleBuilderClient from './BundleBuilderClient';

const BASE_URL = 'https://your-sofer.com';

// ⚠️ ליטרל בלבד — Next מנתח את revalidate סטטית בזמן הבילד.
// שווה ל-MOMENT_REVALIDATE ב-fetchMomentProducts.
export const revalidate = 600;

const TITLE = 'בנה מארז חתנים משלך | כיסוי, טלית וסידור עם רקמת שם | YourSofer';
const DESCRIPTION =
  'בונים מארז חתנים בהתאמה אישית: כיסוי לטלית ותפילין, רקמת שם, טלית וסידור — ומקבלים הנחת מארז. משלוח מהיר לכל הארץ.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['בנה מארז', 'מארז חתנים', 'מארז לחתן', 'סט חתן', 'כיסוי טלית ותפילין', 'רקמת שם'],
  alternates: { canonical: `${BASE_URL}${BUNDLE_META.route}` },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: `${BASE_URL}${BUNDLE_META.route}`,
    siteName: 'Your Sofer',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630, alt: BUNDLE_META.heroTitle }],
  },
};

export default async function BuildBundlePage() {
  // שליפה שרתית אחת מקווששת לכל הקטגוריות של הבונה — אותה שכבה של
  // עמודי /moment ו-/gifts. 250 לקטגוריה: הבורר מציג רשת גלילה, לא קטלוג.
  const products = await fetchMomentProducts(
    { relatedCategories: ALL_BUNDLE_CATEGORIES },
    { perCategoryLimit: 250 },
  );

  return <BundleBuilderClient products={products} />;
}
