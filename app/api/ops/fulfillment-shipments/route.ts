import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyOpsOrAdminToken } from '@/lib/verifyOps';

const ADVANCEABLE_STATUSES = ['picked', 'shipped', 'delivered'] as const;

async function requireOpsOrAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!idToken) return { error: NextResponse.json({ error: 'Missing auth token' }, { status: 401 }) };
  if (!(await verifyOpsOrAdminToken(idToken))) {
    return { error: NextResponse.json({ error: 'Forbidden — admin or ops role required' }, { status: 403 }) };
  }
  return { error: null };
}

// GET /api/ops/fulfillment-shipments?status=created,picked — lists shipments
// already created via LionWheel (fulfillment_shipments collection).
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireOpsOrAdmin(req);
    if (error) return error;

    const adminDb = getAdminDb();
    const statusParam = req.nextUrl.searchParams.get('status');
    const statuses = statusParam ? statusParam.split(',').map((s) => s.trim()).filter(Boolean) : null;

    let query: FirebaseFirestore.Query = adminDb.collection('fulfillment_shipments');
    if (statuses && statuses.length > 0 && statuses.length <= 30) {
      query = query.where('status', 'in', statuses);
    }

    const snap = await query.get();
    const shipments = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as any))
      .sort((a, b) => (b.createdAt?._seconds ?? 0) - (a.createdAt?._seconds ?? 0));

    return NextResponse.json({ success: true, shipments });
  } catch (err: any) {
    console.error('[ops/fulfillment-shipments] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/ops/fulfillment-shipments — body { shipmentId, status } advances a
// shipment's status (picked → shipped → delivered). 'created' is set by the
// LionWheel route itself and can't be set here.
export async function POST(req: NextRequest) {
  try {
    const { error } = await requireOpsOrAdmin(req);
    if (error) return error;

    const { shipmentId, status } = await req.json() as { shipmentId?: string; status?: string };
    if (!shipmentId || !status) {
      return NextResponse.json({ error: 'shipmentId and status are required' }, { status: 400 });
    }
    if (!ADVANCEABLE_STATUSES.includes(status as any)) {
      return NextResponse.json({ error: `status must be one of: ${ADVANCEABLE_STATUSES.join(', ')}` }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const shipmentRef = adminDb.collection('fulfillment_shipments').doc(shipmentId);
    const shipmentSnap = await shipmentRef.get();
    if (!shipmentSnap.exists) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    await shipmentRef.update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
      [`${status}At`]: FieldValue.serverTimestamp(),
    });

    // Keep orders/{id}.fulfillmentPlan.shipments in sync.
    const shipment = shipmentSnap.data()!;
    if (shipment.orderId) {
      try {
        const orderRef = adminDb.collection('orders').doc(shipment.orderId);
        const orderSnap = await orderRef.get();
        const plan = orderSnap.data()?.fulfillmentPlan;
        if (plan?.shipments) {
          const nowIso = new Date().toISOString();
          const updatedShipments = plan.shipments.map((s: any) =>
            s.id === shipmentId ? { ...s, status, updatedAt: nowIso } : s
          );
          const allDelivered = updatedShipments.every((s: any) => s.status === 'delivered');
          await orderRef.update({
            fulfillmentPlan: {
              ...plan,
              shipments: updatedShipments,
              status: allDelivered ? 'completed' : plan.status,
            },
          });
        }
      } catch (syncErr) {
        console.error('[ops/fulfillment-shipments] plan sync failed (non-fatal):', syncErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[ops/fulfillment-shipments] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
