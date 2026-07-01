import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireChatApiKey } from '@/lib/chatApiAuth';
import { serializeOrder, resolveCustomerPhone, phoneQueryVariants } from '../_lib/serialize';

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

    async function runIn(field: string, values: string[]) {
      if (values.length === 0) return;
      const snap = await db.collection('orders').where(field, 'in', values).limit(50).get();
      for (const d of snap.docs) {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          docs.push(d);
        }
      }
    }

    // Match on every plausible stored format of the phone (local vs. E.164), since
    // a WhatsApp-based caller will likely send E.164 while orders are stored locally.
    await Promise.all([
      runIn('phone', phoneQueryVariants(phone)),
      runIn('email', email ? [email] : []),
    ]);

    docs.sort((a, b) => {
      const aSec = (a.data().createdAt?.seconds as number | undefined) ?? 0;
      const bSec = (b.data().createdAt?.seconds as number | undefined) ?? 0;
      return bSec - aSec;
    });

    const orders = await Promise.all(
      docs.map(async (doc) => {
        const data = doc.data();
        const resolvedPhone = await resolveCustomerPhone(db, data);
        return serializeOrder(data, resolvedPhone);
      }),
    );

    return NextResponse.json({ orders });
  } catch (err) {
    console.error('[chat-api/orders]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
