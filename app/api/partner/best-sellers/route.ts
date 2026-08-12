import { NextRequest, NextResponse } from 'next/server';
import { requirePartner, getPartnerOrders, partnerItems } from '@/app/lib/partner-auth';

/**
 * GET /api/partner/best-sellers?days=90
 *
 * Ranks this partner's own products by units sold and revenue, from their orders.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requirePartner(req);
    if ('error' in auth) return auth.error;
    const { adminDb, partnerId } = auth;

    const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') || '90', 10), 730);
    const orders = await getPartnerOrders(adminDb, partnerId, days);

    const map = new Map<
      string,
      { productId: string; name: string; units: number; revenue: number; orders: number }
    >();

    for (const order of orders) {
      const seen = new Set<string>();
      for (const it of partnerItems(order, partnerId)) {
        const productId = String(it.productId || it.id || it.name || '').trim();
        if (!productId) continue;

        const qty = Number(it.quantity) || 1;
        const price = Number(it.price) || 0;
        const row = map.get(productId) || {
          productId,
          name: String(it.productName || it.name || productId),
          units: 0,
          revenue: 0,
          orders: 0,
        };
        row.units += qty;
        row.revenue += price * qty;
        if (!seen.has(productId)) {
          row.orders += 1;
          seen.add(productId);
        }
        map.set(productId, row);
      }
    }

    const products = Array.from(map.values()).sort((a, b) => b.units - a.units);

    // Products with zero sales in the period — useful for pruning the catalogue.
    const catalogueSnap = await adminDb
      .collection('partners')
      .doc(partnerId)
      .collection('products')
      .get();

    const sold = new Set(products.map((p) => p.productId));
    const neverSold = catalogueSnap.docs
      .map((d): Record<string, any> & { id: string } => ({
        ...(d.data() as Record<string, any>),
        id: d.id,
      }))
      .filter((p) => !sold.has(p.id))
      .map((p) => ({ productId: p.id, name: p.name || p.id, price: p.price ?? 0, stock: p.stock ?? 0 }));

    return NextResponse.json({
      success: true,
      products,
      neverSold,
      summary: {
        days,
        distinctProducts: products.length,
        totalUnits: products.reduce((s, p) => s + p.units, 0),
        totalRevenue: products.reduce((s, p) => s + p.revenue, 0),
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[partner/best-sellers] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
