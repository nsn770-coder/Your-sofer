// app/api/lionwheel/create-shipment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendCustomerShipmentEmail } from '@/app/lib/send-notification';
import { verifyOpsOrAdminToken } from '@/lib/verifyOps';
import type { ShipmentRecord, WarehouseAddress, CustomerAddress } from '@/app/lib/types';

// ── כתובת מוצא קבועה (נקודת האיסוף של YourSofer) ────────────────────────────
// LionWheel לא ממלא את המוצא אוטומטית בקריאות API — בלי השדות האלה
// המשלוח נוצר עם מוצא ריק ומסומן "חשד לאי דיוק בכתובת מוצא".
// ניתן לדרוס דרך משתני סביבה בלי לשנות קוד.
// האיות של הרחוב תואם במדויק למיקום השמור אצל LionWheel ("פרופסור", לא "פרופ'"),
// כדי שהגיאוקוד יזהה אותו ולא יסמן "חשד לאי דיוק בכתובת מוצא".
// משמש רק כברירת מחדל למוצא במסלול הישן (הזמנה בודדת, בלי fulfillmentPlan) —
// במסלול הרב-מחסני (multi-warehouse) המוצא מגיע תמיד מה-pickupAddress בגוף הבקשה.
const SOURCE = {
  city:          process.env.LIONWHEEL_SOURCE_CITY      || 'דימונה',
  street:        process.env.LIONWHEEL_SOURCE_STREET    || 'פרופסור עדה יונת',
  number:        process.env.LIONWHEEL_SOURCE_NUMBER    || '19',
  apartment:     process.env.LIONWHEEL_SOURCE_APARTMENT || '',
  floor:         process.env.LIONWHEEL_SOURCE_FLOOR     || '',
  zipCode:       process.env.LIONWHEEL_SOURCE_ZIP       || '',
  recipientName: process.env.LIONWHEEL_SOURCE_NAME      || 'ניסים בואהרון — YourSofer',
  phone:         process.env.LIONWHEEL_SOURCE_PHONE     || '058-487-7770',
  email:         process.env.LIONWHEEL_SOURCE_EMAIL     || '',
};

type LineItem = { name: string; quantity: string; price: string; weight: string };

type LionWheelShipment = {
  taskId: string | null;
  publicId: string | null;
  trackingLink: string | null;
  label: string | null;
  barcode: string | null;
};

// הזמנות חדשות שומרות כתובת מפוצלת (city/street/houseNumber/apartment/zipCode).
// הזמנות ישנות שמרו רק מחרוזת address אחת — נפרק אותה כ-fallback.
// override (pickupAddress/destinationAddress שהגיעו בגוף הבקשה) גובר על ההזמנה.
function resolveAddress(
  order: any,
  override?: Partial<CustomerAddress> | null
): { city: string; street: string; number: string; apartment: string; zipCode: string } {
  let city   = (override?.city   ?? order.city   ?? '').trim();
  let street = (override?.street ?? order.street ?? '').trim();
  let number = (override?.number ?? order.houseNumber ?? order.addressNumber ?? '').trim();
  const apartment = (override?.apartment ?? order.apartment ?? '').trim();
  const zipCode   = (override?.zipCode   ?? order.zipCode   ?? '').trim();

  if ((!city || !street) && typeof order.address === 'string' && order.address.trim()) {
    const parts = order.address.split(',').map((p: string) => p.trim()).filter(Boolean);
    if (!city && parts.length >= 2) city = parts[parts.length - 1];
    if (!street) {
      const line1 = parts[0] || '';
      const m = line1.match(/^(.*?)\s+(\d+\S*)$/);
      if (m) {
        street = m[1];
        if (!number) number = m[2];
      } else {
        street = line1;
      }
    }
  }

  if (!number) number = '1';
  return { city, street, number, apartment, zipCode };
}

function buildLineItems(items: any[]): LineItem[] {
  return (items || []).map((item: any) => ({
    name: item.name || item.productName || 'מוצר',
    quantity: String(item.quantity || 1),
    price: String(item.price || item.finalPrice || 0),
    weight: String(item.weight || 0.5),
  }));
}

