/**
 * faq.ts — מקור האמת היחיד לכל השאלות והתשובות באתר.
 *
 * שלושה צרכנים נשענים על הקובץ הזה:
 *   1. דף השאלות והתשובות המרכזי (/faq) — משתמש ב-fullAnswer.
 *   2. הבוט (שירה, /api/shira) — משתמש ב-shortAnswer.
 *   3. אזורי FAQ ממוקדים בעמודים (PageFaqSection) — לפי השדה pages.
 *   4. ייצוא JSON לבוטים חיצוניים — /api/faq.
 *
 * שינוי מחיר / מדיניות / זמן אספקה — מתבצע כאן במקום אחד בלבד.
 * נתונים שמנוהלים כבר במקור מרכזי אחר (siteTrust) נמשכים משם ולא מוקשחים.
 */

import { BUSINESS, SHIPPING, ENABLED_PAYMENT_METHODS } from '@/app/config/siteTrust';
import { buildWhatsAppLink, WA_PREFILL } from '@/lib/whatsapp';

// ── טיפוסים ───────────────────────────────────────────────────────────────────

export type FaqCategoryId =
  | 'kippot'
  | 'dedication'
  | 'shipping'
  | 'club'
  | 'pricing'
  | 'stam'
  | 'orders'
  | 'payments'
  | 'returns';

export type FaqPageKey =
  | 'home'              // דף הבית — 5 שאלות הפתיחה הרחבות
  | 'event-kippot'      // עמוד כיפות בהדפסה אישית
  | 'kippot-order'      // עמוד עיצוב/הזמנת כיפות
  | 'product-custom'    // עמודי מוצר עם עיצוב אישי
  | 'cart'              // עמוד הסל
  | 'checkout'          // עמוד התשלום
  | 'club'              // עמוד מועדון הלקוחות
  | 'account'           // אזור אישי / סטטוס הזמנה
  | 'stam'              // עמודי מוצרי סת״ם
  | 'shipping';         // עמוד משלוחים והחזרות

export interface FaqCta {
  label: string;
  href: string;
  type?: 'internal' | 'whatsapp' | 'email';
}

export interface FAQItem {
  id: string;
  category: FaqCategoryId;
  question: string;
  /** תשובה מלאה לדף ה-FAQ. \n יוצר פסקאות/שורות */
  fullAnswer: string;
  /** תשובה קצרה וחד-משמעית לבוט */
  shortAnswer: string;
  keywords?: string[];
  pages?: FaqPageKey[];
  /** נמוך = מוצג ראשון */
  priority?: number;
  cta?: FaqCta;
}

export interface FaqCategory {
  id: FaqCategoryId;
  label: string;
  /** אייקון עדין (אימוג'י יחיד) לכפתורי הקטגוריות */
  icon: string;
}

// ── נתונים דינמיים ממקורות קיימים ─────────────────────────────────────────────

const SHIP_COST = `${SHIPPING.regularCost} ₪`;
const HOURS = BUSINESS.supportHours; // מקור אמת יחיד — siteTrust
const CARD_LABELS = ENABLED_PAYMENT_METHODS
  .filter(m => m.id !== 'bit')
  .map(m => m.label)
  .join(', ');

// ── קטגוריות ──────────────────────────────────────────────────────────────────

export const FAQ_CATEGORIES: FaqCategory[] = [
  { id: 'kippot',     label: 'כיפות בהדפסה אישית',                icon: '🧢' },
  { id: 'dedication', label: 'הקדשות ועיצוב אישי',                 icon: '✍️' },
  { id: 'shipping',   label: 'משלוחים ואיסוף עצמי',                icon: '📦' },
  { id: 'club',       label: 'מועדון הפרימיום, קופונים ונקודות',   icon: '⭐' },
  { id: 'pricing',    label: 'מחירים, יחידות ומבצעי כמות',         icon: '🏷️' },
  { id: 'stam',       label: 'מוצרי סת״ם וכשרות',                  icon: '📜' },
  { id: 'orders',     label: 'סטטוס הזמנה ושירות לקוחות',          icon: '💬' },
  { id: 'payments',   label: 'תשלומים',                            icon: '💳' },
  { id: 'returns',    label: 'שינויים, ביטולים, החזרות ואחריות',   icon: '↩️' },
];

// ── CTA נפוצים ────────────────────────────────────────────────────────────────

const CTA_WA_GENERAL: FaqCta = { label: 'דברו איתנו בוואטסאפ', href: buildWhatsAppLink(WA_PREFILL.general), type: 'whatsapp' };
const CTA_WA_VELVET: FaqCta = { label: 'קבלת הצעת מחיר בוואטסאפ', href: buildWhatsAppLink(WA_PREFILL.velvetQuote), type: 'whatsapp' };
const CTA_WA_URGENT: FaqCta = { label: 'בקשת טיפול דחוף בוואטסאפ', href: buildWhatsAppLink(WA_PREFILL.urgentOrder), type: 'whatsapp' };
const CTA_WA_STATUS: FaqCta = { label: 'שליחת קוד הזמנה בוואטסאפ', href: buildWhatsAppLink(WA_PREFILL.orderStatus), type: 'whatsapp' };
const CTA_WA_STAM: FaqCta = { label: 'קבלת ייעוץ אישי בוואטסאפ', href: buildWhatsAppLink(WA_PREFILL.stamAdvice), type: 'whatsapp' };
const CTA_START_DESIGN: FaqCta = { label: 'התחילו לעצב את הכיפות שלכם', href: '/event-kippot', type: 'internal' };
const CTA_ACCOUNT: FaqCta = { label: 'מעבר לאזור האישי', href: '/account', type: 'internal' };
const CTA_CLUB: FaqCta = { label: 'הצטרפות למועדון', href: '/club', type: 'internal' };

// ── השאלות והתשובות ───────────────────────────────────────────────────────────

