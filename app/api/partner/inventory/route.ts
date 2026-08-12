import { NextRequest, NextResponse } from 'next/server';
import { requirePartner, getPartnerOrders, partnerItems } from '@/app/lib/partner-auth';

const LOW_STOCK_THRESHOLD = 3;

/**
 * GET /api/partner/inventory
 *
 * Stock overview for this partner's catalogue, enriched with 30-day sales
 * velocity so they can see what is about to run out.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requirePartner(req);
    if ('error' in auth) return auth.error;
    const { adminDb, partnerId } = auth;

    const [catalogueSnap, orders] = await Promise.all([
      adminDb.collection('partners').doc(partnerId).collection('products').get(),
      getPartnerOrders(adminDb, partnerId, 30),
    ]);

    const sold30 = new Map<string, number>();
    for (const order of orders) {
      for (const it of partnerItems(order, partnerId)) {
        const id = String(it.productId || it.id || '').trim();
        if (!id) continue;
        sold30.set(id, (sold30.get(id) || 0) + (Number(it.quantity) || 1));
      }
    }

    const products = catalogueSnap.docs.map((doc) => {
      const d = doc.data() as Record<string, any>;
      const stock = Number(d.stock) || 0;
      const units30 = sold30.get(doc.id) || 0;
      const perDay = units30 / 30;
      const daysOfCover = perDay > 0 ? Math.round(stock / perDay) : null;

      return {
        id: doc.id,
        name: d.name || doc.id,
        sku: d.sku || '',
        category: d.category || '',
        price: Number(d.price) || 0,
        stock,
        status: d.status || 'active',
        images: Array.isArray(d.images) ? d.images.slice(0, 1) : [],
        units30,
        daysOfCover,
        state: stock === 0 ? 'out' : stock <= LOW_STOCK_THRESHOLD ? 'low' : 'ok',
      };
    });

    const inventoryValue = products.reduce((s, p) => s + p.price * p.stock, 0);

    return NextResponse.json({
      success: true,
      products: products.sort((a, b) => a.stock - b.stock),
      summary: {
        total: products.length,
        outOfStock: products.filter((p) => p.state === 'out').length,
        lowStock: products.filter((p) => p.state === 'low').length,
        inactive: products.filter((p) => p.status !== 'active').length,
        inventoryValue,
        lowStockThreshold: LOW_STOCK_THRESHOLD,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[partner/inventory] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
