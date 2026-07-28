// ─────────────────────────────────────────────────────────────────────────────
// personalization.ts — מקור אמת יחיד לשאלה "האם למוצר הזה יש התאמה אישית".
//
// ⚠️ למה זה לא פשוט customDesign:
// `customDesign: true` הוא לא דגל כללי של "אפשר לחרוט". הוא מסומן על 4 מוצרי
// כיפות בלבד (ראו app/scripts/setCustomDesign.mjs) ומשמעותו ספציפית: יש כלי
// עיצוב להעלאת לוגו/הדפסה בעמוד /event-kippot. מוצר עם חריטה או רקמה לא נושא
// את הדגל הזה בכלל.
//
// ההתאמה האישית בפועל מגיעה מארבעה מנגנונים נפרדים שכבר קיימים בקוד:
//   1. customDesign            → עיצוב והדפסה של כיפה (כלי העלאת קובץ)
//   2. EMBROIDERY_CATEGORIES   → רקמה אישית ₪50   (ProductClient)
//   3. EMBOSSING_CATEGORIES    → הטבעת שם ₪15     (ProductClient)
//   4. addons עם requiresText  → הקדשה / שם פר-מוצר
//
// ⚠️ הרשימות כאן חייבות להישאר תואמות ל-EMBROIDERY_CATEGORIES ול-
//    EMBOSSING_CATEGORIES ב-ProductClient.tsx. אם משנים שם — משנים כאן.
// ─────────────────────────────────────────────────────────────────────────────

import type { ProductAddon } from './types';

/** KEEP IN SYNC with EMBROIDERY_CATEGORIES ב-ProductClient.tsx */
const EMBROIDERY_CATEGORIES = [
  'כיסוי טלית', 'סט טלית תפילין', 'בר מצווה', 'סט לבר מצוה', 'סט לחתן', 'תיקי טלית ותפילין',
];

/** KEEP IN SYNC with EMBOSSING_CATEGORIES ב-ProductClient.tsx (בדיקת includes) */
const EMBOSSING_CATEGORIES = ['ספרי קודש וסידורים'];

export interface PersonalizationFields {
  cat?: string;
  customDesign?: boolean;
  isEventKippot?: boolean;
  addons?: ProductAddon[] | null;
}

export type PersonalizationKind = 'print' | 'embroidery' | 'embossing' | 'dedication';

export interface Personalization {
  kind: PersonalizationKind;
  /** נוסח מלא לבאדג' בעמוד המוצר */
  badgeLabel: string;
  /** נוסח קצר לתגית בכרטיס המוצר */
  tagLabel: string;
}

/**
 * מחזיר את סוג ההתאמה האישית של המוצר, או null אם אין.
 * הסדר מכוון: המנגנון הספציפי ביותר גובר, כדי שהנוסח יהיה מדויק ולא כללי.
 */
export function getPersonalization(p: PersonalizationFields | null | undefined): Personalization | null {
  if (!p) return null;
  const cat = p.cat ?? '';

  if (p.customDesign === true || p.isEventKippot === true) {
    return {
      kind: 'print',
      badgeLabel: '🎨 ניתן לעצב ולהדפיס עיצוב אישי',
      tagLabel: 'עיצוב אישי',
    };
  }

  if (EMBROIDERY_CATEGORIES.includes(cat)) {
    return {
      kind: 'embroidery',
      badgeLabel: '✏️ ניתן להוסיף רקמת שם אישית',
      tagLabel: 'רקמה אישית',
    };
  }

  if (EMBOSSING_CATEGORIES.some(c => cat.includes(c))) {
    return {
      kind: 'embossing',
      badgeLabel: '✏️ ניתן להוסיף הטבעת שם או הקדשה',
      tagLabel: 'הטבעה אישית',
    };
  }

  if (p.addons?.some(a => a.requiresText)) {
    return {
      kind: 'dedication',
      badgeLabel: '✏️ ניתן להוסיף חריטה / הקדשה אישית',
      tagLabel: 'הקדשה אישית',
    };
  }

  return null;
}
