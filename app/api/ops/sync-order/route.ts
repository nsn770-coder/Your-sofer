import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/firebase';

function detectOrderType(items: any[]): 'judaica' | 'stam' | 'mixed' {
  const STAM_CATEGORIES = ['מזוזות', 'תפילין', 'מגילות', 'ספרי תורה', 'ספר תורה'];
  let hasStam = false;
  let hasJudaica = false;

  for (const item of items || []) {
    const cat = item.category || item.cat || '';
    if (STAM_CATEGORIES.some((s) => cat.includes(s) || item.name?.includes(s))) {
      hasStam = true;
    } else {
      hasJudaica = true;
    }
  }

  if (hasStam && hasJudaica) return 'mixed';
  if (hasStam) return 'stam';
  return 'judaica';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, orderNumber, customerName, customerEmail, customerPhone, items, total, address } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    }

    // Check if already synced
    const existing = await getDocs(
      query(collection(db, 'internalOrders'), where('orderId', '==', orderId))
    );
    if (!existing.empty) {
      return NextResponse.json({ success: true, alreadySynced: true });
    }

    const products = (items || []).map((item: any, idx: number) => ({
      id: item.id || `item-${idx}`,
      name: item.name || '',
      category: item.category || item.cat || '',
      quantity: item.quantity || 1,
      price: item.price || 0,
      isStam: false,
    }));

    const orderType = detectOrderType(items || []);

    const shippingAddress = typeof address === 'string'
      ? { street: address, city: '', zip: '' }
      : {
          street: address?.street || address?.address || '',
          city: address?.city || '',
          zip: address?.zip || address?.postal || '',
        };

    const internalOrder = {
      orderId,
      orderNumber: orderNumber || orderId,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      customerEmail: customerEmail || '',
      shippingAddress,
      orderType,
      products,
      totalAmount: total || 0,
      status: 'new_order',
      primaryOwner: '',
      secondaryOwner: '',
      judaicaStream: { status: '', owner: '', notes: '' },
      stamStream: { status: '', owner: '', soferId: '', klafStatus: '', paymentStatus: '', notes: '' },
      financialStatus: 'paid',
      shipmentTracking: '',
      priority: 'normal',
      isDelayed: false,
      isBlocked: false,
      delayReason: '',
      blockReason: '',
      internalNotes: [],
      customerCommunicationLog: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'internalOrders'), internalOrder);

    await addDoc(collection(db, 'auditLog'), {
      orderId: docRef.id,
      userId: 'system',
      userName: 'מערכת',
      action: 'הזמנה נוצרה',
      newValue: { status: 'new_order', orderId },
      timestamp: serverTimestamp(),
    });

    // Notify team (non-fatal)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-sofer.com';
      await fetch(`${baseUrl}/api/ops/notify-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_order',
          orderNumber: orderNumber || orderId,
          orderId: docRef.id,
          customerName,
          total,
          products,
          shippingAddress,
          orderType,
        }),
      });
    } catch (notifyErr) {
      console.error('Notify failed (non-fatal):', notifyErr);
    }

    return NextResponse.json({ success: true, internalOrderId: docRef.id });
  } catch (err: any) {
    console.error('Sync order error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
