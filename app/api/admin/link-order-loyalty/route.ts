import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminToken } from '@/lib/verifyAdmin';
import { getTier } from '@/app/lib/loyalty';

// POST /api/admin/link-order-loyalty — שיוך ידני של הזמנה למשתמש רשום + זיכוי נקודות.
// פותר מקרים כמו עדי אלפי: לקוחה שנרשמה עם אימייל אחד אבל הזמינה כאורחת עם
// אימייל/פרטים אחרים — ההזמנה לא מקושרת ל-uid ולכן הצבירה הרטרואקטיבית לא מוצאת אותה.
// אדמין בלבד. אותה נוסחה ואותו מנגנון idempotency (loyaltyProcessed) כמו club-join.

export const dynamic = 'force-dynamic';

const SKIP_STATUSES = new Set(['pending_payment', 'cancelled', 'refunded', 'abandoned']);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }
    if (!(await verifyAdminToken(idToken))) {
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 });
    }

    const { orderId, userEmail } = await req.json() as { orderId?: string; userEmail?: string };
    if (!orderId || !userEmail) {
      return NextResponse.json({ error: 'orderId and userEmail are required' }, { status: 400 });
    }
    const email = userEmail.trim().toLowerCase();

    const db = getAdminDb();

    // ── איתור המשתמש לפי אימייל ─────────────────────────────────────────────
    const userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (userSnap.empty) {
      return NextResponse.json({ error: `לא נמצא משתמש רשום עם האימייל ${email}` }, { status: 404 });
    }
    const userDoc = userSnap.docs[0];
    const uid = userDoc.id;

    const orderRef = db.collection('orders').doc(orderId);
    const userRef  = db.collection('users').doc(uid);

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    let pointsEarned = 0;
    let alreadyProcessed = false;

    await db.runTransaction(async (tx) => {
      const [orderSnap, uSnap] = await Promise.all([tx.get(orderRef), tx.get(userRef)]);
      if (!orderSnap.exists) throw new Error('ORDER_NOT_FOUND');
      const order = orderSnap.data()!;

      if (order.status && SKIP_STATUSES.has(String(order.status))) {
        throw new Error('ORDER_NOT_PAID');
      }

      // שיוך ההזמנה למשתמש — תמיד (גם אם הנקודות כבר זוכו)
      tx.update(orderRef, { uid, linkedByAdmin: true, linkedAt: FieldValue.serverTimestamp() });

      if (order.loyaltyProcessed === true) { alreadyProcessed = true; return; }

      const data = uSnap.data() ?? {};
      const prevSpent  = Number(data.totalSpent ?? 0);
      const prevPoints = Number(data.loyaltyPoints ?? 0);
      const tier = getTier(prevSpent);

      const total    = Number(order.total ?? 0);
      const shipping = Number(order.shippingCost ?? 0);
      const baseAmount = Math.max(0, total - shipping);
      const items: Array<{ cat?: string; price?: number; quantity?: number }> =
        Array.isArray(order.items) ? order.items : [];
      const kippotBase = items
        .filter((i) => i && i.cat === 'כיפות')
        .reduce((sum, i) => sum + Number(i.price ?? 0) * Number(i.quantity ?? 1), 0);
      const regularBase = Math.max(0, baseAmount - kippotBase);
      pointsEarned =
        Math.floor(kippotBase * 0.05) +
        Math.floor(regularBase * tier.accrualRate / 100);

      const newTotalSpent = prevSpent + baseAmount;
      tx.set(userRef, {
        totalSpent: newTotalSpent,
        loyaltyPoints: prevPoints + pointsEarned,
        tier: getTier(newTotalSpent).id,
      }, { merge: true });
      tx.update(orderRef, { loyaltyProcessed: true });

      if (pointsEarned > 0) {
        tx.set(userRef.collection('pointsHistory').doc(), {
          amount: pointsEarned, reason: 'purchase', orderId,
          balanceAfter: prevPoints + pointsEarned,
          linkedByAdmin: true,
          createdAt: FieldValue.serverTimestamp(),
          expiresAt: expiresAt.toISOString(),
        });
      }
    });

    return NextResponse.json({
      success: true,
      uid,
      userName: (userDoc.data().displayName as string) || (userDoc.data().name as string) || email,
      alreadyProcessed,
      pointsEarned,
    });
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    if (e.message === 'ORDER_NOT_FOUND') {
      return NextResponse.json({ error: 'ההזמנה לא נמצאה' }, { status: 404 });
    }
    if (e.message === 'ORDER_NOT_PAID') {
      return NextResponse.json({ error: 'ההזמנה לא שולמה (בוטלה / ממתינה לתשלום) — אין זיכוי' }, { status: 400 });
    }
    console.error('[link-order-loyalty]', e.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
