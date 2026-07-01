import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireChatApiKey } from '@/lib/chatApiAuth';
import { serializeProduct, isVisibleProduct } from '../../_lib/serialize';

export const dynamic = 'force-dynamic';

// GET /api/chat/products/{id} — single product with live price/stock, plus details[].
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireChatApiKey(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const db = getAdminDb();
    const doc = await db.collection('products').doc(id).get();
    const data = doc.data();

    if (!doc.exists || !data || !isVisibleProduct(data)) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(serializeProduct(doc.id, data, { withDetails: true }));
  } catch (err) {
    console.error('[chat-api/products/id]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
