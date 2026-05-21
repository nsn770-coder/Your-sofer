/**
 * Finds the Firestore "categories" document with slug or name === 'מזוזות'
 * and updates it to name/slug === 'בתי מזוזה'.
 *
 * Usage: node app/scripts/updateCategoryDocument.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH
  ?? resolve(process.cwd(), 'service-account.json');

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch {
  console.error('❌ Could not read service account file at:', serviceAccountPath);
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const OLD = 'מזוזות';
const NEW_NAME = 'בתי מזוזה';
const NEW_SLUG = 'בתי מזוזה';

async function run() {
  console.log(`\n🔄 Searching "categories" collection for slug/name === "${OLD}"\n`);

  const col = db.collection('categories');

  // Try slug field first, then name field
  const [bySlug, byName] = await Promise.all([
    col.where('slug', '==', OLD).get(),
    col.where('name', '==', OLD).get(),
  ]);

  // Merge unique docs
  const seen = new Set();
  const docs = [];
  for (const snap of [bySlug, byName]) {
    snap.docs.forEach(doc => {
      if (!seen.has(doc.id)) {
        seen.add(doc.id);
        docs.push(doc);
      }
    });
  }

  if (docs.length === 0) {
    console.log('ℹ️  No document found with slug or name === "מזוזות". Nothing to update.');
    return;
  }

  for (const doc of docs) {
    console.log(`  Found doc ID: ${doc.id}`, JSON.stringify(doc.data()));
    await doc.ref.update({ name: NEW_NAME, slug: NEW_SLUG });
    console.log(`  ✓ Updated → name: "${NEW_NAME}", slug: "${NEW_SLUG}"`);
  }

  console.log(`\n✅ Done. Updated ${docs.length} document(s).\n`);
}

run().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
