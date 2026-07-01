import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireChatApiKey } from '@/lib/chatApiAuth';
import { serializeOrder } from '../_lib/serialize';

export const dynamic = 'force-dynamic';

// GET /api/chat/orders?phone=&email= — that customer's recent orders.
// Empty list (not 404) when nothing matches.
export async function GET(req: NextRequest) {
  const authError = requireChatApiKey(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const phone = (searchParams.get('phone') ?? '').trim();
    const email = (searchParams.get('email') ?? '').trim();

    if (!phone && !email) {
      return NextResponse.json({ orders: [] });
    }

    const db = getAdminDb();
    const seen = new Set<string>();
    const docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];

    async function run(field: string, value: string) {
      if (!value) return;
      const snap = await db.collection('orders').where(field, '==', value).limit(50).get();
      for (const d of snap.docs) {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          docs.push(d);
        }
      }
    }

    await Promise.all([run('phone', phone), run('email', email)]);

    docs.sort((a, b) => {
      const aSec = (a.data().createdAt?.seconds as number | undefined) ?? 0;
      const bSec = (b.data().createdAt?.seconds as number | undefined) ?? 0;
      return bSec - aSec;
    });

    return NextResponse.json({
      orders: docs.map((d) => serializeOrder(d.data())),
    });
  } catch (err) {
    console.error('[chat-api/orders]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
