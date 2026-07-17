import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import type { CartItem } from '@/app/contexts/CartContext';
import { getTier } from '@/app/lib/loyalty';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-sofer.com';

// ── IPN לתשלום ביט (Sumit) ────────────────────────────────────────────────────
// Sumit קוראת ל-URL הזה בצד שרת אחרי תשלום ביט מוצלח (כמו בפלאגין הרשמי).
// אימות: המפתח הסודי ב-query חייב להתאים ל-hash שנשמר בהזמנה בעת היצירה.
// כאן (ולא בצד לקוח) מתבצעים: סימון paid, עדכון שימוש בקופון, מימוש וצבירת נקודות.
// כל הפעולות אידמפוטנטיות — קריאת IPN כפולה לא תזכה/תנכה פעמיים.

// ── Loyalty accrual helper (זהה ל-/api/payment) ───────────────────────────────
async function accruePoints(
  adminDb: ReturnType<typeof getAdminDb>,
  orderId: string,
  uid: string | null,
  email: string,
  total: number,
  shippingCost: number,
  cartItems: Pick<CartItem, 'cat' | 'price' | 'quantity'>[],
): Promise<void> {
  const uidSnap = uid ? await adminDb.collection('users').doc(uid).get() : null;
  let userRef   = uidSnap?.exists ? uidSnap.ref : null;
  if (!userRef && email) {
    const q = await adminDb.collection('users').where('email', '==', email).limit(1).get();
    if (!q.empty) userRef = q.docs[0].ref;
  }
  if (!userRef) return; // guest without account — skip silently

  const orderDocRef = adminDb.collection('orders').doc(orderId);

  await adminDb.runTransaction(async (tx) => {
    const [userSnap, orderSnap] = await Promise.all([tx.get(userRef!), tx.get(orderDocRef)]);
    if (orderSnap.data()?.loyaltyProcessed === true) return; // idempotency guard

    const data        = userSnap.data() ?? {};
    const prevSpent   = Number(data.totalSpent   ?? 0);
    const prevPoints  = Number(data.loyaltyPoints ?? 0);
    const currentTier = getTier(prevSpent);

    const baseAmount  = Math.max(0, total - (shippingCost || 0));
    const kippotBase  = cartItems
      .filter(i => i.cat === 'כיפות')
      .reduce((sum, i) => sum + i.price * i.quantity, 0);
    const regularBase = Math.max(0, baseAmount - kippotBase);

    const pointsEarned =
      Math.floor(kippotBase  * 0.05) +
      Math.floor(regularBase * currentTier.accrualRate / 100);

    const newTotalSpent = prevSpent + baseAmount;
    const newTier       = getTier(newTotalSpent);

    tx.update(userRef!, {
      totalSpent:    newTotalSpent,
      loyaltyPoints: prevPoints + pointsEarned,
      tier:          newTier.id,
    });
    tx.update(orderDocRef, { loyaltyProcessed: true, pointsEarned });

    const historyCol = userRef!.collection('pointsHistory');
    const expiresAt  = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    if (pointsEarned > 0) {
      tx.set(historyCol.doc(), {
        amount: pointsEarned, reason: 'purchase', orderId,
        balanceAfter: prevPoints + pointsEarned,
        createdAt: FieldValue.serverTimestamp(), expiresAt: expiresAt.toISOString(),
      });
    }

    console.log(`[bit-ipn][loyalty] uid=${uid ?? email} +${pointsEarned}pts tier:${currentTier.id}→${newTier.id}`);
  });
}

// ── Loyalty redemption helper (זהה ל-/api/payment) ────────────────────────────
async function redeemPoints(
  adminDb: ReturnType<typeof getAdminDb>,
  orderId: string,
  uid: string,
  pointsUsed: number,
): Promise<void> {
  const userRef  = adminDb.collection('users').doc(uid);
  const orderRef = adminDb.collection('orders').doc(orderId);

  await adminDb.runTransaction(async (tx) => {
    const [userSnap, orderSnap] = await Promise.all([tx.get(userRef), tx.get(orderRef)]);
    if (orderSnap.data()?.pointsRedeemed === true) return; // idempotency guard

    const prevPoints = Number(userSnap.data()?.loyaltyPoints ?? 0);
    const deduct = Math.min(prevPoints, pointsUsed);
    const balanceAfter = prevPoints - deduct;

    tx.set(userRef, { loyaltyPoints: balanceAfter }, { merge: true });
    tx.update(orderRef, { pointsRedeemed: true });

    tx.set(userRef.collection('pointsHistory').doc(), {
      amount:       -deduct,
      reason:       'redemption',
      orderId,
      balanceAfter,
      createdAt:    FieldValue.serverTimestamp(),
    });

    if (deduct < pointsUsed) {
      console.error(`[bit-ipn][loyalty-redeem] RACE: uid=${uid} order=${orderId} requested=${pointsUsed} had only ${prevPoints}`);
    }
    console.log(`[bit-ipn][loyalty-redeem] uid=${uid} order=${orderId} -${deduct}pts balance:${prevPoints}→${balanceAfter}`);
  });
}

