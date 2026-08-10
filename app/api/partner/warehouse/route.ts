import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { validateIsraeliPhone } from '@/app/lib/partner-security';
import type { PartnerWarehouse } from '@/app/lib/partner-types';

/**
 * GET /api/partner/warehouse - Fetch partner warehouse address
 * PUT /api/partner/warehouse - Update partner warehouse address
 */

async function requirePartner(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  }

  const idToken = authHeader.slice(7);
  const adminAuth = getAdminAuth();

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(idToken);
  } catch (tokenErr) {
    console.error('[warehouse] token verification failed:', tokenErr);
    return { error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) } as const;
  }

  const adminDb = getAdminDb();
  const userSnap = await adminDb.collection('users').doc(decodedToken.uid).get();

  if (!userSnap.exists || userSnap.data()?.role !== 'partner') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const;
  }

  const partnerId = userSnap.data()?.partnerId as string;
  return { adminDb, partnerId } as const;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePartner(req);
    if ('error' in auth) return auth.error;
    const { adminDb, partnerId } = auth;

    const partnerSnap = await adminDb.collection('partners').doc(partnerId).get();
    if (!partnerSnap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      warehouse: (partnerSnap.data()?.warehouse as PartnerWarehouse) ?? null,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[warehouse] GET error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requirePartner(req);
    if ('error' in auth) return auth.error;
    const { adminDb, partnerId } = auth;

    const body = await req.json();
    const { city, street, number, apartment, zipCode, phone, recipientName, type } = body ?? {};

    if (!city || typeof city !== 'string') {
      return NextResponse.json({ error: 'עיר היא שדה חובה' }, { status: 400 });
    }
    if (!street || typeof street !== 'string') {
      return NextResponse.json({ error: 'רחוב הוא שדה חובה' }, { status: 400 });
    }
    if (!number || typeof number !== 'string') {
      return NextResponse.json({ error: 'מספר בית הוא שדה חובה' }, { status: 400 });
    }
    if (!recipientName || typeof recipientName !== 'string') {
      return NextResponse.json({ error: 'שם הנוכל הוא שדה חובה' }, { status: 400 });
    }
    if (!phone || typeof phone !== 'string' || !validateIsraeliPhone(phone)) {
      return NextResponse.json({ error: 'מספר טלפון לא תקין' }, { status: 400 });
    }
    if (type !== 'partner' && type !== 'dropship') {
      return NextResponse.json({ error: 'סוג מחסן לא תקין' }, { status: 400 });
    }

    const warehouse: PartnerWarehouse = {
      city,
      street,
      number,
      apartment: typeof apartment === 'string' ? apartment : '',
      zipCode: typeof zipCode === 'string' ? zipCode : '',
      phone,
      recipientName,
      type,
      updatedAt: new Date().toISOString(),
    };

    await adminDb.collection('partners').doc(partnerId).update({
      warehouse,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, warehouse });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[warehouse] PUT error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