async function callLionWheel(payload: Record<string, unknown>, apiKey: string) {
  const res = await fetch(
    `https://members.lionwheel.com/api/v1/tasks/create?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

function toLionWheelShipment(data: any): LionWheelShipment {
  return {
    taskId:       data.task_id       ?? null,
    publicId:     data.public_id     ?? null,
    trackingLink: data.tracking_link ?? null,
    label:        data.label         ?? null,
    barcode:      data.barcode       ?? null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }
    if (!(await verifyOpsOrAdminToken(idToken))) {
      return NextResponse.json({ error: 'Forbidden — admin or ops role required' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const LIONWHEEL_API_KEY = process.env.LIONWHEEL_API_KEY;
    if (!LIONWHEEL_API_KEY) {
      console.error('❌ [LionWheel] LIONWHEEL_API_KEY is not set in .env.local');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const adminDb = getAdminDb();
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      console.error('❌ [Firestore] Order not found:', orderId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderSnap.data() as any;

    // ── מסלול רב-מחסני (multi-warehouse): shipmentId + pickupAddress בגוף הבקשה ──
    if (body.shipmentId) {
      return await handleMultiWarehouseShipment(adminDb, orderRef, order, orderId, body, LIONWHEEL_API_KEY);
    }

    // ── מסלול ישן: הזמנה בודדת, מוצא קבוע (Dimona), נשמר על order.lionwheel ──
    return await handleLegacyShipment(orderRef, order, orderId, !!body.force, LIONWHEEL_API_KEY);
  } catch (error) {
    console.error('Error creating shipment:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function handleLegacyShipment(
  orderRef: FirebaseFirestore.DocumentReference,
  order: any,
  orderId: string,
  force: boolean,
  apiKey: string
) {
  console.log('📦 [LionWheel] Legacy single-shipment request:', { orderId, force });

  // הגנה מפני משלוח כפול — אם כבר נוצר משלוח, מחזירים אותו במקום ליצור חדש
  if (order.lionwheel?.publicId && !force) {
    console.log('ℹ️ [LionWheel] Shipment already exists:', order.lionwheel.publicId);
    return NextResponse.json({
      success: true,
      alreadyExists: true,
      shipment: order.lionwheel,
    });
  }

  const destination = resolveAddress(order);

  if (!destination.city || !destination.street) {
    console.error('❌ [LionWheel] Missing address fields:', { destination, raw: order.address });
    return NextResponse.json(
      {
        error: 'חסרים פרטי כתובת בהזמנה',
        message: `לא ניתן ליצור משלוח: ${!destination.city ? 'חסרה עיר. ' : ''}${!destination.street ? 'חסר רחוב. ' : ''}יש להשלים את הפרטים בהזמנה.`,
        address: order.address || null,
      },
      { status: 400 }
    );
  }

  const lineItems = buildLineItems(order.items || []);
  const today = new Date();
  const pickupDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const lionWheelPayload = {
    pickup_at: pickupDate,
    original_order_id: orderId,

    source_city:           SOURCE.city,
    source_street:         SOURCE.street,
    source_number:         SOURCE.number,
    source_apartment:      SOURCE.apartment,
    source_floor:          SOURCE.floor,
    source_zip_code:       SOURCE.zipCode,
    source_recipient_name: SOURCE.recipientName,
    source_phone:          SOURCE.phone,
    source_email:          SOURCE.email,

    destination_city: destination.city,
    destination_street: destination.street,
    destination_number: destination.number,
    destination_apartment: destination.apartment,
    destination_zip_code: destination.zipCode,
    destination_recipient_name: order.customerName || 'לא צוין',
    destination_phone: order.phone || '',
    destination_email: order.email || '',
    line_items: lineItems,
    notes: order.notes || `הזמנה YourSofer #${order.orderNumber || orderId}`,
  };

  const { ok, status, data } = await callLionWheel(lionWheelPayload, apiKey);
  if (!ok) {
    console.error('❌ [LionWheel] API error:', data);
    return NextResponse.json({ error: 'Failed to create shipment in LionWheel', details: data }, { status });
  }

  const shipment = toLionWheelShipment(data);

  try {
    await orderRef.update({
      lionwheel: { ...shipment, createdAt: new Date().toISOString() },
      lionwheelSentAt: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error('⚠️ [Firestore] Failed to save shipment to order (non-fatal):', e);
  }

  try {
    await sendCustomerShipmentEmail(
      { orderNumber: order.orderNumber || orderId, customerName: order.customerName || '', email: order.email || '' },
      shipment,
    );
  } catch (emailErr) {
    console.error('⚠️ [email] Failed to send customer shipment notification (non-fatal):', emailErr);
  }

  return NextResponse.json({ success: true, shipment }, { status: 200 });
}

async function handleMultiWarehouseShipment(
  adminDb: FirebaseFirestore.Firestore,
  orderRef: FirebaseFirestore.DocumentReference,
  order: any,
  orderId: string,
  body: any,
  apiKey: string
) {
  const {
    shipmentId,
    pickupAddress,
    destinationAddress,
    itemIds,
    source,
  } = body as {
    shipmentId: string;
    pickupAddress?: Partial<WarehouseAddress>;
    destinationAddress?: Partial<CustomerAddress>;
    itemIds?: string[];
    source?: string;
  };

  console.log('📦 [LionWheel] Multi-warehouse request:', { orderId, shipmentId, source });

  if (!pickupAddress?.city || !pickupAddress?.street) {
    return NextResponse.json({ error: 'pickupAddress (city, street) is required' }, { status: 400 });
  }

  const existingShipmentSnap = await adminDb.collection('fulfillment_shipments').doc(shipmentId).get();
  if (existingShipmentSnap.exists && existingShipmentSnap.data()?.lionwheelData?.publicId && !body.force) {
    console.log('ℹ️ [LionWheel] Shipment already exists:', shipmentId);
    return NextResponse.json({
      success: true,
      alreadyExists: true,
      shipmentId,
      shipment: existingShipmentSnap.data(),
    });
  }

  const destination = resolveAddress(order, destinationAddress);
  if (!destination.city || !destination.street) {
    return NextResponse.json(
      {
        error: 'חסרים פרטי כתובת יעד',
        message: `לא ניתן ליצור משלוח: ${!destination.city ? 'חסרה עיר. ' : ''}${!destination.street ? 'חסר רחוב.' : ''}`,
      },
      { status: 400 }
    );
  }

  const allItems: any[] = order.items || [];
  const shipmentItems = itemIds && itemIds.length > 0
    ? allItems.filter((item) => itemIds.includes(item.id) || itemIds.includes(item.productId))
    : allItems;
  const lineItems = buildLineItems(shipmentItems);

  const today = new Date();
  const pickupDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const lionWheelPayload = {
    pickup_at: pickupDate,
    original_order_id: `${orderId}-${shipmentId}`,

    source_city:           pickupAddress.city,
    source_street:         pickupAddress.street,
    source_number:         pickupAddress.number || '1',
    source_apartment:      pickupAddress.apartment || '',
    source_zip_code:       pickupAddress.zipCode || '',
    source_recipient_name: pickupAddress.recipientName || 'Your Sofer',
    source_phone:          pickupAddress.phone || '',
    source_email:          '',

    destination_city: destination.city,
    destination_street: destination.street,
    destination_number: destination.number,
    destination_apartment: destination.apartment,
    destination_zip_code: destination.zipCode,
    destination_recipient_name: destinationAddress?.recipientName || order.customerName || 'לא צוין',
    destination_phone: destinationAddress?.phone || order.phone || '',
    destination_email: order.email || '',
    line_items: lineItems,
    notes: order.notes || `הזמנה YourSofer #${order.orderNumber || orderId} — משלוח ${shipmentId}`,
  };

  const { ok, status, data } = await callLionWheel(lionWheelPayload, apiKey);
  if (!ok) {
    console.error('❌ [LionWheel] API error:', data);
    return NextResponse.json({ error: 'Failed to create shipment in LionWheel', details: data }, { status });
  }

  const shipment = toLionWheelShipment(data);
  const nowIso = new Date().toISOString();

  const shipmentDoc = {
    shipmentId,
    orderId,
    orderNumber: order.orderNumber || null,
    customerName: order.customerName || null,
    source: source || null,
    pickupAddress,
    destinationAddress: destination,
    itemIds: itemIds || null,
    items: shipmentItems.map((i: any) => ({ id: i.id, name: i.name || i.productName, quantity: i.quantity, price: i.price })),
    status: 'created',
    lionwheelData: { ...shipment, createdAt: nowIso },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  try {
    await adminDb.collection('fulfillment_shipments').doc(shipmentId).set(shipmentDoc, { merge: true });
  } catch (e) {
    console.error('⚠️ [Firestore] Failed to save fulfillment_shipments doc (non-fatal):', e);
  }

  // Keep orders/{id}.fulfillmentPlan.shipments in sync — it's what the ops UI reads.
  try {
    const plan = order.fulfillmentPlan;
    if (plan?.shipments) {
      const updatedShipments: ShipmentRecord[] = plan.shipments.map((s: ShipmentRecord) =>
        s.id === shipmentId
          ? { ...s, status: 'created', lionwheelData: { ...shipment, createdAt: nowIso }, updatedAt: nowIso }
          : s
      );
      const allCreated = updatedShipments.every((s) => s.status !== 'pending');
      await orderRef.update({
        fulfillmentPlan: {
          ...plan,
          shipments: updatedShipments,
          status: allCreated ? 'ready' : 'in_progress',
        },
      });
    }
  } catch (e) {
    console.error('⚠️ [Firestore] Failed to sync fulfillmentPlan on order (non-fatal):', e);
  }

  try {
    await sendCustomerShipmentEmail(
      { orderNumber: order.orderNumber || orderId, customerName: order.customerName || '', email: order.email || '' },
      shipment,
    );
  } catch (emailErr) {
    console.error('⚠️ [email] Failed to send customer shipment notification (non-fatal):', emailErr);
  }

  return NextResponse.json({
    success: true,
    shipmentId,
    taskId: shipment.taskId,
    trackingLink: shipment.trackingLink,
    shipment,
  }, { status: 200 });
}
