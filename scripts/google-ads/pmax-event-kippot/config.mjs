/**
 * config.mjs — כל ההגדרות של קמפיין PMax "כיפות לאירועים".
 * אין כאן שום סוד. סודות מגיעים אך ורק מ-.env.local / משתני סביבה.
 */

// ── סימון המוצרים ────────────────────────────────────────────────────────────
// custom_label_0 כבר תפוס בפיד (הוא נושא את השדה `badge` של המוצר),
// לכן הסימון של הקמפיין הזה יושב על custom_label_1.
export const CUSTOM_LABEL_INDEX = 1;              // 0..4  → INDEX1
export const CUSTOM_LABEL_VALUE = 'event_kippot';

// ── מקור האמת באתר ───────────────────────────────────────────────────────────
export const SITE = 'https://your-sofer.com';
export const EVENT_KIPPOT_CAT    = 'כיפות';
export const EVENT_KIPPOT_SUBCAT = 'כיפות לאירועים';

/** עמוד הנחיתה המרכזי — הפילטר "כיפות לאירועים" בקטגוריית כיפות. */
export const FINAL_URL =
  `${SITE}/category/${encodeURIComponent(EVENT_KIPPOT_CAT)}` +
  `?filter=${encodeURIComponent(EVENT_KIPPOT_SUBCAT)}`;

export const FEED_URL = `${SITE}/api/google-feed`;

// ── קמפיין ───────────────────────────────────────────────────────────────────
export const CAMPAIGN_NAME    = 'PMax | כיפות לאירועים | Event Kippot';
export const BUDGET_NAME      = 'Budget | כיפות לאירועים | Event Kippot';
export const ASSET_GROUP_NAME = 'כיפות לאירועים | Main';

/** ישראל. criteria id 2376 = Israel (geo target constant). */
export const GEO_TARGET_CONSTANTS = ['2376'];
/** עברית. criteria id 1027 = Hebrew. */
export const LANGUAGE_CONSTANTS = ['1027'];

export const BUSINESS_NAME = 'Your Sofer';           // ≤ 25 תווים

// ── תקציב ובידינג — נקבעים ממשתני סביבה, בלי ניחוש ──────────────────────────
// DAILY_BUDGET_ILS  — חובה. תקציב יומי בשקלים.
// TARGET_ROAS       — אופציונלי. יחס (2.5 = 250%). ריק → Maximize Conversion Value ללא יעד.
export const DAILY_BUDGET_ILS = process.env.DAILY_BUDGET_ILS
  ? Number(process.env.DAILY_BUDGET_ILS) : null;
export const TARGET_ROAS = process.env.TARGET_ROAS
  ? Number(process.env.TARGET_ROAS) : null;

// ── Search Themes (עד 25; נבחרו 20 ללא כפילויות כמעט-זהות) ──────────────────
export const SEARCH_THEMES = [
  'כיפות לאירועים',
  'כיפות לבר מצווה',
  'כיפות לחתונה',
  'כיפות לשבת חתן',
  'כיפות בעיצוב אישי',
  'כיפות עם הדפסה אישית',
  'כיפות עם לוגו',
  'כיפות ממותגות',
  'כיפות עם שם',
  'כיפות עם הקדשה',
  'כיפות רקומות',
  'כיפות פשתן לאירועים',
  'כיפות סאטן לאירועים',
  'כיפות לאורחים',
  'כיפות בכמות',
  'הזמנת כיפות לאירוע',
  'כיפות לחתן',
  'כיפות מזכרת',
  'כיפות בהתאמה אישית',
  'כיפות מודפסות',
];

// ── נכסי טקסט ────────────────────────────────────────────────────────────────
// כל הנתונים נלקחו מעמוד /event-kippot באתר (מינימום 30 יח', מחירי פשתן/סאטן,
// הדמיה חינם, אספקה 7–10 ימים). אין כאן שום הבטחה שאינה מופיעה באתר.
// מגבלות Google Ads: Headline ≤30, Long headline ≤90, Description ≤90
// (לפחות אחד ≤60), Business name ≤25.

