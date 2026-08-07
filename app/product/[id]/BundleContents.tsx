// ─────────────────────────────────────────────────────────────────────────────
// BundleContents — סקשן "מה כלול במארז" בעמוד המוצר.
//
// bundleComponentCodes נשמר כבר היום באדמין ("עד 4 קודי מוצר — מק״ט / ID"),
// אבל עד כה לא הוצג ללקוח בשום מקום. הרכיב הזה פותר בדיוק את זה.
//
// הקוד יכול להיות doc ID או sku — לכן קודם ניסיון GET ישיר לפי ID, ואם אין
// מסמך, נפילה לשאילתת sku. שתי הדרכים מקוששות ב-data cache של Next.
//
// Server Component: אין שליפה בדפדפן, אין שלד טעינה, ואפס השפעה על ה-LCP
// (הסקשן נמצא מתחת לקיפול).
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';

const FIREBASE_PROJECT = 'your-sofer';
const FIREBASE_API_KEY = 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I';
const REVALIDATE = 3600;

const NAVY = '#373A5A';
const GOLD = 'var(--ys-accent)';

interface Component {
  id: string;
  name: string;
  imgUrl?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseField(f: any): any {
  if (!f) return undefined;
  if ('stringValue' in f) return f.stringValue;
  if ('integerValue' in f) return Number(f.integerValue);
  if ('doubleValue' in f) return Number(f.doubleValue);
  if ('booleanValue' in f) return f.booleanValue;
  if ('nullValue' in f) return null;
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toComponent(doc: any): Component | null {
  const fields = doc?.fields ?? {};
  const id = String(doc?.name ?? '').split('/').pop() ?? '';
  const name = parseField(fields['name']) as string | undefined;
  if (!id || !name) return null;
  const imgUrl =
    (parseField(fields['imgUrl']) as string | undefined) ||
    (parseField(fields['image_url']) as string | undefined) ||
    (parseField(fields['imgUrl2']) as string | undefined);
  return { id, name, imgUrl };
}

async function resolveByDocId(code: string): Promise<Component | null> {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/products/${encodeURIComponent(code)}?key=${FIREBASE_API_KEY}`,
      { next: { revalidate: REVALIDATE } },
    );
    if (!res.ok) return null;
    return toComponent(await res.json());
  } catch {
    return null;
  }
}

async function resolveBySku(code: string): Promise<Component | null> {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'products' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'sku' },
                op: 'EQUAL',
                value: { stringValue: code },
              },
            },
            limit: 1,
          },
        }),
        next: { revalidate: REVALIDATE },
      },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ document?: unknown }>;
    const doc = rows.find(r => r.document)?.document;
    return doc ? toComponent(doc) : null;
  } catch {
    return null;
  }
}

async function resolveCode(code: string): Promise<Component | null> {
  return (await resolveByDocId(code)) ?? (await resolveBySku(code));
}

export default async function BundleContents({ codes }: { codes?: string[] | null }) {
  const clean = (codes ?? []).map(c => String(c).trim()).filter(Boolean).slice(0, 4);
  if (!clean.length) return null;

  const resolved = (await Promise.all(clean.map(resolveCode))).filter(Boolean) as Component[];
  // אם אף קוד לא נפתר (מק״ט שגוי / מוצר שנמחק) — עדיף לא להציג סקשן ריק.
  if (!resolved.length) return null;

  return (
    <section
      dir="rtl"
      aria-labelledby="bundle-contents-title"
      style={{ background: '#FFFFFF', borderTop: '1px solid #E7E2D8', padding: '36px 16px' }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span
            style={{
              background: NAVY, color: GOLD, fontSize: 11, fontWeight: 800,
              padding: '4px 10px', letterSpacing: '0.02em', lineHeight: 1.4,
            }}
          >
            ✦ מארז מהודר
          </span>
        </div>

        <h2 id="bundle-contents-title" style={{ fontSize: 21, fontWeight: 700, color: NAVY, margin: '10px 0 4px' }}>
          מה כלול במארז
        </h2>
        <div style={{ width: 44, height: 2, background: GOLD, marginBottom: 22 }} />

        <ul
          className="ys-bundle-grid"
          style={{
            listStyle: 'none', margin: 0, padding: 0,
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14,
          }}
        >
          {resolved.map(c => (
            <li key={c.id}>
              <Link
                href={`/product/${c.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  border: '1px solid #E7E2D8', padding: 10,
                  textDecoration: 'none', background: '#FFFFFF', height: '100%',
                }}
              >
                <span
                  style={{
                    width: 62, height: 62, flexShrink: 0, background: 'var(--ys-bg-warm)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {c.imgUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={optimizeCloudinaryUrl(c.imgUrl, 150)}
                      alt={c.name}
                      width={62} height={62}
                      loading="lazy" decoding="async"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span aria-hidden="true" style={{ fontSize: 20, opacity: 0.35 }}>🎁</span>
                  )}
                </span>
                <span
                  style={{
                    fontSize: 13.5, fontWeight: 600, color: NAVY, lineHeight: 1.45,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {c.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* 2 עמודות במובייל → 4 מ-768px */}
        <style>{`@media (min-width:768px){.ys-bundle-grid{grid-template-columns:repeat(4,1fr)!important}}`}</style>
      </div>
    </section>
  );
}
