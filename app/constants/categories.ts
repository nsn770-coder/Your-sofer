// app/constants/categories.ts

export const CATS = [
  'הכל',
  'בתי מזוזה',
  'תפילין קומפלט',
  'טליתות',
  'מגילות',
  'ספרי תורה',
  'יודאיקה',
  'חגים',
  'יודאיקה כללי',
  'מתנות',
  'בר מצווה',
  'קלפים',
  'קלפי מזוזה',
  'קלפי תפילין',
  'כיפות',
  'ספרי קודש וברכונים',
  'תיקי טלית ותפילין',
];

/**
 * תת-הקטגוריה של כיפות לאירועים (הדפסה אישית / מזכרות).
 * מקור אמת יחיד — משמש את טופס האדמין, עמוד הקטגוריה והתפריט.
 * מוצרים עם הערך הזה מוצגים גם אם הם מסומנים eventsOnly.
 */
export const EVENT_KIPPOT_SUBCAT = 'כיפות לאירועים';

export const SUB_CATS: Record<string, string[]> = {
  'טליתות':               ['טלית קטן', 'טלית צמר', 'סט טלית תפילין'],
  // 'ברכונים' הוסרה (07/2026): התת-קטגוריה הכילה 273 פריטים שרק 15 מהם היו
  // חוברות ברכונים. החוברות עברו ל'ספרי קודש וברכונים', והשאר פוצל למטה.
  'יודאיקה':              ['נטילת ידיים', 'שבת', 'חנוכה', 'פסח', 'סטים ומארזים', 'ברכות לתלייה', 'מעמדים וסטנדים', 'יודאיקה כללי'],
  'חגים':                 ['חנוכה', 'פסח', 'סוכות', 'פורים', 'ראש השנה', 'דבשיות לראש השנה', 'צלחות סימני ראש השנה', 'סכיני חלה לראש השנה'],
  'בר מצווה':             ['סטים לבר מצווה', 'תפילין קומפלט', 'טליתות', 'מתנות לבר מצווה'],
  // כיפות — הערכים תואמים ל-subCategory הקיים ב-Firestore (ראה scripts/createKippotSubcategories.mjs).
  // 'כיפות לאירועים' (08/2026) מרכזת את הכיפות בהדפסה אישית שמוצגות גם ב-/event-kippot.
  'כיפות':                [
    EVENT_KIPPOT_SUBCAT,
    'כיפות סרוגות',
    'כיפות סרוגות DMC',
    'כיפות סרוגות עם רקמה',
    'כיפות סאטן וטרילין',
    'כיפות קטיפה',
    'כיפות עור',
    'כיפות פריק',
    'כיפות פריק עבודת יד',
    'כיפות מיוחדות',
    'סיכות לכיפה',
  ],
  'קלפים':                ['קלפי מזוזה', 'קלפי תפילין'],
  // ⚠️ KEEP IN SYNC with RULES ב-app/scripts/reclassifySimchonimSubcats.mjs —
  // תת-קטגוריה שהסקריפט כותב ואינה רשומה כאן לא תקבל שבב סינון בעמוד הקטגוריה.
  'ספרי קודש וברכונים':  [
    'סידורים ותהילים',
    'ברכונים',
    'זמירות שבת',
    'תפילות ותחינות',
    'הגדות פסח',
    'מגילות אסתר',
    'מעמדים וסטנדים',
    // ברכונים ומארזים לפי חגים (07/2026)
    'ראש השנה',
    'חנוכה',
    'פורים',
    'פסח',
  ],
  'תיקי טלית ותפילין':   ['מארז לחתנים'],
};

// ─── Admin product form: hierarchical category selector ───────────────────────

export type CategoryOption =
  | { type: 'standalone'; cat: string }
  | { type: 'group'; label: string; children: Array<{ label: string; value: string }> };

/**
 * Hierarchical structure for the admin category <select>.
 * value format: "cat" for standalone, "cat|subCategory" for subcategories.
 * קלפי מזוזה / קלפי תפילין appear under the קלפים visual group but save as
 * standalone cat values (they have their own /category/* pages queried by cat).
 */
