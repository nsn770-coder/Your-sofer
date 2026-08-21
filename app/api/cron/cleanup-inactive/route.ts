import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Cron: ארכוב מוצרים שהוסרו ─────────────────────────────────────────────────
// רץ יומית (מוגדר ב-vercel.json). מטפל במוצרים בסטטוס 'inactive' בלבד:
//  - drafts לא נוגעים בהם (ייבואים חדשים נוצרים כ-draft וממתינים להפעלה)
//  - hidden עם status=active לא נוגעים בהם (הסתרה זמנית מכוונת)
//
// ⚠️ עד 08/2026 הקרון *מחק לצמיתות* את המסמכים מ-Firestore. זה שבר את
// היסטוריית ההזמנות: שורת פריט בהזמנה מצביעה ל-productId, וכשהמוצר נמחק
// דוח הרווחיות עושה `if (!product) return` ומעלים את השורה. נמצאו 34 שורות
// כאלה ששוות ₪5,910 הכנסה שפשוט נעלמה מהדוחות.
//
// עכשיו המסמך נשאר ב-Firestore ומסומן ב-archivedAt, ורק נמחק מאינדקס
// Algolia. הלקוחות לא רואים אותו כך או כך — כל מסכי החנות מסננים
// status='inactive' ממילא — אבל ההזמנות הישנות ממשיכות להתחשבן נכון.
//
// למה נשאר status='inactive' ולא סטטוס 'archived' חדש: חמישה מסכי חנות
// מסננים ברשימת-איסור (`p.status !== 'inactive'`) ולא ברשימת-היתר —
// EventSouvenirsBrowser · EventKippotClient · ShabbatHolidaysClient ·
// ChatCartBridge · api/chat/_lib/serialize. סטטוס חדש היה *מחזיר אותם
// לתצוגה* בדיוק במקומות האלה. אל תשנה את זה בלי לעבור על חמשתם.
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

  const { FieldValue } = await import('firebase-admin/firestore');

  // שליפה ממוקדת — רק inactive (בלי סריקת כל הקולקציה)
  const snap = await db.collection('products').where('status', '==', 'inactive').get();
  // מי שכבר אורכב בריצה קודמת — מדלגים. אי אפשר לשאול על שדה חסר ב-Firestore,
  // ולכן מסננים כאן; קבוצת ה-inactive קטנה (עשרות) והקריאה זולה.
  const ids = snap.docs.filter(d => !d.data().archivedAt).map(d => d.id);

  // סימון כמאורכב — בלי למחוק. ב-batches של 500.
  for (let i = 0; i < ids.length; i += 500) {
    const batch = db.batch();
    for (const id of ids.slice(i, i + 500)) {
      batch.update(db.collection('products').doc(id), {
        archivedAt: FieldValue.serverTimestamp(),
      });
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
      // מ-Algolia כן מוחקים — שם אין ערך היסטורי, רק חיפוש חי
      await client.deleteObjects({ indexName: 'products', objectIDs: ids });
      algoliaCleaned = ids.length;
    }
  } catch (err) {
    console.warn('[cleanup-inactive] Algolia warn:', err);
  }

  console.log(`[cleanup-inactive] archived ${ids.length} inactive products (algolia: ${algoliaCleaned})`);
  return NextResponse.json({
    archived: ids.length,
    archivedIds: ids.slice(0, 100),
    algoliaCleaned,
    ranAt: new Date().toISOString(),
  });
}
