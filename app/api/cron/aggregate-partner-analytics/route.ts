import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/aggregate-partner-analytics
 * Runs nightly (via vercel.json cron) to aggregate daily analytics from raw events
 * SECURITY: Requires CRON_SECRET in Authorization header
 */
export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminDb = getAdminDb();

    // Get yesterday's date (aggregate previous day)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    const dateStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`[analytics-cron] Aggregating for ${dateStr}`);

    // Get all events from yesterday
    const eventsSnap = await adminDb
      .collection('partners_events')
      .where('createdAt', '>=', yesterday)
      .where('createdAt', '<', today)
      .get();

    // Group by partnerId and aggregate
    const aggregates: Record<string, Record<string, number>> = {};

    eventsSnap.forEach((doc) => {
      const data = doc.data();
      const partnerId = data.partnerId;

      if (!aggregates[partnerId]) {
        aggregates[partnerId] = {
          store_view: 0,
          product_view: 0,
          add_to_cart: 0,
          begin_checkout: 0,
          purchase: 0,
          share_store: 0,
          revenue: 0,
        };
      }

      aggregates[partnerId][data.type] = (aggregates[partnerId][data.type] || 0) + 1;
      if (data.revenue) {
        aggregates[partnerId].revenue += data.revenue;
      }
    });

    // Write daily aggregates
    let written = 0;
    for (const [partnerId, counts] of Object.entries(aggregates)) {
      await adminDb
        .collection('partners_analytics')
        .doc(partnerId)
        .collection('daily')
        .doc(dateStr)
        .set(
          {
            partnerId,
            date: dateStr,
            visitors: counts.store_view,
            uniqueSessions: counts.store_view, // TODO: calculate unique sessions
            productViews: counts.product_view,
            addToCart: counts.add_to_cart,
            checkoutStarted: counts.begin_checkout,
            purchases: counts.purchase,
            revenue: Math.round(counts.revenue),
            commission: Math.round(counts.revenue * 0.2), // TODO: use partner commission rate
            refunds: 0, // TODO: track refunds separately
            createdAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      written++;
    }

    // Clean up old events (keep only 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const oldEventsSnap = await adminDb
      .collection('partners_events')
      .where('createdAt', '<', sevenDaysAgo)
      .get();

    const batch = adminDb.batch();
    oldEventsSnap.forEach((doc) => batch.delete(doc.ref));
    if (oldEventsSnap.size > 0) {
      await batch.commit();
      console.log(`[analytics-cron] Deleted ${oldEventsSnap.size} old events`);
    }

    console.log(`[analytics-cron] Aggregated ${written} partners for ${dateStr}`);

    return NextResponse.json({
      success: true,
      aggregated: written,
      dateStr,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[analytics-cron] error:', err.message, err.stack);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
