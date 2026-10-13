import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireAdmin, errorResponse } from '@/lib/logoStudio/auth.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Hit { id: string; name: string; sku: string | null; imgUrl: string | null; cat: string | null; hidden: boolean }

const toHit = (id: string, d: Record<string, unknown>): Hit => ({
  id,
  name: typeof d.name === 'string' ? d.name : '',
  sku: typeof d.sku === 'string' ? d.sku : null,
  imgUrl: typeof d.imgUrl === 'string' ? d.imgUrl : typeof d.image_url === 'string' ? d.image_url : null,
  cat: typeof d.cat === 'string' ? d.cat : null,
  hidden: d.hidden === true,
});

/**
 * GET ?q=<text|SKU|id> — חיפוש מוצר קיים לשיוך לכיפת סטודיו (אדמין בלבד).
 * מחפש: מזהה מסמך, קוד מוצר (SKU) מדויק, ואז שם בתוך קטגוריית הכיפות.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const q = (req.nextUrl.searchParams.get('q') || '').trim().slice(0, 80);
    if (q.length < 2) return NextResponse.json({ products: [] });
    const products = getAdminDb().collection('products');
    const found = new Map<string, Hit>();

    if (/^[A-Za-z0-9_-]{6,128}$/.test(q)) {
      const byId = await products.doc(q).get().catch(() => null);
      if (byId?.exists) found.set(byId.id, toHit(byId.id, byId.data() ?? {}));
    }
    for (const sku of new Set([q, q.toUpperCase()])) {
      const bySku = await products.where('sku', '==', sku).limit(5).get();
      bySku.docs.forEach(d => found.set(d.id, toHit(d.id, d.data())));
    }
    if (found.size < 20) {
      const needle = q.toLowerCase();
      const kippot = await products.where('cat', '==', 'כיפות').select('name', 'sku', 'imgUrl', 'image_url', 'cat', 'hidden').get();
      for (const d of kippot.docs) {
        if (found.size >= 20) break;
        const h = toHit(d.id, d.data());
        if (h.name.toLowerCase().includes(needle) || (h.sku ?? '').toLowerCase().includes(needle)) found.set(d.id, h);
      }
    }
    return NextResponse.json({ products: [...found.values()].slice(0, 20) });
  } catch (e) {
    return errorResponse(e, 'admin:studio-kippot:products');
  }
}
