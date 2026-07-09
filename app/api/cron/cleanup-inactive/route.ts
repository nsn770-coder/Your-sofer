import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Cron: מחיקה אוטומטית של מוצרים שהוסרו ─────────────────────────────────────
// רץ יומית (מוגדר ב-vercel.json). מוחק לצמיתות מוצרים בסטטוס 'inactive' בלבד:
//  - drafts לא נמחקים (ייבואים חדשים נוצרים כ-draft וממתינים להפעלה)
//  - hidden עם status=active לא נמחקים (הסתרה זמנית מכוונת)
// כלומר: כדי שמוצר יימחק אוטומטית — סמן אותו status='inactive' באדמין/סקריפט.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: (process.env.FIREBASE_CLIENT_EMAIL ?? '').trim(),
        privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
      }),
    });
  }
  const db = getFirestore();

  // שליפה ממוקדת — רק inactive (בלי סריקת כל הקולקציה)
  const snap = await db.collection('products').where('status', '==', 'inactive').get();
  const ids = snap.docs.map(d => d.id);

  // מחיקה ב-batches של 500
  for (let i = 0; i < ids.length; i += 500) {
    const batch = db.batch();
    for (const id of ids.slice(i, i + 500)) {
      batch.delete(db.collection('products').doc(id));
    }
    await batch.commit();
  }

  // ניקוי מקביל מאינדקס Algolia (אם מוגדר) — כדי שלא יופיעו בחיפוש באתר
  let algoliaCleaned = 0;
  try {
    const appId = process.env.ALGOLIA_APP_ID ?? '';
    const key = process.env.ALGOLIA_ADMIN_KEY ?? '';
    if (appId && key && ids.length) {
      const { algoliasearch } = await import('algoliasearch');
      const client = algoliasearch(appId, key);
      await client.deleteObjects({ indexName: 'products', objectIDs: ids });
      algoliaCleaned = ids.length;
    }
  } catch (err) {
    console.warn('[cleanup-inactive] Algolia warn:', err);
  }

  console.log(`[cleanup-inactive] deleted ${ids.length} inactive products (algolia: ${algoliaCleaned})`);
  return NextResponse.json({
    deleted: ids.length,
    deletedIds: ids.slice(0, 100),
    algoliaCleaned,
    ranAt: new Date().toISOString(),
  });
}
