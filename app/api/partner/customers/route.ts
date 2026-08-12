import { NextRequest, NextResponse } from 'next/server';
import { requirePartner, getPartnerOrders, partnerItems, toMillis } from '@/app/lib/partner-auth';

interface CustomerRow {
  key: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  orders: number;
  totalSpent: number;
  lastOrderAt: number | null;
  firstOrderAt: number | null;
}

/**
 * GET /api/partner/customers
 *
 * Customers derived from this partner's own orders. Nothing from other stores
 * is ever read — the orders query is scoped by partnerId.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requirePartner(req);
    if ('error' in auth) return auth.error;
    const { adminDb, partnerId } = auth;

    const days = parseInt(req.nextUrl.searchParams.get('days') || '0', 10);
    const orders = await getPartnerOrders(adminDb, partnerId, days > 0 ? days : undefined);

    const map = new Map<string, CustomerRow>();

    for (const order of orders) {
      const email = String(order.email || '').trim().toLowerCase();
      const phone = String(order.phone || '').trim();
      const key = email || phone || String(order.customerName || order.id);
      if (!key) continue;

      const mine = partnerItems(order, partnerId);
      const value = mine.reduce(
        (s: number, it: any) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1),
        0
      );
      const at = toMillis(order.createdAt);

      const existing = map.get(key);
      if (existing) {
        existing.orders += 1;
        existing.totalSpent += value;
        if (at && (!existing.lastOrderAt || at > existing.lastOrderAt)) existing.lastOrderAt = at;
        if (at && (!existing.firstOrderAt || at < existing.firstOrderAt)) existing.firstOrderAt = at;
        existing.name = existing.name || String(order.customerName || '');
        existing.city = existing.city || String(order.city || '');
      } else {
        map.set(key, {
          key,
          name: String(order.customerName || ''),
          email,
          phone,
          city: String(order.city || ''),
          orders: 1,
          totalSpent: value,
          lastOrderAt: at,
          firstOrderAt: at,
        });
      }
    }

    const customers = Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
    const returning = customers.filter((c) => c.orders > 1).length;
    const totalSpent = customers.reduce((s, c) => s + c.totalSpent, 0);

    return NextResponse.json({
      success: true,
      customers,
      summary: {
        total: customers.length,
        returning,
        returningRate: customers.length ? (returning / customers.length) * 100 : 0,
        averageSpend: customers.length ? totalSpent / customers.length : 0,
        totalSpent,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[partner/customers] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
