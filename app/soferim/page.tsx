import type { Metadata } from 'next';
import SoferimClient from './SoferimClient';

const BASE_URL = 'https://your-sofer.com';
const FIREBASE_PROJECT = 'your-sofer';
const FIREBASE_API_KEY = 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I';

// ── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'סופרי סת"מ מוסמכים בישראל | YourSofer',
  description: 'מאגר סופרי סת"מ מוסמכים מכל רחבי ישראל. מצא סופר קרוב אליך לרכישת מזוזות, תפילין, מגילות וספרי תורה.',
  keywords: ['סופר סת"מ', 'סופרי סת"מ', 'מזוזה', 'תפילין', 'מגילה', 'ספר תורה', 'סת"מ ישראל', 'Your Sofer'],
  alternates: { canonical: `${BASE_URL}/soferim` },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: `${BASE_URL}/soferim`,
    siteName: 'Your Sofer',
    title: 'סופרי סת"מ מוסמכים בישראל | YourSofer',
    description: 'מאגר סופרי סת"מ מוסמכים מכל רחבי ישראל. מצא סופר קרוב אליך לרכישת מזוזות, תפילין ומגילות.',
    images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630, alt: 'סופרי סת"מ | Your Sofer' }],
  },
};

// ── Firestore REST helpers ───────────────────────────────────────────────────

interface SoferStub { id: string; name: string; url: string }

async function fetchActiveSoferim(): Promise<SoferStub[]> {
  try {
    const body = {
      structuredQuery: {
        from: [{ collectionId: 'soferim' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'status' },
            op: 'EQUAL',
            value: { stringValue: 'active' },
          },
        },
        select: { fields: [{ fieldPath: 'name' }] },
        limit: 200,
      },
    };
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) return [];
    const results = await res.json();
    return (results as Array<{ document?: { name: string; fields: Record<string, { stringValue?: string }> } }>)
      .filter(r => r.document)
      .map(r => {
        const docName = r.document!.name;
        const id = docName.split('/').pop() ?? '';
        const name = r.document!.fields['name']?.stringValue ?? id;
        return { id, name, url: `${BASE_URL}/soferim/${id}` };
      });
  } catch {
    return [];
  }
}

// ── ItemList JSON-LD ─────────────────────────────────────────────────────────

async function SoferimItemListJsonLd() {
  const soferim = await fetchActiveSoferim();
  if (!soferim.length) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'סופרי סת"מ מוסמכים - Your Sofer',
    url: `${BASE_URL}/soferim`,
    numberOfItems: soferim.length,
    itemListElement: soferim.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: s.name,
      url: s.url,
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

export default async function SoferimPage() {
  return (
    <>
      <SoferimItemListJsonLd />
      <SoferimClient />
    </>
  );
}
