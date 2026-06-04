'use client';
import { createContext, useContext, useState, useEffect } from 'react';

// ── Discount constants — edit here to adjust promotions ───────────────────────
export const KIPPOT_DISCOUNT_QTY  = 100;  // minimum units to trigger kippot discount
export const KIPPOT_DISCOUNT_RATE = 0.30; // 30% off all kippot items

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
  promoPlan?: string;
  promoPrice?: number;
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
  };
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: CartItem) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  total: number;               // effective total (after all discounts, before shipping)
  count: number;
  promoSavings: number;        // 2+1 promo savings
  kippotQty: number;           // total kippot units in cart
  kippotDiscountActive: boolean;
  kippotDiscountAmount: number; // ₪ saved from kippot bulk discount
  discountableTotal: number;   // portion eligible for coupon (non-kippot, non-print-kipa)
}

// ── Totals calculation ────────────────────────────────────────────────────────

function calcTotals(items: CartItem[]) {
  // Count all kippot units across all kippot items
  const kippotQty = items
    .filter(i => i.cat === 'כיפות')
    .reduce((s, i) => s + i.quantity, 0);
  const kippotDiscountActive = kippotQty >= KIPPOT_DISCOUNT_QTY;
  const kippotDiscountRate   = kippotDiscountActive ? KIPPOT_DISCOUNT_RATE : 0;

  let total          = 0;
  let kippotSubtotal = 0; // original price × qty for kippot items
  let discountable   = 0; // items eligible for coupon

  for (const item of items) {
    const isKippot    = item.cat === 'כיפות';
    const isPrintKipa = item.printCustomization?.productType === 'kipa';

    if (isKippot) {
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
      // Print kipa items have their own tiered pricing — exclude from coupon
      if (!isPrintKipa) discountable += subtotal;
    }
  }

  return {
    total:                Math.round(total      * 100) / 100,
    kippotQty,
    kippotDiscountActive,
    kippotDiscountAmount: Math.round(kippotSubtotal * kippotDiscountRate * 100) / 100,
    discountableTotal:    Math.round(discountable * 100) / 100,
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
  const { total, kippotQty, kippotDiscountActive, kippotDiscountAmount, discountableTotal } = calcTotals(items);
  const promoSavings = Math.round((regularTotal - total) * 100) / 100;
  const count        = items.reduce((sum, x) => sum + x.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQty, clearCart,
      total, count, promoSavings,
      kippotQty, kippotDiscountActive, kippotDiscountAmount, discountableTotal,
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
