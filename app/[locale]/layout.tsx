import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  PREFIXED_LOCALES,
  getLocale,
  hreflangAlternates,
} from '@/app/lib/i18n/config';
import { getDictionary } from '@/app/lib/i18n/dictionaries';

// כל שפה נבנית סטטית בזמן build; פרמטר שאינו שפה מוכרת → 404 אוטומטי
export function generateStaticParams() {
  return PREFIXED_LOCALES.map(locale => ({ locale }));
}
export const dynamicParams = false;

const BASE_URL = 'https://your-sofer.com';

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  if (!PREFIXED_LOCALES.includes(locale)) return {};
  const def = getLocale(locale);
  const t = getDictionary(locale);

  return {
    title: { default: `Your Sofer | ${t['intl.heroTitle']}`, template: '%s | Your Sofer' },
    description: t['intl.heroSub'],
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
      languages: hreflangAlternates('/', BASE_URL),
    },
    openGraph: {
      type: 'website',
      locale: def.ogLocale,
      url: `${BASE_URL}/${locale}`,
      siteName: 'Your Sofer',
      title: `Your Sofer | ${t['intl.heroTitle']}`,
      description: t['intl.heroSub'],
      images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Your Sofer' }],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!PREFIXED_LOCALES.includes(locale)) notFound();
  const def = getLocale(locale);

  return (
    <>
      {/*
        ה-<html> מוגדר בשורש כ-he/rtl ונשאר סטטי (שינויו דרך headers() היה
        מבטל את ה-SSG בכל 188 העמודים). כאן מתקנים אותו לשפה הנוכחית —
        סקריפט inline שרץ לפני הציור, כך שאין הבזק של פריסה הפוכה.
        המחרוזת ידועה בזמן build לכל שפה, ולכן אין כאן שום קלט משתמש.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang=${JSON.stringify(def.htmlLang)};document.documentElement.dir=${JSON.stringify(def.dir)};`,
        }}
      />
      <div dir={def.dir} lang={def.htmlLang}>
        {children}
      </div>
    </>
  );
}
