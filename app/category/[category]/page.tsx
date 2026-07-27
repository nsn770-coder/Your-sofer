import { Suspense } from 'react';
import type { Metadata } from 'next';
import CategoryClient from './CategoryClient';

// Force dynamic rendering - prevents the client-side router cache from serving
// a stale RSC payload from a previous visit with the old layout.
export const dynamic = 'force-dynamic';

const BASE_URL = 'https://your-sofer.com';
const FIREBASE_PROJECT = 'your-sofer';
const FIREBASE_API_KEY = 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I';

// ── Category copy ───────────────────────────────────────────────────────────

interface CategoryMetaEntry {
  title: string;
  description: string;
  /** Optional Cloudinary/static image for OG */
  ogImage?: string;
}

const CATEGORY_META: Record<string, CategoryMetaEntry> = {
  'סט טלית תפילין': {
    title: 'סט טלית ותפילין - סטים מושלמים לבר מצווה ולכל יום',
    description: 'סטי טלית ותפילין מסופרים מוסמכים - לבר מצווה, לנישואין ולכל אירוע. קלף כתוב ביד, בתים ורצועות באריזה מהודרת. Your Sofer.',
  },
  'בתי מזוזה': {
    title: 'בתי מזוזה מכל הסוגים — אלומיניום, עץ, כסף וזכוכית',
    description: 'בתי מזוזה מעוצבים לרכישה מקוונת — אלומיניום, עץ, מתכת, זכוכית וקרמיקה. מגוון גדלים וסגנונות לכל פתח. משלוח לכל הארץ.',
  },
  'יודאיקה': {
    title: 'יודאיקה - חנוכיות, כוסות קידוש ואמנות יהודית',
    description: 'מוצרי יודאיקה: חנוכיות, כוסות קידוש, נרות שבת ועוד. מתנות ייחודיות לכל אירוע. Your Sofer.',
  },
  'מתנות': {
    title: 'מזכרות ומתנות לאירועים - חנוכת בית, בר מצווה וחגים',
    description: 'מזכרות ומתנות לאירועים: חנוכת בית, בר מצווה, שבת חתן וחגים. מבחר ענק מתוך מעל 5,000 מוצרי היודאיקה של Your Sofer. משלוחים לכל הארץ.',
  },
  'מגילות': {
    title: 'מגילות אסתר ומגילות נוספות - כתובות ביד',
    description: 'מגילת אסתר ומגילות נוספות כתובות בידי סופר סת"מ מוסמך, בדוקות ומאושרות. Your Sofer.',
  },
  'תפילין קומפלט': {
    title: 'תפילין קומפלט - סט קלף, בתים ורצועות מסופרים מוסמכים',
    description: 'תפילין קומפלט לכל הנוסחים - אשכנז, ספרד, חב"ד ותימני. קלף כתוב בידי סופר מוסמך, בדוק לפני מכירה. Your Sofer.',
  },
  'קלפי מזוזה': {
    title: 'קלפי מזוזה - כל גודל, כל נוסח, כתיבה ידנית',
    description: 'קלפי מזוזה בגדלים 7–30 ס"מ, כל הנוסחים. כל קלף מצולם ונבדק לפני מכירה. Your Sofer.',
  },
  'קלפי תפילין': {
    title: 'קלפי תפילין - כתיבה ידנית לפי כל הנוסחים',
    description: 'קלפי תפילין לכל הנוסחים - אשכנז, ספרד, חב"ד ותימני. כתיבה מדוקדקת ובדיקה מלאה. Your Sofer.',
  },
  'ספרי תורה': {
    title: 'ספרי תורה - כתיבה ידנית על ידי סופר סת"מ',
    description: 'ספרי תורה כתובים בידי סופרים מוסמכים. תהליך בדיקה מלא לפני מכירה. Your Sofer.',
  },
  'תכשיטים': {
    title: 'תכשיטים יהודיים - שרשראות, צמידים ותכשיטי יודאיקה',
    description: 'תכשיטים בהשראה יהודית: שרשראות מגן דוד, חמסות, צמידים ועוד. מתנה מושלמת לכל אירוע. Your Sofer.',
  },
  'כיפות': {
    title: 'כיפות - סרוגות, בד, קטיפה, בוכריות והדפסה אישית',
    description: 'מעל 800 כיפות במקום אחד: כיפות סרוגות, כיפות בד וקטיפה, כיפה בוכרית, כיפות לילדים וכיפות בהדפסה אישית לאירועים. משלוחים לכל הארץ. Your Sofer.',
  },
  'שבת': {
    title: 'מוצרי שבת - פמוטים, כיסויי חלה, כוסות קידוש וקרשי חלה',
    description: 'כל מה שצריך לשולחן השבת: פמוטים, כיסויי חלה מעוצבים, כוסות קידוש, קרשי חלה, סכיני חלה ומלחיות. מבחר ענק ומשלוחים לכל הארץ. Your Sofer.',
  },
  'חגים': {
    title: 'מוצרים לחגים - חנוכיות, פסח, ראש השנה, פורים וסוכות',
    description: 'מוצרי חג לכל השנה: חנוכיות מעוצבות, כלי פסח, דבשיות וצלחות סימנים לראש השנה, מתנות לפורים וסוכות. Your Sofer.',
  },
  'מוצרי בית כנסת': {
    title: 'מוצרי בית כנסת - סטנדרים, פרוכות וכלי קודש',
    description: 'ציוד לבית הכנסת: סטנדרים לבית כנסת, כלי קודש, אביזרי תפילה ומוצרים לספר תורה. מבחר איכותי ומשלוחים לכל הארץ. Your Sofer.',
  },
  'ספרי קודש וסידורים': {
    title: 'סידורים ותהילים - סידורי תפילה בכל הנוסחים',
    description: 'סידור תפילה לכל נוסח: ספרד, אשכנז ועדות המזרח. סידורים מהודרים, תהילים, ברכונים וספרי קודש - גם עם הקדשה אישית לאירועים. Your Sofer.',
  },
  'טליתות וציציות': {
    title: 'טליתות וציציות - טלית צמר, גופיות ציצית וסטים לחתן',
    description: 'טליתות צמר מהודרות, ציציות וגופיות ציצית בכל המידות, וסטים מושלמים לחתן ולבר מצווה. משלוחים לכל הארץ. Your Sofer.',
  },
  'תיקי טלית ותפילין': {
    title: 'תיקי טלית ותפילין - מעל 300 דגמים כולל רקמה אישית',
    description: 'מבחר ענק של תיקי טלית ותפילין: עור אמיתי, עור מדומה, קטיפה ותיקים טרמיים - כולל רקמת שם אישית. מתנה מושלמת לבר מצווה. Your Sofer.',
  },
};

