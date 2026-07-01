import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireChatApiKey } from '@/lib/chatApiAuth';
import { serializeOrder, resolveCustomerPhone } from '../../_lib/serialize';

export const dynamic = 'force-dynamic';

// GET /api/chat/orders/{number} — one order by its human order number (e.g. "YS-123456").
export async function GET(req: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const authError = requireChatApiKey(req);
  if (authError) return authError;

  try {
    const { number } = await params;
    const db = getAdminDb();
    const snap = await db.collection('orders').where('orderNumber', '==', number).limit(1).get();

    if (snap.empty) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const data = snap.docs[0].data();
    const resolvedPhone = await resolveCustomerPhone(db, data);
    return NextResponse.json(serializeOrder(data, resolvedPhone));
  } catch (err) {
    console.error('[chat-api/orders/number]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
