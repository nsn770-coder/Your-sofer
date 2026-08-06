// app/api/lionwheel/create-shipment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/app/firebase';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    console.log('📦 [LionWheel] Request received:', { orderId });

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const LIONWHEEL_API_KEY = process.env.LIONWHEEL_API_KEY;
    console.log('🔑 [LionWheel] API Key configured:', !!LIONWHEEL_API_KEY);

    if (!LIONWHEEL_API_KEY) {
      console.error('❌ [LionWheel] LIONWHEEL_API_KEY is not set in .env.local');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Get order from Firestore
    const orderRef = doc(db, 'orders', orderId);
    console.log('📂 [Firestore] Fetching order:', orderId);

    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      console.error('❌ [Firestore] Order not found:', orderId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderSnap.data() as any;
    console.log('✅ [Firestore] Order loaded:', { id: orderId, name: order.customerName });

    // Use city field (new in orders from payment route)
    let destinationCity = order.city || '';
    let destinationStreet = order.address || '';
    let destinationNumber = order.addressNumber || '1';
    let destinationApartment = order.apartment || '';
    let destinationZipCode = order.zipCode || '';

    // Ensure city is set (LionWheel requires it)
    if (!destinationCity || destinationCity.trim() === '') {
      // Fallback: try to extract from address if no city field
      if (order.address && typeof order.address === 'string') {
        const parts = order.address.split(',').map((p: string) => p.trim());
        if (parts.length === 2) {
          destinationCity = parts[1];
        }
      }

      // Last resort fallback
      if (!destinationCity || destinationCity.trim() === '') {
        destinationCity = 'Israel';
      }
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

    return NextResponse.json(
      {
        success: true,
        shipment: {
          taskId: shipmentData.task_id,
          publicId: shipmentData.public_id,
          trackingLink: shipmentData.tracking_link,
          label: shipmentData.label,
          barcode: shipmentData.barcode,
        },
      },
      { status: 200 }
    );
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
