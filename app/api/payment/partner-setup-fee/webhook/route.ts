import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import { provisionPartnerAccount } from '@/app/lib/partner-provisioning';

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

    // NOTE: Idempotency check happens INSIDE the provisioning transaction —
    // this prevents race conditions where two simultaneous webhook calls
    // could both see webhookReceived=false and create duplicate subscriptions

    // ── Parse Sumit webhook body ────────────────────────────────────────────
    let documentId: string | null = null;

    try {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = (await req.json().catch(() => null)) as SumitWebhookBody | null;
        documentId = String(body?.documentid ?? body?.DocumentID ?? '') || null;
      } else {
        const text = await req.text();
        const params = new URLSearchParams(text);
        documentId = params.get('documentid') || params.get('DocumentID');
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

    // ── Provision Partner Account (Auth user + partners/{uid} + subscription) ──
    const { uid } = await provisionPartnerAccount({
      paymentId,
      applicationId,
      setupFeeTransactionId: documentId || paymentId,
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
