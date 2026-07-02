import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { getTier } from '@/app/lib/loyalty';

// POST /api/club-join — completes a club sign-up for the AUTHENTICATED user.
//
// Called by ClubPopup after a successful Google sign-in. The caller proves who
// they are with their Firebase ID token (Authorization: Bearer <idToken>) — the
// server acts only on the verified uid/email, so the endpoint cannot be used to
// touch anyone else's data.
//
// What it does (all with the Admin SDK — `leads` is admin-read-only by rules):
// 1. If users/{uid} is already a club member → returns { alreadyMember: true }.
// 2. Looks for existing leads with the same (verified) email — "old" club
//    sign-ups from the previous email+phone popup. If found: links the lead to
//    this uid and recovers the phone number onto the user profile (only when
//    the profile doesn't already have one).
// 3. If no lead exists → creates one ({ source:'club' }), so new members keep
//    flowing into the same mailing list the bulk-email system reads.
// 4. Marks users/{uid} as a club member (clubMember / clubJoinedAt /
//    clubConsent / newsletterSubscribed).
// 5. Retroactive loyalty credit: finds the member's PAID historical orders
//    (by uid and by verified email) that were never processed by the live
//    accrual, and credits points on the spot — same formula and idempotency
//    guard (loyaltyProcessed) as accruePoints in the payment route, without
//    touching the payment flow itself.

export const dynamic = 'force-dynamic';

// Statuses that must NOT earn retroactive points — stricter than the live
// isPaidOrder(): refunded/abandoned orders are excluded as well.
const SKIP_STATUSES = new Set(['pending_payment', 'cancelled', 'refunded', 'abandoned']);

function tsToMillis(ts: unknown): number {
  if (!ts) return 0;
  const maybe = ts as { toMillis?: () => number; seconds?: number };
  if (typeof maybe.toMillis === 'function') return maybe.toMillis();
  if (typeof maybe.seconds === 'number') return maybe.seconds * 1000;
  if (typeof ts === 'string') {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  return 0;
}

// Retroactive credit for the member's own historical orders. Mirrors
// accruePoints() in app/api/payment/route.ts: base = total − shipping,
// kippot capped at 5%, tier rate on the rest, tier read from the user's
// totalSpent BEFORE each order (chronological), per-order transaction with a
// loyaltyProcessed re-check so nothing is ever credited twice.
async function backfillUserPoints(
  db: FirebaseFirestore.Firestore,
  uid: string,
  email: string,
): Promise<{ ordersCredited: number; pointsCredited: number }> {
  const ordersCol = db.collection('orders');
  const [byUid, byEmail] = await Promise.all([
    ordersCol.where('uid', '==', uid).get(),
    ordersCol.where('email', '==', email).get(),
  ]);

  const seen = new Set<string>();
  const eligible: { id: string; createdAt: number }[] = [];
  for (const doc of [...byUid.docs, ...byEmail.docs]) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);
    const d = doc.data();
    if (d.loyaltyProcessed === true) continue;
    if (!d.status || SKIP_STATUSES.has(String(d.status))) continue;
    if (!(Number(d.total ?? 0) > 0)) continue;
    eligible.push({ id: doc.id, createdAt: tsToMillis(d.createdAt) });
  }
  eligible.sort((a, b) => a.createdAt - b.createdAt);

  if (eligible.length === 0) return { ordersCredited: 0, pointsCredited: 0 };

  const userRef = db.collection('users').doc(uid);
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  let ordersCredited = 0;
  let pointsCredited = 0;

  for (const o of eligible) {
    const orderRef = ordersCol.doc(o.id);
    // The transaction RETURNS the points earned (null = skipped) — counters are
    // updated outside, so a transaction retry can never double-count.
    const earned = await db.runTransaction<number | null>(async (tx) => {
      const [userSnap, orderSnap] = await Promise.all([tx.get(userRef), tx.get(orderRef)]);
      const order = orderSnap.data();
      if (!order || order.loyaltyProcessed === true) return null; // idempotency guard

      const data = userSnap.data() ?? {};
      const prevSpent = Number(data.totalSpent ?? 0);
      const prevPoints = Number(data.loyaltyPoints ?? 0);
      const tier = getTier(prevSpent);

      const total = Number(order.total ?? 0);
      const shipping = Number(order.shippingCost ?? 0);
      const baseAmount = Math.max(0, total - shipping);
      const items: Array<{ cat?: string; price?: number; quantity?: number }> =
        Array.isArray(order.items) ? order.items : [];
      const kippotBase = items
        .filter((i) => i && i.cat === 'כיפות')
        .reduce((sum, i) => sum + Number(i.price ?? 0) * Number(i.quantity ?? 1), 0);
      const regularBase = Math.max(0, baseAmount - kippotBase);
      const pointsEarned =
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
          amount: pointsEarned, reason: 'purchase', orderId: o.id,
          balanceAfter: prevPoints + pointsEarned,
          backfilled: true,
          createdAt: FieldValue.serverTimestamp(),
          expiresAt: expiresAt.toISOString(),
        });
      }

      return pointsEarned;
    });

    if (earned !== null) {
      ordersCredited += 1;
      pointsCredited += earned;
    }
  }

  return { ordersCredited, pointsCredited };
}

