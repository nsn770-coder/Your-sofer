// Phase 7: Admin Partner Management
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * GET /api/admin/partners?limit=50&offset=0
 * List all partners with pagination
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const adminAuth = getAdminAuth();

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!userSnap.exists || userSnap.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 500);
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    const partnersSnap = await adminDb
      .collection('partners')
      .orderBy('createdAt', 'desc')
      .limit(limit + 1)
      .offset(offset)
      .get();

    const partners = partnersSnap.docs.map((doc) => ({
      id: doc.id,
      businessName: doc.data().businessName,
      status: doc.data().status,
      createdAt: doc.data().createdAt,
      storeName: doc.data().storeName,
      isPublished: doc.data().isPublished,
    }));

    return NextResponse.json({
      success: true,
      partners: partners.slice(0, limit),
      hasMore: partners.length > limit,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[admin/partners] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/partners/[id]/action
 * Suspend/activate/cancel partner
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const adminAuth = getAdminAuth();

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!userSnap.exists || userSnap.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { partnerId, action } = await req.json();

    if (!['suspend', 'activate', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

    if (action === 'suspend') {
      updates.status = 'suspended';
      updates.suspendedAt = FieldValue.serverTimestamp();
      updates.suspendedBy = decodedToken.uid;
    } else if (action === 'activate') {
      updates.status = 'active';
      updates.suspendedAt = null;
    } else if (action === 'cancel') {
      updates.status = 'cancelled';
      updates.cancelledAt = FieldValue.serverTimestamp();
      updates.cancelledBy = decodedToken.uid;
    }

    await adminDb.collection('partners').doc(partnerId).update(updates);

    // Log to audit trail
    await adminDb.collection('audit_log').add({
      action: `partner_${action}`,
      partnerId,
      adminId: decodedToken.uid,
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[admin/partners] POST error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
