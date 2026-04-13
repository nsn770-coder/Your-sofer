import { Suspense } from 'react';
import type { Metadata } from 'next';
import CategoryClient from './CategoryClient';

const BASE_URL = 'https://yoursofer.com';
const FIREBASE_PROJECT = 'your-sofer';
const FIREBASE_API_KEY = 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I';

// ── Category copy ───────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { title: string; description: string }> = {
  'סט טלית תפילין': {
    title: 'סט טלית ותפילין — סטים מושלמים לבר מצווה ולכל יום',
    description: 'סטי טלית ותפילין מסופרים מוסמכים — לבר מצווה, לנישואין ולכל אירוע. קלף כתוב ביד, בתים ורצועות באריזה מהודרת. Your Sofer.',
  },
  'מזוזות': {
    title: 'מזוזות כשרות ומהודרות — בתי מזוזה מכל הסוגים',
    description: 'מזוזות כשרות לרכישה מקוונת — בתי מזוזה מעץ, מתכת, זכוכית ועוד. כל קלף מצולם, נבדק ומקושר לסופר שכתב אותו. משלוח חינם לכל הארץ.',
  },
  'יודאיקה': {
    title: 'יודאיקה — חנוכיות, כוסות קידוש ואמנות יהודית',
    description: 'מוצרי יודאיקה: חנוכיות, כוסות קידוש, נרות שבת ועוד. מתנות ייחודיות לכל אירוע. Your Sofer.',
  },
  'כיסוי תפילין': {
    title: 'כיסוי תפילין — בד, עור ודמוי עור לאשכנז, ספרד וחב"ד',
    description: 'מגוון כיסויי תפילין לכל הנוסחים והגדלים. בד, עור, קטיפה ועוד. Your Sofer.',
  },
  'מתנות': {
    title: 'מתנות לאירועים יהודיים — חנוכת בית, בר מצווה וחגים',
    description: 'מתנות מיוחדות לחנוכת בית, בר מצווה, חגים וכל אירוע. מגוון מוצרי סת"מ ויודאיקה. Your Sofer.',
  },
  'מגילות': {
    title: 'מגילות אסתר ומגילות נוספות — כתובות ביד',
    description: 'מגילת אסתר ומגילות נוספות כתובות בידי סופר סת"מ מוסמך, בדוקות ומאושרות. Your Sofer.',
  },
  'תפילין קומפלט': {
    title: 'תפילין קומפלט — סט קלף, בתים ורצועות מסופרים מוסמכים',
    description: 'תפילין קומפלט לכל הנוסחים — אשכנז, ספרד, חב"ד ותימני. קלף כתוב בידי סופר מוסמך, בדוק לפני מכירה. Your Sofer.',
  },
  'קלפי מזוזה': {
    title: 'קלפי מזוזה — כל גודל, כל נוסח, כתיבה ידנית',
    description: 'קלפי מזוזה בגדלים 7–30 ס"מ, כל הנוסחים. כל קלף מצולם ונבדק לפני מכירה. Your Sofer.',
  },
  'קלפי תפילין': {
    title: 'קלפי תפילין — כתיבה ידנית לפי כל הנוסחים',
    description: 'קלפי תפילין לכל הנוסחים — אשכנז, ספרד, חב"ד ותימני. כתיבה מדוקדקת ובדיקה מלאה. Your Sofer.',
  },
  'ספרי תורה': {
    title: 'ספרי תורה — כתיבה ידנית על ידי סופר סת"מ',
    description: 'ספרי תורה כתובים בידי סופרים מוסמכים. תהליך בדיקה מלא לפני מכירה. Your Sofer.',
  },
};

function getCategoryMeta(category: string) {
  return (
    CATEGORY_META[category] ?? {
      title: `${category} | Your Sofer`,
      description: `מוצרי ${category} מסופרים מוסמכים — בדיקה ושקיפות מלאה. Your Sofer.`,
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
  const { title, description } = getCategoryMeta(decoded);
  const pageUrl = `${BASE_URL}/category/${encodeURIComponent(decoded)}`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'website',
      locale: 'he_IL',
      url: pageUrl,
      siteName: 'Your Sofer',
      title: `${title} | Your Sofer`,
      description,
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

async function fetchCategoryProducts(category: string): Promise<ProductStub[]> {
  try {
    const body = {
      structuredQuery: {
        from: [{ collectionId: 'products' }],
        where: {
          fieldFilter: {
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

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function CategoryPage(
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params;
  const decoded = decodeURIComponent(category);

  return (
    <>
      <CategoryItemListJsonLd category={decoded} />
      <Suspense fallback={<div dir="rtl" className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">טוען...</div>}>
        <CategoryClient category={decoded} />
      </Suspense>
    </>
  );
}
