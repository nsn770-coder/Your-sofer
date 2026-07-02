// ── One-time loyalty backfill ─────────────────────────────────────────────────
// Credits club points retroactively for PAID orders that were never processed
// by the live accrual (orders without loyaltyProcessed:true).
//
// Mirrors accruePoints() in app/api/payment/route.ts EXACTLY:
//   base = total − shippingCost
//   kippot items (cat 'כיפות') earn a capped 5%
//   the rest earns the tier accrual rate (bronze/silver 10%, gold 12%),
//   tier evaluated from the user's running totalSpent BEFORE each order
//   (orders processed in chronological order so tiers progress correctly).
//
// User resolution like production: order.uid → users/{uid}, else email match.
// Guests without a users doc are skipped — safe to RE-RUN the script later:
// once an old customer signs up (e.g. via the club popup), the next run
// credits their history. Idempotent via the same loyaltyProcessed flag.
//
// Usage:
//   node app/scripts/backfillLoyalty.mjs            ← dry-run (default, no writes)
//   node app/scripts/backfillLoyalty.mjs --apply    ← actually write
//
// Requires app/scripts/serviceAccount.json (same as importProducts.mjs).

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes('--apply');

const serviceAccount = JSON.parse(
  await import('fs').then(fs => fs.promises.readFile(join(__dirname, 'serviceAccount.json'), 'utf8'))
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── Same tier logic as app/lib/loyalty.ts ────────────────────────────────────
function getTier(totalSpent) {
  if (totalSpent >= 3600) return { id: 'gold', accrualRate: 12 };
  if (totalSpent >= 1400) return { id: 'silver', accrualRate: 10 };
  return { id: 'bronze', accrualRate: 10 };
}

// Statuses that must NOT earn points. Live isPaidOrder() excludes only
// pending_payment/cancelled — for a retroactive credit we're stricter and
// also skip refunded/abandoned orders.
const SKIP_STATUSES = new Set(['pending_payment', 'cancelled', 'refunded', 'abandoned']);

function tsToMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts === 'string') { const d = new Date(ts); return Number.isNaN(d.getTime()) ? 0 : d.getTime(); }
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return 0;
}

function calcPoints(order, tierRate) {
  const total = Number(order.total ?? 0);
  const shipping = Number(order.shippingCost ?? 0);
  const baseAmount = Math.max(0, total - shipping);
  const items = Array.isArray(order.items) ? order.items : [];
  const kippotBase = items
    .filter(i => i && i.cat === 'כיפות')
    .reduce((sum, i) => sum + Number(i.price ?? 0) * Number(i.quantity ?? 1), 0);
  const regularBase = Math.max(0, baseAmount - kippotBase);
  const points = Math.floor(kippotBase * 0.05) + Math.floor(regularBase * tierRate / 100);
  return { points, baseAmount };
}

