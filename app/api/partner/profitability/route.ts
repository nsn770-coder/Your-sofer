import { NextRequest, NextResponse } from 'next/server';
import { requirePartner, getPartnerOrders, partnerItems, toMillis } from '@/app/lib/partner-auth';

/**
 * GET /api/partner/profitability?days=90
 *
 * Revenue, platform commission and net-to-store, broken down per product and
 * per month, from this partner's own orders.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requirePartner(req);
    if ('error' in auth) return auth.error;
    const { adminDb, partnerId } = auth;

    const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') || '90', 10), 730);

    const [orders, partnerSnap] = await Promise.all([
      getPartnerOrders(adminDb, partnerId, days),
      adminDb.collection('partners').doc(partnerId).get(),
    ]);

    const commissionPercent = Number(partnerSnap.data()?.commissionPercent ?? 20);

    const byProduct = new Map<
      string,
      { productId: string; name: string; units: number; revenue: number; commission: number; net: number }
    >();
    const byMonth = new Map<string, { month: string; revenue: number; commission: number; net: number; orders: number }>();

    let totalRevenue = 0;

    for (const order of orders) {
      const at = toMillis(order.createdAt);
      const monthKey = at ? new Date(at).toISOString().slice(0, 7) : 'unknown';
      let orderRevenue = 0;

      for (const it of partnerItems(order, partnerId)) {
        const id = String(it.productId || it.id || it.name || '').trim();
        if (!id) continue;

        const qty = Number(it.quantity) || 1;
        const revenue = (Number(it.price) || 0) * qty;
        const commission = revenue * (commissionPercent / 100);

        orderRevenue += revenue;

        const row = byProduct.get(id) || {
          productId: id,
          name: String(it.productName || it.name || id),
          units: 0,
          revenue: 0,
          commission: 0,
          net: 0,
        };
        row.units += qty;
        row.revenue += revenue;
        row.commission += commission;
        row.net += revenue - commission;
        byProduct.set(id, row);
      }

      totalRevenue += orderRevenue;

      const m = byMonth.get(monthKey) || {
        month: monthKey,
        revenue: 0,
        commission: 0,
        net: 0,
        orders: 0,
      };
      m.revenue += orderRevenue;
      m.commission += orderRevenue * (commissionPercent / 100);
      m.net += orderRevenue - orderRevenue * (commissionPercent / 100);
      m.orders += 1;
      byMonth.set(monthKey, m);
    }

    const totalCommission = totalRevenue * (commissionPercent / 100);

    return NextResponse.json({
      success: true,
      commissionPercent,
      summary: {
        days,
        orders: orders.length,
        revenue: totalRevenue,
        commission: totalCommission,
        net: totalRevenue - totalCommission,
        averageOrderValue: orders.length ? totalRevenue / orders.length : 0,
      },
      byProduct: Array.from(byProduct.values()).sort((a, b) => b.net - a.net),
      byMonth: Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month)),
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[partner/profitability] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
