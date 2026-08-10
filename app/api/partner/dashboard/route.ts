import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

interface DashboardStats {
  revenue: number;
  commission: number;
  orders: number;
  visitors: number;
  previousMonthRevenue?: number;
  previousMonthCommission?: number;
  previousMonthOrders?: number;
  conversionRate: number;
  averageOrderValue: number;
}

/**
 * GET /api/partner/dashboard
 *
 * Returns monthly dashboard stats for authenticated partner.
 * CRITICAL: Must validate partnerId from auth token, not from query params
 */
export async function GET(req: NextRequest) {
  try {
    // ── Auth: Extract & verify partner ID ───────────────────────────────────
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const adminAuth = getAdminAuth();

    let uid: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      uid = decodedToken.uid;
    } catch (err) {
      console.error('[dashboard] auth verification failed:', err);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const adminDb = getAdminDb();

    // ── Get user document to verify partner role & get partnerId ────────────
    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists || userSnap.data()?.role !== 'partner') {
      return NextResponse.json({ error: 'Not a partner' }, { status: 403 });
    }

    const partnerId = userSnap.data()?.partnerId;
    if (!partnerId) {
      return NextResponse.json({ error: 'Partner not configured' }, { status: 400 });
    }

    // ── Verify partner document exists ──────────────────────────────────────
    const partnerRef = adminDb.collection('partners').doc(partnerId);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // ── Calculate date ranges ───────────────────────────────────────────────
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // ── Query current month orders ──────────────────────────────────────────
    const currentOrdersSnap = await adminDb
      .collection('orders')
      .where('partnerId', '==', partnerId)
      .where('createdAt', '>=', currentMonthStart)
      .where('createdAt', '<=', currentMonthEnd)
      .get();

    let currentRevenue = 0;
    let currentCommission = 0;
    let currentOrders = 0;

    currentOrdersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'paid') {
        currentRevenue += data.total || 0;
        currentCommission += data.commissionAmount || 0;
        currentOrders += 1;
      }
    });

    // ── Query previous month orders (for comparison) ─────────────────────────
    const previousOrdersSnap = await adminDb
      .collection('orders')
      .where('partnerId', '==', partnerId)
      .where('createdAt', '>=', previousMonthStart)
      .where('createdAt', '<=', previousMonthEnd)
      .get();

    let previousRevenue = 0;
    let previousCommission = 0;
    let previousOrders = 0;

    previousOrdersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'paid') {
        previousRevenue += data.total || 0;
        previousCommission += data.commissionAmount || 0;
        previousOrders += 1;
      }
    });

    // ── Calculate analytics ────────────────────────────────────────────────
    // TODO: Get actual visitor count from partners_analytics collection
    const visitorsEstimate = currentOrders > 0 ? Math.max(currentOrders * 10, 1) : 1;
    const conversionRate = (currentOrders / visitorsEstimate) * 100;
    const averageOrderValue = currentOrders > 0 ? Math.round(currentRevenue / currentOrders) : 0;

    const stats: DashboardStats = {
      revenue: currentRevenue,
      commission: currentCommission,
      orders: currentOrders,
      visitors: 0, // TODO: fetch from partners_analytics
      previousMonthRevenue: previousRevenue,
      previousMonthCommission: previousCommission,
      previousMonthOrders: previousOrders,
      conversionRate,
      averageOrderValue,
    };

    console.log(`[dashboard] Generated stats for partner ${partnerId}:`, stats);

    return NextResponse.json({ success: true, stats });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[dashboard] error:', err.message, err.stack);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
