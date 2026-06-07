'use client';
import { createContext, useContext, useState, useEffect } from 'react';

// ── Discount constants — edit here to adjust promotions ───────────────────────
export const KIPPOT_DISCOUNT_QTY  = 100;  // minimum regular-kippot units for 30% off
export const KIPPOT_DISCOUNT_RATE = 0.30; // 30% off regular kippot items

export const PRINT_DISCOUNT_QTY  = 50;   // minimum print-kipa units for 55% off
export const PRINT_DISCOUNT_RATE = 0.55; // 55% off print kipa items

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  name: string;
  price: number;
  imgUrl?: string;
  image_url?: string;
  quantity: number;
  cat?: string;                    // 'כיפות' for kippot — used for bulk discount
  selectedKlafId?: string;
  selectedKlafName?: string;
  embroideryText?: string;
  selectedCover?: { id: string; name: string; imgUrl: string };
  promoPlan?: string;              // '2+1' for the buy-2-get-1-free promo
  promoPrice?: number;
  bundlePromo?: string;            // e.g. '4for100', '12for100' — NforX bundle promo
  printCustomization?: {
    productType: string;
    side: string;
    color?: string;
    uploadedImageUrl: string;
    bgRemoved: boolean;
    originalImageUrl: string;
    imageX?: number;
    imageY?: number;
    imageScale?: number;
    imageRotation?: number;
    logoWidthPct?: number;
    mockupUrl?: string;
  };
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: CartItem) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  total: number;                 // effective total (after ALL discounts, before shipping)
  count: number;
  promoSavings: number;          // 2+1 promo savings
  kippotQty: number;             // regular kippot units (no printCustomization, no bundlePromo)
  kippotDiscountActive: boolean;
  kippotDiscountAmount: number;  // ₪ saved from regular-kippot bulk discount
  printDiscountActive: boolean;
  printDiscountAmount: number;   // ₪ saved from print-kipa discount
  bundleDiscountAmount: number;  // ₪ saved from NforX bundle promos (kippot)
  discountableTotal: number;     // portion eligible for coupon
}

// ── Bundle promo parser ────────────────────────────────────────────────────────
// Parses keys like '4for100' → { n: 4, bundlePrice: 100 }
function parseBundle(key: string): { n: number; bundlePrice: number } | null {
  const m = key.match(/^(\d+)for(\d+)$/);
  if (!m) return null;
  return { n: parseInt(m[1]), bundlePrice: parseInt(m[2]) };
}

// ── Totals calculation ────────────────────────────────────────────────────────

