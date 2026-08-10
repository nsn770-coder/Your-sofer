import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

type EventType = 'store_view' | 'product_view' | 'add_to_cart' | 'begin_checkout' | 'purchase' | 'share_store';

interface AnalyticsEvent {
  type: EventType;
  partnerId: string;
  sessionId?: string;
  productId?: string;
  quantity?: number;
  revenue?: number;
}

/**
 * POST /api/partner/analytics/events
 * Log analytics events (public, no auth required - sent from client)
 * CRITICAL: Validate partnerId exists before logging
 */
export async function POST(req: NextRequest) {
  try {
    const event = await req.json() as AnalyticsEvent;

    const { type, partnerId, sessionId, productId, quantity, revenue } = event;

    if (!type || !partnerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminDb = getAdminDb();

    // Verify partner exists (prevent spam for fake partners)
    const partnerSnap = await adminDb.collection('partners').doc(partnerId).get();
    if (!partnerSnap.exists) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Log event to partners_events
    await adminDb.collection('partners_events').add({
      type,
      partnerId,
      sessionId: sessionId || null,
      productId: productId || null,
      quantity: quantity || null,
      revenue: revenue || null,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[analytics/events] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
