import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { getTier } from '@/app/lib/loyalty';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // ── 1. Verify Firebase Auth token ─────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const adminAuth = getAdminAuth();
    let uid: string;
    let tokenEmail: string;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      uid        = decoded.uid;
      tokenEmail = (decoded.email ?? '').trim().toLowerCase();
    } catch {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 });
    }

    if (!uid || !tokenEmail) {
      return NextResponse.json({ error: 'Token missing uid or email' }, { status: 401 });
    }

    // ── 2. Parse body ──────────────────────────────────────────────────────────
    const body = await req.json() as { orderId?: string };
    const { orderId } = body;
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    // ── 3. Atomic transaction ─────────────────────────────────────────────────
    const adminDb  = getAdminDb();
    const orderRef = adminDb.collection('orders').doc(orderId);
    const userRef  = adminDb.collection('users').doc(uid);

    let pointsEarned   = 0;
    let alreadyProcessed = false;

    await adminDb.runTransaction(async (tx) => {
      const [orderSnap, userSnap] = await Promise.all([
        tx.get(orderRef),
        tx.get(userRef),
      ]);

      // 3a. Order must exist
      if (!orderSnap.exists) {
        throw new Error('ORDER_NOT_FOUND');
      }
      const order = orderSnap.data()!;

      // 3b. Idempotency guard — never credit twice
      if (order.loyaltyProcessed === true) {
        alreadyProcessed = true;
        return;
      }

      // 3c. Security — caller may only claim their own order
      const orderEmail = (order.email ?? '').trim().toLowerCase();
      if (orderEmail !== tokenEmail) {
        throw new Error('EMAIL_MISMATCH');
      }

      // 3d. Calculate points — flat 10% of subtotal
      // (category not stored on order items, so no kippot split; 10% is equal to or
      // better than the 5% rate that kippot would receive — always in the customer's favour)
      const total        = Number(order.total        ?? 0);
      const shippingCost = Number(order.shippingCost ?? 0);
      const baseAmount   = Math.max(0, total - shippingCost);
      pointsEarned       = Math.floor(baseAmount * 0.10);

      // 3e. Read current user totals (default to 0 if doc is very new / missing)
      const userData    = userSnap.exists ? (userSnap.data() ?? {}) : {};
      const prevSpent   = Number(userData.totalSpent    ?? 0);
      const prevPoints  = Number(userData.loyaltyPoints ?? 0);
      const newTotalSpent = prevSpent + baseAmount;
      const newTier       = getTier(newTotalSpent);

      // 3e. Update user — use set+merge so a race-condition-new doc is safe
      tx.set(userRef, {
        loyaltyPoints: prevPoints + pointsEarned,
        totalSpent:    newTotalSpent,
        tier:          newTier.id,
      }, { merge: true });

      // 3f. Mark order processed and link to uid
      tx.update(orderRef, {
        loyaltyProcessed: true,
        loyaltyUid:       uid,
      });

      // 3g. Points history — one sub-doc per credit event
      if (pointsEarned > 0) {
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        tx.set(userRef.collection('pointsHistory').doc(), {
          amount:       pointsEarned,
          reason:       'purchase_retroactive',
          orderId,
          balanceAfter: prevPoints + pointsEarned,
          createdAt:    FieldValue.serverTimestamp(),
          expiresAt:    expiresAt.toISOString(),
        });
      }

      console.log(
        `[claim-order] uid=${uid} orderId=${orderId} +${pointsEarned}pts` +
        ` spent:${prevSpent}→${newTotalSpent} tier→${newTier.id}`,
      );
    });

    if (alreadyProcessed) {
      return NextResponse.json({ alreadyProcessed: true, pointsEarned: 0 });
    }

    return NextResponse.json({ alreadyProcessed: false, pointsEarned });

  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));

    if (e.message === 'ORDER_NOT_FOUND') {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (e.message === 'EMAIL_MISMATCH') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.error('[claim-order] unhandled error:', e.message, e.stack);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
