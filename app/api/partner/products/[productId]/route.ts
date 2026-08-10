import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * GET /api/partner/products/[productId]
 * PUT /api/partner/products/[productId]
 * DELETE /api/partner/products/[productId] (soft delete: status -> 'inactive')
 *
 * CRITICAL: Data isolation - product is only reachable under the caller's
 * own partners/{partnerId}/products path, so no separate ownership check
 * is required beyond deriving partnerId from the token as usual.
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
    console.error('[partner/products/[id]] token verification failed:', tokenErr);
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const auth = await requirePartner(req);
    if ('error' in auth) return auth.error;
    const { adminDb, partnerId } = auth;
    const { productId } = await params;

    const snap = await adminDb.collection('partners').doc(partnerId).collection('products').doc(productId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: { id: snap.id, ...snap.data() } });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[partner/products/[id]] GET error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const auth = await requirePartner(req);
    if ('error' in auth) return auth.error;
    const { adminDb, partnerId } = auth;
    const { productId } = await params;

    const productRef = adminDb.collection('partners').doc(partnerId).collection('products').doc(productId);
    const snap = await productRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const allowedFields = ['name', 'description', 'price', 'images', 'stock', 'status', 'category', 'weight', 'dimensions'];
    const updates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(body ?? {})) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates[key] = value;
      }
    }

    if ('price' in updates && (typeof updates.price !== 'number' || updates.price <= 0)) {
      return NextResponse.json({ error: 'מחיר חייב להיות גדול מ-0' }, { status: 400 });
    }
    if ('stock' in updates && (typeof updates.stock !== 'number' || updates.stock < 0)) {
      return NextResponse.json({ error: 'מלאי חייב להיות 0 ומעלה' }, { status: 400 });
    }
    if ('status' in updates && updates.status !== 'active' && updates.status !== 'inactive') {
      return NextResponse.json({ error: 'סטטוס לא תקין' }, { status: 400 });
    }

    updates.updatedAt = FieldValue.serverTimestamp();
    await productRef.update(updates);

    const updated = await productRef.get();
    return NextResponse.json({ success: true, product: { id: updated.id, ...updated.data() } });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[partner/products/[id]] PUT error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const auth = await requirePartner(req);
    if ('error' in auth) return auth.error;
    const { adminDb, partnerId } = auth;
    const { productId } = await params;

    const productRef = adminDb.collection('partners').doc(partnerId).collection('products').doc(productId);
    const snap = await productRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await productRef.update({ status: 'inactive', updatedAt: FieldValue.serverTimestamp() });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[partner/products/[id]] DELETE error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
