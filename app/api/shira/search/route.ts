import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export interface SearchFilters {
  cat?: string;
  subCategory?: string;
  color?: string;
  material?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  keywords?: string[];
  sort?: string;
}

export interface ProductResult {
  id: string;
  name: string;
  price: number;
  imgUrl: string;
  cat: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyClientFilters(docs: any[], filters: SearchFilters): any[] {
  let results = docs;
  if (filters.color)        results = results.filter(p => p.color === filters.color);
  if (filters.material)     results = results.filter(p => p.material === filters.material);
  if (filters.subCategory)  results = results.filter(p => p.subCategory === filters.subCategory);
  if (filters.minPrice != null) results = results.filter(p => (p.price ?? 0) >= filters.minPrice!);
  if (filters.maxPrice != null) results = results.filter(p => (p.price ?? 0) <= filters.maxPrice!);
  if (filters.keywords?.length) {
    results = results.filter(p =>
      filters.keywords!.some(kw =>
        (p.name ?? '').includes(kw) || (p.desc ?? '').includes(kw)
      )
    );
  }
  return results;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sortResults(results: any[], sort?: string): any[] {
  if (sort === 'price_asc')  return [...results].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  if (sort === 'price_desc') return [...results].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  return [...results].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toProductResult(p: any): ProductResult {
  return {
    id: String(p.id ?? ''),
    name: String(p.name ?? ''),
    price: Number(p.price ?? 0),
    imgUrl: String(p.imgUrl || p.image_url || ''),
    cat: String(p.cat ?? ''),
  };
}

async function runQuery(cat?: string): Promise<Record<string, unknown>[]> {
  const db = getAdminDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = db.collection('products').where('status', '==', 'active');
  if (cat) q = q.where('cat', '==', cat);
  const fetchLimit = cat ? 300 : 500;
  const snap = await q.limit(fetchLimit).get();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const filters: SearchFilters = body.filters ?? {};

    const allDocs = await runQuery(filters.cat);

    // Attempt 1 — full filters
    let results = applyClientFilters(allDocs, filters);

    let fallback = false;

    // Fallback 1 — drop color
    if (results.length === 0 && filters.color) {
      results = applyClientFilters(allDocs, { ...filters, color: undefined });
      fallback = true;
    }

    // Fallback 2 — drop color + material
    if (results.length === 0 && filters.material) {
      results = applyClientFilters(allDocs, {
        ...filters,
        color: undefined,
        material: undefined,
      });
      fallback = true;
    }

    // Fallback 3 — keywords only within cat
    if (results.length === 0 && filters.keywords?.length) {
      results = applyClientFilters(allDocs, { keywords: filters.keywords });
      fallback = true;
    }

    // Fallback 4 — top by priority in cat (or overall)
    if (results.length === 0) {
      results = allDocs;
      fallback = true;
    }

    const sorted = sortResults(results, filters.sort);
    const products: ProductResult[] = sorted.slice(0, 3).map(toProductResult);

    return NextResponse.json({ products, fallback });
  } catch (e) {
    console.error('[shira/search]', e);
    return NextResponse.json({ products: [], fallback: false });
  }
}
