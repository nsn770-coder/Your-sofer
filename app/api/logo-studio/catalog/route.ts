import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { errorResponse, HttpError } from '@/lib/logoStudio/auth.server';
import { isStudioKippah, resolveSelection, type RawProduct } from '@/lib/logoStudio/catalog';
import { getSettings, loadProduct, sanitizeVariants } from '@/lib/logoStudio/projects.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function publicProduct(p: RawProduct) {
  return {
    id: p.id,
    name: p.name ?? '',
    price: p.price ?? 0,
    imgUrl: p.imgUrl || p.image_url || null,
    variantOptions: (p.variantOptions ?? []).map(o => ({ name: o.name, values: o.values })),
  };
}

/**
 * GET ?productId=X&v={"צבע":"לבן"} → one product + resolved selection
 * GET (no params)                   → kippot available in the studio
 * Public catalog data only (same as the product pages).
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const productId = sp.get('productId');
    if (productId) {
      let variants: Record<string, string> = {};
      try { variants = sanitizeVariants(JSON.parse(sp.get('v') || '{}')); } catch { /* ignore */ }
      const product = await loadProduct(productId);
      const settings = await getSettings();
      const selection = resolveSelection(product, variants);
      if (!selection.maxPrintWidthMm && settings.defaultMaxPrintWidthMm) selection.maxPrintWidthMm = settings.defaultMaxPrintWidthMm;
      return NextResponse.json({ product: publicProduct(product), selection, studioEnabled: isStudioKippah(product) });
    }
    const col = getAdminDb().collection('products');
    const [a, b] = await Promise.all([
      col.where('customDesign', '==', true).limit(60).get(),
      col.where('isEventKippot', '==', true).limit(60).get(),
    ]);
    const seen = new Set<string>();
    const products: ReturnType<typeof publicProduct>[] = [];
    for (const d of [...a.docs, ...b.docs]) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      const p = { id: d.id, ...(d.data() as Omit<RawProduct, 'id'>) };
      if (isStudioKippah(p)) products.push(publicProduct(p));
    }
    if (!products.length) throw new HttpError(404, 'no_products', 'אין כרגע כיפות זמינות לעיצוב.');
    return NextResponse.json({ products }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  } catch (e) {
    return errorResponse(e, 'catalog');
  }
}
