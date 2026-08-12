import { NextRequest, NextResponse } from 'next/server';
import { requirePartner, toMillis } from '@/app/lib/partner-auth';

const SCAN_LIMIT = 500;

/**
 * GET /api/partner/abandoned-carts
 *
 * Abandoned carts that contain at least one of THIS partner's products.
 *
 * The `abandoned_carts` documents are written by checkout and do not carry a
 * partnerId, so scoping is done by matching cart item ids against the partner's
 * own catalogue. Only the partner's own line items are returned and totalled —
 * items from other stores in the same cart are stripped out.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requirePartner(req);
    if ('error' in auth) return auth.error;
    const { adminDb, partnerId } = auth;

    const includeConverted = req.nextUrl.searchParams.get('converted') === '1';

    const [catalogueSnap, cartsSnap] = await Promise.all([
      adminDb.collection('partners').doc(partnerId).collection('products').get(),
      adminDb.collection('abandoned_carts').orderBy('updatedAt', 'desc').limit(SCAN_LIMIT).get(),
    ]);

    const mine = new Set(catalogueSnap.docs.map((d) => d.id));
    const nameById = new Map(
      catalogueSnap.docs.map((d) => [d.id, (d.data() as Record<string, any>).name || d.id])
    );

    const carts = [];

    for (const doc of cartsSnap.docs) {
      const d = doc.data() as Record<string, any>;
      if (!includeConverted && d.converted === true) continue;

      const items: any[] = Array.isArray(d.cartItems) ? d.cartItems : [];
      const myItems = items.filter((it) => mine.has(String(it?.id || '')));
      if (myItems.length === 0) continue;

      const myTotal = myItems.reduce(
        (s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1),
        0
      );

      carts.push({
        id: doc.id,
        sessionId: d.sessionId || doc.id,
        name: d.name || '',
        phone: d.phone || '',
        email: d.email || '',
        address: d.address || '',
        converted: d.converted === true,
        updatedAt: toMillis(d.updatedAt),
        createdAt: toMillis(d.createdAt),
        cartTotal: Number(d.cartTotal) || 0,
        myTotal,
        items: myItems.map((it) => ({
          id: String(it.id || ''),
          name: it.name || nameById.get(String(it.id || '')) || '',
          price: Number(it.price) || 0,
          quantity: Number(it.quantity) || 1,
          imgUrl: it.imgUrl || null,
        })),
      });
    }

    carts.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

    const open = carts.filter((c) => !c.converted);
    const withContact = open.filter((c) => c.phone || c.email);

    return NextResponse.json({
      success: true,
      carts,
      summary: {
        total: open.length,
        potentialRevenue: open.reduce((s, c) => s + c.myTotal, 0),
        withContact: withContact.length,
        scanned: cartsSnap.size,
        scanLimit: SCAN_LIMIT,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[partner/abandoned-carts] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
