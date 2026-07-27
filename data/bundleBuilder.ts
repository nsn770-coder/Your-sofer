// ─────────────────────────────────────────────────────────────────────────────
// bundleBuilder.ts — הגדרת "בנה מארז משלך" (מארז סט חתנים).
//
// שני אתרי הייחוס בנישה מציגים בונה מארזים במקום בולט:
// rikmat.com — "הרכיבו את המארז שלכם" עם 15% הנחה, באנר באמצע דף הבית.
// vehidarta.com — "בנה את המארז בעצמך" מסומן NEW בתפריט הראשי.
// ─────────────────────────────────────────────────────────────────────────────

import type { CategoryFilter } from './lifeEvents';

/**
 * ⚠️ אחוז הנחת המארז — **השורה היחידה לשינוי** אם תרצה אחוז אחר.
 * ההנחה חלה על סכום המוצרים בלבד, לא על תוספות הרקמה/הטבעה/הדפס
 * (אלה עלויות עבודה בפועל, לא מרווח).
 */
export const BUNDLE_DISCOUNT_PCT = 10;

/**
 * ⚠️ KEEP IN SYNC with ProductClient.tsx:
 *   embroidery → EMB_OPTION_PRICE (₪50)
 *   embossing  → EMBOSSING_PRICE  (₪15)
 * מחיר שונה כאן מזה שבעמוד המוצר = אותו לקוח רואה שני מחירים לאותה עבודה.
 */
export const ADDON_PRICES = {
  /** הדפס — חלופה זולה לרקמה. קיים רק בבונה המארזים. */
  print: 5,
  embroidery: 50,
  embossing: 15,
} as const;

export type StepId = 'cover' | 'personalization' | 'tallit' | 'siddur';

export interface BundleStep {
  id: StepId;
  /** כותרת השלב בסרגל ההתקדמות */
  label: string;
  title: string;
  subtitle: string;
  /** מאיפה נשלפים המוצרים. null = שלב בחירת תוספת, לא מוצר. */
  source: CategoryFilter[] | null;
}

export const BUNDLE_STEPS: BundleStep[] = [
  {
    id: 'cover',
    label: 'כיסוי',
    title: 'בחרו כיסוי לטלית ולתפילין',
    subtitle: 'הבסיס של המארז — בחרו את הדגם והצבע שמדברים אליכם',
    source: [
      { category: 'תיקי טלית ותפילין', subCategories: 'all' },
      { category: 'סט טלית תפילין', subCategories: 'all' },
    ],
  },
  {
    id: 'personalization',
    label: 'שם אישי',
    title: 'להוסיף שם על הכיסוי?',
    subtitle: 'הדפס או רקמה — השם שהופך את המארז למתנה אישית',
    source: null,
  },
  {
    id: 'tallit',
    label: 'טלית',
    title: 'בחרו טלית',
    subtitle: 'טלית צמר מהודרת שתלווה שנים',
    source: [{ category: 'טליתות וציציות', subCategories: 'all' }],
  },
  {
    id: 'siddur',
    label: 'סידור',
    title: 'בחרו סידור',
    subtitle: 'לסיום — סידור תפילה, עם אפשרות להטבעת שם',
    source: [{ category: 'ספרי קודש וסידורים', subCategories: 'all' }],
  },
];

/** מקור מאוחד לשליפה שרתית אחת של כל הקטגוריות שהבונה צריך */
export const ALL_BUNDLE_CATEGORIES: CategoryFilter[] = BUNDLE_STEPS
  .flatMap(s => s.source ?? []);

export const BUNDLE_META = {
  route: '/build',
  name: 'מארז חתנים בהתאמה אישית',
  heroTitle: 'בנו את מארז החתנים שלכם',
  heroSubtitle: 'כיסוי, רקמה, טלית וסידור — אתם בוחרים כל פריט, אנחנו אורזים מארז אחד מהודר',
  /** cat שנשמר על פריט הסל — לצורכי דוחות ולקיטה */
  cartCat: 'מארזים',
} as const;
