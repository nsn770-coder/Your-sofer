import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireChatApiKey } from '@/lib/chatApiAuth';

export const dynamic = 'force-dynamic';

// Same "what counts as paid" definition as app/lib/orderStatus.ts isPaidOrder() —
// every status reachable only after a successful Sumit charge.
const PAID_LIKE = new Set([
  'paid', 'magiah', 'sofer', 'packing', 'shipped', 'delivered', 'completed', 'needs_care', 'abandoned',
]);

const FETCH_CAP = 10000;

// GET /api/chat/sales/summary?since=&until= — owner-only aggregate of paid orders
// in the window (ISO dates, inclusive).
export async function GET(req: NextRequest) {
  const authError = requireChatApiKey(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const sinceParam = searchParams.get('since');
    const untilParam = searchParams.get('until');

    const since = sinceParam ? new Date(sinceParam) : null;
    const until = untilParam ? new Date(untilParam) : null;

    if ((sinceParam && Number.isNaN(since?.getTime())) || (untilParam && Number.isNaN(until?.getTime()))) {
      return NextResponse.json({ error: 'Invalid since/until date' }, { status: 400 });
    }

    // Inclusive window — "until" covers the whole day.
    if (until) until.setUTCHours(23, 59, 59, 999);

    const db = getAdminDb();
    let q: FirebaseFirestore.Query = db.collection('orders');
    if (since) q = q.where('createdAt', '>=', Timestamp.fromDate(since));
    if (until) q = q.where('createdAt', '<=', Timestamp.fromDate(until));

    const snap = await q.limit(FETCH_CAP).get();

    let orderCount = 0;
    let grossRevenue = 0;
    for (const doc of snap.docs) {
      const d = doc.data();
      if (typeof d.status === 'string' && PAID_LIKE.has(d.status)) {
        orderCount += 1;
        grossRevenue += Number(d.total ?? 0);
      }
    }

    return NextResponse.json({
      order_count: orderCount,
      gross_revenue: grossRevenue.toFixed(2),
      currency: 'ILS',
      truncated: snap.size >= FETCH_CAP,
    });
  } catch (err) {
    console.error('[chat-api/sales/summary]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
