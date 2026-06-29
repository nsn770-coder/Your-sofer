import { Suspense } from 'react';
import type { Metadata } from 'next';
import KippotEventClient from './KippotEventClient';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://your-sofer.com';
const PAGE_URL = `${BASE_URL}/bar-mitzvah-kippot`;

// ── SEO Metadata ──────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'כיפות לבר מצווה ואירועים | הדפסה אישית | Your Sofer',
  description: 'כיפות לבר מצווה ואירועים עם הדפסה אישית — שם, תאריך ולוגו. מגוון עצום, משלוח לכל הארץ, שירות מהיר.',
  keywords: [
    'כיפות לבר מצווה', 'כיפות מודפסות', 'כיפות לאירועים',
    'הדפסה על כיפות', 'כיפות בכמות', 'כיפות לחתונה',
    'הזמנת כיפות', 'כיפות בר מצווה', 'כיפות מותאמות אישית',
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: PAGE_URL,
    siteName: 'Your Sofer',
    title: 'כיפות לבר מצווה ואירועים | הדפסה אישית | Your Sofer',
    description: 'כיפות לבר מצווה ואירועים עם הדפסה אישית. שם, תאריך ולוגו. Your Sofer.',
    images: [{ url: `${BASE_URL}/og-default.jpg`, width: 1200, height: 630, alt: 'כיפות לבר מצווה' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'כיפות לבר מצווה | Your Sofer',
    description: 'כיפות לבר מצווה ואירועים עם הדפסה אישית — שם, תאריך ולוגו.',
    images: [`${BASE_URL}/og-default.jpg`],
  },
};

// ── FAQ data — shared with KippotEventClient for schema + accordion ──────────

export const FAQ_ITEMS = [
  {
    q: 'כמה כיפות צריך לבר מצווה?',
    a: 'בדרך כלל מזמינים כיפה אחת לכל מוזמן. אירוע ממוצע דורש בין 80 ל-200 כיפות. מומלץ להזמין 10–15% עודף ליתר ביטחון — למשפחה, לצלמים ולאורחים שמסיימים לפני הסוף.',
  },
  {
    q: 'האם אפשר להדפיס לוגו?',
    a: 'כן! ניתן להדפיס לוגו, תמונה, ציור, עיצוב מותאם אישית — כל קובץ תמונה בפורמט PNG/JPG יתאים. השתמשו בעמוד ההדפסה כדי לטעון את הקובץ ולראות תצוגה מקדימה אינטראקטיבית.',
  },
  {
    q: 'האם אפשר להדפיס שם ותאריך?',
    a: 'בהחלט. ניתן להדפיס שם הבר מצווה, תאריך האירוע (לועזי ועברי), ציטוט מהתורה, פסוק, או כל טקסט אחר. ניתן לשלב תמונה עם טקסט בתצוגה מקדימה לפני ההזמנה.',
  },
  {
    q: 'תוך כמה זמן מגיע?',
    a: 'הזמנה רגילה מגיעה תוך 5–7 ימי עסקים. הזמנות גדולות (100 כיפות ומעלה) — מומלץ להזמין לפחות שבועיים לפני האירוע. משלוח מהיר זמין בתוספת תשלום.',
  },
  {
    q: 'האם יש מחיר מיוחד לכמויות גדולות?',
    a: 'בהזמנות כמות גדולות מחיר ליחידה יורד. פנו אלינו לפרטים ולקבלת הצעת מחיר מותאמת לאירוע שלכם.',
  },
  {
    q: 'האם אפשר לקבל הדמיה לפני ההדפסה?',
    a: 'כן — בעמוד ההדפסה יש תצוגה מקדימה מיידית של העיצוב על גבי הכיפה. ניתן לשנות, להזיז ולכוונן גודל לפני ההזמנה הסופית. לא מתחילים בייצור ללא אישורכם.',
  },
  {
    q: 'האם יש משלוח לכל הארץ?',
    a: 'כן, משלוח לכל רחבי הארץ — צפון, דרום, מרכז וירושלים. עלות המשלוח מחושבת בקופה לפי משקל ויעד. איסוף עצמי זמין בתיאום מראש.',
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BarMitzvahKippotPage() {
  return (
    <>
      {/* JSON-LD: CollectionPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'כיפות לבר מצווה ואירועים',
            description: 'כיפות לבר מצווה ואירועים עם הדפסה אישית — שם, תאריך ולוגו.',
            url: PAGE_URL,
            provider: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
          }),
        }}
      />

      {/* JSON-LD: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'דף הבית', item: BASE_URL },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'כיפות',
                item: `${BASE_URL}/category/${encodeURIComponent('כיפות')}`,
              },
              { '@type': 'ListItem', position: 3, name: 'כיפות לבר מצווה', item: PAGE_URL },
            ],
          }),
        }}
      />

      {/* JSON-LD: FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ_ITEMS.map(item => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
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
        <KippotEventClient faqItems={FAQ_ITEMS} />
      </Suspense>
    </>
  );
}
