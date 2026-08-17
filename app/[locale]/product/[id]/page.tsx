import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductPage from '@/app/product/[id]/page';
import { PREFIXED_LOCALES, getLocale, hreflangAlternates } from '@/app/lib/i18n/config';
import { getDictionary } from '@/app/lib/i18n/dictionaries';

// ─────────────────────────────────────────────────────────────────────────────
// /en/product/[id] — אותו עמוד מוצר בכתובת עם קידומת שפה.
//
// שם המוצר ותיאורו עדיין נשלפים מ-Firestore בעברית (שלב 3), ולכן ה-title
// כאן נשאר שם המוצר המקורי. זה מכוון: כותרת עברית אמיתית עדיפה על תרגום
// מכונה שגוי, ועל כותרת גנרית שלא מתארת את המוצר.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://your-sofer.com';

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; id: string }> },
): Promise<Metadata> {
  const { locale, id } = await params;
  if (!PREFIXED_LOCALES.includes(locale)) return {};
  const def = getLocale(locale);
  const t = getDictionary(locale);
  const path = `/product/${id}`;

  return {
    description: t['intl.heroSub'],
    alternates: {
      canonical: `${BASE_URL}/${locale}${path}`,
      languages: hreflangAlternates(path, BASE_URL),
    },
    openGraph: {
      type: 'website',
      locale: def.ogLocale,
      url: `${BASE_URL}/${locale}${path}`,
      siteName: 'Your Sofer',
    },
  };
}

export default async function LocaleProductPage(
  { params }: { params: Promise<{ locale: string; id: string }> },
) {
  const { locale, id } = await params;
  if (!PREFIXED_LOCALES.includes(locale)) notFound();
  return <ProductPage params={Promise.resolve({ id })} />;
}
