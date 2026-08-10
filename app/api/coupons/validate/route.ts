import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/app/lib/rate-limit';
import { lookupPartnerCoupon, PARTNER_SETUP_FEE_AMOUNT } from '@/app/lib/partner-coupons';
import type { CouponValidateRequest, CouponValidateResponse } from '@/app/lib/partner-coupon-types';

/**
 * POST /api/coupons/validate
 * Validates a Partner-upgrade coupon code (₪5,000 setup fee).
 * Read-only — does not consume a usage. The actual charge in
 * /api/payment/partner-setup-fee re-validates and atomically consumes it.
 */
export async function POST(req: NextRequest) {
  try {
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(`coupon-validate:${ipAddress}`, 3600, 30);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { valid: false, message: `בדיקה מחדש בעוד ${Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 60000)} דקות` } as CouponValidateResponse,
        { status: 429 }
      );
    }

    const body = (await req.json()) as CouponValidateRequest;
    if (!body?.code || typeof body.code !== 'string') {
      return NextResponse.json({ valid: false, message: 'נא להזין קוד קופון' } as CouponValidateResponse, { status: 400 });
    }

    const result = await lookupPartnerCoupon(body.code, PARTNER_SETUP_FEE_AMOUNT);

    if (!result.ok) {
      return NextResponse.json({ valid: false, message: result.message } as CouponValidateResponse, { status: 200 });
    }

    const response: CouponValidateResponse = {
      valid: true,
      message: 'הקופון תקין',
      coupon: {
        code: result.coupon.code,
        type: result.coupon.type,
        value: result.coupon.value,
        description: result.coupon.description,
      },
      discountAmount: result.discountAmount,
      finalAmount: result.finalAmount,
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[coupons/validate] error:', err.message);
    return NextResponse.json({ valid: false, message: 'שגיאה בבדיקת הקופון' } as CouponValidateResponse, { status: 500 });
  }
}