export const CATEGORY_OPTIONS: CategoryOption[] = [
  { type: 'standalone', cat: 'בתי מזוזה' },
  { type: 'group', label: 'קלפים', children: [
    { label: 'קלפי מזוזה',  value: 'קלפי מזוזה' },
    { label: 'קלפי תפילין', value: 'קלפי תפילין' },
  ]},
  { type: 'standalone', cat: 'ספרי תורה' },
  { type: 'standalone', cat: 'מגילות' },
  { type: 'standalone', cat: 'תפילין קומפלט' },
  { type: 'group', label: 'טליתות', children: [
    { label: 'טליתות (כללי)',    value: 'טליתות' },
    { label: 'טלית קטן',         value: 'טליתות|טלית קטן' },
    { label: 'טלית צמר',         value: 'טליתות|טלית צמר' },
    { label: 'סט טלית תפילין',   value: 'טליתות|סט טלית תפילין' },
  ]},
  { type: 'group', label: 'יודאיקה', children: [
    { label: 'יודאיקה (כללי)',   value: 'יודאיקה' },
    { label: 'נטילת ידיים',      value: 'יודאיקה|נטילת ידיים' },
    { label: 'שבת',              value: 'יודאיקה|שבת' },
    { label: 'חנוכה',            value: 'יודאיקה|חנוכה' },
    { label: 'פסח',              value: 'יודאיקה|פסח' },
    { label: 'סטים ומארזים',    value: 'יודאיקה|סטים ומארזים' },
    { label: 'ברכות לתלייה',    value: 'יודאיקה|ברכות לתלייה' },
    { label: 'מעמדים וסטנדים', value: 'יודאיקה|מעמדים וסטנדים' },
    { label: 'יודאיקה כללי',    value: 'יודאיקה|יודאיקה כללי' },
  ]},
  { type: 'group', label: 'חגים', children: [
    { label: 'חגים (כללי)',      value: 'חגים' },
    { label: 'חנוכה',            value: 'חגים|חנוכה' },
    { label: 'פסח',              value: 'חגים|פסח' },
    { label: 'סוכות',            value: 'חגים|סוכות' },
    { label: 'פורים',            value: 'חגים|פורים' },
    { label: 'ראש השנה',         value: 'חגים|ראש השנה' },
    { label: 'דבשיות לראש השנה',        value: 'חגים|דבשיות לראש השנה' },
    { label: 'צלחות סימני ראש השנה',    value: 'חגים|צלחות סימני ראש השנה' },
    { label: 'סכיני חלה לראש השנה',     value: 'חגים|סכיני חלה לראש השנה' },
  ]},
  { type: 'standalone', cat: 'מתנות' },
  { type: 'group', label: 'בר מצווה', children: [
    { label: 'בר מצווה (כללי)',  value: 'בר מצווה' },
    { label: 'סטים לבר מצווה',  value: 'בר מצווה|סטים לבר מצווה' },
    { label: 'תפילין קומפלט',   value: 'בר מצווה|תפילין קומפלט' },
    { label: 'טליתות',           value: 'בר מצווה|טליתות' },
    { label: 'מתנות לבר מצווה', value: 'בר מצווה|מתנות לבר מצווה' },
  ]},
  { type: 'group', label: 'כיפות', children: [
    { label: 'כיפות (כללי)',      value: 'כיפות' },
    { label: 'כיפות לאירועים',   value: 'כיפות|כיפות לאירועים' },
    { label: 'כיפות סרוגות',      value: 'כיפות|כיפות סרוגות' },
    { label: 'כיפות סרוגות DMC',  value: 'כיפות|כיפות סרוגות DMC' },
    { label: 'כיפות סרוגות עם רקמה', value: 'כיפות|כיפות סרוגות עם רקמה' },
    { label: 'כיפות סאטן וטרילין',   value: 'כיפות|כיפות סאטן וטרילין' },
    { label: 'כיפות קטיפה',       value: 'כיפות|כיפות קטיפה' },
    { label: 'כיפות עור',         value: 'כיפות|כיפות עור' },
    { label: 'כיפות פריק',        value: 'כיפות|כיפות פריק' },
    { label: 'כיפות פריק עבודת יד', value: 'כיפות|כיפות פריק עבודת יד' },
    { label: 'כיפות מיוחדות',    value: 'כיפות|כיפות מיוחדות' },
    { label: 'סיכות לכיפה',       value: 'כיפות|סיכות לכיפה' },
  ]},
  { type: 'group', label: 'ספרי קודש וברכונים', children: [
    { label: 'כל הספרים',        value: 'ספרי קודש וברכונים' },
    { label: 'סידורים ותהילים',  value: 'ספרי קודש וברכונים|סידורים ותהילים' },
    { label: 'ברכונים',          value: 'ספרי קודש וברכונים|ברכונים' },
    { label: 'זמירות שבת',       value: 'ספרי קודש וברכונים|זמירות שבת' },
    { label: 'תפילות ותחינות',   value: 'ספרי קודש וברכונים|תפילות ותחינות' },
    { label: 'הגדות פסח',        value: 'ספרי קודש וברכונים|הגדות פסח' },
    { label: 'מגילות אסתר',      value: 'ספרי קודש וברכונים|מגילות אסתר' },
    { label: 'מעמדים וסטנדים',   value: 'ספרי קודש וברכונים|מעמדים וסטנדים' },
    { label: 'ראש השנה',         value: 'ספרי קודש וברכונים|ראש השנה' },
    { label: 'חנוכה',            value: 'ספרי קודש וברכונים|חנוכה' },
    { label: 'פורים',            value: 'ספרי קודש וברכונים|פורים' },
    { label: 'פסח',              value: 'ספרי קודש וברכונים|פסח' },
  ]},
  { type: 'group', label: 'תיקי טלית ותפילין', children: [
    { label: 'תיקי טלית ותפילין (כללי)', value: 'תיקי טלית ותפילין' },
    { label: 'מארז לחתנים',              value: 'תיקי טלית ותפילין|מארז לחתנים' },
  ]},
];

