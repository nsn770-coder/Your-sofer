/**
 * Manually provision a partner account for a payment that was charged but whose
 * provisioning never completed (e.g. the pre-fix Firestore transaction error).
 *
 * Mirrors app/lib/partner-provisioning.ts — all reads before any writes.
 *
 * Usage:
 *   node app/scripts/provisionPartnerManual.mjs <paymentId>
 *   node app/scripts/provisionPartnerManual.mjs <paymentId> --apply
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';

const paymentId = process.argv[2];
const apply = process.argv.includes('--apply');

if (!paymentId) {
  console.error('Usage: node app/scripts/provisionPartnerManual.mjs <paymentId> [--apply]');
  process.exit(1);
}

const serviceAccount = JSON.parse(
  readFileSync(new URL('../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json', import.meta.url))
);
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const auth = getAuth();

const generateStoreUrl = (businessName) =>
  businessName
    .toLowerCase()
    .replace(/[^א-תװ-״\w]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

const paymentRef = db.collection('partner_payments').doc(paymentId);
const paymentSnap = await paymentRef.get();
if (!paymentSnap.exists) {
  console.error('payment not found:', paymentId);
  process.exit(1);
}
const paymentData = paymentSnap.data();
console.log('\nPayment:', JSON.stringify(paymentData, null, 2));

if (paymentData.status !== 'success') {
  console.error(`\n✗ payment status is "${paymentData.status}", not "success". Refusing to provision.`);
  process.exit(1);
}

const applicationId = paymentData.applicationId;
const appRef = db.collection('partners_applications').doc(applicationId);
const appSnap = await appRef.get();
if (!appSnap.exists) {
  console.error('application not found:', applicationId);
  process.exit(1);
}
const appData = appSnap.data();
console.log('\nApplication:', appData.businessName, '|', appData.email, '|', appData.status);

const email = paymentData.email;
let uid;
try {
  uid = (await auth.getUserByEmail(email)).uid;
  console.log('\nExisting auth user:', uid);
} catch (e) {
  if (e?.code === 'auth/user-not-found') {
    if (!apply) {
      console.log('\nWould CREATE a new auth user for', email);
      uid = '(new)';
    } else {
      uid = (await auth.createUser({ email, emailVerified: false, displayName: appData.businessName })).uid;
      console.log('\nCreated auth user:', uid);
    }
  } else throw e;
}

if (!apply) {
  console.log('\n--- DRY RUN ---');
  console.log('Would create partners/' + uid);
  console.log('Would set users/' + uid + ' role=partner, partnerId=' + uid);
  console.log('Would create a partners_subscriptions doc (400 ILS/month)');
  console.log('Would mark application approved and payment webhookReceived=true');
  console.log('\nRerun with --apply to write.');
  process.exit(0);
}

await db.runTransaction(async (t) => {
  const partnerRef = db.collection('partners').doc(uid);
  const userRef = db.collection('users').doc(uid);

  const [payCheck, partnerSnap, userSnap] = await Promise.all([
    t.get(paymentRef),
    t.get(partnerRef),
    t.get(userRef),
  ]);

  if (payCheck.data()?.webhookReceived === true) {
    console.log('already provisioned — nothing to do');
    return;
  }

  if (!partnerSnap.exists) {
    t.set(partnerRef, {
      uid,
      email: appData.email,
      status: 'payment_received',
      businessName: appData.businessName,
      firstName: appData.firstName,
      lastName: appData.lastName,
      phone: appData.phone,
      city: appData.city,
      businessType: appData.businessType,
      businessId: appData.businessId,
      taxId: appData.taxId,
      storeUrl: generateStoreUrl(appData.businessName),
      storeName: appData.businessName,
      isPublished: false,
      commissionPercent: 20,
      setupFeeAmount: 5000,
      setupFeePaid: true,
      setupFeePaidAt: new Date().toISOString(),
      subscriptionFeeMonthly: 400,
      onboarding: {
        nameComplete: false,
        logoComplete: false,
        colorsComplete: false,
        whatsappComplete: false,
        published: false,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  if (!userSnap.exists) {
    t.set(userRef, {
      email: appData.email,
      displayName: appData.businessName,
      role: 'partner',
      partnerId: uid,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
    });
  } else {
    const existing = userSnap.data() || {};
    const upgrade = {
      role: 'partner',
      partnerId: uid,
      status: 'active',
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (existing.role && existing.role !== 'partner') upgrade.previousRole = existing.role;
    t.update(userRef, upgrade);
  }

  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  t.set(db.collection('partners_subscriptions').doc(), {
    partnerId: uid,
    status: 'active',
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: nextMonth.toISOString(),
    nextBillingDate: nextMonth.toISOString(),
    amount: 400,
    currency: 'ILS',
    lastChargeDate: null,
    failureCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  t.update(appRef, {
    status: 'approved',
    approvedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  t.update(paymentRef, {
    webhookReceived: true,
    status: 'success',
    processedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
});

console.log('\n✓ Provisioned. uid =', uid);
process.exit(0);
