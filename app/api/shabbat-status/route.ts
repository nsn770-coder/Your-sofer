/**
 * GET /api/shabbat-status
 * מחזיר את מצב החנות (סגור בשבת/חג או פתוח) + זמני פתיחה/סגירה.
 * הלקוח בצ'קאאוט קורא לזה כדי להסתיר את טופס התשלום — החסימה עצמה
 * נאכפת בצד שרת ב-/api/payment.
 */
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getShabbatStatus } from '@/app/lib/shabbatClock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // מתג כיבוי ידני לאוטומציה (ברירת מחדל: פעיל)
  let autoClose = true;
  try {
    const snap = await getAdminDb().collection('siteSettings').doc('global').get();
    if (snap.exists && snap.data()?.shabbatAutoClose === false) autoClose = false;
  } catch (e) {
    console.error('[shabbat-status] settings read failed (non-fatal):', e);
  }

  const status = getShabbatStatus();
  const body = autoClose ? status : { ...status, closed: false, message: '', disabled: true };

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  });
}
