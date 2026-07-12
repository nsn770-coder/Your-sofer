/**
 * whatsapp.ts — פונקציה מרכזית אחת לבניית קישורי וואטסאפ בכל האתר.
 *
 * אין להקשיח קישורי wa.me ברכיבים. כל רכיב שצריך קישור וואטסאפ —
 * מייבא buildWhatsAppLink (ואופציונלית טקסט מוכן מ-WA_PREFILL).
 * המספר נגזר ממקור האמת היחיד: BUSINESS.whatsappHref ב-siteTrust.ts.
 * הקישור בפורמט wa.me נפתח תקין גם במובייל וגם בדסקטופ (WhatsApp Web).
 */

import { BUSINESS } from '@/app/config/siteTrust';

/** המספר הבינלאומי, נגזר מ-siteTrust (ללא + וללא רווחים) */
export const WA_NUMBER: string = BUSINESS.whatsappHref.replace(/\D/g, '');

/** בונה קישור וואטסאפ תקין, עם טקסט מוכן מראש אופציונלי */
export function buildWhatsAppLink(prefillText?: string): string {
  const base = `https://wa.me/${WA_NUMBER}`;
  if (!prefillText) return base;
  return `${base}?text=${encodeURIComponent(prefillText)}`;
}

/** טקסטים מוכנים מראש לפי הקשר — לשימוש בכפתורי CTA באתר ובבוט */
export const WA_PREFILL = {
  general: 'שלום, אשמח לעזרה ופרטים נוספים',
  velvetQuote: 'שלום, אשמח לקבל הצעת מחיר לכיפות קטיפה עם הדפסה. הכמות המבוקשת היא: ',
  urgentOrder: 'שלום, אני צריך/ה כיפות מודפסות בדחיפות לתאריך: ___. הכמות המבוקשת היא: ',
  orderStatus: 'שלום, אשמח לבדוק את סטטוס ההזמנה שלי. קוד ההזמנה: ',
  stamAdvice: 'שלום, אשמח לקבל ייעוץ לפני רכישת מוצר סת״ם',
  dedicationHelp: 'שלום, אשמח לעזרה בהכנת הקדשה או עיצוב אישי למוצר',
  kippotQuote: 'שלום, אשמח לקבל פרטים על כיפות בהדפסה אישית. הכמות המבוקשת היא: ',
} as const;

export type WaPrefillKey = keyof typeof WA_PREFILL;
