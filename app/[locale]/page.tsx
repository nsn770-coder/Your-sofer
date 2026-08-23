import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HomePage from '@/app/page';
import { PREFIXED_LOCALES, getLocale, hreflangAlternates } from '@/app/lib/i18n/config';
import { getDictionary } from '@/app/lib/i18n/dictionaries';

// ─────────────────────────────────────────────────────────────────────────────
// /en · /fr · /es · /ru — דף הבית האמיתי, בכתובת עם קידומת שפה.
//
// ⚠️ עד 08/2026 ישב כאן עמוד נחיתה בינלאומי נפרד: hero משלו, שלוש נקודות
// אמון ושישה אריחי קטגוריה. הוא נבנה בשלב 1, כששום דבר באתר עוד לא היה
// מתורגם, והיה אז ההחלטה הנכונה — עדיף עמוד קטן וכן מדף בית עברי שמתחזה
// למתורגם. מאז תורגמו הממשק, הקטגוריות, שמות המוצרים, העגלה, הצ'קאאוט,
// החיפוש ולבסוף גם HomePageClient עצמו, ולכן אין לו יותר סיבה קיום:
// לקוח שבחר אנגלית קיבל עמוד דל במקום החנות.
//
// הקומפוננטה משותפת עם '/' — אין שכפול לוגיקה, רק כתובת נוספת. useT גוזר
// את השפה מהנתיב, ולכן אותו עץ בדיוק מרונדר מתורגם.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://your-sofer.com';

export function generateStaticParams() {
  return PREFIXED_LOCALES.map(locale => ({ locale }));
}
export const dynamicParams = false;

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  if (!PREFIXED_LOCALES.includes(locale)) return {};
  const def = getLocale(locale);
  const t = getDictionary(locale);
  const title = t['home.hero.h1'];

  return {
    title,
    description: t['home.hero.sub'],
    alternates: {
      // ⚠️ canonical מצביע על גרסת השפה הזו ולא על העברית — אחרת גוגל
      // היה מאנדקס את העברית במקומה ומבטל את התועלת מהעמוד המתורגם.
      canonical: `${BASE_URL}/${locale}`,
      languages: hreflangAlternates('/', BASE_URL),
    },
    openGraph: {
      type: 'website',
      locale: def.ogLocale,
      url: `${BASE_URL}/${locale}`,
      siteName: 'Your Sofer',
      title,
      description: t['home.hero.sub'],
      images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Your Sofer' }],
    },
  };
}

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!PREFIXED_LOCALES.includes(locale)) notFound();
  return <HomePage />;
}
