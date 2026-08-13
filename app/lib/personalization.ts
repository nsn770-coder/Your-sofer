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
// ✅ הקובץ הזה הוא מקור האמת היחיד — ProductClient.tsx מייבא מכאן את
//    isEmbroideryEligible / isEmbossingEligible ואין בו יותר רשימות משוכפלות.
//
// ⚠️ קטגוריה לבדה לא מספיקה: מוצר שנכנסים אליו מעמוד מרצ'נדייז (למשל ברכון
//    תחת "מזכרות לאירועים") נושא cat שיווקי ולא cat של ספרים, ולכן איבד את
//    ההטבעה. לכן הבדיקה רצה גם על subCat ועל שם המוצר.
// ─────────────────────────────────────────────────────────────────────────────

import type { ProductAddon } from './types';

const EMBROIDERY_CATEGORIES = [
  'כיסוי טלית', 'סט טלית תפילין', 'בר מצווה', 'סט לבר מצוה', 'סט לחתן', 'תיקי טלית ותפילין',
];

/** פריטי בד שיושבים תחת "שבת" ולא תחת קטגוריות הרקמה — כיסויי חלה וסטי הפרשה. */
const EMBROIDERY_KEYWORDS = ['הפרשת חלה', 'כיסוי חלה', 'כיסוי לחלה', 'מפת חלה'];

/** גרסאות נייר/חוברת של "הפרשת חלה" — אין על מה לרקום. */
const EMBROIDERY_EXCLUDE = ['כרטיס', 'מתקפל', 'ספרי קודש', 'ספרון', 'סדר הפרשת'];

const EMBOSSING_CATEGORIES = ['ספרי קודש וברכונים'];

/** ספרים כרוכים שניתן להטביע עליהם, בכל קטגוריה שהיא. */
const EMBOSSING_KEYWORDS = [
  'ברכון', 'ברכונים', 'זמירות', 'מזמור', 'סידור', 'סדור',
  'תהילים', 'תהלים', 'חומש', 'מחזור', 'הגדה', 'ברכת המזון',
];

/**
 * חוסמים הטבעה על כל מה שאינו ספר כרוך.
 * הקטלוג מלא בפריטים ששמם מכיל "ברכון" או "מזמור לתודה" אך הם מעמד, מגנט,
 * מחזיק מפתחות או תמונת אקריליק — אי אפשר להטביע עליהם, והכפתור שם הוא באג.
 * כמו כן סת"ם נכתב ולא מודפס, ולכן נחסם במפורש.
 */
const EMBOSSING_EXCLUDE = [
  // סת"ם
  'ספר תורה', 'מגילת אסתר', 'מגילה',
  // מעמדים ומחזיקים
  'מעמד', 'סטנד', 'מתקן', 'מחזיק מפתחות', 'תיק',
  // חומרים קשיחים / תלייה / נוי
  'אקריליק', 'אקרילי', 'פרספקס', 'זכוכית', 'קריסטל', 'לוסייט', 'פולימר',
  'מסגרת', 'תמונה', 'קנווס', 'בלוק', 'מגנט', 'לתלייה', 'לתליה',
  'חמסה', 'סגולה', 'תוף', 'מעץ', 'ממתכת', 'פלקטה',
];

export interface PersonalizationFields {
  cat?: string;
  /** אופציונליים — משפרים את הדיוק כשהם קיימים, ולא נדרשים כשלא. */
  subCat?: string;
  name?: string;
  customDesign?: boolean;
  isEventKippot?: boolean;
  addons?: ProductAddon[] | null;
}

const haystack = (p: PersonalizationFields) =>
  `${p.cat ?? ''} ${p.subCat ?? ''} ${p.name ?? ''}`;

/** רקמה אישית — ₪50. */
export function isEmbroideryEligible(p: PersonalizationFields | null | undefined): boolean {
  if (!p) return false;
  if (EMBROIDERY_CATEGORIES.includes(p.cat ?? '')) return true;
  const h = haystack(p);
  if (EMBROIDERY_EXCLUDE.some(k => h.includes(k))) return false;
  return EMBROIDERY_KEYWORDS.some(k => h.includes(k));
}

/** הטבעת שם — ₪15 ליחידה או ₪130 לכל הכמות. */
export function isEmbossingEligible(p: PersonalizationFields | null | undefined): boolean {
  if (!p) return false;
  const h = haystack(p);
  if (EMBOSSING_EXCLUDE.some(k => h.includes(k))) return false;
  if (EMBOSSING_CATEGORIES.some(c => (p.cat ?? '').includes(c))) return true;
  return EMBOSSING_KEYWORDS.some(k => h.includes(k));
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

  if (p.customDesign === true || p.isEventKippot === true) {
    return {
      kind: 'print',
      badgeLabel: '🎨 ניתן לעצב ולהדפיס עיצוב אישי',
      tagLabel: 'עיצוב אישי',
    };
  }

  if (isEmbroideryEligible(p)) {
    return {
      kind: 'embroidery',
      badgeLabel: '✏️ ניתן להוסיף רקמת שם אישית',
      tagLabel: 'רקמה אישית',
    };
  }

  if (isEmbossingEligible(p)) {
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
