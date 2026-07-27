// Server-side product fetch for /moment/[id] pages.
//
// WHY THIS EXISTS:
// Previously each visit ran a big client-side Firestore `where('cat','in',[...])`
// query (up to 8 categories, no limit), then dedup/filter/sort in the browser —
// so the skeleton showed on every cold load and every new visitor hit Firestore live.
//
// This module runs the SAME logic on the server via the Firestore REST API with
// Next.js data-cache (`next: { revalidate }`). The result is baked into the page and
// reused for all visitors until the revalidate window elapses — a fixed cached copy,
// not a fresh source read per visit.

import type { CategoryFilter } from '@/data/lifeEvents';
import type { ProductAddon } from '@/app/lib/types';

/**
 * מקור מוצרים לעמוד מבוסס-אירוע. LifeEvent מקיים את הצורה הזו, וכך גם
 * OccasionConfig ב-data/occasions.ts — שני סוגי העמודים חולקים את אותה שליפה.
 */
export interface ProductSource {
  relatedCategories: CategoryFilter[];
}

const FIREBASE_PROJECT = 'your-sofer';
const FIREBASE_API_KEY = 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I';

// Refresh the cached copy at most once every 10 minutes.
// Product edits appear within this window; raise/lower to taste.
export const MOMENT_REVALIDATE = 600;

export interface MomentProduct {
  id: string;
  name: string;
  price: number;
  imgUrl?: string;
  image_url?: string;
  imgUrl2?: string;
  imgUrl3?: string;
  /** תמונת ה-AI lifestyle — גוברת על imgUrl בתצוגת גריד, כמו ב-ProductCard */
  aiLifestyleImage?: string;
  priority?: number;
  isBestSeller?: boolean;
  badge?: string | null;
  was?: number | null;
  createdAt?: { seconds: number } | null;
  hidden?: boolean;
  cat?: string;
  subCategory?: string;
  filterAttributes?: Record<string, string>;
  hasKlafSelection?: boolean;
  soferId?: string;
  soferName?: string;
  soferPhoto?: string;
  stars?: number;
  outOfStock?: boolean;
  /** מוצר מארז — עד 4 קודי רכיבים. מזין את הבאדג' "מארז מהודר" בכרטיס. */
  bundleComponentCodes?: string[] | null;
  // ── שדות תמחור — נדרשים ל-effectivePrice() דרך priceSource בכרטיס ──
  isOnSale?: boolean;
  salePrice?: number;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  clearanceDiscount?: boolean;
  clearanceSalePrice?: number;
  originalPrice?: number;
  // ── התאמה אישית — מזין את getPersonalization() בכרטיס ──
  customDesign?: boolean;
  isEventKippot?: boolean;
  addons?: ProductAddon[] | null;
  _tabLabel?: string;
}

/**
 * PERF — קריטי: הפרויקציה הזו היא ההבדל בין עמוד שנטען בשניות לעמוד שנתקע.
 *
 * בלי select, runQuery מחזיר את **כל** שדות המסמך — כולל תיאורים ארוכים,
 * מערכי תגיות ושדות אדמין — עבור כל מוצר בכל הקטגוריות של האירוע. בעמוד
 * כמו wedding (תכשיטים + מתנות + שבת + יודאיקה + תיקים) אלה אלפי מסמכים
 * ועשרות MB של JSON שצריך להוריד ולפרסר בכל רענון — מה שגרם ל-render של
 * 23.6 דקות. עם select הפלט מצטמצם לשדות שהגריד באמת מציג.
 *
 * ⚠️ שדה שמוסיפים ל-MomentProduct חייב להתווסף גם כאן, אחרת הוא יגיע
 *    undefined בזמן ריצה בלי שום שגיאת טייפים.
 */
const SELECT_FIELDS = [
  'name', 'price', 'imgUrl', 'image_url', 'imgUrl2', 'imgUrl3', 'aiLifestyleImage',
  'priority', 'isBestSeller', 'badge', 'was', 'createdAt', 'hidden',
  'cat', 'subCategory', 'filterAttributes', 'hasKlafSelection',
  'soferId', 'soferName', 'soferPhoto', 'stars', 'outOfStock',
  'bundleComponentCodes',
  'isOnSale', 'salePrice', 'saleStartsAt', 'saleEndsAt',
  'clearanceDiscount', 'clearanceSalePrice', 'originalPrice',
  'customDesign', 'isEventKippot', 'addons',
] as const;

