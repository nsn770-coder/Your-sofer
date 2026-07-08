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

import type { LifeEvent } from '@/data/lifeEvents';

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
  _tabLabel?: string;
}

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

// ── Fetch all products for an event, server-side, cached ─────────────────────
export async function fetchMomentProducts(event: LifeEvent): Promise<MomentProduct[]> {
  const uniqueCats = [...new Set(event.relatedCategories.map(cf => cf.category))];
  if (uniqueCats.length === 0) return [];

  const body = {
    structuredQuery: {
      from: [{ collectionId: 'products' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'cat' },
          op: 'IN',
          value: { arrayValue: { values: uniqueCats.map(c => ({ stringValue: c })) } },
        },
      },
    },
  };

  let docs: MomentProduct[] = [];
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        next: { revalidate: MOMENT_REVALIDATE },
      },
    );
    if (!res.ok) return [];
    const results = (await res.json()) as Array<{ document?: unknown }>;
    docs = results.filter(r => r.document).map(r => docToProduct(r.document));
  } catch {
    return []; // On failure, client component falls back to its own live fetch.
  }

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