export async function POST(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get('orderId');
    const key     = req.nextUrl.searchParams.get('key');
    if (!orderId || !key) {
      console.error('[bit-ipn] missing orderId/key');
      return NextResponse.json({ error: 'bad request' }, { status: 400 });
    }

    // גוף ה-IPN של Sumit מגיע כ-form-encoded (documentid, customerid) — קריאה סלחנית
    let documentId: string | null = null;
    let customerId: string | null = null;
    try {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await req.json().catch(() => null) as Record<string, unknown> | null;
        documentId = String(body?.documentid ?? body?.DocumentID ?? '') || null;
        customerId = String(body?.customerid ?? body?.CustomerID ?? '') || null;
      } else {
        const text = await req.text();
        const params = new URLSearchParams(text);
        documentId = params.get('documentid') || params.get('DocumentID');
        customerId = params.get('customerid') || params.get('CustomerID');
      }
    } catch { /* body optional — האימות הוא על orderId+key */ }

    const adminDb  = getAdminDb();
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      console.error('[bit-ipn] order not found:', orderId);
      return NextResponse.json({ error: 'order not found' }, { status: 404 });
    }
    const order = orderSnap.data()!;

    // ── אימות: המפתח הסודי חייב להתאים ל-hash השמור ──────────────────────────
    if (order.paymentMethod !== 'bit' || !order.bitIpnKeyHash) {
      console.error('[bit-ipn] order is not a bit order:', orderId);
      return NextResponse.json({ error: 'invalid order' }, { status: 400 });
    }
    const keyHash = createHash('sha256').update(key).digest('hex');
    if (keyHash !== order.bitIpnKeyHash) {
      console.error('[bit-ipn] key mismatch for order:', orderId);
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // ── סימון ההזמנה כשולמה (אידמפוטנטי — דגל bitConfirmed נפרד מ-status,
    //    כי דף התודה עלול לעדכן status ל-paid לפני שה-IPN מגיע) ─────────────────
    if (order.bitConfirmed === true) {
      console.log('[bit-ipn] already confirmed:', orderId);
      return NextResponse.json({ ok: true, already: true });
    }

    await orderRef.update({
      bitConfirmed: true,
      status: 'paid',
      paidAt: FieldValue.serverTimestamp(),
      bitDocumentId: documentId || null,
      bitCustomerId: customerId || null,
      // דגלים שמסומנים כאן כדי שעמוד התודה לא ישלח מייל/סנכרון כפולים —
      // בזרימת ביט הלקוח משלם באפליקציה ולא תמיד חוזר לאתר, ולכן
      // המייל והסנכרון חייבים לקרות כאן בצד שרת (תוקן 17.7.26 אחרי
      // הזמנה אמיתית ששולמה בביט בלי שהלקוח חזר לעמוד התודה).
      confirmationEmailSent: true,
      opsSynced: true,
    });
    console.log('[bit-ipn] order confirmed paid:', orderId, order.orderNumber, 'doc:', documentId);

    // ── מייל אישור הזמנה — בצד שרת, לא תלוי בחזרת הלקוח לאתר ────────────────
    try {
      const emailRes = await fetch(`${BASE_URL}/api/send-order-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: order.email,
          customerName: order.customerName,
          orderNumber: order.orderNumber,
          items: order.items,
          total: order.total,
          address: order.address,
        }),
      });
      if (!emailRes.ok) throw new Error(`send-order-email returned ${emailRes.status}`);
      console.log('[bit-ipn] confirmation email sent for', order.orderNumber);
    } catch (emailErr) {
      console.error('[bit-ipn] EMAIL FAILED — send manually!', order.orderNumber, emailErr);
      await orderRef.update({ confirmationEmailSent: false }).catch(() => {});
    }

    // ── סנכרון למערכת הניהול הפנימית ─────────────────────────────────────────
    try {
      await fetch(`${BASE_URL}/api/ops/sync-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.email,
          customerPhone: order.phone || '',
          items: order.items,
          total: order.total,
          address: order.address,
        }),
      });
    } catch (opsErr) {
      console.error('[bit-ipn] ops sync failed (non-fatal):', opsErr);
    }

    // ── תופעות לוואי (כמו בזרימת האשראי, non-fatal) ───────────────────────────
    // 1. שימוש בקופון
    if (order.couponCode) {
      try {
        await adminDb.collection('coupons').doc(order.couponCode).update({
          usedBy: FieldValue.arrayUnion(order.email || order.customerName),
          usedAt: FieldValue.serverTimestamp(),
        });
      } catch (couponErr) {
        console.error('[bit-ipn] coupon usage update failed:', couponErr);
      }
    }

    // 2. מימוש נקודות (לפני צבירה — כמו בזרימת האשראי)
    const pointsUsed = Number(order.pointsUsed ?? 0);
    if (pointsUsed > 0 && order.bitRedeemUid) {
      try {
        await redeemPoints(adminDb, orderId, order.bitRedeemUid, pointsUsed);
      } catch (redeemErr) {
        console.error('[bit-ipn] POINTS REDEMPTION FAILED — deduct manually!', { orderId, uid: order.bitRedeemUid, pointsUsed }, redeemErr);
      }
    }

    // 3. צבירת נקודות
    try {
      await accruePoints(
        adminDb, orderId, order.uid || null, order.email || '',
        Number(order.total ?? 0), Number(order.shippingCost ?? 0),
        (order.bitLoyaltyItems ?? order.items ?? []) as Pick<CartItem, 'cat' | 'price' | 'quantity'>[],
      );
    } catch (loyaltyErr) {
      console.error('[bit-ipn] loyalty accrual failed (non-fatal):', loyaltyErr);
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[bit-ipn] unhandled error:', err.message, err.stack);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
