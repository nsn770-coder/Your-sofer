// ── מבצע SIMCHA — חוקי קופון אירועים ─────────────────────────────────────────
// קובץ ה-config היחיד של המבצע. כיבוי: PROMO_ACTIVE = false + deploy.
// הפונקציה calcSimchaDiscount טהורה — רצה גם בקליינט (CartContext) וגם בשרת
// (app/api/payment/route.ts) על אותם נתונים, כך שאי אפשר לזייף הנחה מהדפדפן.

export const PROMO_ACTIVE = true;
export const SIMCHA_CODE = 'SIMCHA';

export const MIN_KIPPOT_QTY = 50;   // תנאי בסיס: 50+ יחידות מאותו מוצר כיפה
export const MIN_ADDON_QTY = 30;    // מוצר נוסף זכאי רק אם כמותו (לאותו productId) ≥ 30
export const TIER1_DISCOUNT = 0.10; // הקטגוריה עם הסכום הגבוה ביותר
export const TIER2_DISCOUNT = 0.15; // כל שאר הקטגוריות הזכאיות

export interface SimchaItem {
  id: string;
  price: number;
  quantity: number;
  cat?: string;
  /** פריט שכבר במבצע אחר (bundle / 2+1 / sale) — אין כפל מבצעים */
  hasOtherPromo?: boolean;
  /** שיוך לעמוד "כיפות ומזכרות לאירועים" (שדה isEventProduct במוצר) */
  isEventProduct?: boolean;
  /** סקשן בעמוד האירועים (eventScrollSection) — משמש לקיבוץ המדרגות */
  eventSection?: string | null;
}

export interface SimchaResult {
  eligible: boolean;                 // תנאי הבסיס (50 כיפות) מתקיים
  lineDiscounts: Record<string, { percent: number; amount: number }>;
  totalDiscount: number;             // ש"ח שלמים — סכום ה-amounts
  reason: string;                    // הודעה להצגה למשתמש
}

const EMPTY: Omit<SimchaResult, 'reason'> = { eligible: false, lineDiscounts: {}, totalDiscount: 0 };

export function calcSimchaDiscount(items: SimchaItem[]): SimchaResult {
  if (!PROMO_ACTIVE) return { ...EMPTY, reason: 'מבצע SIMCHA אינו פעיל כעת' };

  // ── תנאי בסיס: מוצר כיפה בודד (אותו productId) עם 50+ יחידות ──────────────
  const kippahItems = items.filter(i => i.cat === 'כיפות');
  const maxKippahQty = kippahItems.reduce((m, i) => Math.max(m, i.quantity), 0);
  if (maxKippahQty < MIN_KIPPOT_QTY) {
    const reason = maxKippahQty > 0
      ? `הוסיפו עוד ${MIN_KIPPOT_QTY - maxKippahQty} כיפות מאותו דגם להפעלת המבצע`
      : `המבצע דורש לפחות ${MIN_KIPPOT_QTY} כיפות מאותו דגם בסל`;
    return { ...EMPTY, reason };
  }

  // ── מוצרים נוספים זכאים: משויכים לעמוד האירועים (isEventProduct),
  //    30+ יח' לאותו מוצר, לא כיפות/הדפסה, בלי מבצע אחר ──────────────────────
  const addonItems = items.filter(i =>
    i.isEventProduct === true &&
    i.cat !== 'כיפות' &&
    i.cat !== 'הדפסה' &&
    i.quantity >= MIN_ADDON_QTY &&
    !i.hasOtherPromo &&
    i.price > 0,
  );

  if (addonItems.length === 0) {
    return {
      eligible: true, lineDiscounts: {}, totalDiscount: 0,
      reason: `המבצע פעיל! הוסיפו ${MIN_ADDON_QTY}+ יחידות ממוצר נוסף מקטגוריות האירועים לקבלת הנחה`,
    };
  }

  // ── קיבוץ לפי סקשן בעמוד האירועים (או קטגוריה כגיבוי):
  //    הגבוהה ביותר → TIER1, השאר → TIER2 ─────────────────────────────────────
  // דטרמיניסטי: שובר שוויון לפי סדר א"ב של שם הקבוצה.
  const groupOf = (it: SimchaItem) => it.eventSection || it.cat || 'אחר';
  const catTotals = new Map<string, number>();
  for (const it of addonItems) {
    catTotals.set(groupOf(it), (catTotals.get(groupOf(it)) ?? 0) + it.price * it.quantity);
  }
  let topCat = '';
  let topVal = -1;
  for (const [cat, val] of catTotals) {
    if (val > topVal || (val === topVal && (topCat === '' || cat.localeCompare(topCat, 'he') < 0))) {
      topCat = cat;
      topVal = val;
    }
  }

  const lineDiscounts: SimchaResult['lineDiscounts'] = {};
  let totalDiscount = 0;
  for (const it of addonItems) {
    const percent = groupOf(it) === topCat ? TIER1_DISCOUNT : TIER2_DISCOUNT;
    // עיגול לש"ח שלם ברמת שורה; הסיכום = סכום השורות
    const amount = Math.round(it.price * it.quantity * percent);
    if (amount > 0) {
      lineDiscounts[it.id] = { percent, amount };
      totalDiscount += amount;
    }
  }

  return {
    eligible: true,
    lineDiscounts,
    totalDiscount,
    reason: totalDiscount > 0 ? '🎉 מבצע SIMCHA פעיל!' : `המבצע פעיל! הוסיפו ${MIN_ADDON_QTY}+ יחידות ממוצר נוסף לקבלת הנחה`,
  };
}
