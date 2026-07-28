import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items' }, { status: 400 });
    }

    const db = getAdminDb();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const ref = await db.collection('savedCarts').add({
      items,
      createdAt: new Date().toISOString(),
      expiresAt,
    });

    return NextResponse.json({ cartId: ref.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[save-cart] failed:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