export const FAQ_ITEMS: FAQItem[] = [

  // ═══ קטגוריה 1 — כיפות בהדפסה אישית ═══

  // ── שאלות ייעודיות לדף הבית ──────────────────────────────────────────────
  // מנוסחות רחב (כניסה ראשונה לאתר), ומצטרפות לשאלות הקיימות שסומנו
  // ב-pages: ['home'] — shipping-time, dedication-products, returns-regular.
  {
    id: 'home-events-bulk',
    category: 'kippot',
    question: 'אתם מספקים כיפות ומזכרות לאירועים בכמויות?',
    fullAnswer:
      'כן — זו אחת ההתמחויות שלנו. אנחנו מספקים כיפות בהדפסה אישית ומזכרות לבר מצווה, חתונות ואירועים, עם מחירי כמות מיוחדים.\n' +
      'הכמות המינימלית לכיפות בהדפסה אישית היא 30 יחידות. לקבלת הצעה לאירוע — דברו איתנו בוואטסאפ.',
    shortAnswer:
      'כן. כיפות מודפסות ומזכרות לאירועים במחירי כמות; מינימום 30 יחידות לכיפות בהדפסה אישית.',
    keywords: ['אירועים', 'כמויות', 'מחיר כמות', 'בר מצווה', 'חתונה', 'מזכרות', 'כיפות'],
    pages: ['home'],
    priority: 3,
    cta: CTA_WA_GENERAL,
  },
  {
    id: 'home-about-us',
    category: 'orders',
    question: 'מי עומד מאחורי האתר?',
    fullAnswer:
      'YourSofer הוא עסק ישראלי מדימונה שמתמחה ביודאיקה ובמתנות בעיצוב אישי.\n' +
      'אנחנו עובדים ישירות מול סופרים ויוצרים מוסמכים, ומלווים כל הזמנה אישית עד שהיא מגיעה אליכם.',
    shortAnswer:
      'YourSofer הוא עסק ישראלי מדימונה המתמחה ביודאיקה ובמתנות בעיצוב אישי, בעבודה ישירה מול סופרים ויוצרים מוסמכים.',
    keywords: ['מי אתם', 'עלינו', 'העסק', 'דימונה', 'אודות'],
    pages: ['home'],
    priority: 5,
  },
  {
    id: 'kippot-min-quantity',
    category: 'kippot',
    question: 'מהי הכמות המינימלית להזמנת כיפות עם הדפסה אישית?',
    fullAnswer: 'הכמות המינימלית להזמנת כיפות עם הדפסה אישית היא 30 כיפות.',
    shortAnswer: 'המינימום להזמנת כיפות עם הדפסה אישית הוא 30 יחידות.',
    keywords: ['כיפות', 'מינימום', 'כמות', 'הדפסה', '30 כיפות'],
    pages: ['event-kippot', 'kippot-order'],
    priority: 1,
    cta: CTA_START_DESIGN,
  },
  {
    id: 'kippot-types',
    category: 'kippot',
    question: 'אילו סוגי כיפות אפשר להזמין עם הדפסה אישית?',
    fullAnswer: 'ניתן להזמין הדפסה אישית על כיפות פשתן, כיפות סאטן וכיפות קטיפה.',
    shortAnswer: 'ניתן להזמין הדפסה אישית על כיפות פשתן, סאטן וקטיפה.',
    keywords: ['כיפות', 'פשתן', 'סאטן', 'קטיפה', 'סוגים', 'הדפסה'],
    pages: ['event-kippot'],
    priority: 2,
  },
  {
    id: 'kippot-price-includes-both',
    category: 'kippot',
    question: 'האם המחיר כולל גם את הכיפות וגם את ההדפסה?',
    fullAnswer: 'כן. המחיר כולל את הכיפות ואת ההדפסה האישית.',
    shortAnswer: 'כן. המחיר כולל גם את הכיפות וגם את ההדפסה האישית.',
    keywords: ['מחיר', 'כולל', 'הדפסה', 'כיפות'],
    pages: ['event-kippot'],
    priority: 3,
  },
  {
    id: 'kippot-price-linen',
    category: 'kippot',
    question: 'כמה עולות כיפות פשתן עם הדפסה אישית?',
    fullAnswer:
      'מחירי כיפות פשתן, כולל הכיפה וההדפסה:\n' +
      '• 30–49 יחידות: 14 ₪ ליחידה.\n' +
      '• 50–99 יחידות: 12 ₪ ליחידה.\n' +
      '• 100 יחידות ומעלה: 10 ₪ ליחידה.\n\n' +
      'דוגמאות:\n' +
      '• 30 כיפות פשתן: 420 ₪.\n' +
      '• 100 כיפות פשתן: 1,000 ₪.\n' +
      '• 200 כיפות פשתן: 2,000 ₪.\n\n' +
      `מחיר המשלוח (${SHIP_COST}) אינו כלול במחיר הכיפות.`,
    shortAnswer:
      'כיפות פשתן כולל הדפסה: 30–49 יח׳ — 14 ₪ ליחידה; 50–99 יח׳ — 12 ₪ ליחידה; 100 ומעלה — 10 ₪ ליחידה. המשלוח אינו כלול.',
    keywords: ['פשתן', 'מחיר', 'כיפות', '30 כיפות', '100 כיפות', '300 כיפות', 'הדפסה'],
    pages: ['event-kippot', 'kippot-order'],
    priority: 4,
    cta: CTA_START_DESIGN,
  },
  {
    id: 'kippot-price-satin',
    category: 'kippot',
    question: 'כמה עולות כיפות סאטן עם הדפסה אישית?',
    fullAnswer:
      'מחירי כיפות סאטן, כולל הכיפה וההדפסה:\n' +
      '• 30–99 יחידות: 9 ₪ ליחידה.\n' +
      '• 100–299 יחידות: 7 ₪ ליחידה.\n' +
      '• 300 יחידות ומעלה: 6 ₪ ליחידה.\n\n' +
      'דוגמאות:\n' +
      '• 30 כיפות סאטן: 270 ₪.\n' +
      '• 100 כיפות סאטן: 700 ₪.\n' +
      '• 300 כיפות סאטן: 1,800 ₪.\n\n' +
      `מחיר המשלוח (${SHIP_COST}) אינו כלול במחיר הכיפות.`,
    shortAnswer:
      'כיפות סאטן כולל הדפסה: 30–99 יח׳ — 9 ₪ ליחידה; 100–299 יח׳ — 7 ₪ ליחידה; 300 ומעלה — 6 ₪ ליחידה. המשלוח אינו כלול.',
    keywords: ['סאטן', 'מחיר', 'כיפות', 'הדפסה'],
    pages: ['event-kippot', 'kippot-order'],
    priority: 5,
    cta: CTA_START_DESIGN,
  },
  {
    id: 'kippot-price-velvet',
    category: 'kippot',
    question: 'כמה עולות כיפות קטיפה עם הדפסה אישית?',
    fullAnswer:
      'מחיר כיפות קטיפה משתנה לפי דגם הכיפה וסוג הקטיפה. לקבלת הצעת מחיר מדויקת יש לפנות לשירות הלקוחות בוואטסאפ.',
    shortAnswer:
      'מחיר כיפות קטיפה משתנה לפי הדגם וסוג הקטיפה — לקבלת הצעת מחיר מדויקת פנו אלינו בוואטסאפ.',
    keywords: ['קטיפה', 'מחיר', 'כיפות', 'הצעת מחיר'],
    pages: ['event-kippot'],
    priority: 6,
    cta: CTA_WA_VELVET,
  },
  {
    id: 'kippot-whats-included',
    category: 'kippot',
    question: 'מה כלול במחיר של הכיפות המודפסות?',
    fullAnswer:
      'המחיר כולל:\n' +
      '• הכיפות.\n' +
      '• עיצוב גרפי.\n' +
      '• הכנת הדמיה לפני הייצור.\n' +
      '• שם ותאריך.\n' +
      '• שילוב לוגו.\n' +
      '• הדפסה צבעונית.',
    shortAnswer:
      'המחיר כולל את הכיפות, עיצוב גרפי, הדמיה לפני ייצור, שם ותאריך, שילוב לוגו והדפסה צבעונית.',
    keywords: ['כלול', 'מחיר', 'עיצוב', 'לוגו', 'הדמיה', 'הדפסה'],
    pages: ['event-kippot', 'kippot-order'],
    priority: 7,
  },
  {
    id: 'kippot-two-sides',
    category: 'kippot',
    question: 'האם הדפסה בשני צדדים כלולה במחיר?',
    fullAnswer:
      'המחיר הבסיסי מתייחס להדפסה באזור אחד. הדפסה בשני צדדים כרוכה בתוספת של 1.5 ₪ לכל כיפה.',
    shortAnswer: 'הדפסה בשני צדדים כרוכה בתוספת של 1.5 ₪ לכל כיפה.',
    keywords: ['שני צדדים', 'צד נוסף', 'תוספת', 'הדפסה'],
    pages: ['kippot-order'],
    priority: 8,
  },
  {
    id: 'kippot-print-area',
    category: 'kippot',
    question: 'מהו שטח ההדפסה האפשרי על כיפה?',
    fullAnswer:
      'שטח ההדפסה המרבי על הכיפה הוא עד 6×6 ס״מ, בהתאם לעיצוב, לצורת הכיפה ולמיקום ההדפסה.',
    shortAnswer: 'שטח ההדפסה המרבי הוא עד 6×6 ס״מ, בהתאם לעיצוב ולמיקום ההדפסה.',
    keywords: ['שטח הדפסה', 'גודל', 'סמ', 'מידות'],
    pages: ['kippot-order'],
    priority: 9,
  },
  {
    id: 'kippot-delivery-time',
    category: 'kippot',
    question: 'כמה זמן לוקח לקבל את הכיפות?',
    fullAnswer:
      'זמן האספקה הכולל הוא בדרך כלל 7–10 ימים מרגע התשלום, ולעיתים אף פחות.',
    shortAnswer: 'זמן האספקה הכולל הוא בדרך כלל 7–10 ימים מרגע התשלום, ולעיתים פחות.',
    keywords: ['זמן אספקה', 'משלוח', 'כמה זמן', 'ימים'],
    pages: ['event-kippot', 'kippot-order', 'checkout'],
    priority: 10,
  },
  {
    id: 'kippot-urgent',
    category: 'kippot',
    question: 'האם אפשר לבצע הזמנה דחופה?',
    fullAnswer:
      'כן. ניתן לפנות אלינו בוואטסאפ ולבקש טיפול דחוף. הצוות יבדוק את לוח הייצור ויעשה מאמץ לעזור, בהתאם לזמינות.',
    shortAnswer:
      'אפשר לבקש טיפול דחוף בוואטסאפ — נבדוק את זמינות הייצור ונשתדל לעזור. איננו מתחייבים מראש לזמן קצר מהרגיל.',
    keywords: ['דחוף', 'הזמנה דחופה', 'אקספרס', 'מהיר'],
    pages: ['event-kippot'],
    priority: 11,
    cta: CTA_WA_URGENT,
  },
  {
    id: 'kippot-multi-colors',
    category: 'kippot',
    question: 'האם אפשר להזמין כמה צבעים באותה הזמנה?',
    fullAnswer: 'כן. ניתן לשלב כמה צבעים של כיפות באותה הזמנה.',
    shortAnswer: 'כן, ניתן לשלב כמה צבעים של כיפות באותה הזמנה.',
    keywords: ['צבעים', 'שילוב', 'כמה צבעים'],
    pages: ['event-kippot', 'cart'],
    priority: 12,
  },
  {
    id: 'kippot-mockup',
    category: 'kippot',
    question: 'האם מקבלים הדמיה לפני הייצור?',
    fullAnswer: 'כן. הלקוח תמיד מקבל הדמיה לאישור לפני תחילת ההדפסה או הרקמה.',
    shortAnswer: 'כן. תמיד נשלחת הדמיה לאישור לפני תחילת ההדפסה או הרקמה.',
    keywords: ['הדמיה', 'אישור', 'לפני ייצור'],
    pages: ['event-kippot', 'kippot-order', 'product-custom'],
    priority: 13,
  },
  {
    id: 'kippot-change-after-approval',
    category: 'kippot',
    question: 'האם אפשר לשנות את העיצוב לאחר אישור ההדמיה?',
    fullAnswer:
      'לא. לאחר אישור ההדמיה ההזמנה נכנסת לייצור ולא ניתן לשנות את העיצוב, הצבע, הכמות או ההקדשה.\n' +
      'ניתן עדיין לשנות את כתובת המשלוח, כל עוד ההזמנה טרם יצאה למשלוח.',
    shortAnswer:
      'לאחר אישור ההדמיה ההזמנה נכנסת לייצור ולא ניתן לשנות את העיצוב. כתובת משלוח אפשר לשנות כל עוד ההזמנה טרם נשלחה.',
    keywords: ['שינוי', 'אחרי אישור', 'הדמיה', 'עיצוב'],
    pages: ['kippot-order', 'product-custom'],
    priority: 14,
  },

  // ═══ קטגוריה 2 — הקדשות ועיצוב אישי ═══

  {
    id: 'dedication-products',
    category: 'dedication',
    question: 'על אילו מוצרים ניתן להוסיף הקדשה אישית?',
    fullAnswer:
      'ניתן להוסיף הקדשה אישית לכיפות, כיסויי ראש, ברכונים, סידורים, כיסויי טלית ומוצרים נוספים המסומנים באתר כמתאימים לעיצוב אישי.',
    shortAnswer:
      'ניתן להוסיף הקדשה לכיפות, כיסויי ראש, ברכונים, סידורים, כיסויי טלית ומוצרים נוספים המסומנים באתר כמתאימים לעיצוב אישי.',
    keywords: ['הקדשה', 'עיצוב אישי', 'מוצרים', 'רקמה', 'הטבעה'],
    pages: ['product-custom', 'home'],
    priority: 1,
  },
  {
    id: 'dedication-how-to-send',
    category: 'dedication',
    question: 'איך שולחים את נוסח ההקדשה?',
    fullAnswer:
      'ניתן להזין את ההקדשה דרך השדה המתאים בדף המוצר או לשלוח אותה ישירות בוואטסאפ, לפי מה שנוח לכם.',
    shortAnswer: 'ניתן להזין את ההקדשה בדף המוצר או לשלוח אותה בוואטסאפ.',
    keywords: ['הקדשה', 'נוסח', 'לשלוח', 'טקסט'],
    pages: ['product-custom'],
    priority: 2,
    cta: { label: 'עזרה בהקדשה בוואטסאפ', href: buildWhatsAppLink(WA_PREFILL.dedicationHelp), type: 'whatsapp' },
  },
  {
    id: 'dedication-logo-file',
    category: 'dedication',
    question: 'האם אפשר לשלוח לוגו או קובץ עיצוב?',
    fullAnswer:
      'כן. ניתן לשלוח כל סוג קובץ. הצוות יבדוק את הקובץ ויתאים אותו ככל האפשר להכנת ההדמיה ולשיטת הייצור.',
    shortAnswer:
      'כן, ניתן לשלוח כל סוג קובץ. הצוות יבדוק ויתאים אותו ככל האפשר להכנת ההדמיה.',
    keywords: ['לוגו', 'קובץ', 'עיצוב', 'להעלות'],
    pages: ['product-custom', 'kippot-order'],
    priority: 3,
  },
  {
    id: 'dedication-mockup',
    category: 'dedication',
    question: 'האם מקבלים הדמיה לפני ההדפסה, ההטבעה או הרקמה?',
    fullAnswer: 'כן. לפני תחילת הייצור נשלחת הדמיה לאישור הלקוח.',
    shortAnswer: 'כן. לפני תחילת הייצור נשלחת הדמיה לאישורכם.',
    keywords: ['הדמיה', 'רקמה', 'הטבעה', 'אישור'],
    pages: ['product-custom'],
    priority: 4,
  },
  {
    id: 'dedication-embossing-price',
    category: 'dedication',
    question: 'כיצד מחושב מחיר הטבעה?',
    fullAnswer: 'בהטבעה המחיר מחושב לפי מספר השורות.',
    shortAnswer: 'מחיר הטבעה מחושב לפי מספר השורות.',
    keywords: ['הטבעה', 'מחיר', 'שורות'],
    pages: ['product-custom'],
    priority: 5,
  },
  {
    id: 'dedication-embroidery-limit',
    category: 'dedication',
    question: 'כיצד נקבעת מגבלת הטקסט ברקמה?',
    fullAnswer:
      'ברקמה המגבלה תלויה במספר האותיות, בגודל הטקסט ובשטח שניתן לרקום על המוצר. הצוות יבדוק את העיצוב לפני הייצור.',
    shortAnswer:
      'ברקמה המגבלה תלויה במספר האותיות, בגודל הטקסט ובשטח הרקמה על המוצר — הצוות בודק את העיצוב לפני הייצור.',
    keywords: ['רקמה', 'מגבלה', 'אותיות', 'טקסט'],
    pages: ['product-custom'],
    priority: 6,
  },
  {
    id: 'dedication-change-after-payment',
    category: 'dedication',
    question: 'האם אפשר לבצע שינויים לאחר התשלום?',
    fullAnswer:
      'כן. ניתן לשנות כתובת, צבע, כמות או הקדשה כל עוד ההדמיה עדיין לא אושרה.\n' +
      'לאחר אישור ההדמיה ניתן לשנות רק את כתובת המשלוח, בתנאי שההזמנה טרם נשלחה.',
    shortAnswer:
      'כן — כתובת, צבע, כמות והקדשה ניתנים לשינוי כל עוד ההדמיה לא אושרה. אחרי אישור ההדמיה ניתן לשנות רק כתובת משלוח, כל עוד ההזמנה טרם נשלחה.',
    keywords: ['שינוי', 'אחרי תשלום', 'כתובת', 'הקדשה'],
    pages: ['product-custom', 'checkout', 'account'],
    priority: 7,
  },

  // ═══ קטגוריה 3 — משלוחים ואיסוף עצמי ═══

  {
    id: 'shipping-cost',
    category: 'shipping',
    question: 'מה עלות המשלוח?',
    fullAnswer: `עלות משלוח היא ${SHIP_COST} לכל הארץ.`,
    shortAnswer: `משלוח לכל הארץ עולה ${SHIP_COST}.`,
    keywords: ['משלוח', 'עלות', 'מחיר משלוח', 'דמי משלוח'],
    pages: ['cart', 'checkout', 'shipping'],
    priority: 1,
  },
  {
    id: 'shipping-nationwide',
    category: 'shipping',
    question: 'האם אתם מבצעים משלוחים לכל הארץ?',
    fullAnswer: 'כן. אנו מבצעים משלוחים לכל הארץ.',
    shortAnswer: 'כן, אנו שולחים לכל הארץ.',
    keywords: ['משלוח', 'כל הארץ', 'אזורים'],
    pages: ['shipping'],
    priority: 2,
  },
  {
    id: 'shipping-time',
    category: 'shipping',
    question: 'כמה זמן לוקח המשלוח?',
    fullAnswer:
      'זמן האספקה הכולל הוא בדרך כלל 7–10 ימים מרגע התשלום, ולעיתים ההזמנה מגיעה מוקדם יותר.',
    shortAnswer: 'זמן האספקה הכולל הוא בדרך כלל 7–10 ימים מרגע התשלום.',
    keywords: ['זמן משלוח', 'אספקה', 'כמה זמן', 'ימים'],
    pages: ['shipping', 'checkout', 'home'],
    priority: 3,
  },
  {
    id: 'shipping-tracking',
    category: 'shipping',
    question: 'האם מקבלים עדכון כשההזמנה נשלחת?',
    fullAnswer:
      'כן. לאחר מסירת ההזמנה לחברת המשלוחים, תקבלו עדכון ישירות מחברת המשלוחים עם פרטי מעקב.',
    shortAnswer: 'כן. לאחר שההזמנה יוצאת למשלוח מתקבל עדכון ישירות מחברת המשלוחים.',
    keywords: ['מעקב', 'עדכון', 'משלוח', 'טרקינג'],
    pages: ['shipping', 'checkout', 'account'],
    priority: 4,
  },
  {
    id: 'shipping-pickup',
    category: 'shipping',
    question: 'האם קיימת אפשרות לאיסוף עצמי?',
    fullAnswer: `כן. ניתן לבצע איסוף עצמי בתיאום מראש מהכתובת: ${BUSINESS.address}.`,
    shortAnswer: `ניתן לבצע איסוף עצמי בתיאום מראש מ${BUSINESS.address}.`,
    keywords: ['איסוף עצמי', 'איסוף', 'דימונה'],
    pages: ['shipping', 'cart'],
    priority: 5,
    cta: CTA_WA_GENERAL,
  },
  {
    id: 'shipping-physical-store',
    category: 'shipping',
    question: 'האם קיימת חנות פיזית במקום?',
    fullAnswer:
      'לא. הכתובת מיועדת לאיסוף עצמי בתיאום מראש בלבד ואינה חנות פיזית הפתוחה לקהל.',
    shortAnswer: 'אין חנות פיזית — הכתובת משמשת לאיסוף עצמי בתיאום מראש בלבד.',
    keywords: ['חנות', 'פיזית', 'דימונה', 'ביקור'],
    pages: ['shipping'],
    priority: 6,
  },

  // ═══ קטגוריה 4 — מועדון הפרימיום, קופונים ונקודות ═══

  {
    id: 'club-benefits',
    category: 'club',
    question: 'מה מקבלים בהצטרפות למועדון?',
    fullAnswer:
      'המצטרפים למועדון מקבלים שתי הטבות:\n' +
      '• 5% הנחה על ההזמנה הראשונה.\n' +
      '• 10% מסכום המוצרים ברכישה חוזר כיתרה לרכישה הבאה (בקטגוריית כיפות הצבירה היא 5%, ובדרגת זהב — 12%).',
    shortAnswer:
      'חברי המועדון מקבלים 5% הנחה על ההזמנה הראשונה, ו-10% מסכום המוצרים חוזר כיתרה לרכישה הבאה.',
    keywords: ['מועדון', 'הטבות', 'הצטרפות', '5 אחוז', '10 אחוז'],
    pages: ['club', 'cart'],
    priority: 1,
    cta: CTA_CLUB,
  },
  {
    id: 'club-coupon-how',
    category: 'club',
    question: 'איך מקבלים את קוד הקופון של 5%?',
    fullAnswer:
      'לאחר מילוי פרטי ההצטרפות, קוד הקופון מופיע מיד באתר ונשלח גם למייל.\n' +
      'לא מצאתם את המייל? מומלץ לבדוק גם בתיקיית הספאם או קידומי המכירות.',
    shortAnswer:
      'הקוד מופיע מיד באתר לאחר ההצטרפות ונשלח גם במייל. כדאי לבדוק גם בתיקיית הספאם או קידומי המכירות.',
    keywords: ['קופון', 'קוד', '5 אחוז', 'מייל', 'ספאם'],
    pages: ['club', 'cart'],
    priority: 2,
  },
  {
    id: 'club-coupon-all-products',
    category: 'club',
    question: 'האם קופון ה-5% תקף על כל המוצרים?',
    fullAnswer: 'כן. קופון ההצטרפות תקף על כל המוצרים באתר, וללא סכום מינימום להזמנה.',
    shortAnswer: 'כן. קופון ההצטרפות תקף על כל המוצרים וללא סכום מינימום.',
    keywords: ['קופון', 'כל המוצרים', 'מינימום', 'תקף'],
    pages: ['club'],
    priority: 3,
  },
  {
    id: 'club-coupon-stacking',
    category: 'club',
    question: 'האם ניתן לשלב את הקופון עם מבצעים נוספים?',
    fullAnswer: 'כן. ניתן לשלב את קופון ההצטרפות עם מבצעים וקופונים נוספים.',
    shortAnswer: 'כן. ניתן לשלב את קופון ההצטרפות עם מבצעים וקופונים נוספים.',
    keywords: ['קופון', 'מבצעים', 'שילוב', 'כפל הנחות'],
    pages: ['club', 'cart'],
    priority: 4,
  },
  {
    id: 'club-coupon-expiry',
    category: 'club',
    question: 'לכמה זמן קופון ההצטרפות תקף?',
    fullAnswer:
      'לקופון ההצטרפות אין תאריך תפוגה קבוע — הוא תקף כל עוד ההטבה פעילה באתר.',
    shortAnswer: 'לקופון אין תאריך תפוגה קבוע — הוא תקף כל עוד ההטבה פעילה באתר.',
    keywords: ['קופון', 'תוקף', 'תפוגה'],
    pages: ['club'],
    priority: 5,
  },
  {
    id: 'club-how-to-join',
    category: 'club',
    question: 'איך מצטרפים למועדון הפרימיום?',
    fullAnswer:
      'לוחצים על אייקון דמות האיש בחלק העליון בצד שמאל של האתר ומתחברים באמצעות חשבון Google.',
    shortAnswer:
      'לחצו על אייקון דמות האיש בחלק העליון בצד שמאל והתחברו באמצעות חשבון Google.',
    keywords: ['הצטרפות', 'מועדון', 'גוגל', 'התחברות'],
    pages: ['club'],
    priority: 6,
    cta: CTA_CLUB,
  },
  {
    id: 'club-cashback-how',
    category: 'club',
    question: 'כיצד מתקבל ההחזר של 10%?',
    fullAnswer:
      'לאחר התשלום, 10% מסכום המוצרים מתווספים כיתרה באזור האישי שלכם, בתנאי שאתם מחוברים למועדון הפרימיום.\n' +
      'בקטגוריית כיפות הצבירה היא 5%, וחברי דרגת זהב צוברים 12%.',
    shortAnswer:
      'לאחר התשלום, 10% מסכום המוצרים מתווספים כיתרה באזור האישי — בתנאי שאתם מחוברים למועדון.',
    keywords: ['החזר', 'נקודות', '10 אחוז', 'יתרה', 'צבירה'],
    pages: ['club', 'account'],
    priority: 7,
  },
  {
    id: 'club-cashback-after-discounts',
    category: 'club',
    question: 'האם ההחזר מחושב אחרי ההנחות?',
    fullAnswer: 'כן. ההחזר מחושב לפי הסכום ששולם בפועל על המוצרים לאחר הנחות וקופונים.',
    shortAnswer: 'כן. ההחזר מחושב על הסכום ששולם בפועל, אחרי הנחות וקופונים.',
    keywords: ['החזר', 'הנחות', 'חישוב'],
    pages: ['club'],
    priority: 8,
  },
  {
    id: 'club-cashback-shipping',
    category: 'club',
    question: 'האם צוברים החזר גם על משלוח?',
    fullAnswer: 'לא. ההחזר נצבר על המוצרים בלבד ולא על עלות המשלוח.',
    shortAnswer: 'לא. הצבירה היא על המוצרים בלבד, לא על המשלוח.',
    keywords: ['החזר', 'משלוח', 'צבירה'],
    pages: ['club'],
    priority: 9,
  },
  {
    id: 'club-cashback-on-points',
    category: 'club',
    question: 'האם צוברים החזר גם על חלק ששולם בנקודות?',
    fullAnswer: 'כן. אתם צוברים החזר גם על חלק מסכום המוצרים ששולם באמצעות נקודות.',
    shortAnswer: 'כן. צוברים החזר גם על החלק ששולם בנקודות.',
    keywords: ['נקודות', 'צבירה', 'החזר'],
    pages: ['club'],
    priority: 10,
  },
  {
    id: 'club-points-when',
    category: 'club',
    question: 'מתי הנקודות מתווספות?',
    fullAnswer: 'הנקודות מתווספות לאחר התשלום, בתנאי שאתם מחוברים למועדון הפרימיום.',
    shortAnswer: 'הנקודות מתווספות מיד לאחר התשלום, בתנאי שאתם מחוברים למועדון.',
    keywords: ['נקודות', 'מתי', 'תשלום'],
    pages: ['club', 'account'],
    priority: 11,
  },
  {
    id: 'club-retroactive',
    category: 'club',
    question: 'האם ניתן לקבל נקודות על הזמנות קודמות?',
    fullAnswer:
      'כן. כשאתם מתחברים למועדון הפרימיום, המערכת משייכת אוטומטית את כל ההזמנות הקודמות שבוצעו באמצעות אותה כתובת מייל.',
    shortAnswer:
      'כן. לאחר ההתחברות, נקודות עבור כל ההזמנות הקודמות שבוצעו באותה כתובת מייל מתווספות אוטומטית.',
    keywords: ['הזמנות קודמות', 'רטרואקטיבי', 'נקודות'],
    pages: ['club', 'account'],
    priority: 12,
  },
  {
    id: 'club-email-match',
    category: 'club',
    question: 'כיצד המערכת מזהה את ההזמנות הקודמות?',
    fullAnswer: 'לפי כתובת המייל של ההזמנה ושל חשבון Google שאיתו התחברתם.',
    shortAnswer: 'לפי כתובת המייל של ההזמנה ושל חשבון Google.',
    keywords: ['מייל', 'זיהוי', 'הזמנות קודמות'],
    pages: ['club', 'account'],
    priority: 13,
  },
  {
    id: 'club-merge-emails',
    category: 'club',
    question: 'האם ניתן לאחד נקודות מהזמנות שנעשו עם כתובות מייל שונות?',
    fullAnswer: 'לא. לא ניתן לאחד יתרות שנצברו תחת כתובות מייל שונות.',
    shortAnswer: 'לא. לא ניתן לאחד יתרות מכתובות מייל שונות.',
    keywords: ['איחוד', 'מייל אחר', 'כתובות שונות'],
    pages: ['club', 'account'],
    priority: 14,
  },
  {
    id: 'club-transfer',
    category: 'club',
    question: 'האם הנקודות ניתנות להעברה ללקוח אחר?',
    fullAnswer: 'לא. הנקודות והיתרה הן אישיות ואינן ניתנות להעברה.',
    shortAnswer: 'לא. הנקודות אישיות ואינן ניתנות להעברה.',
    keywords: ['העברה', 'נקודות', 'לקוח אחר'],
    pages: ['club'],
    priority: 15,
  },
  {
    id: 'club-points-expiry',
    category: 'club',
    question: 'האם לנקודות יש תוקף?',
    fullAnswer: 'לא. הנקודות נשארות באזור האישי ללא הגבלת זמן עד למימושן.',
    shortAnswer: 'לנקודות אין תאריך תפוגה — הן נשמרות עד למימוש.',
    keywords: ['תוקף', 'נקודות', 'תפוגה'],
    pages: ['club'],
    priority: 16,
  },
  {
    id: 'club-redeem-limit',
    category: 'club',
    question: 'כמה נקודות ניתן לממש בכל רכישה?',
    fullAnswer:
      'ניתן לממש נקודות עד 50% מסכום המוצרים בעגלה.\n' +
      'מגבלת ה-50% אינה כוללת את עלות המשלוח.',
    shortAnswer: 'ניתן לממש נקודות עד 50% מסכום המוצרים בעגלה (לא כולל משלוח).',
    keywords: ['מימוש', 'נקודות', '50 אחוז', 'מגבלה'],
    pages: ['club', 'cart', 'checkout'],
    priority: 17,
  },
  {
    id: 'club-redeem-minimum',
    category: 'club',
    question: 'האם יש סכום מינימום למימוש נקודות?',
    fullAnswer:
      'לא. ניתן לממש נקודות בכל סכום הזמנה, כל עוד המימוש אינו עולה על 50% מסכום המוצרים בעגלה.',
    shortAnswer: 'אין מינימום — אפשר לממש בכל סכום, עד 50% מסכום המוצרים.',
    keywords: ['מינימום', 'מימוש', 'נקודות'],
    pages: ['club'],
    priority: 18,
  },
  {
    id: 'club-points-with-deals',
    category: 'club',
    question: 'האם ניתן להשתמש בנקודות יחד עם מבצעים וקופונים?',
    fullAnswer: 'כן. ניתן לשלב נקודות עם קופון ההצטרפות ועם מבצעים נוספים.',
    shortAnswer: 'כן. אפשר לשלב נקודות עם קופון ההצטרפות ועם מבצעים.',
    keywords: ['נקודות', 'מבצעים', 'קופון', 'שילוב'],
    pages: ['club', 'cart'],
    priority: 19,
  },
  {
    id: 'club-points-shipping',
    category: 'club',
    question: 'האם אפשר להשתמש בנקודות לתשלום על משלוח?',
    fullAnswer: 'לא. ניתן לממש נקודות עבור המוצרים בלבד ולא עבור עלות המשלוח.',
    shortAnswer: 'לא. נקודות ניתנות למימוש על המוצרים בלבד, לא על המשלוח.',
    keywords: ['נקודות', 'משלוח', 'מימוש'],
    pages: ['club'],
    priority: 20,
  },

  // ═══ קטגוריה 5 — מחירים, יחידות ומבצעי כמות ═══

  {
    id: 'pricing-per-unit',
    category: 'pricing',
    question: 'האם המחיר באתר הוא ליחידה או למארז?',
    fullAnswer:
      'המחיר שמוצג באתר הוא תמיד מחיר ליחידה.\n' +
      'גם כאשר קיים מבצע חבילה, המחיר הבסיסי של המוצר מוצג ליחידה וההנחה מחושבת בהתאם לכמות בעגלה.',
    shortAnswer: 'המחיר שמוצג באתר הוא תמיד מחיר ליחידה.',
    keywords: ['מחיר', 'יחידה', 'מארז', 'חבילה'],
    pages: ['cart'],
    priority: 1,
  },
  {
    id: 'pricing-min-cheap-items',
    category: 'pricing',
    question: 'האם קיימת כמות מינימלית במוצרים זולים?',
    fullAnswer:
      'במוצרים שמחירם נמוך מ-15 ₪, למעט כיפות, ניתן להזמין בכמות של 5 יחידות ומעלה.',
    shortAnswer: 'מוצרים מתחת ל-15 ₪ (למעט כיפות) — מינימום 5 יחידות.',
    keywords: ['מינימום', 'כמות', 'מוצרים זולים'],
    priority: 2,
  },
  {
    id: 'pricing-bundle-deals',
    category: 'pricing',
    question: 'אילו מבצעי חבילות קיימים לכיפות?',
    fullAnswer:
      'קיימים מבצעי חבילות קבועים, בהתאם לכיפה:\n' +
      '• 3 ב-100 ₪.\n' +
      '• 4 ב-100 ₪.\n' +
      '• 5 ב-100 ₪.\n' +
      '• 12 ב-100 ₪.\n' +
      'לכל כיפה מצוין בדף המוצר לאיזה מבצע היא שייכת.',
    shortAnswer:
      'יש מבצעי 3 ב-100, 4 ב-100, 5 ב-100 ו-12 ב-100 ₪. בדף כל כיפה מצוין לאיזה מבצע היא שייכת.',
    keywords: ['מבצע', 'חבילה', '3 ב-100', 'כיפות'],
    pages: ['cart'],
    priority: 3,
  },
  {
    id: 'pricing-bundle-auto',
    category: 'pricing',
    question: 'האם ההנחה במבצע החבילה מתעדכנת אוטומטית?',
    fullAnswer:
      'כן. כאשר מוסיפים לעגלה את הכמות המתאימה, ההנחה מתעדכנת אוטומטית בסל.',
    shortAnswer: 'כן. ההנחה מתעדכנת אוטומטית בסל כשמגיעים לכמות המתאימה.',
    keywords: ['מבצע', 'אוטומטי', 'הנחה', 'סל'],
    pages: ['cart'],
    priority: 4,
  },
  {
    id: 'pricing-mix-models',
    category: 'pricing',
    question: 'האם אפשר לערבב דגמים, צבעים ומידות בחבילה?',
    fullAnswer:
      'כן. ניתן לשלב דגמים, צבעים ומידות שונות, כל עוד כל הפריטים שייכים לאותה מדרגת מבצע.',
    shortAnswer:
      'כן, אפשר לערבב דגמים, צבעים ומידות — כל עוד כולם שייכים לאותה מדרגת מבצע.',
    keywords: ['ערבוב', 'דגמים', 'צבעים', 'מידות', 'חבילה'],
    pages: ['cart'],
    priority: 5,
  },
  {
    id: 'pricing-bundle-stacking',
    category: 'pricing',
    question: 'האם אפשר לשלב מבצע חבילה עם הנחות נוספות?',
    fullAnswer:
      'כן. מבצעי החבילות ניתנים לשילוב עם הנחות נוספות, קופון ההצטרפות ונקודות המועדון, בהתאם לכללים הפעילים באתר.',
    shortAnswer:
      'כן. מבצעי חבילות ניתנים לשילוב עם קופון ההצטרפות ונקודות המועדון.',
    keywords: ['שילוב', 'מבצע', 'קופון', 'הנחות'],
    pages: ['cart'],
    priority: 6,
  },

  // ═══ קטגוריה 6 — מוצרי סת״ם וכשרות ═══

  {
    id: 'stam-who-writes',
    category: 'stam',
    question: 'מי כותב את מוצרי הסת״ם באתר?',
    fullAnswer:
      'מוצרי הסת״ם באתר נכתבים בידי סופרי סת״ם מוסמכים, שעברו מבחן ובדיקה מטעמנו ונמצאו מתאימים.',
    shortAnswer:
      'מוצרי הסת״ם נכתבים בידי סופרי סת״ם מוסמכים שעברו מבחן ובדיקה מטעמנו.',
    keywords: ['סופר', 'סתם', 'מוסמך', 'כותב'],
    pages: ['stam'],
    priority: 1,
  },
  {
    id: 'stam-direct-purchase',
    category: 'stam',
    question: 'האם אפשר לקנות ישירות מסופר דרך הוואטסאפ?',
    fullAnswer:
      'ניתן ליצור קשר ישירות עם סופר דרך שירות הוואטסאפ, אך רכישה ישירה שאינה מתבצעת דרך האתר אינה נמצאת באחריות האתר.\n' +
      'כדי ליהנות מבדיקות האיכות, מאחריות האתר ומתיעוד מסודר, מומלץ להשלים את הרכישה והתשלום דרך האתר.',
    shortAnswer:
      'אפשר לדבר עם סופר בוואטסאפ, אבל רכישה מחוץ לאתר אינה באחריות האתר. כדי ליהנות מבדיקות האיכות והאחריות — מומלץ לרכוש ולשלם דרך האתר.',
    keywords: ['רכישה ישירה', 'סופר', 'וואטסאפ', 'אחריות'],
    pages: ['stam'],
    priority: 2,
  },
  {
    id: 'stam-checks',
    category: 'stam',
    question: 'אילו בדיקות עובר מוצר סת״ם שנרכש דרך האתר?',
    fullAnswer:
      'המוצר עובר:\n' +
      '• הגהת אדם.\n' +
      '• הגהת מחשב.\n' +
      '• בדיקת איכות הכתב.\n' +
      '• בדיקת איכות הקלף.\n' +
      '• אימות שהמוצר שהתקבל כשר ותואם להזמנה.',
    shortAnswer:
      'כל מוצר סת״ם שנרכש באתר עובר הגהת אדם, הגהת מחשב, בדיקת איכות הכתב והקלף, ואימות התאמה להזמנה.',
    keywords: ['בדיקות', 'הגהה', 'כשרות', 'איכות'],
    pages: ['stam'],
    priority: 3,
  },
  {
    id: 'stam-certificate',
    category: 'stam',
    question: 'האם מקבלים תעודת כשרות?',
    fullAnswer: 'כן. עם מוצר הסת״ם מקבלים תעודת כשרות ואישור הגהה.',
    shortAnswer: 'כן. מוצרי הסת״ם מגיעים עם תעודת כשרות ואישור הגהה.',
    keywords: ['תעודה', 'כשרות', 'אישור הגהה'],
    pages: ['stam'],
    priority: 4,
  },
  {
    id: 'stam-transparency',
    category: 'stam',
    question: 'האם ניתן לראות מי כתב ומי הגיה את המוצר?',
    fullAnswer: 'כן. באתר ניתן לראות מי הסופר שכתב את המוצר ומי המגיה שבדק אותו.',
    shortAnswer: 'כן. באתר רואים מי הסופר שכתב ומי המגיה שבדק.',
    keywords: ['סופר', 'מגיה', 'שקיפות'],
    pages: ['stam'],
    priority: 5,
  },
  {
    id: 'stam-photo',
    category: 'stam',
    question: 'האם נשמרת תמונה של הקלף?',
    fullAnswer: 'כן. נשמרת תמונה של הקלף או מוצר הסת״ם לפני מסירתו ללקוח.',
    shortAnswer: 'כן. נשמרת תמונה של הקלף לפני המסירה.',
    keywords: ['תמונה', 'קלף', 'תיעוד'],
    pages: ['stam'],
    priority: 6,
  },
  {
    id: 'stam-tefillin-types',
    category: 'stam',
    question: 'אילו סוגי תפילין מוצעים באתר?',
    fullAnswer:
      'באתר מוצעים תפילין מעור בהמה גסה בלבד, הנחשבים למהודרים יותר, ובמבחר סוגי כתבים.',
    shortAnswer: 'תפילין מעור בהמה גסה בלבד, הנחשבים למהודרים יותר, במבחר סוגי כתבים.',
    keywords: ['תפילין', 'בהמה גסה', 'כתבים', 'הידור'],
    pages: ['stam'],
    priority: 7,
  },
  {
    id: 'stam-mezuzot-types',
    category: 'stam',
    question: 'אילו מזוזות קיימות באתר?',
    fullAnswer:
      'באתר ניתן למצוא מזוזות במגוון רחב של סוגים, כתבים, רמות הידור וגדלים.',
    shortAnswer: 'מזוזות במגוון סוגים, כתבים, רמות הידור וגדלים.',
    keywords: ['מזוזה', 'מזוזות', 'סוגים', 'הידור'],
    pages: ['stam'],
    priority: 8,
  },
  {
    id: 'stam-advice',
    category: 'stam',
    question: 'האם ניתן לקבל ייעוץ אישי?',
    fullAnswer:
      'כן. ניתן לקבל ייעוץ אישי לפני רכישת תפילין, מזוזה, מגילה או כל מוצר סת״ם אחר באמצעות כפתור הוואטסאפ באתר.',
    shortAnswer: 'כן. אפשר לקבל ייעוץ אישי לפני כל רכישת סת״ם דרך הוואטסאפ.',
    keywords: ['ייעוץ', 'התייעצות', 'עזרה בבחירה'],
    pages: ['stam'],
    priority: 9,
    cta: CTA_WA_STAM,
  },
  {
    id: 'stam-warranty',
    category: 'stam',
    question: 'האם קיימת אחריות על מוצרי סת״ם?',
    fullAnswer:
      'כן. האחריות תקפה למשך שנה ממועד הרכישה, אם נמצא שהמוצר היה פגום מלכתחילה.\n' +
      'ניתן לבדוק זאת באמצעות התמונה של הקלף שנשמרה ונשלחה בזמן הרכישה.\n' +
      'האחריות חלה על כל מוצרי הסת״ם, כולל מזוזות, תפילין ומגילות.\n' +
      'אין אחריות על נזקים שנגרמו לאחר המסירה עקב לחות, חום, רטיבות, אחסון לא מתאים או שימוש לא תקין.',
    shortAnswer:
      'יש אחריות לשנה על פגם שהיה קיים מלכתחילה (נבדק מול תמונת הקלף). אין אחריות על נזק מחום, לחות או אחסון לא מתאים.',
    keywords: ['אחריות', 'פגום', 'שנה', 'פסול'],
    pages: ['stam', 'shipping'],
    priority: 10,
  },

  // ═══ קטגוריה 7 — סטטוס הזמנה ושירות לקוחות ═══

  {
    id: 'orders-status-check',
    category: 'orders',
    question: 'איך בודקים סטטוס הזמנה?',
    fullAnswer:
      'לקוח המחובר למועדון הפרימיום באמצעות חשבון Google יכול לראות את סטטוס ההזמנה באזור האישי באתר.\n' +
      'בנוסף, ניתן תמיד לפנות אלינו בוואטסאפ.',
    shortAnswer:
      'סטטוס ההזמנה מופיע באזור האישי לאחר התחברות עם Google. אפשר גם לשלוח לנו את קוד ההזמנה בוואטסאפ.',
    keywords: ['סטטוס', 'הזמנה', 'מעקב', 'איפה ההזמנה'],
    pages: ['account', 'checkout'],
    priority: 1,
    cta: CTA_ACCOUNT,
  },
  {
    id: 'orders-status-detail',
    category: 'orders',
    question: 'איזה פרט צריך לשלוח כדי לברר סטטוס הזמנה?',
    fullAnswer: 'יש לשלוח את קוד ההזמנה כדי שנוכל לאתר אותה במהירות.',
    shortAnswer: 'שלחו לנו את קוד ההזמנה ונאתר אותה במהירות.',
    keywords: ['קוד הזמנה', 'מספר הזמנה', 'בירור'],
    pages: ['account'],
    priority: 2,
    cta: CTA_WA_STATUS,
  },
  {
    id: 'orders-not-showing',
    category: 'orders',
    question: 'מדוע הזמנה אינה מופיעה באזור האישי?',
    fullAnswer:
      'ודאו שהתחברתם עם אותו חשבון Google שכתובת המייל שלו זהה לכתובת ששימשה בהזמנה.\n' +
      'אם ההזמנה עדיין לא מופיעה — שלחו לנו את קוד ההזמנה בוואטסאפ ונבדוק.',
    shortAnswer:
      'ודאו שהתחברתם עם חשבון Google שכתובת המייל שלו זהה לזו של ההזמנה. אם עדיין לא מופיעה — שלחו לנו את קוד ההזמנה בוואטסאפ.',
    keywords: ['הזמנה לא מופיעה', 'אזור אישי', 'חסרה'],
    pages: ['account'],
    priority: 3,
    cta: CTA_WA_STATUS,
  },
  {
    id: 'orders-hours',
    category: 'orders',
    question: 'מהן שעות הפעילות של שירות הלקוחות?',
    fullAnswer: `שעות הפעילות של שירות הלקוחות: ${HOURS}.`,
    shortAnswer: `שעות הפעילות: ${HOURS}.`,
    keywords: ['שעות', 'פעילות', 'שירות', 'מתי'],
    pages: ['account'],
    priority: 4,
  },
  {
    id: 'orders-channels',
    category: 'orders',
    question: 'באילו ערוצים ניתן לקבל שירות?',
    fullAnswer:
      'ניתן לקבל שירות בוואטסאפ, בטלפון, במייל ובצ׳אט באתר.\n' +
      'הדרך המומלצת והמהירה ביותר היא וואטסאפ.',
    shortAnswer: 'וואטסאפ (המומלץ והמהיר ביותר), טלפון, מייל וצ׳אט באתר.',
    keywords: ['ערוצים', 'טלפון', 'מייל', 'צאט', 'יצירת קשר'],
    pages: ['account'],
    priority: 5,
    cta: CTA_WA_GENERAL,
  },
  {
    id: 'orders-response-time',
    category: 'orders',
    question: 'מה זמן המענה בוואטסאפ?',
    fullAnswer: 'במהלך שעות הפעילות אנו עונים בוואטסאפ בדרך כלל בתוך כדקה.',
    shortAnswer: 'בשעות הפעילות אנו עונים בוואטסאפ בדרך כלל בתוך כדקה.',
    keywords: ['זמן מענה', 'וואטסאפ', 'כמה זמן עונים'],
    pages: ['account'],
    priority: 6,
  },

  // ═══ קטגוריה 8 — תשלומים ═══

  {
    id: 'payments-methods',
    category: 'payments',
    question: 'באילו אמצעי תשלום ניתן לשלם?',
    fullAnswer: `כרגע ניתן לשלם באמצעות כרטיסי אשראי (${CARD_LABELS}) ובאמצעות Bit.`,
    shortAnswer: 'ניתן לשלם בכרטיס אשראי או ב-Bit.',
    keywords: ['תשלום', 'אשראי', 'bit', 'ביט', 'אמצעי תשלום'],
    pages: ['checkout', 'cart'],
    priority: 1,
  },
  {
    id: 'payments-installments',
    category: 'payments',
    question: 'האם אפשר לשלם בתשלומים?',
    fullAnswer: 'כן. ניתן לחלק את התשלום לעד 4 תשלומים.',
    shortAnswer: 'כן, עד 4 תשלומים.',
    keywords: ['תשלומים', 'פריסה', 'לחלק'],
    pages: ['checkout'],
    priority: 2,
  },

  // ═══ קטגוריה 9 — שינויים, ביטולים, החזרות ואחריות ═══

  {
    id: 'returns-regular',
    category: 'returns',
    question: 'האם ניתן להחזיר מוצר רגיל?',
    fullAnswer:
      'כן. מוצר רגיל שאינו מותאם אישית ניתן להחזיר בתוך 14 ימים ולקבל זיכוי, בהתאם לתנאי האתר ולמצב המוצר.',
    shortAnswer:
      'מוצר רגיל ניתן להחזיר בתוך 14 ימים ולקבל זיכוי, בהתאם למדיניות האתר.',
    keywords: ['החזרה', 'החזר', '14 יום', 'זיכוי', 'ביטול', 'ביטול עסקה'],
    pages: ['shipping', 'home'],
    priority: 1,
    cta: { label: 'למדיניות ההחזרות המלאה', href: '/legal/returns', type: 'internal' },
  },
  {
    id: 'returns-custom',
    category: 'returns',
    question: 'האם ניתן להחזיר מוצר בעיצוב אישי?',
    fullAnswer:
      'לא. מוצר שעבר עיצוב אישי, הדפסה, הטבעה, רקמה או התאמה מיוחדת ללקוח אינו ניתן להחזרה.',
    shortAnswer: 'לא. מוצר שהוכן בעיצוב אישי אינו ניתן להחזרה.',
    keywords: ['החזרה', 'עיצוב אישי', 'מותאם אישית'],
    pages: ['shipping', 'product-custom'],
    priority: 2,
  },
  {
    id: 'returns-defective',
    category: 'returns',
    question: 'מה קורה אם מוצר מעוצב הגיע פגום או אינו תואם להדמיה?',
    fullAnswer:
      'אם המוצר הגיע פגום או שההדפסה אינה תואמת להדמיה שאישרתם, תקבלו הזמנה חדשה או החזר כספי, בהתאם למקרה.\n' +
      'אם המוצר תואם להדמיה שאושרה, לא ניתן לדרוש החזר בגלל שינוי דעה ביחס לעיצוב.',
    shortAnswer:
      'מוצר פגום או שאינו תואם להדמיה שאושרה — תקבלו הזמנה חדשה או החזר כספי, בהתאם למקרה.',
    keywords: ['פגום', 'לא תואם', 'הדמיה', 'החזר כספי'],
    pages: ['shipping', 'product-custom'],
    priority: 3,
  },
  {
    id: 'returns-change-order',
    category: 'returns',
    question: 'האם אפשר לשנות את ההזמנה לאחר התשלום?',
    fullAnswer:
      'כן. ניתן לשנות כתובת, צבע, כמות או הקדשה כל עוד ההדמיה עדיין לא אושרה.',
    shortAnswer: 'כן — כתובת, צבע, כמות והקדשה, כל עוד ההדמיה עדיין לא אושרה.',
    keywords: ['שינוי הזמנה', 'אחרי תשלום'],
    pages: ['checkout', 'account'],
    priority: 4,
  },
  {
    id: 'returns-change-address',
    category: 'returns',
    question: 'האם אפשר לשנות את כתובת המשלוח לאחר אישור ההדמיה?',
    fullAnswer:
      'כן. ניתן לשנות את כתובת המשלוח כל עוד ההזמנה טרם נמסרה לחברת המשלוחים.',
    shortAnswer: 'כן, כל עוד ההזמנה טרם נמסרה לחברת המשלוחים.',
    keywords: ['כתובת', 'שינוי כתובת', 'משלוח'],
    pages: ['checkout', 'shipping', 'account'],
    priority: 5,
  },
];

