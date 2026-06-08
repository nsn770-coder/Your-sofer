import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Vercel Cron sends the secret in the Authorization header
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  const { getFirestore }                  = await import('firebase-admin/firestore');

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: (process.env.FIREBASE_CLIENT_EMAIL ?? '').trim(),
        privateKey:  (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
      }),
    });
  }

  const db = getFirestore();
  const snap = await db.collection('products').get();

  const toMark:   { id: string; salePrice: number; origPrice: number }[] = [];
  const toRemove: string[] = [];

  snap.forEach(docSnap => {
    const p = docSnap.data();
    if (typeof p.inStock !== 'number') return;

    const hasCleared = p.clearanceDiscount === true;

    if (p.inStock > 0 && !hasCleared) {
      toMark.push({
        id: docSnap.id,
        salePrice: Math.round(p.price * 0.9 * 100) / 100,
        origPrice: p.price,
      });
    } else if (p.inStock === 0 && hasCleared) {
      toRemove.push(docSnap.id);
    }
  });

  const BATCH = 400;
  const now   = new Date();

  const markOps   = toMark.map(p => ({ id: p.id, data: { clearanceDiscount: true,  clearanceSalePrice: p.salePrice, originalPrice: p.origPrice, lastInventoryCheck: now } }));
  const removeOps = toRemove.map(id => ({ id, data: { clearanceDiscount: false, clearanceSalePrice: null, originalPrice: null, lastInventoryCheck: now } }));
  const allOps    = [...markOps, ...removeOps];

  for (let i = 0; i < allOps.length; i += BATCH) {
    const batch = db.batch();
    allOps.slice(i, i + BATCH).forEach(op => batch.update(db.collection('products').doc(op.id), op.data as Record<string, unknown>));
    await batch.commit();
  }

  return NextResponse.json({
    ok: true,
    marked:  toMark.length,
    removed: toRemove.length,
    at: now.toISOString(),
  });
}
