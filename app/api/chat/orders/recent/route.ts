import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireChatApiKey } from '@/lib/chatApiAuth';
import { serializeOrder } from '../../_lib/serialize';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// GET /api/chat/orders/recent?limit= — owner-only, most recent orders newest first.
// Never surfaced to customers by the assistant.
export async function GET(req: NextRequest) {
  const authError = requireChatApiKey(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const limitRaw = parseInt(searchParams.get('limit') ?? '', 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, MAX_LIMIT) : DEFAULT_LIMIT;

    const db = getAdminDb();
    const snap = await db.collection('orders').orderBy('createdAt', 'desc').limit(limit).get();

    return NextResponse.json({
      orders: snap.docs.map((d) => serializeOrder(d.data())),
    });
  } catch (err) {
    console.error('[chat-api/orders/recent]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
