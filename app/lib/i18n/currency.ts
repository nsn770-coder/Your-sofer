// ─────────────────────────────────────────────────────────────────────────────
// המרת מטבע — לתצוגה בלבד
//
// ⚠️ כלל ברזל: החיוב בפועל תמיד בשקלים, דרך Sumit. הקובץ הזה לא נוגע
// בשום סכום שנשלח לסליקה, להזמנה, לחשבונית או לחישובי הרווחיות — הוא רק
// מוסיף שורת "בערך $X" לצד המחיר, כדי שלקוח מחו"ל יבין כמה זה עולה לו.
// כל שימוש אחר בערכים כאן הוא באג.
// ─────────────────────────────────────────────────────────────────────────────

export type CurrencyCode = 'ILS' | 'USD' | 'EUR' | 'RUB' | 'GBP';

/** מטבע התצוגה המשני לכל שפה. עברית = בלי המרה (המחיר כבר במטבע שלה) */
export const CURRENCY_BY_LOCALE: Record<string, CurrencyCode | null> = {
  he: null,
  en: 'USD',
  fr: 'EUR',
  es: 'EUR',
  ru: 'RUB',
};

/**
 * שערים אחרונים ידועים — משמשים כרשת ביטחון בלבד, אם קריאת ה-API נכשלת.
 * מכוונים בכוונה נמוך-משמעותית מהשער האמיתי כדי שהערכה לא תיראה זולה
 * מהמחיר בפועל. עודכן: אוגוסט 2026.
 */
export const FALLBACK_RATES: Record<CurrencyCode, number> = {
  ILS: 1,
  USD: 0.33,
  EUR: 0.29,
  GBP: 0.24,
  RUB: 28.0,
};

export type FxRates = Partial<Record<CurrencyCode, number>>;

/**
 * פורמט סכום מומר לתצוגה. מחזיר null כשאין מה להציג
 * (עברית, שער חסר, או סכום אפס) — כדי שהקורא פשוט לא ירנדר כלום.
 */
export function formatApprox(
  amountIls: number,
  locale: string,
  rates: FxRates | null,
): string | null {
  const currency = CURRENCY_BY_LOCALE[locale];
  if (!currency || currency === 'ILS') return null;
  if (!Number.isFinite(amountIls) || amountIls <= 0) return null;

  const rate = rates?.[currency] ?? FALLBACK_RATES[currency];
  if (!rate || !Number.isFinite(rate)) return null;

  const converted = amountIls * rate;
  // רובל מוצג בשלמים — אגורות ברובל הן רעש חסר משמעות
  const fractionDigits = currency === 'RUB' ? 0 : 2;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(converted);
  } catch {
    return `${converted.toFixed(fractionDigits)} ${currency}`;
  }
}
