/**
 * verifySeed.mjs
 * Reads stores/yoursofer, memberships collection, and users platformRole.
 * Usage: node app/scripts/verifySeed.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!getApps().length) {
  const SA = resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
  initializeApp({ credential: cert(JSON.parse(readFileSync(SA, 'utf8'))) });
}
const db   = getFirestore();
const auth = getAuth();

const OWNER_UID  = 'CqYU8azKVdQPt6PVahDLmCJ5fp53';
const IDAN_EMAIL = 'bnsymwlydn2@gmail.com';

console.log('═'.repeat(60));
console.log('🔍 verifySeed — YourSofer multi-tenancy seed check');
console.log('═'.repeat(60));

// 1. stores/yoursofer
console.log('\n── 1. stores/yoursofer ───────────────────────────────────');
const storeSnap = await db.collection('stores').doc('yoursofer').get();
if (!storeSnap.exists) {
  console.log('  ❌ Document does NOT exist');
} else {
  console.log('  ✅ Document exists. Fields:');
  const d = storeSnap.data();
  for (const [k, v] of Object.entries(d)) {
    const display = (v && typeof v === 'object' && v.constructor?.name === 'Timestamp')
      ? v.toDate().toISOString()
      : JSON.stringify(v);
    console.log(`     ${k}: ${display}`);
  }
}

// 2. memberships collection
console.log('\n── 2. memberships collection ─────────────────────────────');
const memSnap = await db.collection('memberships').get();
console.log(`  Total documents: ${memSnap.size}`);
memSnap.forEach(doc => {
  const { userId, storeId, role, createdAt } = doc.data();
  const ts = (createdAt && typeof createdAt.toDate === 'function') ? createdAt.toDate().toISOString() : createdAt;
  console.log(`\n  doc id : ${doc.id}`);
  console.log(`    userId   : ${userId}`);
  console.log(`    storeId  : ${storeId}`);
  console.log(`    role     : ${role}`);
  console.log(`    createdAt: ${ts}`);
});

// 3. users platformRole
console.log('\n── 3. users platformRole ─────────────────────────────────');

async function checkUser(uid, label) {
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) {
    console.log(`  ⚠️  users/${uid} (${label}): document does NOT exist`);
    return;
  }
  const data = snap.data();
  const role = data.platformRole ?? '(field missing)';
  const ok   = role === 'superadmin' ? '✅' : '❌';
  console.log(`  ${ok} users/${uid} (${label}): platformRole = "${role}"`);
}

await checkUser(OWNER_UID, 'owner');

try {
  const idanUser = await auth.getUserByEmail(IDAN_EMAIL);
  console.log(`  ℹ️  idan UID resolved: ${idanUser.uid}`);
  await checkUser(idanUser.uid, `idan — ${IDAN_EMAIL}`);
} catch (e) {
  console.log(`  ⚠️  Could not find auth user for ${IDAN_EMAIL}: ${e.message}`);
}

console.log('\n' + '═'.repeat(60));
process.exit(0);