// ── Recursive Firestore REST value parser ────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseValue(v: any): any {
  if (!v || typeof v !== 'object') return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) {
    const ms = Date.parse(v.timestampValue);
    return Number.isNaN(ms) ? null : { seconds: Math.floor(ms / 1000) };
  }
  if ('mapValue' in v) {
    const out: Record<string, unknown> = {};
    const fields = v.mapValue?.fields ?? {};
    for (const k of Object.keys(fields)) out[k] = parseValue(fields[k]);
    return out;
  }
  if ('arrayValue' in v) {
    return (v.arrayValue?.values ?? []).map(parseValue);
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToProduct(doc: any): MomentProduct {
  const fields = doc.fields ?? {};
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(fields)) out[k] = parseValue(fields[k]);
  const id = (doc.name as string).split('/').pop() ?? '';
  return { id, ...(out as object) } as MomentProduct;
}

const RUN_QUERY_URL =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;

/** מעל זה עדיף להחזיר עמוד עם פחות מוצרים מאשר לתלות את הרינדור. */
const FETCH_TIMEOUT_MS = 8000;

/**
 * שליפת קטגוריה בודדת, מוגבלת ומוקווששת בנפרד.
 *
 * למה לא שאילתת IN אחת גדולה: IN בלי limit פר-קטגוריה מחזיר את כל המוצרים
 * בכל הקטגוריות של האירוע במכה אחת. בעמוד wedding (תכשיטים + מתנות + שבת +
 * יודאיקה + תיקים) אלה אלפי מסמכים בתשובה אחת — הרינדור נתקע, והתשובה גם
 * חורגת מתקרת ה-2MB של ה-fetch cache של Next ולכן נשלפת מחדש בכל רינדור.
 *
 * שליפה פר-קטגוריה נותנת: תשובות קטנות שנכנסות לקאש, ריצה במקביל, כשל
 * מבודד (קטגוריה אחת שנופלת לא מפילה את העמוד) וגבול עליון ודאי על העבודה.
 */
async function fetchCategory(cat: string, limit: number): Promise<MomentProduct[]> {
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'products' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'cat' },
          op: 'EQUAL',
          value: { stringValue: cat },
        },
      },
      select: { fields: SELECT_FIELDS.map(f => ({ fieldPath: f })) },
      limit,
    },
  };

  try {
    const res = await fetch(RUN_QUERY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      next: { revalidate: MOMENT_REVALIDATE },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const results = (await res.json()) as Array<{ document?: unknown }>;
    return results.filter(r => r.document).map(r => docToProduct(r.document!));
  } catch {
    return []; // timeout / רשת — קטגוריה אחת חסרה, העמוד ממשיך להיבנות
  }
}

// ── Fetch all products for an event, server-side, cached ─────────────────────
export async function fetchMomentProducts(
  event: ProductSource,
  opts: { perCategoryLimit?: number } = {},
): Promise<MomentProduct[]> {
  // ברירת המחדל 1000 נבחרה כדי לא לשנות בפועל את עמודי /moment הקיימים:
  // הקטגוריה הגדולה באתר (כיפות) מונה ~800 מוצרים, כך שאין שם קיצוץ.
  // עמודי /gifts מעבירים ערך נמוך בהרבה — הם גריד נחיתה, לא קטלוג.
  const { perCategoryLimit = 1000 } = opts;
  const uniqueCats = [...new Set(event.relatedCategories.map(cf => cf.category))];
  if (uniqueCats.length === 0) return [];

  const perCat = await Promise.all(uniqueCats.map(c => fetchCategory(c, perCategoryLimit)));
  const docs: MomentProduct[] = perCat.flat();

  // Group by cat for O(1) lookup per CategoryFilter (mirrors client logic).
  const catDocs = new Map<string, MomentProduct[]>();
  for (const p of docs) {
    const cat = p.cat ?? '';
    if (!catDocs.has(cat)) catDocs.set(cat, []);
    catDocs.get(cat)!.push(p);
  }

  const seen = new Set<string>();
  const all: MomentProduct[] = [];

  for (const cf of event.relatedCategories) {
    const list = catDocs.get(cf.category) ?? [];
    for (const p of list) {
      if (seen.has(p.id)) continue;
      if (p.hidden === true) continue;

      if (cf.subCategories !== 'all') {
        const allowed = cf.subCategories as string[];
        if (!allowed.includes(p.subCategory ?? '')) continue;
      }

      if (cf.nameContains?.length) {
        const n = (p.name ?? '').toLowerCase();
        if (!cf.nameContains.some(kw => n.includes(kw.toLowerCase()))) continue;
      }

      seen.add(p.id);
      all.push({ ...p, _tabLabel: cf.tabLabel });
    }
  }

  all.sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50));
  return all;
}
