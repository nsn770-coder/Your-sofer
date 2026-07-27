import type { Metadata } from 'next';
import ProductClient from './ProductClient';
import ProductShell, { type ShellProduct } from './ProductShell';
import BundleContents from './BundleContents';
import PageFaqSection from '@/app/components/faq/PageFaqSection';
import { formatPrice } from '@/app/lib/utils';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';

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
  if ('timestampValue' in field) return field.timestampValue as string; // ISO string — matches client-side date handling
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
  stars?: number;
  reviews?: number;
  /** מוצר מארז — עד 4 קודי רכיבים (מק״ט / doc ID). ראו BundleContents. */
  bundleComponentCodes?: string[] | null;
}

interface ReviewItem {
  reviewerName?: string;
  stars?: number;
  text?: string;
  createdAt?: string;
}

async function fetchReviews(id: string): Promise<ReviewItem[]> {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/products/${id}/reviews?key=${FIREBASE_API_KEY}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.documents) return [];
    return data.documents.map((doc: { fields?: Record<string, unknown> }) =>
      doc.fields ? parseFields(doc.fields) as ReviewItem : {}
    );
  } catch {
    return [];
  }
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
    // מוצר שנמחק / לא קיים — לא לאנדקס, כדי שגוגל לא יציג "מוצר" גנרי בתוצאות
    return {
      title: 'מוצר לא נמצא | Your Sofer',
      description: 'המוצר אינו זמין יותר. גלו כיפות בעיצוב אישי, מזכרות לאירועים ומגוון היודאיקה שלנו.',
      robots: { index: false, follow: false },
    };
  }

  const name = product.name ?? 'מוצר';
  const desc =
    product.desc ||
    product.description ||
    `${name} - מתוך מבחר היודאיקה הגדול בישראל. משלוחים לכל הארץ. Your Sofer.`;
  const image = product.imgUrl || product.image_url || product.imgUrl2;
  const priceStr = product.price ? formatPrice(product.price) : '';
  const pageUrl = `${BASE_URL}/product/${id}`;

  const images = image
    ? [{ url: image, width: 800, height: 800, alt: name }]
    : undefined;

  return {
    title: `${name}${priceStr ? ` - ${priceStr}` : ''}`,
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
  const [product, reviewItems] = await Promise.all([fetchProduct(id), fetchReviews(id)]);
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
    sku: id,
    name: product.name,
    description: product.desc || product.description || undefined,
    image: images.length ? images : undefined,
    brand: { '@type': 'Brand', name: 'Your Sofer' },
    ...(product.sofer ? { manufacturer: { '@type': 'Person', name: product.sofer } } : {}),
    ...(product.reviews && product.reviews > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.stars,
        reviewCount: product.reviews,
      },
    } : {}),
    ...(reviewItems.length > 0 ? {
      review: reviewItems.slice(0, 5).map((r) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.reviewerName || 'לקוח מאומת' },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: r.stars || 5,
          bestRating: 5,
        },
        ...(r.text ? { reviewBody: r.text } : {}),
      })),
    } : {}),
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'IL',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 14,
      returnMethod: 'https://schema.org/ReturnByMail',
      // תואם למדיניות ההחזרות: עלות המשלוח החוזר חלה על הלקוח
      returnFees: 'https://schema.org/ReturnShippingFees',
    },
    shippingDetails: [
      {
        '@type': 'OfferShippingDetails',
        // תואם לעלות המשלוח בפועל (SHIPPING_REGULAR = 35)
        shippingRate: { '@type': 'MonetaryAmount', value: '35', currency: 'ILS' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
          transitTime:  { '@type': 'QuantitativeValue', minValue: 5, maxValue: 8, unitCode: 'DAY' },
        },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IL' },
      },
    ],
    offers: {
      '@type': 'Offer',
      url: `${BASE_URL}/product/${id}`,
      priceCurrency: 'ILS',
      price: product.price,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'Your Sofer' },
    },
  };

  // LCP: preload the exact image ProductClient shows first, so the browser
  // downloads it in parallel with the client-side Firestore fetch instead of
  // discovering it only after hydration. Mirrors ProductClient's allMedia logic
  // (aiLifestyleImage first; else image #2 promoted; width 800 — keep in sync).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = product as any;
  const mediaRaw = [
    p.imgUrl || p.image_url,
    p.imgUrl2 || p.img1,
    p.imgUrl3 || p.img2,
    p.imgUrl4 || p.img3,
    p.imgUrl5,
  ].filter(Boolean) as string[];
  const mediaDeduped = [...new Set(mediaRaw)];
  const mainImage = p.aiLifestyleImage
    ? (p.aiLifestyleImage as string)
    : (mediaDeduped.length >= 2 ? mediaDeduped[1] : mediaDeduped[0]);
  const mainImageOptimized = mainImage ? optimizeCloudinaryUrl(mainImage, 800) : null;

  return (
    <>
      {mainImageOptimized && (
        <link rel="preload" as="image" href={mainImageOptimized} fetchPriority="high" />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </>
  );
}

// ── FAQ ממוקד לפי קטגוריה ────────────────────────────────────────────────────
// ערכי הקטגוריות חייבים להתאים במדויק לערכי Firestore (case sensitive).
// מוצרים עם עיצוב אישי → שאלות הקדשה/הדמיה; מוצרי סת״ם → שאלות כשרות/אחריות.

const CUSTOM_DESIGN_CATS = ['כיפות', 'טליתות', 'סידורים', 'כיסויי חלה', 'תיקי תפילין'];
const STAM_CATS = ['קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'מגילות', 'ספרי תורה'];

function productFaqKey(cat?: string): 'product-custom' | 'stam' | null {
  if (!cat) return null;
  if (CUSTOM_DESIGN_CATS.includes(cat)) return 'product-custom';
  if (STAM_CATS.includes(cat)) return 'stam';
  return null;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function ProductPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // PERF: same fetch as generateMetadata/ProductJsonLd — deduped by Next's
  // fetch cache, so this costs nothing extra. The parsed product is:
  //  1. rendered as a server-side above-the-fold shell (real LCP image +
  //     title + price in the initial HTML, removed by ProductClient on mount)
  //  2. passed to ProductClient as initialProduct so it renders full content
  //     at hydration instead of waiting for a client-side Firestore roundtrip.
  const product = await fetchProduct(id);
  // Only pass data through when the essential render fields exist — otherwise
  // fall back to the original client-side flow (spinner → Firestore fetch).
  const shellProduct = product && product.name && product.price != null
    ? ({ ...(product as Record<string, unknown>), id } as ShellProduct)
    : null;
  const faqKey = productFaqKey(product?.cat);
  const breadcrumbSchema = product?.name ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'דף הבית', item: BASE_URL },
      ...(product.cat ? [{ '@type': 'ListItem', position: 2, name: product.cat, item: `${BASE_URL}/category/${encodeURIComponent(product.cat)}` }] : []),
      { '@type': 'ListItem', position: product.cat ? 3 : 2, name: product.name, item: `${BASE_URL}/product/${id}` },
    ],
  } : null;
  return (
    <>
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}
      <ProductJsonLd id={id} />
      {shellProduct && <ProductShell product={shellProduct} />}
      <ProductClient initialProduct={shellProduct} />
      {/* "מה כלול במארז" — רק למוצרים עם bundleComponentCodes; מחזיר null אחרת */}
      <BundleContents codes={product?.bundleComponentCodes ?? null} />
      {/* FAQ ממוקד מתחת לתוכן המוצר — לא מפריע לתהליך ההוספה לסל */}
      {faqKey && (
        <PageFaqSection
          pageKey={faqKey}
          title={faqKey === 'stam' ? 'שאלות נפוצות על מוצרי סת״ם' : 'שאלות נפוצות על עיצוב אישי'}
          max={faqKey === 'stam' ? 8 : 6}
        />
      )}
    </>
  );
}