export async function POST(req: NextRequest) {
  try {
    // ── Authenticate the caller ─────────────────────────────────────────────
    const authHeader = req.headers.get('authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ ok: false, error: 'Missing auth token' }, { status: 401 });
    }

    let uid: string;
    let email: string;
    try {
      const decoded = await getAdminAuth().verifyIdToken(idToken);
      uid = decoded.uid;
      email = (decoded.email ?? '').trim().toLowerCase();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid auth token' }, { status: 401 });
    }
    if (!email) {
      return NextResponse.json({ ok: false, error: 'Account has no email' }, { status: 400 });
    }

    const db = getAdminDb();
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data() ?? {};

    // ── Already a member — nothing to do (and no duplicate welcome email) ───
    if (userData.clubMember === true) {
      return NextResponse.json({ ok: true, alreadyMember: true });
    }

    // ── Email-match against existing leads (old popup sign-ups) ─────────────
    let matchedLead = false;
    let recoveredPhone: string | null = null;
    try {
      const leadsSnap = await db
        .collection('leads')
        .where('email', '==', email)
        .limit(10)
        .get();

      if (!leadsSnap.empty) {
        matchedLead = true;
        for (const leadDoc of leadsSnap.docs) {
          const lead = leadDoc.data();
          if (!recoveredPhone && typeof lead.phone === 'string' && lead.phone.trim()) {
            recoveredPhone = lead.phone.trim();
          }
        }
        // Link the lead(s) to the real user so the identity isn't duplicated.
        await Promise.all(
          leadsSnap.docs.map((leadDoc) =>
            leadDoc.ref.update({ uid, linkedAt: FieldValue.serverTimestamp() }),
          ),
        );
      } else {
        // New member — keep the mailing list fed exactly like the old popup did.
        await db.collection('leads').add({
          email,
          phone: typeof userData.phone === 'string' ? userData.phone : '',
          source: 'club',
          consent: true,
          uid,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (e) {
      // Lead bookkeeping must never block the join itself.
      console.error('[club-join] leads lookup/link failed (non-fatal):', e);
    }

    // ── Mark membership on the user doc (merge — doc may be freshly created) ─
    const userPhone = typeof userData.phone === 'string' && userData.phone.trim() ? userData.phone : null;
    await userRef.set(
      {
        clubMember: true,
        clubJoinedAt: FieldValue.serverTimestamp(),
        clubConsent: true,
        newsletterSubscribed: true,
        ...(recoveredPhone && !userPhone ? { phone: recoveredPhone } : {}),
      },
      { merge: true },
    );

    // ── Retroactive points for historical orders (never blocks the join) ────
    let ordersCredited = 0;
    let pointsCredited = 0;
    try {
      const credit = await backfillUserPoints(db, uid, email);
      ordersCredited = credit.ordersCredited;
      pointsCredited = credit.pointsCredited;
    } catch (e) {
      console.error('[club-join] retroactive points failed (non-fatal):', e);
    }

    return NextResponse.json({
      ok: true,
      alreadyMember: false,
      matchedLead,
      phoneRecovered: Boolean(recoveredPhone && !userPhone),
      ordersCredited,
      pointsCredited,
    });
  } catch (err) {
    console.error('[club-join]', err);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