// ── עזרי גישה ─────────────────────────────────────────────────────────────────

/** תאריך עדכון אחרון של מאגר התוכן — לעדכן בכל שינוי מהותי */
export const FAQ_UPDATED_AT = '2026-07-12';

/** מחזיר את השאלות של עמוד מסוים, ממוינות לפי priority, עד max */
export function getFaqForPage(page: FaqPageKey, max = 8): FAQItem[] {
  return FAQ_ITEMS
    .filter(item => item.pages?.includes(page))
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    .slice(0, max);
}

/**
 * מחזיר שאלות לפי רשימת מזהים מפורשת, **בסדר שנמסר**.
 *
 * למה זה קיים: getFaqForPage ממיין לפי priority הגלובלי, שמשותף לכל העמודים
 * ולדף ה-FAQ. כשרוצים סדר ספציפי בעמוד אחד (למשל דף הבית — משלוח קודם),
 * שינוי ה-priority היה מזיז את השאלה גם בכל שאר המקומות. כאן הסדר מקומי.
 *
 * מזהה שלא נמצא פשוט מדולג — כך שמחיקת שאלה לא שוברת עמוד.
 */
export function getFaqByIds(ids: string[]): FAQItem[] {
  const byId = new Map(FAQ_ITEMS.map(i => [i.id, i]));
  return ids.map(id => byId.get(id)).filter(Boolean) as FAQItem[];
}

/** מחזיר את השאלות של קטגוריה, ממוינות לפי priority */
export function getFaqByCategory(category: FaqCategoryId): FAQItem[] {
  return FAQ_ITEMS
    .filter(item => item.category === category)
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
}

/**
 * נרמול טקסט עברי לחיפוש: הסרת גרשיים/גרש/ניקוד, אותיות סופיות,
 * ו-lowercase ללטינית — כדי שחיפוש "סתם" ימצא "סת״ם" וכו'.
 */
export function normalizeHebrew(text: string): string {
  return text
    .toLowerCase()
    .replace(/["'`“”׳״]/g, '')
    .replace(/[֑-ׇ]/g, '') // ניקוד וטעמים
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** חיפוש בשאלות: שאלה, תשובה ומילות מפתח, עם נרמול עברית */
export function searchFaq(query: string, items: FAQItem[] = FAQ_ITEMS): FAQItem[] {
  const q = normalizeHebrew(query);
  if (!q) return items;
  const terms = q.split(' ').filter(Boolean);
  return items.filter(item => {
    const haystack = normalizeHebrew(
      `${item.question} ${item.fullAnswer} ${(item.keywords ?? []).join(' ')}`,
    );
    return terms.every(t => haystack.includes(t));
  });
}
