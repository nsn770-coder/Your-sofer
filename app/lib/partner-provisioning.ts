import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { PartnerProvisioningPayload } from '@/app/lib/partner-signup-types';

/**
 * Generate URL-safe store name from business name
 */
function generateStoreUrl(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^א-תװ-״\w]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/**
 * Provisions a Partner account (Firebase Auth user + partners/{uid} + users/{uid} +
 * first-month subscription + application approval) after a setup fee payment has
 * been confirmed (real Sumit charge via webhook, or a coupon covering 100% of the fee).
 *
 * Idempotent: safe to call multiple times for the same paymentId.
 */
export async function provisionPartnerAccount(params: {
  paymentId: string;
  applicationId: string;
  setupFeeTransactionId: string;
}): Promise<{ uid: string }> {
  const { paymentId, applicationId, setupFeeTransactionId } = params;
  const adminDb = getAdminDb();
  const adminAuth = getAdminAuth();

  const paymentRef = adminDb.collection('partner_payments').doc(paymentId);
  const paymentSnap = await paymentRef.get();
  if (!paymentSnap.exists) throw new Error(`partner_payments/${paymentId} not found`);
  const paymentData = paymentSnap.data()!;

  const appRef = adminDb.collection('partners_applications').doc(applicationId);
  const appSnap = await appRef.get();
  if (!appSnap.exists) throw new Error(`partners_applications/${applicationId} not found`);
  const appData = appSnap.data()!;

  const email = paymentData.email as string;
  let uid: string;
  try {
    const user = await adminAuth.getUserByEmail(email);
    uid = user.uid;
  } catch (getUserErr: any) {
    if (getUserErr?.code === 'auth/user-not-found') {
      const newUser = await adminAuth.createUser({
        email,
        emailVerified: false,
        displayName: appData.businessName,
      });
      uid = newUser.uid;
    } else {
      throw getUserErr;
    }
  }

  const partnerPayload: PartnerProvisioningPayload = {
    uid,
    email: appData.email,
    businessName: appData.businessName,
    firstName: appData.firstName,
    lastName: appData.lastName,
    phone: appData.phone,
    city: appData.city,
    businessType: appData.businessType,
    businessId: appData.businessId,
    taxId: appData.taxId,
    setupFeeTransactionId,
    setupFeePaidAt: new Date().toISOString(),
  };

  await adminDb.runTransaction(async (transaction) => {
    const paymentCheckSnap = await transaction.get(paymentRef);
    if (paymentCheckSnap.data()?.webhookReceived === true) {
      return; // already provisioned
    }

    const partnerRef = adminDb.collection('partners').doc(uid);
    const partnerSnap = await transaction.get(partnerRef);

    if (!partnerSnap.exists) {
      transaction.set(partnerRef, {
        uid,
        email: partnerPayload.email,
        status: 'payment_received',

        businessName: partnerPayload.businessName,
        firstName: partnerPayload.firstName,
        lastName: partnerPayload.lastName,
        phone: partnerPayload.phone,
        city: partnerPayload.city,
        businessType: partnerPayload.businessType,
        businessId: partnerPayload.businessId,
        taxId: partnerPayload.taxId,

        storeUrl: generateStoreUrl(partnerPayload.businessName),
        storeName: partnerPayload.businessName,
        isPublished: false,

        commissionPercent: 20,
        setupFeeAmount: 5000,
        setupFeePaid: true,
        setupFeePaidAt: partnerPayload.setupFeePaidAt,
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

    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists) {
      transaction.set(userRef, {
        email: partnerPayload.email,
        displayName: partnerPayload.businessName,
        role: 'partner',
        partnerId: uid,
        status: 'active',
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    const subscriptionId = adminDb.collection('partners_subscriptions').doc().id;
    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    transaction.set(adminDb.collection('partners_subscriptions').doc(subscriptionId), {
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

    transaction.update(appRef, {
      status: 'approved',
      approvedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.update(paymentRef, {
      webhookReceived: true,
      status: 'success',
      processedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { uid };
}
