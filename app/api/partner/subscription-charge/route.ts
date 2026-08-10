// Phase 6: Subscription Charging Cron
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const SUMIT_API_URL = 'https://api.sumit.co.il/billing/payments/charge/';
const SUMIT_COMPANY_ID = process.env.SUMIT_COMPANY_ID!;
const MONTHLY_FEE = 400;

/**
 * POST /api/cron/subscription-charge
 * Charge active subscriptions monthly
 */
export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const now = new Date();

    // Find subscriptions due for billing
    const dueSubs = await adminDb
      .collection('partners_subscriptions')
      .where('status', '==', 'active')
      .where('nextBillingDate', '<=', now)
      .get();

    let charged = 0;
    let failed = 0;

    for (const doc of dueSubs.docs) {
      const sub = doc.data();
      const partnerId = sub.partnerId;

      try {
        // Get partner's Sumit customer ID from payment history
        const lastPaymentSnap = await adminDb
          .collection('partner_payments')
          .where('partnerId', '==', partnerId)
          .where('status', '==', 'success')
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();

        if (lastPaymentSnap.empty) {
          // No previous payment — skip for now
          console.warn(`[subscription-charge] No payment history for ${partnerId}`);
          continue;
        }

        const lastPayment = lastPaymentSnap.docs[0].data();
        const customerId = lastPayment.customerId;

        // Try to charge via Sumit
        const chargeResponse = await fetch(SUMIT_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            CompanyID: SUMIT_COMPANY_ID,
            CustomerID: customerId,
            ChargeAmount: MONTHLY_FEE,
            Currency: 'ILS',
            ChargeDescription: `Your Sofer Partner Monthly Subscription`,
          }),
        });

        const chargeData = await chargeResponse.json();
        const success = chargeData?.Data?.Payment?.ValidPayment === true;

        if (success) {
          // Update subscription
          const nextMonth = new Date(now);
          nextMonth.setMonth(nextMonth.getMonth() + 1);

          await doc.ref.update({
            status: 'active',
            lastChargeDate: FieldValue.serverTimestamp(),
            lastChargeAmount: MONTHLY_FEE,
            failureCount: 0,
            nextBillingDate: nextMonth,
            updatedAt: FieldValue.serverTimestamp(),
          });

          charged++;
        } else {
          // Mark as past_due
          await doc.ref.update({
            status: 'past_due',
            lastFailedAt: FieldValue.serverTimestamp(),
            failureCount: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          });

          failed++;
        }
      } catch (err) {
        console.error(`[subscription-charge] Error charging ${partnerId}:`, err);
        failed++;
      }
    }

    console.log(`[subscription-charge] Charged: ${charged}, Failed: ${failed}`);

    return NextResponse.json({ success: true, charged, failed });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[subscription-charge] cron error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
