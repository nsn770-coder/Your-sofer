import { NextResponse } from 'next/server';
import { FALLBACK_RATES, type CurrencyCode } from '@/app/lib/i18n/currency';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/fx — שערי חליפין משקל, לתצוגה בלבד.
//
// המקור (open.er-api.com) חינמי, ללא מפתח, ומתעדכן פעם ביום. אנחנו מבקשים
// ממנו לכל היותר פעם ב-6 שעות דרך קאש ה-fetch של Next, כך שהעומס עליו זניח
// וזמן התגובה ללקוח הוא של קובץ סטטי.
//
// כשל בקריאה לא שובר כלום: מוחזרים שערי ה-fallback עם stale:true, והלקוח
// ממשיך להציג הערכה סבירה. אף פעם לא מוחזרת שגיאה — זו תצוגה משנית.
// ─────────────────────────────────────────────────────────────────────────────

const WANTED: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'RUB'];
const TTL_SECONDS = 60 * 60 * 6;

export const revalidate = 21600; // 6h

export async function GET() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/ILS', {
      next: { revalidate: TTL_SECONDS },
    });
    if (!res.ok) throw new Error(`fx upstream ${res.status}`);

    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (data.result !== 'success' || !data.rates) throw new Error('fx upstream payload');

    const rates: Record<string, number> = { ILS: 1 };
    for (const c of WANTED) {
      const v = data.rates[c];
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) rates[c] = v;
    }
    // אם משום מה לא חזר אף שער שימושי — עדיף fallback מאשר אובייקט ריק
    if (Object.keys(rates).length <= 1) throw new Error('fx upstream empty');

    return NextResponse.json(
      { rates, stale: false },
      { headers: { 'Cache-Control': `public, s-maxage=${TTL_SECONDS}, stale-while-revalidate=86400` } },
    );
  } catch (e) {
    console.error('[api/fx] falling back to static rates:', e);
    return NextResponse.json(
      { rates: FALLBACK_RATES, stale: true },
      { headers: { 'Cache-Control': 'public, s-maxage=300' } },
    );
  }
}
