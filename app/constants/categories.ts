// app/constants/categories.ts

export const CATS = [
  'הכל',
  'מזוזות',
  'כיסוי תפילין',
  'תפילין קומפלט',
  'טליתות',
  'מגילות',
  'ספרי תורה',
  'יודאיקה',
  'נטילת ידיים',
  'שבת',
  'חגים',
  'חנוכה',
  'פסח',
  'סטים ומארזים',
  'יודאיקה כללי',
  'מתנות',
  'כלי שולחן והגשה',
  'הגשה ואירוח',
  'עיצוב הבית',
  'בר מצווה',
  'קלפים',
  'קלפי מזוזה',
  'קלפי תפילין',
];

export const SUB_CATS: Record<string, string[]> = {
  'טליתות': ['טלית קטן', 'טלית צמר', 'סט טלית תפילין'],
  'יודאיקה': ['נטילת ידיים', 'שבת', 'חנוכה', 'פסח', 'סטים ומארזים', 'יודאיקה כללי'],
  'חגים':   ['חנוכה', 'פסח'],
  'בר מצווה': ['סטים לבר מצווה', 'תפילין קומפלט', 'טליתות', 'מתנות לבר מצווה'],
  'קלפים': ['קלפי מזוזה', 'קלפי תפילין'],
};

export const NAV_ITEMS: { label: string; cat: string | null; action: string | null }[] = [
  { label: '🔥 מבצעי היום',       cat: null,               action: null },
  { label: 'מזוזות',              cat: 'מזוזות',           action: null },
  { label: 'כיסוי תפילין',        cat: 'כיסוי תפילין',    action: null },
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
