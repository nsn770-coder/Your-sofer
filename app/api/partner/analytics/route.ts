import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

/**
 * GET /api/partner/analytics?days=30
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
      console.error('[analytics] token verification failed:', tokenErr);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!userSnap.exists || userSnap.data()?.role !== 'partner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const partnerId = userSnap.data()?.partnerId;
    const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') || '30'), 365);

    // Fetch daily analytics for past N days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analyticsSnap = await adminDb
      .collectionGroup('daily')
      .where('partnerId', '==', partnerId)
      .orderBy('date', 'desc')
      .limit(days)
      .get();

    const data = analyticsSnap.docs.map((doc) => doc.data());

    // Calculate totals
    let totalRevenue = 0;
    let totalCommission = 0;
    let totalOrders = 0;
    let totalVisitors = 0;

    data.forEach((row: any) => {
      totalRevenue += row.revenue || 0;
      totalCommission += row.commission || 0;
      totalOrders += row.purchases || 0;
      totalVisitors += row.visitors || 0;
    });

    return NextResponse.json({
      success: true,
      data: data.reverse(), // chronological order
      totals: {
        revenue: totalRevenue,
        commission: totalCommission,
        orders: totalOrders,
        visitors: totalVisitors,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[analytics] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
