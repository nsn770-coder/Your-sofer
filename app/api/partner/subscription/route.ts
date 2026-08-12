import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import type { PartnerSubscription } from '@/app/lib/partner-types';

/**
 * GET /api/partner/subscription
 * Returns current subscription status
 */
export async function GET(req: NextRequest) {
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
    } catch (tokenErr) {
      console.error('[subscription] token verification failed:', tokenErr);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!userSnap.exists || !userSnap.data()?.partnerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const partnerId = userSnap.data()?.partnerId;

    // Get partner's subscription
    const subsSnap = await adminDb
      .collection('partners_subscriptions')
      .where('partnerId', '==', partnerId)
      .limit(1)
      .get();

    if (subsSnap.empty) {
      return NextResponse.json({ success: true, subscription: null });
    }

    const subscription = subsSnap.docs[0].data() as PartnerSubscription;

    return NextResponse.json({
      success: true,
      subscription,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[subscription] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
