import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import { checkRateLimit } from '@/app/lib/rate-limit';
import { consumePartnerCoupon, refundPartnerCouponUse, PARTNER_SETUP_FEE_AMOUNT } from '@/app/lib/partner-coupons';
import { provisionPartnerAccount } from '@/app/lib/partner-provisioning';
import type { PaymentInitializeResponse } from '@/app/lib/partner-signup-types';

const SETUP_FEE_DESCRIPTION = 'דמי הקמת חנות Partner';

const SUMIT_API_URL = 'https://api.sumit.co.il/billing/payments/charge/';
const SUMIT_COMPANY_ID = process.env.SUMIT_COMPANY_ID!;
const WEBHOOK_SECRET = process.env.PARTNER_WEBHOOK_SECRET || 'partner-webhook-secret';

interface ChargeRequest {
  applicationId: string;
  email: string;
  businessName: string;
  singleUseToken: string;
  paymentsCount: number;
  couponCode?: string;
}

interface SumitChargeBody {
  CompanyID: string;
  SingleUseToken: string;
  PaymentsCount: number;
  ChargeDescription: string;
  ChargeAmount: number;
  Currency: string;
  Terms: number;
  Reference?: string;
  CustomerEmail?: string;
  CustomerName?: string;
}

export async function POST(req: NextRequest) {
  let reservedCouponCode: string | null = null;

  try {
    const body = await req.json() as ChargeRequest;

    const { applicationId, email, businessName, singleUseToken, paymentsCount, couponCode } = body;

    // ── Rate Limiting ───────────────────────────────────────────────────────
    // 10 payment attempts per hour per email
    const rateLimit = checkRateLimit(`partner-payment:${email}`, 3600, 10);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `בדיקה מחדש בעוד ${Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 60000)} דקות` },
        { status: 429 }
      );
    }

    // ── Validation ──────────────────────────────────────────────────────────
    if (!applicationId || !email || !singleUseToken || !paymentsCount) {
      return NextResponse.json(
        { error: 'חסרים פרטים נדרשים' },
        { status: 400 }
      );
    }

    if (paymentsCount < 1) {
      return NextResponse.json(
        { error: 'מספר תשלומים לא תקין' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // ── Verify application exists ───────────────────────────────────────────
    const appRef = adminDb.collection('partners_applications').doc(applicationId);
    const appSnap = await appRef.get();

    if (!appSnap.exists) {
      console.error('[partner-setup-fee] Application not found:', applicationId);
      return NextResponse.json(
        { error: 'הבקשה לא קיימת' },
        { status: 404 }
      );
    }

    const appData = appSnap.data();
    if (!appData || appData.status !== 'pending') {
      return NextResponse.json(
        { error: 'הבקשה לא בסטטוס של מעתידה' },
        { status: 409 }
      );
    }

    // ── Coupon (server-side re-validation — never trust a client-sent price) ─
    let amount = PARTNER_SETUP_FEE_AMOUNT;
    let discountAmount = 0;
    if (couponCode) {
      const result = await consumePartnerCoupon(couponCode, PARTNER_SETUP_FEE_AMOUNT);
      if (!result.ok) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }
      reservedCouponCode = result.coupon.code;
      amount = result.finalAmount;
      discountAmount = result.discountAmount;
    }

    // ── Create payment record (for webhook tracking) ─────────────────────────
    const paymentId = `partner-setup-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const webhookKey = createHash('sha256')
      .update(`${paymentId}${WEBHOOK_SECRET}`)
      .digest('hex');

    await adminDb.collection('partner_payments').doc(paymentId).set({
      applicationId,
      email: email.toLowerCase(),
      businessName,
      amount,
      status: 'pending', // pending -> processing -> success -> failed
      type: 'setup_fee',
      ...(reservedCouponCode ? { couponCode: reservedCouponCode, discountAmount } : {}),

      singleUseToken,
      paymentsCount,
      chargeDescription: SETUP_FEE_DESCRIPTION,

      webhookKey,
      webhookReceived: false,

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // ── Coupon covers the full fee — skip the charge, provision immediately ──
    if (amount <= 0) {
      await adminDb.collection('partner_payments').doc(paymentId).update({
        status: 'success',
        transactionId: null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      await provisionPartnerAccount({
        paymentId,
        applicationId,
        setupFeeTransactionId: paymentId,
      });

      const response: PaymentInitializeResponse = {
        success: true,
        orderId: paymentId,
        singleUseToken,
        amount: 0,
        currency: 'ILS',
        message: 'הקופון כיסה את מלוא דמי ההקמה. החשבון שלך פעיל!',
      };
      return NextResponse.json(response, { status: 200 });
    }

    // ── Call Sumit API ──────────────────────────────────────────────────────
    const chargeBody: SumitChargeBody = {
      CompanyID: SUMIT_COMPANY_ID,
      SingleUseToken: singleUseToken,
      PaymentsCount: paymentsCount,
      ChargeDescription: SETUP_FEE_DESCRIPTION,
      ChargeAmount: amount,
      Currency: 'ILS',
      Terms: 1,
      Reference: paymentId,
      CustomerEmail: email,
      CustomerName: businessName,
    };

    console.log(
      '[partner-setup-fee] Charging Sumit — amount:',
      amount,
      'applicationId:',
      applicationId
    );

    const sumitResponse = await fetch(SUMIT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chargeBody),
    });

    const rawText = await sumitResponse.text();
    let sumitData: unknown;

    try {
      sumitData = JSON.parse(rawText);
    } catch {
      console.error(
        '[partner-setup-fee] Sumit returned non-JSON (status',
        sumitResponse.status,
        '):',
        rawText.slice(0, 300)
      );
      if (reservedCouponCode) await refundPartnerCouponUse(reservedCouponCode);
      return NextResponse.json(
        { error: 'שגיאה בביצוע התשלום' },
        { status: 500 }
      );
    }

    const payment = (sumitData as any)?.Data?.Payment;
    const chargeSucceeded = payment?.ValidPayment === true;

    console.log('[partner-setup-fee] Sumit response:', JSON.stringify(sumitData));

    if (!chargeSucceeded) {
      const errorMessage = (sumitData as any)?.UserErrorMessage || 'התשלום נכשל';

      // Update payment status
      await adminDb.collection('partner_payments').doc(paymentId).update({
        status: 'failed',
        failureReason: errorMessage,
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (reservedCouponCode) await refundPartnerCouponUse(reservedCouponCode);

      console.error('[partner-setup-fee] Charge failed:', errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 402 });
    }

    // ── Charge succeeded — update payment record ────────────────────────────
    await adminDb.collection('partner_payments').doc(paymentId).update({
      status: 'processing',
      transactionId: payment.TransactionID || null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const response: PaymentInitializeResponse = {
      success: true,
      orderId: paymentId,
      singleUseToken,
      amount,
      currency: 'ILS',
      message: 'התשלום בוצע בהצלחה. ממתין לאישור סופי...',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[partner-setup-fee] error:', err.message, err.stack);
    if (reservedCouponCode) await refundPartnerCouponUse(reservedCouponCode);
    return NextResponse.json(
      { error: 'שגיאה בעת עיבוד התשלום' },
      { status: 500 }
    );
  }
}
