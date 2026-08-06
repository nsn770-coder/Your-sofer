// app/api/lionwheel/create-shipment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/app/firebase';

const LIONWHEEL_API_KEY = process.env.LIONWHEEL_API_KEY || 'c_key_b4adcibc-baa2-43ed-aq25-e648ba9c5693';
const LIONWHEEL_API_URL = 'https://members.lionwheel.com/api/v1/tasks/create';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Get order from Firestore
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderSnap.data() as any;

    // Parse address — support various formats
    let destinationCity = order.city || '';
    let destinationStreet = order.address || '';
    let destinationNumber = order.addressNumber || '';
    let destinationApartment = order.apartment || '';
    let destinationZipCode = order.zipCode || '';

    // If we have raw address string, try to parse it
    if (!destinationCity && order.address && typeof order.address === 'string') {
      const parts = order.address.split(',').map((p: string) => p.trim());
      if (parts.length >= 2) {
        destinationStreet = parts[0];
        destinationNumber = parts[1];
        if (parts.length >= 3) destinationCity = parts[2];
      }
    }

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
    const lionWheelResponse = await fetch(
      `${LIONWHEEL_API_URL}?key=${LIONWHEEL_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lionWheelPayload),
      }
    );

    const shipmentData = await lionWheelResponse.json();

    if (!lionWheelResponse.ok) {
      console.error('LionWheel API error:', shipmentData);
      return NextResponse.json(
        {
          error: 'Failed to create shipment in LionWheel',
          details: shipmentData,
        },
        { status: lionWheelResponse.status }
      );
    }

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
