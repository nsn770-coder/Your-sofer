/**
 * orderChecklist — סדר השלבים בטיפול בהזמנה, כרשימת צ'קליסט.
 *
 * הרעיון: אי אפשר לקפוץ שלב. בכל רגע נתון ניתן לסמן רק את השלב הבא בתור,
 * וכך אף שלב (למשל ספירת הכמויות בשקית) לא נשכח.
 *
 * שני מסלולים:
 *   מלא   — הזמנה עם עיצוב אישי / הדפסה: כולל הדמיה, קובץ לדפוס ובית דפוס.
 *   מקוצר — הזמנה של מוצרים רגילים: ישר לספירה, אריזה ומשלוח.
 *
 * ⚠️ ערכי הסטטוס חייבים להישאר תואמים ל-ORDER_STATUSES ב-app/admin/page.tsx
 *    ול-STATUS_LABELS ב-app/lib/orderStatus.ts.
 */

export interface ChecklistStep {
  value: string;
  label: string;
  /** הסבר קצר לעובדת — מה בדיוק צריך לעשות בשלב הזה */
  hint?: string;
}

/** הסטטוס ההתחלתי — הזמנה ששולמה ועוד לא טופלה. אינו שלב לסימון. */
export const START_STATUS = 'paid';

/** סטטוסים שמחוץ לתהליך — ניתן להגדיר אותם בכל רגע, והם עוצרים את הצ'קליסט */
export const OUT_OF_FLOW_STATUSES = ['needs_care', 'abandoned', 'cancelled'];

/** המסלול המלא — הזמנה עם עיצוב אישי / הדפסה */
export const FULL_FLOW: ChecklistStep[] = [
  { value: 'proof_sent',       label: '🎨 הדמיה נשלחה',          hint: 'ההדמיה נשלחה ללקוח לאישור' },
  { value: 'proof_approved',   label: '👍 הדמיה אושרה',          hint: 'הלקוח אישר את ההדמיה בכתב' },
  { value: 'print_file_ready', label: '📄 קובץ לדפוס מוכן',      hint: 'הקובץ הסופי מוכן בגודל ובפורמט הנכונים' },
  { value: 'at_printer',       label: '🖨️ נשלח לבית דפוס',      hint: 'הקובץ והכמות נשלחו לבית הדפוס' },
  { value: 'from_printer',     label: '📥 נאסף מבית דפוס',       hint: 'הסחורה נאספה ונבדקה מול ההזמנה' },
  { value: 'personalization',  label: '✍️ ייצור אישי הסתיים',   hint: 'רקמה / הטבעה / התאמה אישית הושלמו' },
  { value: 'counted',          label: '🔢 נספרו כמויות בשקית',  hint: 'ספירה בפועל מול הכמות בהזמנה — שלב חובה' },
  { value: 'bagged',           label: '🎒 השקית נסגרה',          hint: 'השקית נסגרה אחרי הספירה' },
  { value: 'label_printed',    label: '🏷️ מדבקת משלוח הודפסה', hint: 'המדבקה הודפסה והודבקה על השקית' },
  { value: 'ready_to_ship',    label: '📦 מוכן למשלוח',          hint: 'החבילה ממתינה לאיסוף' },
  { value: 'shipped',          label: '🚚 יצא במשלוח',           hint: 'נמסר לשליח ויש מספר מעקב' },
  { value: 'completed',        label: '🏁 הושלם',               hint: 'ההזמנה הגיעה ללקוח' },
];

/** המסלול המקוצר — מוצרים רגילים, בלי הדמיה ובלי דפוס */
const SIMPLE_KEYS = new Set([
  'counted', 'bagged', 'label_printed', 'ready_to_ship', 'shipped', 'completed',
]);

export const SIMPLE_FLOW: ChecklistStep[] = FULL_FLOW.filter(s => SIMPLE_KEYS.has(s.value));

export interface ChecklistOrderLike {
  status?: string;
  items?: Array<{
    cat?: string | null;
    printCustomization?: unknown;
    customDesign?: unknown;
    embroideryText?: string | null;
    embossingText?: string | null;
    embroideryOptions?: string[] | null;
  }>;
}

/** הזמנה עם עיצוב אישי / הדפסה — מזוהה לפי הפריטים עצמם */
export function isCustomOrder(order: ChecklistOrderLike): boolean {
  return (order.items ?? []).some(it =>
    !!it.printCustomization ||
    !!it.customDesign ||
    !!it.embroideryText ||
    !!it.embossingText ||
    (it.embroideryOptions?.length ?? 0) > 0 ||
    it.cat === 'הדפסה',
  );
}

/** רשימת השלבים הרלוונטית להזמנה הזו */
export function stepsForOrder(order: ChecklistOrderLike): ChecklistStep[] {
  return isCustomOrder(order) ? FULL_FLOW : SIMPLE_FLOW;
}

/** האם הסטטוס נמצא מחוץ לתהליך (דורש טיפול / נטוש / בוטל) */
export function isOutOfFlow(status: string | undefined): boolean {
  return !!status && OUT_OF_FLOW_STATUSES.includes(status);
}

/**
 * כמה שלבים כבר הושלמו. סטטוס שאינו ברשימה (הזמנה ישנה, או מחוץ לתהליך)
 * מחזיר 0 — הצ'קליסט לא ינחש עבורו.
 */
export function completedCount(steps: ChecklistStep[], status: string | undefined): number {
  if (!status || status === START_STATUS) return 0;
  const idx = steps.findIndex(s => s.value === status);
  return idx === -1 ? 0 : idx + 1;
}

/** השלב הבא שמותר לסמן — null כשהתהליך הושלם */
export function nextStep(steps: ChecklistStep[], status: string | undefined): ChecklistStep | null {
  const done = completedCount(steps, status);
  return done < steps.length ? steps[done] : null;
}

/** לאן חוזרים כשמבטלים את הסימון האחרון */
export function previousStatus(steps: ChecklistStep[], status: string | undefined): string {
  const done = completedCount(steps, status);
  if (done <= 1) return START_STATUS;
  return steps[done - 2].value;
}

/**
 * האם הסטטוס הנוכחי מוכר לצ'קליסט. סטטוסים ישנים (magiah/sofer/packing…)
 * אינם — ועליהם ממשיכים לעבוד עם הרשימה הנפתחת הישנה.
 */
export function isKnownFlowStatus(steps: ChecklistStep[], status: string | undefined): boolean {
  if (!status) return false;
  return status === START_STATUS || steps.some(s => s.value === status);
}
