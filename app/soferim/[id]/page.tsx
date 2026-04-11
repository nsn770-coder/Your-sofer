import type { Metadata } from 'next';
import SoferProfileClient from './SoferProfileClient';

const BASE_URL = 'https://yoursofer.com';
const FIREBASE_PROJECT = 'your-sofer';
const FIREBASE_API_KEY = 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I';

// ── Firestore REST helpers ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseField(field: any): any {
  if (!field) return undefined;
  if ('stringValue' in field) return field.stringValue as string;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('booleanValue' in field) return field.booleanValue as boolean;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field)
    return ((field.arrayValue.values as unknown[]) ?? []).map(parseField);
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFields(fields: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, parseField(v)]));
}

interface SoferData {
  name?: string;
  city?: string;
  phone?: string;
  whatsapp?: string;
  description?: string;
  style?: string;
  categories?: string[];
  imageUrl?: string;
  status?: string;
}

async function fetchSofer(id: string): Promise<SoferData | null> {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/soferim/${id}?key=${FIREBASE_API_KEY}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const doc = await res.json();
    if (!doc.fields) return null;
    return parseFields(doc.fields) as SoferData;
  } catch {
    return null;
  }
}

async function fetchActiveSoferIds(): Promise<string[]> {
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
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return [];
    const results = await res.json();
    return (results as Array<{ document?: { name: string } }>)
      .filter(r => r.document)
      .map(r => r.document!.name.split('/').pop() as string);
  } catch {
    return [];
  }
}

// ── Static params ────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const ids = await fetchActiveSoferIds();
  return ids.map(id => ({ id }));
}

// ── generateMetadata ─────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const sofer = await fetchSofer(id);

  if (!sofer?.name) {
    return { title: 'סופר סת"מ | Your Sofer', description: 'פרופיל סופר סת"מ מוסמך — Your Sofer' };
  }

  const name = sofer.name;
  const cityPart = sofer.city ? ` מ${sofer.city}` : '';
  const stylePart = sofer.style ? `, כתב ${sofer.style}` : '';
  const catsPart = sofer.categories?.length ? ` — מתמחה ב${sofer.categories.join(', ')}` : '';

  const title = `${name} — סופר סת"מ מוסמך${cityPart}`;
  const description =
    sofer.description?.slice(0, 155) ||
    `${name}${cityPart}${stylePart}${catsPart}. סופר סת"מ מאושר ומאומת על ידי Your Sofer עם פיקוח רבני ותעודת כשרות.`;

  const pageUrl = `${BASE_URL}/soferim/${id}`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'profile',
      locale: 'he_IL',
      url: pageUrl,
      siteName: 'Your Sofer',
      title: `${name} | סופר סת"מ | Your Sofer`,
      description,
      ...(sofer.imageUrl ? { images: [{ url: sofer.imageUrl, width: 800, height: 800, alt: name }] } : {}),
    },
    twitter: {
      card: sofer.imageUrl ? 'summary_large_image' : 'summary',
      title: `${name} | סופר סת"מ | Your Sofer`,
      description,
      ...(sofer.imageUrl ? { images: [sofer.imageUrl] } : {}),
    },
  };
}

// ── JSON-LD schemas ───────────────────────────────────────────────────────────

async function SoferJsonLd({ id }: { id: string }) {
  const sofer = await fetchSofer(id);
  if (!sofer?.name) return null;

  const pageUrl = `${BASE_URL}/soferim/${id}`;

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: sofer.name,
    url: pageUrl,
    jobTitle: 'סופר סת"מ',
    description: sofer.description || undefined,
    ...(sofer.city ? { address: { '@type': 'PostalAddress', addressLocality: sofer.city, addressCountry: 'IL' } } : {}),
    ...(sofer.phone ? { telephone: sofer.phone } : {}),
    ...(sofer.imageUrl ? { image: sofer.imageUrl } : {}),
    knowsAbout: sofer.categories ?? [],
    worksFor: {
      '@type': 'Organization',
      name: 'Your Sofer',
      url: BASE_URL,
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ראשי', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'סופרים', item: `${BASE_URL}/soferim` },
      { '@type': 'ListItem', position: 3, name: sofer.name, item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SoferProfilePage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return (
    <>
      <SoferJsonLd id={id} />
      <SoferProfileClient id={id} />
    </>
  );
}
