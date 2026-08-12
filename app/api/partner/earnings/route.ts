// Phase 9: Partner Earnings & Payout System
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * GET /api/partner/earnings?days=30
 * Get partner earnings summary
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
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!userSnap.exists || !userSnap.data()?.partnerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const partnerId = userSnap.data()?.partnerId;
    const daysBack = parseInt(req.nextUrl.searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get analytics documents (daily snapshots)
    const analyticsSnap = await adminDb
      .collection('partners_analytics')
      .doc(partnerId)
      .collection('daily')
      .where('date', '>=', startDate.toISOString().split('T')[0])
      .orderBy('date', 'asc')
      .get();

    let totalRevenue = 0;
    let totalCommission = 0;
    let totalOrders = 0;
    const dailyData: Array<{
      date: string;
      revenue: number;
      commission: number;
      orders: number;
    }> = [];

    for (const doc of analyticsSnap.docs) {
      const data = doc.data();
      const revenue = data.revenue || 0;
      const commission = data.commission || 0;

      totalRevenue += revenue;
      totalCommission += commission;
      totalOrders += data.purchases || 0;

      dailyData.push({
        date: data.date || doc.id,
        revenue,
        commission,
        orders: data.purchases || 0,
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRevenue,
        totalCommission,
        totalOrders,
        period: { days: daysBack, startDate: startDate.toISOString() },
      },
      dailyData,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[partner/earnings] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