function getCategoryMeta(category: string): CategoryMetaEntry {
  return (
    CATEGORY_META[category] ?? {
      title: `${category} - מבחר ענק במקום אחד | Your Sofer`,
      description: `מבחר ${category} מתוך האתר הכי גדול בישראל - מעל ל-5,000 מוצרים לבית היהודי. משלוחים לכל הארץ.`,
    }
  );
}

// ── Static params (pre-render all known categories) ──────────────────────────

export function generateStaticParams() {
  const cats = Object.keys(CATEGORY_META);
  return cats.map(c => ({ category: c }));
}

// ── generateMetadata ─────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ category: string }> },
): Promise<Metadata> {
  const { category } = await params;
  const decoded = decodeURIComponent(category);
  const meta = getCategoryMeta(decoded);
  const pageUrl = `${BASE_URL}/category/${encodeURIComponent(decoded)}`;

  const keywords = [decoded, 'יודאיקה', 'חנות יודאיקה', 'מתנות', 'משלוח לכל הארץ', 'your sofer'];

  const ogImage = meta.ogImage ?? `${BASE_URL}/og-default.jpg`;

  return {
    title: meta.title,
    description: meta.description,
    keywords,
    alternates: { canonical: pageUrl },
    openGraph: {
      type:        'website',
      locale:      'he_IL',
      url:         pageUrl,
      siteName:    'YourSofer',
      title:       meta.title,
      description: meta.description,
      images: [
        {
          url:   ogImage,
          width: 1200,
          height: 630,
          alt:   meta.title,
        },
      ],
    },
    twitter: {
      card:        'summary_large_image',
      title:       meta.title,
      description: meta.description,
      images:      [ogImage],
    },
  };
}

// ── Firestore REST helpers ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseField(field: any): any {
  if (!field) return undefined;
  if ('stringValue' in field) return field.stringValue as string;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return Number(field.doubleValue);
  if ('booleanValue' in field) return field.booleanValue as boolean;
  if ('nullValue' in field) return null;
  return undefined;
}

interface ProductStub { id: string; name: string; url: string }

// עמודים שממזגים כמה קטגוריות — חייב להיות תואם ל-MERGED_CAT_PAGES ב-CategoryClient
const MERGED_CAT_PAGES_SEO: Record<string, string[]> = {
  'תיקי טלית ותפילין': ['תיקי טלית ותפילין', 'סט טלית תפילין'],
};

async function fetchCategoryProducts(category: string): Promise<ProductStub[]> {
  try {
    const mergedCats = MERGED_CAT_PAGES_SEO[category];
    const body = {
      structuredQuery: {
        from: [{ collectionId: 'products' }],
        where: {
          fieldFilter: mergedCats
            ? {
                field: { fieldPath: 'cat' },
                op: 'IN',
                value: { arrayValue: { values: mergedCats.map(c => ({ stringValue: c })) } },
              }
            : {
                field: { fieldPath: 'cat' },
                op: 'EQUAL',
                value: { stringValue: category },
              },
        },
        select: { fields: [{ fieldPath: 'name' }] },
        limit: 100,
      },
    };
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return [];
    const results = await res.json();
    return (results as Array<{ document?: { name: string; fields: Record<string, unknown> } }>)
      .filter(r => r.document)
      .map(r => {
        const docName = r.document!.name;
        const id = docName.split('/').pop() ?? '';
        const name = parseField((r.document!.fields as Record<string, unknown>)['name']) as string ?? '';
        return { id, name, url: `${BASE_URL}/product/${id}` };
      });
  } catch {
    return [];
  }
}

// ── ItemList JSON-LD ─────────────────────────────────────────────────────────

async function CategoryItemListJsonLd({ category }: { category: string }) {
  const products = await fetchCategoryProducts(category);
  if (!products.length) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: category,
    url: `${BASE_URL}/category/${encodeURIComponent(category)}`,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.name,
      url: p.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ── BreadcrumbList JSON-LD ───────────────────────────────────────────────────

function CategoryBreadcrumbJsonLd({ category }: { category: string }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'דף הבית', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'כל הקטגוריות', item: `${BASE_URL}/categories` },
      { '@type': 'ListItem', position: 3, name: category, item: `${BASE_URL}/category/${encodeURIComponent(category)}` },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function CategoryPage(
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params;
  const decoded = decodeURIComponent(category);

  return (
    <>
      <CategoryBreadcrumbJsonLd category={decoded} />
      <CategoryItemListJsonLd category={decoded} />
      <Suspense fallback={<div dir="rtl" className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">טוען...</div>}>
        <CategoryClient category={decoded} />
      </Suspense>
    </>
  );
}
