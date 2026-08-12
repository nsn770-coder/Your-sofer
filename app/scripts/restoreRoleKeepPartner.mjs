/**
 * Restore a user's original role (from previousRole) while keeping partnerId,
 * now that partner access is driven by partnerId rather than by `role`.
 *
 * Usage:
 *   node app/scripts/restoreRoleKeepPartner.mjs <email>
 *   node app/scripts/restoreRoleKeepPartner.mjs <email> --apply
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';

const email = process.argv[2];
const apply = process.argv.includes('--apply');
if (!email) {
  console.error('Usage: node app/scripts/restoreRoleKeepPartner.mjs <email> [--apply]');
  process.exit(1);
}

const serviceAccount = JSON.parse(
  readFileSync(new URL('../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json', import.meta.url))
);
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const uid = (await getAuth().getUserByEmail(email)).uid;
const ref = db.collection('users').doc(uid);
const data = (await ref.get()).data() || {};

console.log('\nCurrent users/' + uid + ':');
console.log(JSON.stringify(data, null, 2));

if (!data.previousRole) {
  console.log('\nNo previousRole field — nothing to restore.');
  process.exit(0);
}

const update = {
  role: data.previousRole,
  previousRole: FieldValue.delete(),
  updatedAt: FieldValue.serverTimestamp(),
};

console.log(`\nWould set role: "${data.role}" -> "${data.previousRole}" (partnerId kept: ${data.partnerId})`);

if (!apply) {
  console.log('\n(dry run — rerun with --apply)');
  process.exit(0);
}

await ref.update(update);
console.log('\n✓ Restored.');
process.exit(0);
