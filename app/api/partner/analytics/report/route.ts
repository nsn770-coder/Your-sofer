// Phase 11: Advanced Analytics & Reporting
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

interface DailyMetric {
  date: string;
  visitors: number;
  productViews: number;
  addToCart: number;
  checkoutStarted: number;
  purchases: number;
  revenue: number;
  commission: number;
}

/**
 * GET /api/partner/analytics/report?startDate=2024-01-01&endDate=2024-01-31&metrics=revenue,commission,orders
 * Generate detailed analytics report for export
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

    if (!userSnap.exists || userSnap.data()?.role !== 'partner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const partnerId = userSnap.data()?.partnerId;
    const startDate = req.nextUrl.searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = req.nextUrl.searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const metricsParam = req.nextUrl.searchParams.get('metrics') || 'revenue,commission,orders,visitors,conversion';

    // Query daily analytics
    const analyticsSnap = await adminDb
      .collection('partners_analytics')
      .doc(partnerId)
      .collection('daily')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'asc')
      .get();

    const dailyData: DailyMetric[] = [];
    let totals = {
      visitors: 0,
      productViews: 0,
      addToCart: 0,
      checkoutStarted: 0,
      purchases: 0,
      revenue: 0,
      commission: 0,
    };

    for (const doc of analyticsSnap.docs) {
      const data = doc.data();
      dailyData.push({
        date: data.date || doc.id,
        visitors: data.visitors || 0,
        productViews: data.productViews || 0,
        addToCart: data.addToCart || 0,
        checkoutStarted: data.checkoutStarted || 0,
        purchases: data.purchases || 0,
        revenue: data.revenue || 0,
        commission: data.commission || 0,
      });

      totals.visitors += data.visitors || 0;
      totals.productViews += data.productViews || 0;
      totals.addToCart += data.addToCart || 0;
      totals.checkoutStarted += data.checkoutStarted || 0;
      totals.purchases += data.purchases || 0;
      totals.revenue += data.revenue || 0;
      totals.commission += data.commission || 0;
    }

    // Calculate conversion rates (percentage of preceding step that completed the next step)
    // viewToCart: of those who viewed a product, how many added to cart
    // cartToCheckout: of those with items in cart, how many started checkout
    // checkoutToPurchase: of those who started checkout, how many completed purchase
    // visitorToPurchase: of all visitors, what % purchased (overall conversion)
    const conversionRates = {
      viewToCart: totals.productViews > 0 ? (totals.addToCart / totals.productViews * 100).toFixed(2) : '0',
      cartToCheckout: totals.addToCart > 0 ? (totals.checkoutStarted / totals.addToCart * 100).toFixed(2) : '0',
      checkoutToPurchase: totals.checkoutStarted > 0 ? (totals.purchases / totals.checkoutStarted * 100).toFixed(2) : '0',
      visitorToPurchase: totals.visitors > 0 ? (totals.purchases / totals.visitors * 100).toFixed(2) : '0',
    };

    // Calculate metrics based on requested types
    const metrics = metricsParam.split(',').map(m => m.trim());
    const filteredData = dailyData.map(day => {
      const filtered: Record<string, unknown> = { date: day.date };
      for (const metric of metrics) {
        if (metric in day) {
          filtered[metric] = day[metric as keyof DailyMetric];
        }
      }
      return filtered;
    });

    return NextResponse.json({
      success: true,
      report: {
        period: { startDate, endDate },
        totals,
        conversionRates,
        dailyData: filteredData,
        averages: {
          dailyRevenue: (totals.revenue / dailyData.length).toFixed(2),
          dailyOrders: (totals.purchases / dailyData.length).toFixed(2),
          avgOrderValue: totals.purchases > 0 ? (totals.revenue / totals.purchases).toFixed(2) : '0',
        },
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[analytics/report] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
