import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyOpsOrAdminToken } from '@/lib/verifyOps';

// GET /api/ops/fulfillment-plans — orders that have a fulfillmentPlan still
// needing shipments created (plan.status is 'pending' or 'in_progress').
// Deliberately does NOT filter by orders.status='fulfillment_pending' — that
// field stays 'paid' (see the note in app/api/payment/route.ts); paid-ness is
// checked here in-memory instead, after the single-field query.
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }
    if (!(await verifyOpsOrAdminToken(idToken))) {
      return NextResponse.json({ error: 'Forbidden — admin or ops role required' }, { status: 403 });
    }

    const adminDb = getAdminDb();
    const snap = await adminDb
      .collection('orders')
      .where('fulfillmentPlan.status', 'in', ['pending', 'in_progress'])
      .get();

    const orders = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as any))
      .filter((order) => order.status === 'paid')
      .map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber || order.id,
        customerName: order.customerName || '',
        phone: order.phone || '',
        email: order.email || '',
        address: order.address || '',
        city: order.city || '',
        street: order.street || '',
        houseNumber: order.houseNumber || '',
        apartment: order.apartment || '',
        zipCode: order.zipCode || '',
        items: order.items || [],
        fulfillmentPlan: order.fulfillmentPlan,
        createdAt: order.createdAt ?? null,
      }));

    orders.sort((a, b) => (b.createdAt?._seconds ?? 0) - (a.createdAt?._seconds ?? 0));

    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    console.error('[ops/fulfillment-plans] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
