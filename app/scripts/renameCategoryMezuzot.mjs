/**
 * Renames all products with cat === 'מזוזות' (physical mezuzah cases)
 * to cat === 'בתי מזוזה' in Firestore.
 *
 * Usage: node app/scripts/renameCategoryMezuzot.mjs
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS env var or Firebase service account.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Init Firebase Admin ───────────────────────────────────────────────────────
const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH
  ?? resolve(process.cwd(), 'service-account.json');

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch {
  console.error('❌ Could not read service account file at:', serviceAccountPath);
  console.error('   Set SERVICE_ACCOUNT_PATH env var or place service-account.json in project root.');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// ── Migration ─────────────────────────────────────────────────────────────────
const OLD_CAT = 'מזוזות';
const NEW_CAT = 'בתי מזוזה';
const BATCH_SIZE = 400;

async function run() {
  console.log(`\n🔄 Renaming category: "${OLD_CAT}" → "${NEW_CAT}"\n`);

  let totalUpdated = 0;
  let cursor = null;

  while (true) {
    let q = db.collection('products').where('cat', '==', OLD_CAT).limit(BATCH_SIZE);
    if (cursor) q = q.startAfter(cursor);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach(doc => {
      batch.update(doc.ref, { cat: NEW_CAT });
    });
    await batch.commit();

    totalUpdated += snap.size;
    cursor = snap.docs[snap.docs.length - 1];
    console.log(`  ✓ Updated ${snap.size} products (total so far: ${totalUpdated})`);

    if (snap.size < BATCH_SIZE) break;
  }

  console.log(`\n✅ Done. Total products updated: ${totalUpdated}\n`);
  console.log('⚠️  Remember to also update the Firestore "categories" collection');
  console.log('   document with slug "מזוזות" → slug "בתי מזוזה" if one exists.\n');
}

run().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
