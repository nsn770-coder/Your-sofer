import { FieldValue, type Firestore } from 'firebase-admin/firestore';

// ── ניכוי מלאי אוטומטי בעת הזמנה ─────────────────────────────────────────────
// מקור האמת למלאי הוא השדה `inStock` על מסמך המוצר — מספר אחד לכל מוצר,
// ללא תלות בכמה ספקים סיפקו אותו. שלוש הפעולות היחידות שמשנות אותו:
//   1. הזמנה משולמת  → inStock -= כמות שנרכשה   (הקוד הזה, אטומי)
//   2. קליטת סחורה   → inStock += כמות שהתקבלה  (InventoryTab)
//   3. ספירת מלאי    → inStock = מה שנספר בפועל (InventoryTab / עמוד האירועים)
//
// אידמפוטנטי: ההזמנה מסומנת `stockApplied: true` בתוך אותה טרנזקציה, ולכן
// קריאה כפולה (IPN חוזר של ביט, retry של Vercel) לא תנכה פעמיים.
//
// שיוך כיפות אירועים: שורת הכיפות בסל נושאת `productId` של המוצר שמשויך לדגם
// שנבחר (settings/eventKippotStyles), ולכן הניכוי מזהה לבד איזו כיפה נמכרה.

interface OrderItemLike {
  id?: string;
  productId?: string | null;
  quantity?: number;
  isGift?: boolean;
}

/** מזהי שורות שאינן מוצר פיזי (הדפסה, עיצוב) — לא מנכים עליהן מלאי */
const NON_STOCK_ID_PREFIXES = ['print-', 'shipping', 'coupon-', 'points-'];

function isStockBearing(item: OrderItemLike): boolean {
  const id = String(item.id ?? '');
  if (NON_STOCK_ID_PREFIXES.some(p => id.startsWith(p))) return false;
  return true;
}

/**
 * מנכה מהמלאי את הכמויות של הזמנה משולמת. בטוח לקריאה חוזרת.
 * לעולם לא זורק שגיאה החוצה — כישלון ניכוי מלאי לא אמור להפיל תשלום.
 *
 * @returns מפת productId → כמה נוכה, או null אם ההזמנה כבר טופלה
 */
export async function applyOrderStock(
  adminDb: Firestore,
  orderId: string,
): Promise<Record<string, number> | null> {
  try {
    const orderRef = adminDb.collection('orders').doc(orderId);

    return await adminDb.runTransaction(async tx => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) return null;
      const order = orderSnap.data() as { items?: OrderItemLike[]; stockApplied?: boolean };
      if (order.stockApplied) return null; // כבר נוכה — יציאה שקטה

      // צבירה לפי productId (שורות של אותו מוצר מתאחדות לניכוי אחד)
      const byProduct: Record<string, number> = {};
      for (const item of order.items ?? []) {
        if (item.isGift) continue;          // מתנות אינן במלאי הנמכר
        if (!isStockBearing(item)) continue;
        const pid = item.productId || item.id;
        const qty = Number(item.quantity) || 0;
        if (!pid || qty <= 0) continue;
        byProduct[pid] = (byProduct[pid] ?? 0) + qty;
      }

      const productIds = Object.keys(byProduct);
      if (!productIds.length) {
        tx.update(orderRef, { stockApplied: true, stockAppliedAt: FieldValue.serverTimestamp() });
        return {};
      }

      // כל הקריאות לפני כל הכתיבות — דרישת Firestore
      const refs = productIds.map(id => adminDb.collection('products').doc(id));
      const snaps = await tx.getAll(...refs);

      const applied: Record<string, number> = {};
      snaps.forEach((snap, i) => {
        if (!snap.exists) return;
        const pid  = productIds[i];
        const qty  = byProduct[pid];
        const data = snap.data() as { inStock?: number };
        // מוצר שמעולם לא נוהל לו מלאי — לא ממציאים לו מספר שלילי
        if (typeof data.inStock !== 'number') return;
        const next = Math.max(0, data.inStock - qty);
        tx.update(refs[i], {
          inStock:      next,
          outOfStock:   next === 0,
          stockUpdatedAt: FieldValue.serverTimestamp(),
        });
        applied[pid] = qty;
      });

      tx.update(orderRef, {
        stockApplied:   true,
        stockAppliedAt: FieldValue.serverTimestamp(),
        stockAppliedItems: applied,
      });
      return applied;
    });
  } catch (e) {
    console.error('[inventoryStock] applyOrderStock failed (non-fatal):', orderId, e);
    return null;
  }
}
