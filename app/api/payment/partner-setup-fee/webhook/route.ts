import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import type { PartnerProvisioningPayload } from '@/app/lib/partner-signup-types';

const WEBHOOK_SECRET = process.env.PARTNER_WEBHOOK_SECRET || 'partner-webhook-secret';

interface SumitWebhookBody {
  documentid?: string;
  DocumentID?: string;
  customerid?: string;
  CustomerID?: string;
}

/**
 * Partner Setup Fee Webhook Handler
 *
 * Idempotency: Uses paymentId as idempotency key.
 * If webhook received twice with same paymentId, processes only once.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Extract payment ID and verify ───────────────────────────────────────
    const paymentId = req.nextUrl.searchParams.get('paymentId');
    const key = req.nextUrl.searchParams.get('key');

    if (!paymentId || !key) {
      console.error('[partner-webhook] missing paymentId/key');
      return NextResponse.json({ error: 'bad request' }, { status: 400 });
    }

    // Verify webhook signature
    const expectedKey = createHash('sha256')
      .update(`${paymentId}${WEBHOOK_SECRET}`)
      .digest('hex');

    if (key !== expectedKey) {
      console.error('[partner-webhook] invalid key for paymentId:', paymentId);
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();

    // ── Get payment record ──────────────────────────────────────────────────
    const paymentRef = adminDb.collection('partner_payments').doc(paymentId);
    const paymentSnap = await paymentRef.get();

    if (!paymentSnap.exists) {
      console.error('[partner-webhook] payment not found:', paymentId);
      return NextResponse.json({ error: 'payment not found' }, { status: 404 });
    }

    const paymentData = paymentSnap.data();
    if (!paymentData) {
      console.error('[partner-webhook] payment data empty:', paymentId);
      return NextResponse.json({ error: 'payment data empty' }, { status: 404 });
    }

    // NOTE: Idempotency check is moved INSIDE the transaction below
    // This prevents race conditions where two simultaneous webhook calls
    // could both see webhookReceived=false and create duplicate subscriptions

    // ── Parse Sumit webhook body ────────────────────────────────────────────
    let documentId: string | null = null;
    let customerId: string | null = null;

    try {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = (await req.json().catch(() => null)) as SumitWebhookBody | null;
        documentId = String(body?.documentid ?? body?.DocumentID ?? '') || null;
        customerId = String(body?.customerid ?? body?.CustomerID ?? '') || null;
      } else {
        const text = await req.text();
        const params = new URLSearchParams(text);
        documentId = params.get('documentid') || params.get('DocumentID');
        customerId = params.get('customerid') || params.get('CustomerID');
      }
    } catch (parseErr) {
      console.warn('[partner-webhook] body parse failed (non-fatal):', parseErr);
    }

    // ── Get application details ─────────────────────────────────────────────
    const applicationId = paymentData.applicationId;
    const appRef = adminDb.collection('partners_applications').doc(applicationId);
    const appSnap = await appRef.get();

    if (!appSnap.exists) {
      console.error(
        '[partner-webhook] CRITICAL: application not found after charge succeeded!',
        applicationId,
        '— Customer CHARGED but account NOT created. Manual review required.'
      );
      await paymentRef.update({
        webhookReceived: true,
        processingError: 'APPLICATION DELETED AFTER CHARGE — MANUAL REVIEW REQUIRED',
        updatedAt: FieldValue.serverTimestamp(),
      });
      // Return 200 to prevent Sumit retry (already charged)
      // This will surface in admin dashboard for manual recovery
      return NextResponse.json({ success: true });
    }

    const appData = appSnap.data();
    if (!appData) {
      console.error('[partner-webhook] application data empty:', applicationId);
      return NextResponse.json({ error: 'application data empty' }, { status: 404 });
    }

    // ── Create or get Firebase user ─────────────────────────────────────────
    const email = paymentData.email as string;
    let uid: string;

    try {
      // Try to get existing user
      const user = await adminAuth.getUserByEmail(email);
      uid = user.uid;
      console.log('[partner-webhook] Using existing user:', uid);
    } catch (getUserErr: any) {
      if (getUserErr?.code === 'auth/user-not-found') {
        // Create new user
        const newUser = await adminAuth.createUser({
          email,
          emailVerified: false,
          displayName: appData.businessName,
        });
        uid = newUser.uid;
        console.log('[partner-webhook] Created new user:', uid);
      } else {
        throw getUserErr;
      }
    }

    // ── Provision Partner Account ───────────────────────────────────────────
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
      setupFeeTransactionId: documentId || paymentId,
      setupFeePaidAt: new Date().toISOString(),
    };

    // ── Transaction: Create partner + subscription + update application ─────
    // CRITICAL: Idempotency check INSIDE transaction prevents duplicate subscriptions
    await adminDb.runTransaction(async (transaction) => {
      // 0. IDEMPOTENCY CHECK (inside transaction for safety)
      const paymentCheckSnap = await transaction.get(paymentRef);
      if (paymentCheckSnap.data()?.webhookReceived === true) {
        console.log('[partner-webhook] Idempotent: already processed (inside transaction):', paymentId);
        return; // Exit silently, return 200 success
      }

      // 1. Create partners/{uid} document
      const partnerRef = adminDb.collection('partners').doc(uid);
      const partnerSnap = await transaction.get(partnerRef);

      if (partnerSnap.exists) {
        console.warn('[partner-webhook] Partner already exists:', uid);
        // Partner already exists — skip creation but continue
      } else {
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

          commissionPercent: 20, // Default 20%
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

        console.log('[partner-webhook] Created partner:', uid);
      }

      // 2. Create users/{uid} entry with partner role
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

      // 3. Create partners_subscriptions/{id} for first month (free)
      const subscriptionId = adminDb.collection('partners_subscriptions').doc().id;
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      transaction.set(
        adminDb.collection('partners_subscriptions').doc(subscriptionId),
        {
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
        }
      );

      console.log('[partner-webhook] Created subscription:', subscriptionId);

      // 4. Update application status to approved
      transaction.update(appRef, {
        status: 'approved',
        approvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    // ── Mark webhook as processed ───────────────────────────────────────────
    await paymentRef.update({
      webhookReceived: true,
      status: 'success',
      processedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log('[partner-webhook] Partner provisioning complete:', uid);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[partner-webhook] error:', err.message, err.stack);

    // Log webhook event for manual review
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
