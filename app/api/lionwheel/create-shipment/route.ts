// app/api/lionwheel/create-shipment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendCustomerShipmentEmail } from '@/app/lib/send-notification';

// ── כתובת מוצא קבועה (נקודת האיסוף של YourSofer) ────────────────────────────
// LionWheel לא ממלא את המוצא אוטומטית בקריאות API — בלי השדות האלה
// המשלוח נוצר עם מוצא ריק ומסומן "חשד לאי דיוק בכתובת מוצא".
// ניתן לדרוס דרך משתני סביבה בלי לשנות קוד.
// האיות של הרחוב תואם במדויק למיקום השמור אצל LionWheel ("פרופסור", לא "פרופ'"),
// כדי שהגיאוקוד יזהה אותו ולא יסמן "חשד לאי דיוק בכתובת מוצא".
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

export async function POST(request: NextRequest) {
  try {
    const { orderId, force } = await request.json();

    console.log('📦 [LionWheel] Request received:', { orderId, force: !!force });

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const LIONWHEEL_API_KEY = process.env.LIONWHEEL_API_KEY;
    console.log('🔑 [LionWheel] API Key configured:', !!LIONWHEEL_API_KEY);

    if (!LIONWHEEL_API_KEY) {
      console.error('❌ [LionWheel] LIONWHEEL_API_KEY is not set in .env.local');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const adminDb = getAdminDb();
    const orderRef = adminDb.collection('orders').doc(orderId);
    console.log('📂 [Firestore] Fetching order:', orderId);

    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      console.error('❌ [Firestore] Order not found:', orderId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderSnap.data() as any;
    console.log('✅ [Firestore] Order loaded:', { id: orderId, name: order.customerName });

    // הגנה מפני משלוח כפול — אם כבר נוצר משלוח, מחזירים אותו במקום ליצור חדש
    if (order.lionwheel?.publicId && !force) {
      console.log('ℹ️ [LionWheel] Shipment already exists:', order.lionwheel.publicId);
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        shipment: order.lionwheel,
      });
    }

    // הזמנות חדשות שומרות את שדות הכתובת מפוצלים (city/street/houseNumber/apartment/zipCode).
    // הזמנות ישנות שמרו רק מחרוזת address אחת — נפרק אותה כ-fallback.
    let destinationCity      = (order.city || '').trim();
    let destinationStreet    = (order.street || '').trim();
    let destinationNumber    = (order.houseNumber || order.addressNumber || '').trim();
    const destinationApartment = (order.apartment || '').trim();
    const destinationZipCode   = (order.zipCode || '').trim();

    // Fallback להזמנות ישנות: "רחוב הרצל 5, תל אביב"
    if ((!destinationCity || !destinationStreet) && typeof order.address === 'string' && order.address.trim()) {
      const parts = order.address.split(',').map((p: string) => p.trim()).filter(Boolean);
      if (!destinationCity && parts.length >= 2) destinationCity = parts[parts.length - 1];
      if (!destinationStreet) {
        const line1 = parts[0] || '';
        const m = line1.match(/^(.*?)\s+(\d+\S*)$/);
        if (m) {
          destinationStreet = m[1];
          if (!destinationNumber) destinationNumber = m[2];
        } else {
          destinationStreet = line1;
        }
      }
    }

    if (!destinationNumber) destinationNumber = '1';

    // LionWheel דורש עיר ורחוב — נחזיר שגיאה ברורה במקום לשלוח בקשה שתיכשל
    if (!destinationCity || !destinationStreet) {
      console.error('❌ [LionWheel] Missing address fields:', { destinationCity, destinationStreet, raw: order.address });
      return NextResponse.json(
        {
          error: 'חסרים פרטי כתובת בהזמנה',
          message: `לא ניתן ליצור משלוח: ${!destinationCity ? 'חסרה עיר. ' : ''}${!destinationStreet ? 'חסר רחוב. ' : ''}יש להשלים את הפרטים בהזמנה.`,
          address: order.address || null,
        },
        { status: 400 }
      );
    }

    console.log('📍 [Address Info]:', { destinationStreet, destinationNumber, destinationCity });

    // Format line items
    const lineItems = (order.items || []).map((item: any) => ({
      name: item.name || item.productName || 'מוצר',
      quantity: String(item.quantity || 1),
      price: String(item.price || item.finalPrice || 0),
      weight: String(item.weight || 0.5),
    }));

    // Format date for pickup (dd/mm/yyyy)
    const today = new Date();
    const pickupDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    // Prepare LionWheel payload
    const lionWheelPayload = {
      pickup_at: pickupDate,
      original_order_id: orderId,

      // ── מוצא: נקודת האיסוף הקבועה של YourSofer ──
      source_city:           SOURCE.city,
      source_street:         SOURCE.street,
      source_number:         SOURCE.number,
      source_apartment:      SOURCE.apartment,
      source_floor:          SOURCE.floor,
      source_zip_code:       SOURCE.zipCode,
      source_recipient_name: SOURCE.recipientName,
      source_phone:          SOURCE.phone,
      source_email:          SOURCE.email,

      // ── יעד: כתובת הלקוח ──
      destination_city: destinationCity,
      destination_street: destinationStreet,
      destination_number: destinationNumber || '1',
      destination_apartment: destinationApartment || '',
      destination_zip_code: destinationZipCode,
      destination_recipient_name: order.customerName || 'לא צוין',
      destination_phone: order.phone || '',
      destination_email: order.email || '',
      line_items: lineItems,
      notes: `הזמנה YourSofer #${order.orderNumber || orderId}`,
    };

    // Call LionWheel API
    console.log('📤 [LionWheel] Sending request with payload:', lionWheelPayload);

    const lionWheelResponse = await fetch(
      `https://members.lionwheel.com/api/v1/tasks/create?key=${LIONWHEEL_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lionWheelPayload),
      }
    );

    console.log('📥 [LionWheel] Response status:', lionWheelResponse.status);

    const shipmentData = await lionWheelResponse.json();

    console.log('📥 [LionWheel] Response data:', shipmentData);

    if (!lionWheelResponse.ok) {
      console.error('❌ [LionWheel] API error:', shipmentData);
      return NextResponse.json(
        {
          error: 'Failed to create shipment in LionWheel',
          details: shipmentData,
        },
        { status: lionWheelResponse.status }
      );
    }

    console.log('✅ [LionWheel] Shipment created successfully:', shipmentData);

    const shipment = {
      taskId:       shipmentData.task_id      ?? null,
      publicId:     shipmentData.public_id    ?? null,
      trackingLink: shipmentData.tracking_link ?? null,
      label:        shipmentData.label        ?? null,
      barcode:      shipmentData.barcode      ?? null,
    };

    // שמירה בהזמנה — כדי שהמזהה ישרוד רענון דף וימנע יצירת משלוח כפול.
    // כישלון כאן אינו קריטי (המשלוח כבר נוצר) — לכן רק נרשם ביומן.
    try {
      await orderRef.update({
        lionwheel: { ...shipment, createdAt: new Date().toISOString() },
        lionwheelSentAt: FieldValue.serverTimestamp(),
      });
      console.log('💾 [Firestore] Shipment saved to order:', orderId);
    } catch (e) {
      console.error('⚠️ [Firestore] Failed to save shipment to order (non-fatal):', e);
    }

    // Customer tracking email — non-fatal, shipment is already created either way
    try {
      await sendCustomerShipmentEmail(
        { orderNumber: order.orderNumber || orderId, customerName: order.customerName || '', email: order.email || '' },
        shipment,
      );
    } catch (emailErr) {
      console.error('⚠️ [email] Failed to send customer shipment notification (non-fatal):', emailErr);
    }

    return NextResponse.json({ success: true, shipment }, { status: 200 });
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
