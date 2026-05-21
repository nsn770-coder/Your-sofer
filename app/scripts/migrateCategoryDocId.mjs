/**
 * Migrates the Firestore "categories" document whose ID is 'מזוזות'
 * to a new document with ID 'בתי מזוזה', preserving all fields.
 * Deletes the old document afterwards.
 *
 * Usage: node app/scripts/migrateCategoryDocId.mjs
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

const OLD_ID = 'מזוזות';
const NEW_ID = 'בתי מזוזה';

async function run() {
  console.log(`\n🔄 Migrating categories doc ID: "${OLD_ID}" → "${NEW_ID}"\n`);

  const oldRef = db.collection('categories').doc(OLD_ID);
  const oldSnap = await oldRef.get();

  if (!oldSnap.exists) {
    console.log(`ℹ️  Document "${OLD_ID}" not found. Nothing to migrate.`);
    // Check if new doc already exists
    const newSnap = await db.collection('categories').doc(NEW_ID).get();
    if (newSnap.exists) {
      console.log(`✅ Document "${NEW_ID}" already exists:`, JSON.stringify(newSnap.data()));
    }
    return;
  }

  const data = oldSnap.data();
  console.log('  Old document data:', JSON.stringify(data));

  // Write new document with updated ID (name/slug already set to 'בתי מזוזה' by previous script)
  const newData = { ...data, name: NEW_ID, slug: NEW_ID };
  await db.collection('categories').doc(NEW_ID).set(newData);
  console.log(`  ✓ Created document "${NEW_ID}"`, JSON.stringify(newData));

  // Delete old document
  await oldRef.delete();
  console.log(`  ✓ Deleted old document "${OLD_ID}"`);

  console.log(`\n✅ Done. Category doc migrated from "${OLD_ID}" to "${NEW_ID}".\n`);
}

run().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