async function main() {
  console.log(APPLY ? '⚠️  APPLY MODE — writing to Firestore' : '🔍 DRY-RUN — no writes (use --apply to write)');

  // ── Load users: uid → data, plus email → uid map for legacy orders ────────
  const usersSnap = await db.collection('users').get();
  const users = new Map();          // uid → { totalSpent, loyaltyPoints, email }
  const emailToUid = new Map();     // normalized email → uid
  for (const doc of usersSnap.docs) {
    const d = doc.data();
    users.set(doc.id, {
      totalSpent: Number(d.totalSpent ?? 0),
      loyaltyPoints: Number(d.loyaltyPoints ?? 0),
      email: (d.email ?? '').trim().toLowerCase(),
    });
    if (d.email) emailToUid.set(String(d.email).trim().toLowerCase(), doc.id);
  }
  console.log(`נטענו ${users.size} משתמשים`);

  // ── Load orders needing processing, chronological ─────────────────────────
  const ordersSnap = await db.collection('orders').get();
  const pending = [];
  let alreadyProcessed = 0, notPaid = 0;
  for (const doc of ordersSnap.docs) {
    const d = doc.data();
    if (d.loyaltyProcessed === true) { alreadyProcessed++; continue; }
    if (!d.status || SKIP_STATUSES.has(d.status)) { notPaid++; continue; }
    if (!(Number(d.total ?? 0) > 0)) { notPaid++; continue; }
    pending.push({ id: doc.id, data: d, createdAt: tsToMillis(d.createdAt) });
  }
  pending.sort((a, b) => a.createdAt - b.createdAt);
  console.log(`סה"כ הזמנות: ${ordersSnap.size} | כבר מעובדות: ${alreadyProcessed} | לא שולמו/אפס: ${notPaid} | לעיבוד: ${pending.length}\n`);

  // ── Simulate per user (running state → correct historical tiers) ──────────
  const perUser = new Map();  // uid → { email, orders: [...], pointsEarned, spentAdded, tierBefore, tierAfter }
  const skippedGuests = [];

  // Running state starts from the user's CURRENT totals (matches what a
  // sequential live accrual would have produced).
  const runState = new Map(); // uid → { totalSpent, loyaltyPoints }

  for (const order of pending) {
    const d = order.data;
    let uid = typeof d.uid === 'string' && d.uid ? d.uid : null;
    if (uid && !users.has(uid)) uid = null;
    if (!uid && d.email) uid = emailToUid.get(String(d.email).trim().toLowerCase()) ?? null;
    if (!uid) { skippedGuests.push({ id: order.id, email: d.email ?? '(אין מייל)' }); continue; }

    if (!runState.has(uid)) {
      runState.set(uid, { ...users.get(uid) });
      perUser.set(uid, {
        email: users.get(uid).email, orders: [],
        pointsEarned: 0, spentAdded: 0,
        tierBefore: getTier(users.get(uid).totalSpent).id,
      });
    }
    const state = runState.get(uid);
    const tier = getTier(state.totalSpent);
    const { points, baseAmount } = calcPoints(d, tier.accrualRate);

    state.totalSpent += baseAmount;
    state.loyaltyPoints += points;

    const u = perUser.get(uid);
    u.orders.push({ id: order.id, orderNumber: d.orderNumber ?? '', points, baseAmount, balanceAfter: state.loyaltyPoints });
    u.pointsEarned += points;
    u.spentAdded += baseAmount;
    u.tierAfter = getTier(state.totalSpent).id;
  }

  // ── Report ─────────────────────────────────────────────────────────────────
  let totalPoints = 0, totalOrders = 0;
  for (const [uid, u] of perUser) {
    totalPoints += u.pointsEarned;
    totalOrders += u.orders.length;
    console.log(`${u.email || uid} | הזמנות: ${u.orders.length} | +${u.pointsEarned} נק' | הוצאה: +₪${u.spentAdded.toFixed(0)} | דרגה: ${u.tierBefore}→${u.tierAfter}`);
  }
  console.log(`\nסיכום: ${perUser.size} משתמשים | ${totalOrders} הזמנות | ${totalPoints} נקודות`);
  if (skippedGuests.length) {
    console.log(`\nדולגו ${skippedGuests.length} הזמנות אורח ללא חשבון (ניתן להריץ שוב אחרי שיצטרפו):`);
    for (const g of skippedGuests.slice(0, 20)) console.log(`  ${g.id} | ${g.email}`);
    if (skippedGuests.length > 20) console.log(`  ...ועוד ${skippedGuests.length - 20}`);
  }

  if (!APPLY) { console.log('\n🔍 dry-run הסתיים — שום דבר לא נכתב.'); return; }

  // ── Apply: per-order transaction, same shape as live accruePoints ─────────
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  let written = 0;

  for (const [uid, u] of perUser) {
    const userRef = db.collection('users').doc(uid);
    for (const o of u.orders) {
      const orderRef = db.collection('orders').doc(o.id);
      await db.runTransaction(async (tx) => {
        const [userSnap, orderSnap] = await Promise.all([tx.get(userRef), tx.get(orderRef)]);
        if (orderSnap.data()?.loyaltyProcessed === true) return; // safety re-check
        const data = userSnap.data() ?? {};
        const prevSpent = Number(data.totalSpent ?? 0);
        const prevPoints = Number(data.loyaltyPoints ?? 0);
        const newTotalSpent = prevSpent + o.baseAmount;

        tx.update(userRef, {
          totalSpent: newTotalSpent,
          loyaltyPoints: prevPoints + o.points,
          tier: getTier(newTotalSpent).id,
        });
        tx.update(orderRef, { loyaltyProcessed: true });

        if (o.points > 0) {
          tx.set(userRef.collection('pointsHistory').doc(), {
            amount: o.points, reason: 'purchase', orderId: o.id,
            balanceAfter: prevPoints + o.points,
            backfilled: true,
            createdAt: FieldValue.serverTimestamp(),
            expiresAt: expiresAt.toISOString(),
          });
        }
      });
      written++;
      if (written % 25 === 0) console.log(`... נכתבו ${written}/${totalOrders}`);
    }
  }
  console.log(`\n✅ הושלם: ${written} הזמנות זוכו.`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
