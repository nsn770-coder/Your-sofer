import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireChatApiKey } from '@/lib/chatApiAuth';
import { serializeProduct, isVisibleProduct, scoreProduct, extractTerms } from '../_lib/serialize';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// GET /api/chat/products?q=&limit=&page=
// q empty => whole catalog. Better to over-return than to wrongly return nothing,
// so an unmatched query falls back to the full (visible) catalog rather than [].
export async function GET(req: NextRequest) {
  const authError = requireChatApiKey(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim();

    const limitRaw = parseInt(searchParams.get('limit') ?? '', 10);
    const pageRaw = parseInt(searchParams.get('page') ?? '', 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, MAX_LIMIT) : DEFAULT_LIMIT;
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

    const db = getAdminDb();
    const snap = await db.collection('products').get();

    const visible = snap.docs
      .map((doc) => ({ id: doc.id, data: doc.data() }))
      .filter(({ data }) => isVisibleProduct(data));

    const terms = extractTerms(q);

    let pool = visible;
    if (terms.length > 0) {
      const scored = visible
        .map((v) => ({ ...v, score: scoreProduct(v.data, terms) }))
        .filter((v) => v.score > 0)
        .sort((a, b) => b.score - a.score);
      pool = scored.length > 0 ? scored : visible; // over-return rather than empty
    }

    const total = pool.length;
    const start = (page - 1) * limit;
    const pageItems = pool.slice(start, start + limit);

    return NextResponse.json({
      total,
      products: pageItems.map(({ id, data }) => serializeProduct(id, data)),
    });
  } catch (err) {
    console.error('[chat-api/products]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
