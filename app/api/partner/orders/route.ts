import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

/**
 * GET /api/partner/orders?limit=20&offset=0
 * Returns partner's orders with data isolation
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing auth' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const adminAuth = getAdminAuth();

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (tokenErr) {
      console.error('[orders] token verification failed:', tokenErr);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const uid = decodedToken.uid;

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection('users').doc(uid).get();

    if (!userSnap.exists || !userSnap.data()?.partnerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const partnerId = userSnap.data()?.partnerId;

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    // Data isolation: only return THIS partner's orders
    const ordersSnap = await adminDb
      .collection('orders')
      .where('partnerId', '==', partnerId)
      .orderBy('createdAt', 'desc')
      .limit(limit + 1)
      .offset(offset)
      .get();

    const orders = ordersSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        orderNumber: data.orderNumber,
        customerName: data.customerName,
        total: data.total,
        status: data.status,
        commission: data.commissionAmount,
        createdAt: data.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      orders: orders.slice(0, limit),
      hasMore: orders.length > limit,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[orders] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
