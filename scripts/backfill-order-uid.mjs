// scripts/backfill-order-uid.mjs
// Retroactively sets uid + isGuest:false on orders placed by logged-in users
// that were saved without uid (before commit 2e03c68 added uid to checkout).
//
// Run ONCE:
//   FIREBASE_PROJECT_ID=xxx FIREBASE_CLIENT_EMAIL=xxx FIREBASE_PRIVATE_KEY=xxx \
//   node scripts/backfill-order-uid.mjs
//
// Or with a .env.local file already exported:
//   node -r dotenv/config scripts/backfill-order-uid.mjs

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';

// ── Init ──────────────────────────────────────────────────────────────────────
if (!getApps().length) {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? '';
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey,
    }),
  });
}
const db = getFirestore();

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Fetch orders that either have no uid or uid=null
  // isGuest:true catches both the explicit null case and pre-fix orders
  const snap = await db.collection('orders').where('isGuest', '==', true).get();

  const candidates = snap.docs.filter(d => !d.data().uid);
  console.log(`Checking ${candidates.length} orders without uid (of ${snap.size} guest orders total)\n`);

  let updated = 0, noUser = 0, noEmail = 0;

  for (const orderDoc of candidates) {
    const order = orderDoc.data();
    const raw   = order.email;
    if (!raw) { noEmail++; console.log(`  – ${orderDoc.id}: no email, skipped`); continue; }

    // Case-insensitive match: try lowercase first, then original
    const emails = [...new Set([raw.toLowerCase(), raw])];
    let userDoc = null;

    for (const email of emails) {
      const q = await db.collection('users').where('email', '==', email).limit(1).get();
      if (!q.empty) { userDoc = q.docs[0]; break; }
    }

    if (!userDoc) {
      noUser++;
      console.log(`  – ${order.orderNumber ?? orderDoc.id} (${raw}): no matching user`);
      continue;
    }

    await orderDoc.ref.update({ uid: userDoc.id, isGuest: false, loyaltyProcessed: false });
    console.log(`  ✓ ${order.orderNumber ?? orderDoc.id} (${raw}) → uid: ${userDoc.id}`);
    updated++;
  }

  console.log(`\n═══ Summary ═══`);
  console.log(`Updated:          ${updated}`);
  console.log(`No matching user: ${noUser}`);
  console.log(`No email:         ${noEmail}`);
  console.log(`Total checked:    ${candidates.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
