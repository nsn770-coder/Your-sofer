import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { AdminCouponCreateRequest, PartnerCouponType } from '@/app/lib/partner-coupon-types';

const VALID_TYPES: PartnerCouponType[] = ['percent', 'fixed', 'free'];

/**
 * POST /api/admin/coupons/create
 * Creates a new Partner-upgrade coupon (admin-only).
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const adminAuth = getAdminAuth();

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!userSnap.exists || userSnap.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json()) as AdminCouponCreateRequest;
    const code = body.code?.trim().toUpperCase();
    const type = body.type;
    const value = Number(body.value);
    const description = body.description?.trim() || '';
    const maxUses = Number(body.maxUses);
    const expiresAt = body.expiresAt?.trim() || undefined;

    if (!code || code.length < 3) {
      return NextResponse.json({ error: 'קוד קופון לא תקין (מינימום 3 תווים)' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'סוג קופון לא תקין' }, { status: 400 });
    }
    if (type !== 'free' && (!Number.isFinite(value) || value <= 0)) {
      return NextResponse.json({ error: 'ערך הקופון לא תקין' }, { status: 400 });
    }
    if (type === 'percent' && value > 100) {
      return NextResponse.json({ error: 'אחוז הנחה לא יכול לעלות על 100' }, { status: 400 });
    }
    if (!Number.isFinite(maxUses) || maxUses < 1) {
      return NextResponse.json({ error: 'מספר שימושים לא תקין' }, { status: 400 });
    }

    const couponRef = adminDb.collection('partner_coupons').doc(code);
    const existing = await couponRef.get();
    if (existing.exists) {
      return NextResponse.json({ error: 'קוד קופון זה כבר קיים' }, { status: 409 });
    }

    await couponRef.set({
      code,
      type,
      value: type === 'free' ? 0 : value,
      description,
      maxUses,
      usedCount: 0,
      active: true,
      ...(expiresAt ? { expiresAt } : {}),
      createdAt: new Date().toISOString(),
      createdBy: decodedToken.uid,
    });

    return NextResponse.json({ success: true, code }, { status: 201 });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[admin/coupons/create] error:', err.message);
    return NextResponse.json({ error: 'שגיאה ביצירת הקופון' }, { status: 500 });
  }
}