/**
 * Parses the encoded select value → { cat, subCategory }.
 * "יודאיקה|חנוכה" → { cat: 'יודאיקה', subCategory: 'חנוכה' }
 * "בתי מזוזה"      → { cat: 'בתי מזוזה', subCategory: '' }
 */
export function parseCatValue(v: string): { cat: string; subCategory: string } {
  const idx = v.indexOf('|');
  if (idx === -1) return { cat: v, subCategory: '' };
  return { cat: v.slice(0, idx), subCategory: v.slice(idx + 1) };
}

/**
 * Builds the encoded select value from stored cat + subCategory fields.
 * Used to pre-select the correct option in the edit form.
 */
export function buildCatValue(cat: string, subCategory?: string): string {
  if (subCategory) return `${cat}|${subCategory}`;
  return cat;
}

/** Returns sub-categories for a primary cat, or [] if none. */
export function getSubCats(cat: string): string[] {
  return SUB_CATS[cat] ?? [];
}

/**
 * Returns the first parent category that contains value as a sub-category.
 * Used to normalize legacy products where cat === subCategory
 * (saved by the old SUBCATEGORY_PAGES_FORM pattern).
 */
export function findParentCat(value: string): string | null {
  for (const [parent, children] of Object.entries(SUB_CATS)) {
    if (children.includes(value)) return parent;
  }
  return null;
}

export const NAV_ITEMS: { label: string; cat: string | null; action: string | null }[] = [
  { label: '🔥 מבצעי היום',       cat: null,               action: null },
  { label: 'בתי מזוזה',           cat: 'בתי מזוזה',        action: null },
  { label: 'תפילין קומפלט',       cat: 'תפילין קומפלט',   action: null },
  { label: 'טליתות',              cat: 'טליתות',           action: null },
  { label: 'מגילות',              cat: 'מגילות',           action: null },
  { label: 'ספרי תורה',           cat: 'ספרי תורה',        action: null },
  { label: 'יודאיקה',             cat: 'יודאיקה',          action: null },
  { label: '🎁 מתנות',            cat: 'מתנות',            action: null },
  { label: '✡️ חגים ומועדים',     cat: 'יודאיקה',          action: null },
  { label: '🎉 בר מצווה',         cat: 'בר מצווה',         action: null },
  { label: '📜 קלפי מזוזה',       cat: 'קלפי מזוזה',       action: null },
  { label: '📦 קלפי תפילין',      cat: 'קלפי תפילין',      action: null },
  { label: '✍️ הסופרים שלנו',     cat: null,               action: 'soferim' },
  { label: '🌟 הצטרף לפלטפורמה', cat: null,               action: 'join' },
  { label: '🏛️ רבני קהילה',       cat: null,               action: 'shluchim' },
];
