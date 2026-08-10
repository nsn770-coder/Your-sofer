import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkRateLimit } from '@/app/lib/partner-security';
import { buildMirrorDoc } from '@/app/lib/partnerProductMirror';
import type { PartnerProduct, PartnerWarehouse } from '@/app/lib/partner-types';

/**
 * GET /api/partner/products - List the caller's own products
 * POST /api/partner/products - Create a new product
 *
 * CRITICAL: Data isolation enforced - partnerId always derives from the
 * authenticated user's users/{uid} doc, never from the request.
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
    console.error('[partner/products] token verification failed:', tokenErr);
    return { error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) } as const;
  }

  const adminDb = getAdminDb();
  const userSnap = await adminDb.collection('users').doc(decodedToken.uid).get();

  if (!userSnap.exists || userSnap.data()?.role !== 'partner') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const;
  }

  const partnerId = userSnap.data()?.partnerId as string;
  return { adminDb, partnerId, uid: decodedToken.uid } as const;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePartner(req);
    if ('error' in auth) return auth.error;
    const { adminDb, partnerId } = auth;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') === 'all' ? 'all' : 'active';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

    let query = adminDb
      .collection('partners')
      .doc(partnerId)
      .collection('products')
      .orderBy('createdAt', 'desc') as FirebaseFirestore.Query;

    if (status === 'active') {
      query = query.where('status', '==', 'active');
    }

    const allSnap = await query.get();
    const total = allSnap.size;
    const start = (page - 1) * limit;
    const pageDocs = allSnap.docs.slice(start, start + limit);

    const products = pageDocs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({
      success: true,
      products,
      total,
      page,
      pageSize: limit,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[partner/products] GET error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePartner(req);
    if ('error' in auth) return auth.error;
    const { adminDb, partnerId, uid } = auth;

    if (!checkRateLimit(`partner-products:${partnerId}`, 50, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'יותר מדי בקשות, נסה שוב מאוחר יותר' }, { status: 429 });
    }

    const body = await req.json();
    const {
      name, description, price, images, sku, stock, category,
      weight, dimensions, warehouseType,
    } = body ?? {};

    if (typeof name !== 'string' || name.length < 3 || name.length > 200) {
      return NextResponse.json({ error: 'שם המוצר חייב להיות בין 3 ל-200 תווים' }, { status: 400 });
    }
    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'מחיר חייב להיות גדול מ-0' }, { status: 400 });
    }
    if (typeof stock !== 'number' || stock < 0) {
      return NextResponse.json({ error: 'מלאי חייב להיות 0 ומעלה' }, { status: 400 });
    }
    if (typeof sku !== 'string' || !sku.trim()) {
      return NextResponse.json({ error: 'SKU הוא שדה חובה' }, { status: 400 });
    }
    if (warehouseType !== 'partner' && warehouseType !== 'dropship') {
      return NextResponse.json({ error: 'סוג מחסן לא תקין' }, { status: 400 });
    }

    const productsRef = adminDb.collection('partners').doc(partnerId).collection('products');

    // SKU uniqueness (per partner)
    const dupeSnap = await productsRef.where('sku', '==', sku.trim()).limit(1).get();
    if (!dupeSnap.empty) {
      return NextResponse.json({ error: 'קיים כבר מוצר עם SKU זה' }, { status: 409 });
    }

    // warehouseType must match the partner's declared warehouse type
    const partnerSnap = await adminDb.collection('partners').doc(partnerId).get();
    const partnerData = partnerSnap.data();
    if (!partnerData?.warehouse?.type) {
      return NextResponse.json(
        { error: 'יש להגדיר הגדרות מחסן לפני העלאת מוצר' },
        { status: 400 }
      );
    }
    if (partnerData.warehouse.type !== warehouseType) {
      return NextResponse.json(
        { error: 'סוג המחסן של המוצר חייב להתאים להגדרות המחסן שלך' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newProduct: Omit<PartnerProduct, 'id'> = {
      name,
      description: typeof description === 'string' ? description : '',
      price,
      images: Array.isArray(images) ? images.filter((u) => typeof u === 'string') : [],
      sku: sku.trim(),
      stock,
      category: typeof category === 'string' ? category : '',
      weight: typeof weight === 'number' ? weight : 0,
      dimensions: {
        length: Number(dimensions?.length) || 0,
        width: Number(dimensions?.width) || 0,
        height: Number(dimensions?.height) || 0,
      },
      partnerId,
      partnerName: partnerData.storeName || partnerData.businessName || '',
      warehouseType,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
    };

    const docRef = await productsRef.add({
      ...newProduct,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Mirror into the main products collection so the storefront (home, category
    // pages, product detail, Algolia sync) can display it with zero new query code.
    try {
      const mirrorDoc = buildMirrorDoc(
        { ...newProduct, id: docRef.id },
        partnerData.warehouse as PartnerWarehouse
      );
      await adminDb
        .collection('products')
        .doc(docRef.id)
        .set({ ...mirrorDoc, createdAt: FieldValue.serverTimestamp() }, { merge: true });
    } catch (mirrorErr) {
      console.error('[partner/products] mirror write failed (non-fatal):', mirrorErr);
    }

    return NextResponse.json({
      success: true,
      productId: docRef.id,
      product: { id: docRef.id, ...newProduct },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[partner/products] POST error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
