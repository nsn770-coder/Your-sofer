// ─────────────────────────────────────────────────────────────────────────────
// feedCategories — LIVE category mapping for product feeds (Meta / Google).
//
// B3: computed at request time from cat + subCategory together, so NEW products
// are covered instantly — unlike enrichGoogleFields.mjs (manual script) whose
// pre-computed google_product_category only exists after a re-run.
// The feed prefers the pre-computed doc field when present and falls back here.
// This module does NOT replace enrichGoogleFields.mjs — do not delete it.
// ─────────────────────────────────────────────────────────────────────────────

// Google Product Category codes:
// 5613 = Religious & Ceremonial > Judaism (default — this is a Judaica store)
// 5605 = Gifts & Occasions | 672 = Tableware | 674 = Drinkware
// 696  = Candles & Holders | 735 = Planters  | 784 = Media > Books
const DEFAULT_CATEGORY = '5613';

// Main-category map — superset of enrichGoogleFields.mjs's 14 entries plus the
// live catalog categories from app/constants/categories.ts.
const CATEGORY_MAP: Record<string, string> = {
  // from enrichGoogleFields.mjs (legacy cats still on old products)
  'יודאיקה':             '5613',
  'מתנות':               '5605',
  'שבת וחגים':           '5613',
  'מזוזות':              '5613',
  'סט טלית ותפילין':     '5613',
  'כלי שולחן והגשה':     '672',
  'כלי שתייה':           '674',
  'פמוטים':              '696',
  'נרות':                '696',
  'מגשים':               '672',
  'עציצים ואדניות':      '735',
  'כיסוי תפילין':        '5613',
  'תפילין קומפלט':       '5613',
  'טליתות':              '5613',
  'קלפי מזוזה':          '5613',
  'קלפי תפילין':         '5613',
  'חגים ומועדים':        '5613',
  // current catalog cats (app/constants/categories.ts)
  'בתי מזוזה':           '5613',
  'מגילות':              '5613',
  'ספרי תורה':           '5613',
  'חגים':                '5613',
  'יודאיקה כללי':        '5613',
  'בר מצווה':            '5613',
  'קלפים':               '5613',
  'כיפות':               '5613',
  'ספרי קודש וברכונים':  '784',
  'תיקי טלית ותפילין':   '5613',
  'הדפסה':               '5613',
};

// subCategory refinements — win over the main-category code when matched.
const SUBCATEGORY_MAP: Record<string, string> = {
  'דבשיות לראש השנה':       '672',
  'צלחות סימני ראש השנה':   '672',
  'סכיני חלה לראש השנה':    '672',
  'סידורים ותהילים':        '784',
};

/** Live google_product_category from cat + subCategory (B3). */
export function googleCategoryFor(cat: string, subCategory?: string): string {
  if (subCategory && SUBCATEGORY_MAP[subCategory]) return SUBCATEGORY_MAP[subCategory];
  return CATEGORY_MAP[cat] ?? DEFAULT_CATEGORY;
}

// ── custom_label_2: audience / occasion (B4) ─────────────────────────────────
const OCCASION_RULES: Array<{ label: string; test: RegExp }> = [
  { label: 'בר מצווה',  test: /בר מצו|בר-מצו/ },
  { label: 'חתן',       test: /חתן|חתונה/ },
  { label: 'ראש השנה',  test: /ראש השנה/ },
  { label: 'חנוכה',     test: /חנוכה|חנוכיה/ },
  { label: 'פסח',       test: /פסח/ },
  { label: 'סוכות',     test: /סוכות|אתרוג|לולב/ },
  { label: 'פורים',     test: /פורים|מגילת אסתר/ },
  { label: 'שבת',       test: /שבת|נרות|קידוש|חלה/ },
  { label: 'מתנה',      test: /מתנ/ },
  { label: 'אירועים',   test: /אירוע|כיפות/ },
];

/** Audience/occasion label from cat + subCategory + name; '' when nothing fits. */
export function occasionLabelFor(cat: string, subCategory: string, name: string): string {
  const hay = `${cat} ${subCategory} ${name}`;
  for (const rule of OCCASION_RULES) {
    if (rule.test.test(hay)) return rule.label;
  }
  return '';
}

// ── custom_label_3: price band (B4) ──────────────────────────────────────────
export function priceBandFor(price: number): string {
  if (price < 50)  return '0-49';
  if (price < 100) return '50-99';
  if (price < 200) return '100-199';
  if (price < 400) return '200-399';
  if (price < 800) return '400-799';
  return '800+';
}