function calcTotals(items: CartItem[]) {
  // ── Regular kippot: cat==='כיפות' AND no printCustomization AND no bundlePromo ─
  // Items with bundlePromo are excluded from the 30% bulk discount entirely.
  const kippotQty = items
    .filter(i => i.cat === 'כיפות' && !i.printCustomization && !i.bundlePromo)
    .reduce((s, i) => s + i.quantity, 0);
  const kippotDiscountActive = kippotQty >= KIPPOT_DISCOUNT_QTY;
  const kippotDiscountRate   = kippotDiscountActive ? KIPPOT_DISCOUNT_RATE : 0;

  // ── Print kipa items: any item with printCustomization ───────────────────────
  const printQty = items
    .filter(i => !!i.printCustomization)
    .reduce((s, i) => s + i.quantity, 0);
  const printDiscountActive = printQty >= PRINT_DISCOUNT_QTY;
  const printDiscountRate   = printDiscountActive ? PRINT_DISCOUNT_RATE : 0;

  let total          = 0;
  let kippotSubtotal = 0; // original price × qty for regular kippot
  let printSubtotal  = 0; // original price × qty for print items
  let discountable   = 0; // items eligible for coupon

  for (const item of items) {
    // Bundle promo items are handled separately below
    if (item.bundlePromo) continue;

    const isPrint  = !!item.printCustomization;
    // Regular kippot: cat==='כיפות' AND not a print item AND no bundlePromo
    const isKippot = item.cat === 'כיפות' && !isPrint;

    if (isPrint) {
      // Print items get only the print discount (55%), never the kippot discount
      const orig   = item.price * item.quantity;
      printSubtotal += orig;
      total += orig * (1 - printDiscountRate);
      // Print items are NOT eligible for coupon regardless of discount tier

    } else if (isKippot) {
      // Regular kippot — may get 30% bulk discount
      const orig = item.price * item.quantity;
      kippotSubtotal += orig;
      total += orig * (1 - kippotDiscountRate);
      // Kippot receiving 30% are NOT eligible for coupon
      if (!kippotDiscountActive) discountable += orig;

    } else if (item.promoPlan === '2+1' && item.quantity >= 3) {
      // 2+1: pay for 2 out of every 3 units
      const sets      = Math.floor(item.quantity / 3);
      const remainder = item.quantity % 3;
      const subtotal  = sets * item.price * 2 + remainder * item.price;
      total      += subtotal;
      discountable += subtotal; // 2+1 items remain eligible for coupon

    } else {
      const subtotal = item.price * item.quantity;
      total      += subtotal;
      discountable += subtotal;
    }
  }

  // ── Bundle promo (NforX) — group by bundlePromo key ──────────────────────────
  // Rule: N units from the same bundle group cost ₪X total.
  // Units are sorted by price descending; the most expensive N×fullBundles units
  // enter the promo. Remainder units pay full price.
  // Bundle items are excluded from kippot 30%, 2+1, and coupon eligibility.
  const bundleGroups = new Map<string, CartItem[]>();
  for (const item of items) {
    if (!item.bundlePromo) continue;
    const grp = bundleGroups.get(item.bundlePromo) ?? [];
    grp.push(item);
    bundleGroups.set(item.bundlePromo, grp);
  }

  let bundleOriginalSubtotal   = 0;
  let bundleDiscountedSubtotal = 0;

  for (const [promoKey, grpItems] of bundleGroups) {
    const parsed = parseBundle(promoKey);
    if (!parsed) {
      // Unknown key format — charge full price, no discount
      for (const item of grpItems) {
        const orig = item.price * item.quantity;
        total += orig;
        discountable += orig;
      }
      continue;
    }
    const { n, bundlePrice } = parsed;

    // Expand all units into a flat array and sort by price descending
    // so the most expensive units benefit from the promo first (best for customer)
    const units: number[] = [];
    for (const item of grpItems) {
      for (let i = 0; i < item.quantity; i++) units.push(item.price);
    }
    units.sort((a, b) => b - a);

    const fullBundles    = Math.floor(units.length / n);
    const promoUnits     = units.slice(0, fullBundles * n);
    const remainderUnits = units.slice(fullBundles * n);

    const origPromo     = promoUnits.reduce((s, p) => s + p, 0);
    const discPromo     = fullBundles * bundlePrice;
    const remainderCost = remainderUnits.reduce((s, p) => s + p, 0);

    bundleOriginalSubtotal   += origPromo;
    bundleDiscountedSubtotal += discPromo;
    total += discPromo + remainderCost;
    // Bundle items are NOT eligible for coupon
  }

  const bundleDiscountAmount = Math.round((bundleOriginalSubtotal - bundleDiscountedSubtotal) * 100) / 100;

  return {
    total:                Math.round(total          * 100) / 100,
    kippotQty,
    kippotDiscountActive,
    kippotDiscountAmount: Math.round(kippotSubtotal  * kippotDiscountRate  * 100) / 100,
    printDiscountActive,
    printDiscountAmount:  Math.round(printSubtotal   * printDiscountRate   * 100) / 100,
    bundleDiscountAmount,
    discountableTotal:    Math.round(discountable    * 100) / 100,
  };
}

// ── Context ───────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('cart');
    if (saved) setItems(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  function addItem(product: CartItem) {
    setItems(prev => {
      const existing = prev.find(x => x.id === product.id);
      if (existing) {
        return prev.map(x => x.id === product.id
          ? {
              ...x,
              quantity: x.quantity + 1,
              selectedKlafId:   product.selectedKlafId   ?? x.selectedKlafId,
              selectedKlafName: product.selectedKlafName ?? x.selectedKlafName,
              selectedCover:    product.selectedCover    ?? x.selectedCover,
            }
          : x
        );
      }
      return [...prev, { ...product, quantity: product.quantity ?? 1 }];
    });
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(x => x.id !== id));
  }

  function updateQty(id: string, qty: number) {
    if (qty <= 0) { removeItem(id); return; }
    setItems(prev => prev.map(x => x.id === id ? { ...x, quantity: qty } : x));
  }

  function clearCart() {
    setItems([]);
  }

  const regularTotal = items.reduce((sum, x) => sum + x.price * x.quantity, 0);
  const {
    total, kippotQty, kippotDiscountActive, kippotDiscountAmount,
    printDiscountActive, printDiscountAmount, bundleDiscountAmount, discountableTotal,
  } = calcTotals(items);
  const promoSavings = Math.round((regularTotal - total) * 100) / 100;
  const count        = items.reduce((sum, x) => sum + x.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQty, clearCart,
      total, count, promoSavings,
      kippotQty, kippotDiscountActive, kippotDiscountAmount,
      printDiscountActive, printDiscountAmount,
      bundleDiscountAmount,
      discountableTotal,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
