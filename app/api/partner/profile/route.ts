import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Partner } from '@/app/lib/partner-types';

/**
 * GET /api/partner/profile - Fetch partner profile
 * PUT /api/partner/profile - Update partner profile
 *
 * CRITICAL: Data isolation enforced
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
    } catch (tokenErr) {
      console.error('[profile] token verification failed:', tokenErr);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!userSnap.exists || userSnap.data()?.role !== 'partner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const partnerId = userSnap.data()?.partnerId;
    const partnerSnap = await adminDb.collection('partners').doc(partnerId).get();

    if (!partnerSnap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      partner: partnerSnap.data(),
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[profile] GET error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!userSnap.exists || userSnap.data()?.role !== 'partner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const partnerId = userSnap.data()?.partnerId;
    const updates = await req.json();

    // Security: Only allow certain fields to be updated
    const allowedFields = [
      'storeName',
      'storeDescription',
      'logoUrl',
      'heroImageUrl',
      'colors',
      'whatsapp',
      'facebook',
      'instagram',
    ];

    const sanitizedUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        sanitizedUpdates[key] = value;
      }
    }

    sanitizedUpdates.updatedAt = FieldValue.serverTimestamp();

    await adminDb.collection('partners').doc(partnerId).update(sanitizedUpdates);

    const updated = await adminDb.collection('partners').doc(partnerId).get();

    return NextResponse.json({
      success: true,
      partner: updated.data(),
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[profile] PUT error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
