/**
 * Diagnose a partner signup that did not result in a partners/{uid} document.
 *
 * Usage: node app/scripts/inspectPartnerSignup.mjs someone@example.com
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';

const email = (process.argv[2] || '').toLowerCase();
if (!email) {
  console.error('Usage: node app/scripts/inspectPartnerSignup.mjs <email>');
  process.exit(1);
}

const serviceAccount = JSON.parse(
  readFileSync(new URL('../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json', import.meta.url))
);
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const auth = getAuth();

const show = (label, snap) => {
  console.log(`\n===== ${label} (${snap.size}) =====`);
  snap.forEach((d) => console.log(d.id, '=>', JSON.stringify(d.data(), null, 2)));
};

// 1. Auth users matching this email (there may be more than one account)
console.log('##### AUTH #####');
try {
  const u = await auth.getUserByEmail(email);
  console.log('exact match:', u.uid, '| providers:', u.providerData.map((p) => p.providerId).join(', '));
} catch {
  console.log('no exact auth user for', email);
}

// 2. Applications
show('partners_applications by email', await db.collection('partners_applications').where('email', '==', email).get());

// 3. Payments
show('partner_payments by email', await db.collection('partner_payments').where('email', '==', email).get());

// 4. Any partners doc with this email (uid may differ)
show('partners by email', await db.collection('partners').where('email', '==', email).get());

// 5. Recent applications/payments, in case the email was stored differently
const recentApps = await db.collection('partners_applications').orderBy('createdAt', 'desc').limit(10).get();
console.log('\n===== 10 most recent applications (any email) =====');
recentApps.forEach((d) => {
  const x = d.data();
  console.log(d.id, '|', x.email, '|', x.businessName, '|', x.status);
});

const recentPays = await db.collection('partner_payments').orderBy('createdAt', 'desc').limit(10).get();
console.log('\n===== 10 most recent payments (any email) =====');
recentPays.forEach((d) => {
  const x = d.data();
  console.log(d.id, '|', x.email, '|', x.status, '| webhookReceived:', x.webhookReceived, '| appId:', x.applicationId);
});

process.exit(0);
