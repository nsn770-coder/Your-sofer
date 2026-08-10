import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { PartnerCoupon, PartnerCouponType } from '@/app/lib/partner-coupon-types';

export const PARTNER_SETUP_FEE_AMOUNT = 5000;

export function computeDiscount(type: PartnerCouponType, value: number, baseAmount: number): number {
  if (type === 'free') return baseAmount;
  if (type === 'percent') return Math.round((baseAmount * value) / 100);
  return Math.min(value, baseAmount); // fixed
}

export type CouponLookupResult =
  | { ok: true; coupon: PartnerCoupon; discountAmount: number; finalAmount: number }
  | { ok: false; message: string };

/**
 * Looks up a partner-upgrade coupon by code and checks it is usable
 * (exists, active, not expired, under its usage limit). Does NOT
 * mutate usedCount — callers that actually consume the coupon must
 * do that atomically in a transaction (see partner-setup-fee route).
 */
export async function lookupPartnerCoupon(rawCode: string, baseAmount = PARTNER_SETUP_FEE_AMOUNT): Promise<CouponLookupResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, message: 'נא להזין קוד קופון' };

  const adminDb = getAdminDb();
  const snap = await adminDb.collection('partner_coupons').doc(code).get();

  if (!snap.exists) {
    return { ok: false, message: 'קוד הקופון אינו קיים' };
  }

  const coupon = { id: snap.id, ...snap.data() } as PartnerCoupon;

  if (!coupon.active) {
    return { ok: false, message: 'קוד הקופון אינו פעיל' };
  }

  if (coupon.expiresAt) {
    const today = new Date().toISOString().slice(0, 10);
    if (coupon.expiresAt < today) {
      return { ok: false, message: 'תוקף הקופון פג' };
    }
  }

  if (coupon.usedCount >= coupon.maxUses) {
    return { ok: false, message: 'מספר השימושים בקופון מוצה' };
  }

  const discountAmount = computeDiscount(coupon.type, coupon.value, baseAmount);
  const finalAmount = Math.max(0, baseAmount - discountAmount);

  return { ok: true, coupon, discountAmount, finalAmount };
}

/**
 * Atomically validates and consumes one use of a partner-upgrade coupon.
 * Must be called right before charging, so the usage count and the charge
 * amount can never be manipulated by a client-supplied final price.
 */
export async function consumePartnerCoupon(rawCode: string, baseAmount = PARTNER_SETUP_FEE_AMOUNT): Promise<CouponLookupResult> {
  const code = rawCode.trim().toUpperCase();
  const adminDb = getAdminDb();
  const couponRef = adminDb.collection('partner_coupons').doc(code);

  return adminDb.runTransaction(async (transaction): Promise<CouponLookupResult> => {
    const snap = await transaction.get(couponRef);
    if (!snap.exists) return { ok: false, message: 'קוד הקופון אינו קיים' };

    const coupon = { id: snap.id, ...snap.data() } as PartnerCoupon;

    if (!coupon.active) return { ok: false, message: 'קוד הקופון אינו פעיל' };

    if (coupon.expiresAt) {
      const today = new Date().toISOString().slice(0, 10);
      if (coupon.expiresAt < today) return { ok: false, message: 'תוקף הקופון פג' };
    }

    if (coupon.usedCount >= coupon.maxUses) {
      return { ok: false, message: 'מספר השימושים בקופון מוצה' };
    }

    transaction.update(couponRef, { usedCount: FieldValue.increment(1) });

    const discountAmount = computeDiscount(coupon.type, coupon.value, baseAmount);
    const finalAmount = Math.max(0, baseAmount - discountAmount);

    return { ok: true, coupon, discountAmount, finalAmount };
  });
}

/** Best-effort refund of a coupon use (e.g. after a declined charge). Never throws. */
export async function refundPartnerCouponUse(code: string): Promise<void> {
  try {
    const adminDb = getAdminDb();
    await adminDb.collection('partner_coupons').doc(code.trim().toUpperCase()).update({
      usedCount: FieldValue.increment(-1),
    });
  } catch (e) {
    console.warn('[partner-coupons] refund failed (non-fatal):', e);
  }
}
