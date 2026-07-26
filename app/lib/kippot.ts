// ── תמחור כיפות בהדפסה אישית — מקור אמת יחיד ─────────────────────────────────
// המדרגות חייבות להיות זהות למה שמוצג ב-FAQ (data/faq.ts):
//   פשתן: 30–49 → ₪14 | 50–99 → ₪12 | 100+ → ₪10  (כולל הדפסה)
//   סאטן: 30–49 → ₪8  | 50+  → ₪6                 (כולל עיצוב אישי)
// המינימום להזמנה הוא 30 יחידות (נאכף בעמודי ההזמנה).
// הזמנות מתחת ל-30 אינן זמינות באתר — פונים לוואטסאפ.

export const KIPA_MIN_QTY = 30;

/** תוספת הדפסה בצד שני — לכל כיפה */
export const KIPA_EXTRA_SIDE_PRICE = 1.5;

export type KipaMaterial = 'linen' | 'satin';

/** דגמים מסוג סאטן (לפי style id) — כל השאר פשתן */
export const SATIN_STYLE_IDS = new Set<string>(['satin-white']);

export const getKipaMaterial = (styleId: string): KipaMaterial =>
  SATIN_STYLE_IDS.has(styleId) ? 'satin' : 'linen';

export const KIPA_MATERIAL_LABELS: Record<KipaMaterial, string> = {
  linen: 'כיפה פשתן',
  satin: 'כיפת סאטן',
};

/**
 * שורת סל של "כיפות לאירועים בכמויות" (30+ יחידות, קטגוריית כיפות) —
 * מחירי המדרגות שם נמוכים ולא משאירים מרווח להנחה, ולכן השורה אינה
 * זכאית לקופונים (למשל ברכה5). חייב להיות זהה בקליינט (CartContext)
 * ובשרת (app/api/payment/route.ts), אחרת אימות הקופון ייכשל.
 */
export const isBulkEventKippotLine = (i: { cat?: string; quantity: number }): boolean =>
  i.cat === 'כיפות' && i.quantity >= KIPA_MIN_QTY;

export const getKipaUnitPrice = (q: number, material: KipaMaterial = 'linen'): number =>
  material === 'satin'
    ? (q < 50 ? 8 : 6)
    : (q < 50 ? 14 : q <= 99 ? 12 : 10);

// ── שיוך ברירת מחדל דגם ← מוצר בחנות (ניכוי מלאי) ────────────────────────────
// ערך ב-Firestore (settings/eventKippotStyles) גובר על ברירת המחדל הזו —
// היא קיימת כדי שדגמים חדשים יהיו משויכים מהרגע הראשון, בלי צעד ידני.
export const DEFAULT_STYLE_PRODUCT_MAP: Record<string, { productId: string; sku: string; name: string }> = {
  'satin-white': { productId: 'GA6IaHppba8peGVGHGud', sku: 'UK00321', name: 'כיפת סאטן' },
};
