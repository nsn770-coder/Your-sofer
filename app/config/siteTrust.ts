/**
 * siteTrust.ts — מקור אמת יחיד לכל פרטי האמון, העסק ואמצעי התשלום באתר.
 *
 * כל רכיב שמציג פרטי עסק, אמצעי תשלום, טקסט אבטחה, דירוג לקוחות או
 * קישורי מדיניות — קורא מהקובץ הזה. אין לפזר טקסטים/לוגואים ידנית ברכיבים.
 *
 * ⚠️ לפני שינוי enabledPaymentMethods: לוודא שהאמצעי פעיל בפועל בסליקה (Sumit).
 *    אסור להציג אמצעי תשלום שאינו פעיל — זה פוגע באמון ועלול להיות הטעיה.
 */

// ── אמצעי תשלום ───────────────────────────────────────────────────────────────

export type PaymentMethodId =
  | 'visa'
  | 'mastercard'
  | 'bit'
  | 'amex'
  | 'diners'
  | 'isracard'
  | 'paypal'
  | 'applePay'
  | 'googlePay';

export interface PaymentMethod {
  id: PaymentMethodId;
  /** שם נגיש (alt) — שמות מותג נשארים בשפת המותג */
  label: string;
  /** נתיב SVG מקומי ב-public. null = תג טקסט (למשל bit, שאין לו SVG רשמי זמין) */
  logoSrc: string | null;
  /** יחס רוחב-גובה מקורי של קובץ הלוגו (לשמירת פרופורציות ומניעת CLS) */
  aspectRatio: number;
}

/**
 * אמצעי תשלום פעילים בפועל, בסדר הרלוונטיות ללקוח הישראלי.
 *
 * מאומת בקוד: כרטיסי אשראי דרך Sumit + bit (דף תשלום Sumit).
 * ישראכרט ודיינרס נוספו עם לוגואים רשמיים שסופקו ע"י בעל האתר.
 * amex נוסף לבקשת בעל האתר (07/2026).
 * אם אמצעי כלשהו אינו פעיל בהסכם הסליקה — למחוק את השורה שלו כאן.
 * אין להוסיף paypal / applePay / googlePay לפני אישור שהם פעילים.
 */
export const ENABLED_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'visa',       label: 'Visa',             logoSrc: '/payment/visa.svg',       aspectRatio: 780 / 500 },
  { id: 'mastercard', label: 'Mastercard',       logoSrc: '/payment/mastercard.svg', aspectRatio: 780 / 500 },
  { id: 'isracard',   label: 'ישראכרט',          logoSrc: '/payment/isracard.png',   aspectRatio: 4.0 },
  { id: 'amex',       label: 'American Express', logoSrc: '/payment/amex.svg',       aspectRatio: 780 / 500 },
  { id: 'bit',        label: 'bit',              logoSrc: '/payment/bit.png',        aspectRatio: 1.0 },
  { id: 'diners',     label: 'Diners Club',      logoSrc: '/payment/diners.png',     aspectRatio: 3.2 },
];

// ── פרטי עסק ──────────────────────────────────────────────────────────────────

export const BUSINESS = {
  name: 'Your Sofer',
  legalName: 'בואהרון ניסן נסים',
  businessNumber: '304803810', // עוסק מורשה
  address: 'רחוב האורן 18, דימונה',
  phone: '058-4877-770',
  phoneHref: 'tel:0584877770',
  whatsappNumber: '058-747-9933',
  whatsappHref: 'https://wa.me/972587479933',
  supportEmail: 'support@your-sofer.com',
  /** שעות פעילות — כפי שמופיע במדיניות ההחזרות */
  supportHours: 'א׳–ה׳ 09:00–18:00',
} as const;

// ── קישורי מדיניות ────────────────────────────────────────────────────────────

export const POLICY_URLS = {
  returns: '/legal/returns',
  shipping: '/legal/shipping',
  privacy: '/legal/privacy',
  terms: '/legal/takanon',
  accessibility: '/legal/accessibility',
  contact: '/contact',
  /** דף השאלות והתשובות המרכזי (מקור תוכן: data/faq.ts) */
  faq: '/faq',
} as const;

// ── ביקורות והוכחה חברתית ────────────────────────────────────────────────────
// הנתונים מוצגים כבר היום בעמוד /reviews. אין להציג מספרים שונים באזורים שונים —
// עדכון רק כאן, ורק על בסיס נתון אמיתי (ביקורות מאושרות ב-Firestore / Google Business).

export const REVIEWS = {
  rating: 4.8,
  count: 247,
  url: '/reviews',
  /** נוסח קישור ניטרלי לשימוש כשלא רוצים להציג מספר */
  neutralLinkLabel: 'לקריאת חוות דעת של לקוחות',
} as const;

// ── משלוח ────────────────────────────────────────────────────────────────────

export const SHIPPING = {
  /** עלות משלוח רגיל — חייב להתאים ל-SHIPPING_REGULAR ב-CartContext */
  regularCost: 35,
  /** סף משלוח חינם — חייב להתאים ל-FREE_SHIPPING_THRESHOLD ב-CartContext */
  freeShippingThreshold: 500,
  freeShippingText: 'משלוח חינם בהזמנה מעל ₪500',
  carrierName: 'Sendit',
  trackingAvailable: true,
  standardDeliveryText: 'משלוח לכל הארץ עם מספר מעקב',
  /** ברירת מחדל לימי עסקים כשאין נתון פר-מוצר (product.days) */
  defaultDays: '7-10',
} as const;

// ── נוסחי אמון אחידים ────────────────────────────────────────────────────────
// נוסח עקבי בכל האתר. אין להמציא טענות: כל שורה כאן מגובה בקוד או במדיניות.

export const TRUST_TEXT = {
  paymentTitle: 'תשלום מאובטח',
  /** מאומת: הטוקניזציה מתבצעת בדפדפן מול Sumit — פרטי האשראי לא עוברים בשרת האתר */
  paymentBody: 'פרטי התשלום מועברים בצורה מאובטחת לספק הסליקה לצורך השלמת העסקה. פרטי האשראי אינם נשמרים באתר.',
  paymentShort: 'תשלום מאובטח ומוצפן',
  payWithLabel: 'אפשר לשלם באמצעות',
  securityLinkLabel: 'מידע נוסף על אבטחה ופרטיות',
  shippingShort: 'משלוח לכל הארץ עם מעקב',
  supportShort: 'שירות לקוחות אנושי ב-WhatsApp',
  returnsShort: 'ביטול והחזרה בהתאם למדיניות האתר',
  returnsLinkLabel: 'לפרטי מדיניות הביטולים',
  customMadeNotice: 'מוצר זה מיוצר בהתאמה אישית. תנאי הביטול עשויים להיות שונים ממוצר רגיל.',
} as const;
