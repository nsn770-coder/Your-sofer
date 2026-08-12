/**
 * Fix a user whose partner provisioning skipped the role upgrade
 * (they already had a users/{uid} doc from a previous signup).
 *
 * Usage:
 *   node app/scripts/fixPartnerRole.mjs someone@example.com
 *   node app/scripts/fixPartnerRole.mjs someone@example.com --apply
 *
 * Without --apply it only reports what it would change (dry run).
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';

const email = process.argv[2];
const apply = process.argv.includes('--apply');

if (!email) {
  console.error('Usage: node app/scripts/fixPartnerRole.mjs <email> [--apply]');
  process.exit(1);
}

const serviceAccount = JSON.parse(
  readFileSync(new URL('../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json', import.meta.url))
);

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();
const auth = getAuth();

const user = await auth.getUserByEmail(email);
const uid = user.uid;
console.log(`\nUser:  ${email}\nUID:   ${uid}`);

const userSnap = await db.collection('users').doc(uid).get();
const userData = userSnap.exists ? userSnap.data() : null;
console.log('users/{uid}:', userData ? JSON.stringify(userData, null, 2) : 'MISSING');

const partnerSnap = await db.collection('partners').doc(uid).get();
console.log('partners/{uid} exists:', partnerSnap.exists);

if (!partnerSnap.exists) {
  console.error(
    '\n✗ No partners/' + uid + ' document. The setup fee may not have been provisioned at all.' +
    '\n  Check partner_payments / partners_applications before running with --apply.'
  );
  process.exit(1);
}

const subs = await db
  .collection('partners_subscriptions')
  .where('partnerId', '==', uid)
  .get();
console.log('subscriptions found:', subs.size);

const update = {
  role: 'partner',
  partnerId: uid,
  status: 'active',
};
if (userData?.role && userData.role !== 'partner') {
  update.previousRole = userData.role;
}

console.log('\nWould apply to users/' + uid + ':');
console.log(JSON.stringify(update, null, 2));

if (!apply) {
  console.log('\n(dry run — rerun with --apply to write)');
  process.exit(0);
}

await db.collection('users').doc(uid).set(update, { merge: true });
console.log('\n✓ Applied. User now has partner access.');
process.exit(0);
