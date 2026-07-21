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
  'ספרי קודש וסידורים',
  'תיקי טלית ותפילין',
];

export const SUB_CATS: Record<string, string[]> = {
  'טליתות':               ['טלית קטן', 'טלית צמר', 'סט טלית תפילין'],
  'יודאיקה':              ['נטילת ידיים', 'שבת', 'חנוכה', 'פסח', 'סטים ומארזים', 'יודאיקה כללי'],
  'חגים':                 ['חנוכה', 'פסח', 'סוכות', 'פורים', 'ראש השנה', 'דבשיות לראש השנה', 'צלחות סימני ראש השנה', 'סכיני חלה לראש השנה'],
  'בר מצווה':             ['סטים לבר מצווה', 'תפילין קומפלט', 'טליתות', 'מתנות לבר מצווה'],
  'קלפים':                ['קלפי מזוזה', 'קלפי תפילין'],
  'ספרי קודש וסידורים':  ['סידורים ותהילים'],
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
  { type: 'standalone', cat: 'כיפות' },
  { type: 'group', label: 'ספרי קודש וסידורים', children: [
    { label: 'כל הספרים',       value: 'ספרי קודש וסידורים' },
    { label: 'סידורים ותהילים', value: 'ספרי קודש וסידורים|סידורים ותהילים' },
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
