// Single source of truth for "what counts as a real purchase" across the admin dashboard.
// Business definition (confirmed 2026-06-17): revenue = paid orders only. pending/abandoned/
// cancelled checkouts are never revenue, even though admins later move paid orders through
// fulfillment statuses (magiah/packing/shipped/delivered/completed/needs_care) that look
// different from the literal string 'paid'.

export interface OrderItemLike {
  id?: string;
  productId?: string;
  name?: string;
  productName?: string;
  price?: number;
  quantity?: number;
  isGift?: boolean;
}

type TimestampLike =
  | { toDate: () => Date }
  | { seconds: number }
  | string
  | Date
  | null
  | undefined;

export interface OrderLike {
  status?: string;
  total?: number;
  createdAt?: TimestampLike;
  paidAt?: TimestampLike;
  items?: OrderItemLike[];
  customerName?: string;
  phone?: string;
  email?: string;
}

// An order created more than this many minutes ago and still pending_payment is treated
// as an abandoned checkout rather than "still in progress at the payment gateway".
export const ABANDONED_AFTER_MINUTES = 30;

// Orders never leave this status once cancelled/never-paid; every other status (paid,
// magiah, sofer, packing, shipped, delivered, completed, needs_care, abandoned-fulfillment)
// is only reachable after Sumit payment confirmation set status away from pending_payment.
const NOT_PAID_STATUSES = new Set(['pending_payment', 'cancelled']);

export function tsToDate(ts: TimestampLike): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'string') {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof (ts as { toDate?: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate();
  }
  if (typeof (ts as { seconds?: number }).seconds === 'number') {
    return new Date((ts as { seconds: number }).seconds * 1000);
  }
  return null;
}

export function getOrderDate(order: OrderLike): Date | null {
  return tsToDate(order.createdAt);
}

export function getOrderTotal(order: OrderLike): number {
  return order.total || 0;
}

export function isPaidOrder(order: OrderLike): boolean {
  return !!order.status && !NOT_PAID_STATUSES.has(order.status);
}

export function isFailedPayment(order: OrderLike): boolean {
  return order.status === 'cancelled';
}

export function isPendingPayment(order: OrderLike): boolean {
  if (order.status !== 'pending_payment') return false;
  const date = getOrderDate(order);
  if (!date) return true;
  return minutesSince(date) < ABANDONED_AFTER_MINUTES;
}

export function isAbandonedCheckout(order: OrderLike): boolean {
  if (order.status !== 'pending_payment') return false;
  const date = getOrderDate(order);
  if (!date) return false;
  return minutesSince(date) >= ABANDONED_AFTER_MINUTES;
}

function minutesSince(date: Date): number {
  return (Date.now() - date.getTime()) / 60000;
}

const STATUS_LABELS: Record<string, string> = {
  paid: '✅ שולם',
  magiah: '✅ מגיע',
  sofer: '✍️ אצל הסופר',
  packing: '📦 באריזה',
  shipped: '🚚 נשלח',
  delivered: '📦 נמסר',
  completed: '🏁 הושלם',
  needs_care: '⚠️ דורש טיפול',
  abandoned: '🚫 נטוש (טיפול)',
  cancelled: '❌ בוטל',
  pending_payment: '⏳ ממתין לתשלום',
  new: '⏳ חדש',
  pending: '🕐 ממתין',
};

export function getStatusLabel(status: string | undefined): string {
  if (!status) return '—';
  return STATUS_LABELS[status] ?? status;
}

// ─────────────────────────────────────────────────────────────────────────────
// רשימת הסטטוסים ששולמו — לדוחות הכספיים (08/2026)
//
// נוסף אחרי שהתגלו שלוש הגדרות שונות של "שולם" בשלושה קבצים:
//   ProfitabilityTab   paid completed shipped packing magiah
//   BestSellersTab     paid completed shipped packing delivered needs_care
//   admin/page.tsx     עותק שלישי, זהה לראשון
// כתוצאה מכך הזמנות שנמסרו ללקוח לא נספרו כהכנסה, ושלושת הדוחות הציגו
// סכומי הכנסות שונים זה מזה.
//
// ⚠️ שים לב שזו רשימת-היתר מפורשת, והיא *לא* זהה ל-isPaidOrder שמעליה.
// isPaidOrder הוא רשימת-איסור (הכול חוץ מ-pending_payment ו-cancelled) ומשמש
// את עמוד ה-analytics. שתי ההגדרות נבדלות ב-abandoned וב-pending. אין לאחד
// ביניהן בלי החלטה מפורשת — הן נותנות מספרי הכנסות שונים.
// ─────────────────────────────────────────────────────────────────────────────

/** סטטוסים שנספרים כהכנסה בדוחות הכספיים (אושר ע"י נסים, 08/2026) */
export const PAID_STATUSES: string[] = [
  'paid',        // ⏳ חדש
  'magiah',      // ✅ מגיע
  'sofer',       // ✍️ אצל הסופר
  'packing',     // 📦 באריזה
  'shipped',     // 🚚 נשלח
  'delivered',   // ✅ נמסר
  'completed',   // 🏁 הושלם
  'needs_care',  // ⚠️ דורש טיפול — שולם, רק דורש התייחסות
];

const PAID_SET: ReadonlySet<string> = new Set(PAID_STATUSES);

/** האם הסטטוס נספר כהכנסה. הזמנה בלי סטטוס — לא נספרת. */
export function isPaidStatus(status: string | undefined | null): boolean {
  return !!status && PAID_SET.has(status);
}

/** אותו כלל, על אובייקט הזמנה */
export function isPaidRevenueOrder(order: { status?: string | null } | undefined | null): boolean {
  return isPaidStatus(order?.status);
}