export const HEADLINES = [
  'כיפות בעיצוב אישי לאירועים',
  'כיפות לבר מצווה',
  'כיפות לחתונה',
  'כיפות לשבת חתן',
  'כיפות עם הדפסה אישית',
  'כיפות עם רקמה אישית',
  'כיפות עם לוגו ושם',
  'כיפות פשתן מ-10 ₪ ליחידה',
  'כיפות סאטן מ-6 ₪ ליחידה',
  'הדמיה חינם לפני ייצור',
  'מגוון דגמים וצבעים',
  'הזמנת כיפות אונליין',
  'כיפות מודפסות לאורחים',
  'אספקה תוך 7-10 ימים',
  'כיפות מזכרת לאירוע',
];

export const LONG_HEADLINES = [
  'כיפות בעיצוב אישי לאירועים – בר מצווה, חתונה ושבת חתן',
  'כיפות פשתן וסאטן עם הדפסה אישית – שם, תאריך או לוגו',
  'הדמיה חינם לפני הייצור – כיפות מודפסות לאירוע שלכם',
  'כיפות רקומות ומודפסות לאורחים – מגוון צבעים ודגמים',
  'מזמינים אונליין: כיפות אישיות לאירוע, אספקה 7-10 ימים',
];

export const DESCRIPTIONS = [
  'כיפות בעיצוב אישי לאירועים. הדמיה חינם לפני ייצור.',            // ≤60
  'כיפות פשתן, סאטן וקטיפה עם הדפסה או רקמה אישית – שם, תאריך, לוגו והקדשה.',
  'הזמנה מינימלית 30 כיפות. עיצוב גרפי והדמיה כלולים במחיר. אספקה 7-10 ימים.',
  'כיפות לבר מצווה, לחתונה ולשבת חתן – מגוון צבעים ודגמים לבחירה.',
  'כיפות סאטן מ-6 ₪ ליחידה, כיפות פשתן מ-10 ₪ ליחידה. משלוח לכל הארץ.',
];

// ── לוגו ──────────────────────────────────────────────────────────────────────
// הלוגו הרשמי של האתר, 500x500 (יחס 1:1 — עומד בדרישת LOGO של PMax).
export const LOGO_URL = `${SITE}/logo.png`;

// ── תמונות ────────────────────────────────────────────────────────────────────
// נבחרות אוטומטית מתמונות המוצרים של כיפות לאירועים בלבד (collect-assets.mjs),
// וחתוכות ליחסים הנדרשים דרך טרנספורמציות Cloudinary.
export const IMAGE_SPECS = [
  { field: 'MARKETING_IMAGE',          ar: '1.91', w: 1200, min: 3, label: 'Landscape 1.91:1' },
  { field: 'SQUARE_MARKETING_IMAGE',   ar: '1.0',  w: 1200, min: 3, label: 'Square 1:1' },
  { field: 'PORTRAIT_MARKETING_IMAGE', ar: '0.8',  w: 960,  min: 1, label: 'Portrait 4:5' },
];

// ── החרגות עמודי נחיתה (URL exclusions) ─────────────────────────────────────
// גיבוי נוסף לכיבוי Final URL Expansion: קטגוריות שאסור שהקמפיין ינחת בהן.
export const EXCLUDED_URL_FRAGMENTS = [
  '/category/תפילין',
  '/category/קלפי תפילין',
  '/category/קלפי מזוזה',
  '/category/בתי מזוזה',
  '/category/טליתות וציציות',
  '/category/ספרי תורה',
  '/category/מגילות',
  '/category/יודאיקה',
  '/category/תכשיטים',
  '/category/ספרי קודש וברכונים',
  '/category/מוצרי בית כנסת',
  '/category/תיקי טלית ותפילין',
  '/category/סט טלית תפילין',
  '/category/מתנות',
];

// ── מילות מפתח שליליות — המלצה בלבד, לא מיושם אוטומטית ──────────────────────
// ראה --with-negatives ב-create-pmax-campaign.mjs.
export const SUGGESTED_NEGATIVES = [
  'כיפה חינם',
  'תמונות של כיפות',
  'איך לסרוג כיפה',
  'כיפה סרוגה יד שנייה',
];
