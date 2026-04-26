import type { Metadata } from 'next';
import ProductClient from './ProductClient';

const BASE_URL = 'https://your-sofer.com';
const FIREBASE_PROJECT = 'your-sofer';
const FIREBASE_API_KEY = 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I';

// ── Firestore REST helpers ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseField(field: any): any {
  if (!field) return undefined;
  if ('stringValue' in field) return field.stringValue as string;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return Number(field.doubleValue);
  if ('booleanValue' in field) return field.booleanValue as boolean;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field)
    return ((field.arrayValue.values as unknown[]) ?? []).map(parseField);
  if ('mapValue' in field)
    return parseFields(field.mapValue.fields ?? {});
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFields(fields: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, parseField(v)]));
}

interface ProductData {
  name?: string;
  desc?: string;
  description?: string;
  price?: number;
  was?: number;
  imgUrl?: string;
  image_url?: string;
  imgUrl2?: string;
  imgUrl3?: string;
  cat?: string;
  sofer?: string;
}

async function fetchProduct(id: string): Promise<ProductData | null> {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/products/${id}?key=${FIREBASE_API_KEY}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const doc = await res.json();
    if (!doc.fields) return null;
    return parseFields(doc.fields) as ProductData;
  } catch {
    return null;
  }
}

// ── generateMetadata ────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);

  if (!product) {
    return { title: 'מוצר | Your Sofer', description: 'חנות סת"מ — Your Sofer' };
  }

  const name = product.name ?? 'מוצר';
  const desc =
    product.desc ||
    product.description ||
    `${name} מסופר סת"מ מוסמך — נבדק ומצולם לפני מכירה. Your Sofer.`;
  const image = product.imgUrl || product.image_url || product.imgUrl2;
  const priceStr = product.price ? `₪${product.price}` : '';
  const pageUrl = `${BASE_URL}/product/${id}`;

  const images = image
    ? [{ url: image, width: 800, height: 800, alt: name }]
    : undefined;

  return {
    title: `${name}${priceStr ? ` — ${priceStr}` : ''}`,
    description: desc,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'website',
      locale: 'he_IL',
      url: pageUrl,
      siteName: 'Your Sofer',
      title: `${name} | Your Sofer`,
      description: desc,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | Your Sofer`,
      description: desc,
      images: image ? [image] : undefined,
    },
  };
}

// ── Product JSON-LD ─────────────────────────────────────────────────────────

async function ProductJsonLd({ id }: { id: string }) {
  const product = await fetchProduct(id);
  if (!product || !product.name) return null;

  const images = [
    product.imgUrl,
    product.image_url,
    product.imgUrl2,
    product.imgUrl3,
  ].filter(Boolean) as string[];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.desc || product.description || undefined,
    image: images.length ? images : undefined,
    brand: { '@type': 'Brand', name: 'Your Sofer' },
    ...(product.sofer ? { manufacturer: { '@type': 'Person', name: product.sofer } } : {}),
    offers: {
      '@type': 'Offer',
      url: `${BASE_URL}/product/${id}`,
      priceCurrency: 'ILS',
      price: product.price,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'Your Sofer' },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function ProductPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return (
    <>
      <ProductJsonLd id={id} />
      <ProductClient />
    </>
  );
}
