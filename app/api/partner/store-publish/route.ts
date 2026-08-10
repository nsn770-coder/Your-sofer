import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/partner/store-publish
 * Publish/update store branding
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
    } catch (tokenErr) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!userSnap.exists || userSnap.data()?.role !== 'partner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const partnerId = userSnap.data()?.partnerId;
    const updates = await req.json();

    // Validate branding completeness
    if (updates.publish === true) {
      if (!updates.storeName || !updates.logoUrl || !updates.colors) {
        return NextResponse.json(
          { error: 'Store name, logo, and colors required to publish' },
          { status: 400 }
        );
      }
    }

    // Whitelist fields
    const allowedFields = [
      'storeName',
      'storeDescription',
      'logoUrl',
      'heroImageUrl',
      'colors',
      'whatsapp',
      'facebook',
      'instagram',
      'isPublished',
    ];

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        sanitized[key] = value;
      }
    }

    // Update onboarding checklist
    if (updates.publish === true) {
      sanitized.isPublished = true;
      sanitized.onboarding = {
        nameComplete: !!updates.storeName,
        logoComplete: !!updates.logoUrl,
        colorsComplete: !!updates.colors,
        whatsappComplete: !!updates.whatsapp,
        published: true,
      };
    }

    sanitized.updatedAt = FieldValue.serverTimestamp();

    await adminDb.collection('partners').doc(partnerId).update(sanitized);

    const updated = await adminDb.collection('partners').doc(partnerId).get();

    return NextResponse.json({
      success: true,
      partner: updated.data(),
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[store-publish] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
