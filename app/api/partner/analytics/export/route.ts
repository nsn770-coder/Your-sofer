// Phase 11: Analytics Export to CSV
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

/**
 * GET /api/partner/analytics/export?format=csv&startDate=2024-01-01&endDate=2024-01-31
 * Export analytics data in CSV format
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
    const format = req.nextUrl.searchParams.get('format') || 'csv';
    const startDate = req.nextUrl.searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = req.nextUrl.searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    // Fetch analytics data
    const analyticsSnap = await adminDb
      .collection('partners_analytics')
      .doc(partnerId)
      .collection('daily')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'asc')
      .get();

    if (format === 'csv') {
      // Generate CSV
      const headers = ['תאריך', 'מבקרים', 'צפיות מוצר', 'הוספה לסל', 'התחלת הזמנה', 'קניות', 'הכנסה (₪)', 'עמלה (₪)'];
      const rows = [headers];

      for (const doc of analyticsSnap.docs) {
        const data = doc.data();
        rows.push([
          data.date || doc.id,
          String(data.visitors || 0),
          String(data.productViews || 0),
          String(data.addToCart || 0),
          String(data.checkoutStarted || 0),
          String(data.purchases || 0),
          String((data.revenue || 0).toFixed(2)),
          String((data.commission || 0).toFixed(2)),
        ]);
      }

      // Convert to CSV string with proper RFC 4180 escaping
      const csv = rows.map(row =>
        row.map(cell => {
          const str = String(cell);
          // RFC 4180: quote if contains comma, quote, or newline
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            // Escape internal quotes by doubling them
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      ).join('\n');

      const filename = `analytics_${startDate}_to_${endDate}.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else if (format === 'json') {
      // Generate JSON
      const data = analyticsSnap.docs.map(doc => ({
        date: doc.data().date || doc.id,
        visitors: doc.data().visitors || 0,
        productViews: doc.data().productViews || 0,
        addToCart: doc.data().addToCart || 0,
        checkoutStarted: doc.data().checkoutStarted || 0,
        purchases: doc.data().purchases || 0,
        revenue: doc.data().revenue || 0,
        commission: doc.data().commission || 0,
      }));

      const filename = `analytics_${startDate}_to_${endDate}.json`;

      return new NextResponse(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[analytics/export] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
