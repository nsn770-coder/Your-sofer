// ── Effective price — SINGLE SOURCE OF TRUTH ─────────────────────────────────
// Priority: clearance > active sale (within date window) > base price.
// Used by ProductClient, ProductShell, ChatCartBridge, and the product feeds.
// Accepts a raw Firestore doc (Record<string, unknown>) or a typed product.
export interface EffectivePriceFields {
  price?: number | string | null;
  isOnSale?: boolean | null;
  salePrice?: number | string | null;
  saleStartsAt?: string | number | null;
  saleEndsAt?: string | number | null;
  clearanceDiscount?: boolean | null;
  clearanceSalePrice?: number | string | null;
}

export function effectivePrice(
  p: EffectivePriceFields | Record<string, unknown>,
  now: number = Date.now(),
): number {
  const d = p as EffectivePriceFields;
  const num = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const price = num(d.price) ?? 0;

  const clearance = num(d.clearanceSalePrice);
  if (d.clearanceDiscount === true && clearance !== null) return clearance;

  const sale = num(d.salePrice);
  const saleActive =
    d.isOnSale === true &&
    sale !== null &&
    (d.saleStartsAt == null || new Date(d.saleStartsAt as string | number).getTime() <= now) &&
    (d.saleEndsAt == null || new Date(d.saleEndsAt as string | number).getTime() >= now);
  if (saleActive && sale !== null) return sale;

  return price;
}

export function formatPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined) return '₪0.00';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '₪0.00';
  const rounded = Math.round(num);
  return `₪${rounded.toLocaleString('he-IL')}.00`;
}
