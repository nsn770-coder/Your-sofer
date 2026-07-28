import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';
import PageFaqSection from '@/app/components/faq/PageFaqSection';

/**
 * סדר השאלות בדף הבית — מפורש בכוונה.
 * getFaqForPage ממיין לפי ה-priority הגלובלי, שמשותף לדף ה-FAQ ולשאר
 * העמודים; שינוי שלו כדי לסדר את דף הבית היה מזיז שאלות גם שם.
 * מקור התוכן נשאר data/faq.ts בלבד — כאן רק הסדר.
 */
const HOME_FAQ_IDS = [
  'shipping-time',        // כמה זמן לוקח המשלוח
  'dedication-products',  // על אילו מוצרים אפשר להוסיף הקדשה
  'home-events-bulk',     // כיפות ומזכרות לאירועים בכמויות
  'returns-regular',      // מדיניות ההחזרות
  'home-about-us',        // מי עומד מאחורי האתר
];

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'Your Sofer - אתר היודאיקה הגדול בישראל | כיפות, מתנות ומזכרות לאירועים',
  description:
    'האתר הכי גדול בישראל עם מעל ל-5,000 מוצרים לבית היהודי: תכשיטים ומתנות בעיצוב אישי, כיפות ומזכרות לאירועים, תיקי טלית ותפילין ותשמישי קדושה. משלוחים לכל הארץ.',
  alternates: { canonical: BASE_URL },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: BASE_URL,
    siteName: 'Your Sofer',
    title: 'Your Sofer - אתר היודאיקה הגדול בישראל | כיפות, מתנות ומזכרות לאירועים',
    description:
      'האתר הכי גדול בישראל עם מעל ל-5,000 מוצרים לבית היהודי: תכשיטים ומתנות בעיצוב אישי, כיפות ומזכרות לאירועים.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Your Sofer' }],
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: 'Your Sofer',
  legalName: 'בואהרון ניסן נסים',
  url: BASE_URL,
  description: 'אתר היודאיקה הגדול בישראל - כיפות בעיצוב אישי, מזכרות ומתנות לאירועים, תשמישי קדושה ומוצרים לבית היהודי',
  telephone: '058-4877-770',
  email: 'support@your-sofer.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'רחוב האורן 18',
    addressLocality: 'דימונה',
    addressCountry: 'IL',
  },
  inLanguage: 'he',
  currenciesAccepted: 'ILS',
  priceRange: '₪₪',
  areaServed: 'IL',
};

// Hero video poster — the real mobile LCP element. Must be byte-identical to the
// poster URL in HomePageClient.tsx so the preload is actually used.
// w_1080 covers phones up to DPR2 (and is fine on desktop, where the video takes over).
const HERO_POSTER =
  'https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto,w_1080/v1782769100/WhatsApp_Image_2026-06-29_at_21.52.31_1_m59ykm.jpg';

const FIREBASE_PROJECT = 'your-sofer';
const FIREBASE_API_KEY = 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I';

/** מוצג אם הספירה נכשלה — כדי שהמונה לעולם לא יראה 0 */
const PRODUCT_COUNT_FALLBACK = 4900;

/**
 * ספירה מדויקת של המוצרים בקטלוג, בשרת ובקאש.
 *
 * runAggregationQuery מחזיר COUNT בלי להוריד מסמכים — קריאה אחת זולה, לא
 * סריקה של 5,000 רשומות. הגרסה הקודמת של המונה קראה getCountFromServer
 * **בדפדפן של כל מבקר**; כאן זה רץ פעם בשעה בשרת, והמספר כבר יושב ב-HTML
 * הראשוני (טוב גם לרינדור וגם לזחלנים).
 */
async function fetchProductCount(): Promise<number> {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents:runAggregationQuery?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredAggregationQuery: {
            structuredQuery: { from: [{ collectionId: 'products' }] },
            aggregations: [{ alias: 'count', count: {} }],
          },
        }),
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return PRODUCT_COUNT_FALLBACK;
    const rows = await res.json();
    const raw = rows?.[0]?.result?.aggregateFields?.count?.integerValue;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : PRODUCT_COUNT_FALLBACK;
  } catch {
    return PRODUCT_COUNT_FALLBACK; // timeout / רשת — העמוד ממשיך להיבנות
  }
}

export default async function HomePage() {
  const productCount = await fetchProductCount();

  return (
    <>
      {/* React hoists this into <head> of the prerendered HTML */}
      <link rel="preload" as="image" href={HERO_POSTER} fetchPriority="high" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <HomePageClient productCount={productCount} />
      <PageFaqSection
        pageKey="home"
        ids={HOME_FAQ_IDS}
        title="שאלות ותשובות"
      />
    </>
  );
}
