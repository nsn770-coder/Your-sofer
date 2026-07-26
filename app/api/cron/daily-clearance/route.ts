import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
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

  const db   = getFirestore();
  const snap = await db.collection('products').get();
  const now  = new Date();

  const toMark:   { id: string; salePrice: number; origPrice: number; name: string }[] = [];
  const toRemove: { id: string; name: string }[] = [];

  snap.forEach(docSnap => {
    const p = docSnap.data();

    // Only numeric inStock is reliable
    if (typeof p.inStock !== 'number') return;

    const hasCleared = p.clearanceDiscount === true;

    const eligible =
      p.price > 40 &&
      p.inStock >= 1 &&
      p.source === 'israel-judaica' &&
      !hasCleared;

    if (eligible) {
      toMark.push({
        id:        docSnap.id,
        name:      p.name ?? '',
        // Whole shekels only (pricing-integrity): no agorot in clearanceSalePrice
        salePrice: Math.round(p.price * 0.9),
        origPrice: p.price,
      });
    } else if (p.inStock <= 0 && hasCleared) {
      toRemove.push({ id: docSnap.id, name: p.name ?? '' });
    }
  });

  console.log(`[daily-clearance] ${toMark.length} מוצרים נכנסו ל-clearance (price > 40, source=israel-judaica)`);
  console.log(`[daily-clearance] ${toRemove.length} מוצרים יצאו מ-clearance (inStock <= 0)`);
  if (toMark.length)   toMark.slice(0, 5).forEach(p => console.log(`  + ${p.name} ₪${p.origPrice} → ₪${p.salePrice}`));
  if (toRemove.length) toRemove.slice(0, 5).forEach(p => console.log(`  - ${p.name}`));

  const BATCH = 400;
  const markOps = toMark.map(p => ({
    id:   p.id,
    data: { clearanceDiscount: true,  clearanceSalePrice: p.salePrice, originalPrice: p.origPrice, lastInventoryCheck: now },
  }));
  const removeOps = toRemove.map(p => ({
    id:   p.id,
    data: { clearanceDiscount: false, clearanceSalePrice: null, originalPrice: null, lastInventoryCheck: now },
  }));
  const allOps = [...markOps, ...removeOps];

  for (let i = 0; i < allOps.length; i += BATCH) {
    const batch = db.batch();
    allOps.slice(i, i + BATCH).forEach(op =>
      batch.update(db.collection('products').doc(op.id), op.data as Record<string, unknown>)
    );
    await batch.commit();
  }

  return NextResponse.json({
    ok:      true,
    marked:  toMark.length,
    removed: toRemove.length,
    message: `${toMark.length} מוצרים נכנסו ל-clearance (price > 40) | ${toRemove.length} מוצרים יצאו מ-clearance (inStock <= 0)`,
    at:      now.toISOString(),
  });
}
