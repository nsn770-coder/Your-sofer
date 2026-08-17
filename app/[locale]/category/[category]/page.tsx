import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CategoryPage from '@/app/category/[category]/page';
import { PREFIXED_LOCALES, getLocale, hreflangAlternates } from '@/app/lib/i18n/config';
import { getDictionary } from '@/app/lib/i18n/dictionaries';
import { categoryLabel } from '@/app/lib/i18n/categories';

// ─────────────────────────────────────────────────────────────────────────────
// /en/category/[category] — אותו עמוד קטגוריה, בכתובת עם קידומת שפה.
// הקומפוננטה משותפת; useT גוזר את השפה מהנתיב ולכן התוכן מתורגם מעצמו.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://your-sofer.com';

// אין generateStaticParams כאן בכוונה: עמוד הקטגוריה הוא force-dynamic,
// ושכבת ה-[locale] שמעליו כבר חוסמת שפות לא מוכרות (dynamicParams=false).
export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; category: string }> },
): Promise<Metadata> {
  const { locale, category } = await params;
  if (!PREFIXED_LOCALES.includes(locale)) return {};
  const def = getLocale(locale);
  const t = getDictionary(locale);
  const name = categoryLabel(decodeURIComponent(category), locale);
  const path = `/category/${category}`;

  return {
    title: `${name} | Your Sofer`,
    description: t['intl.heroSub'],
    alternates: {
      // ⚠️ קריטי: canonical מצביע על גרסת השפה הזו ולא על העברית.
      // canonical לעברית היה אומר לגוגל "אנדקס את ההיא במקום", ומבטל
      // את כל התועלת מהעמודים המתורגמים.
      canonical: `${BASE_URL}/${locale}${path}`,
      languages: hreflangAlternates(path, BASE_URL),
    },
    openGraph: {
      type: 'website',
      locale: def.ogLocale,
      url: `${BASE_URL}/${locale}${path}`,
      siteName: 'Your Sofer',
      title: `${name} | Your Sofer`,
      description: t['intl.heroSub'],
    },
  };
}

export default async function LocaleCategoryPage(
  { params }: { params: Promise<{ locale: string; category: string }> },
) {
  const { locale, category } = await params;
  if (!PREFIXED_LOCALES.includes(locale)) notFound();
  return <CategoryPage params={Promise.resolve({ category })} />;
}
