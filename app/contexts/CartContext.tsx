'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// ── Shipping constant — single source of truth used in cart + checkout ────────
export const SHIPPING_REGULAR = 35;

// ── Event print tiered pricing (A1) ──────────────────────────────────────────
// Applies to print-service items (cat='הדפסה') attached to event kippot orders.
export function getEventPrintPricePerUnit(qty: number): number {
  if (qty >= 100) return 5;
  if (qty >= 50)  return 7;
  return 20;
}

// ── Event kippot tiered pricing — per-unit price by quantity ─────────────────
// basePrice (product.price) is the 100–200 tier price; logo printing included.
// Ratios: 30–39 → ×1.7 | 40–49 → ×1.5 | 50–99 → ×1.2 | 100–200 → ×1 | 200+ → ×0.9
// For basePrice=10: 17 / 15 / 12 / 10 / 9.
export function getEventKippahPricePerUnit(basePrice: number, qty: number): number {
  if (qty > 200)  return Math.round(basePrice * 0.9);
  if (qty >= 100) return basePrice;
  if (qty >= 50)  return Math.round(basePrice * 1.2);
  if (qty >= 40)  return Math.round(basePrice * 1.5);
  return Math.round(basePrice * 1.7); // 30–39 (and below 30)
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  name: string;
  price: number;
  imgUrl?: string;
  image_url?: string;
  quantity: number;
  cat?: string;                    // 'כיפות' for kippot | 'הדפסה' for print-service
  selectedKlafId?: string;
  selectedKlafName?: string;
  embroideryText?: string;
  embroideryOptions?: string[];    // 'כיסוי טלית' | 'כיסוי תפילין' — ₪50 לאופציה
  embroiderySurcharge?: number;    // תוספת רקמה כלולה במחיר הפריט
  threadColor?: { id: string; name: string; hex: string }; // צבע חוט הרקמה שנבחר
  embossingText?: string;          // אותיות ההטבעה על סידור/ספר
  embossingColor?: 'gold' | 'silver'; // צבע ההטבעה — זהב / כסף
  embossingSurcharge?: number;     // תוספת הטבעה (₪15) כלולה במחיר הפריט
  selectedCover?: { id: string; name: string; imgUrl: string };
  promoPlan?: string;              // '2+1' for buy-2-get-1-free
  promoPrice?: number;
  bundlePromo?: string;            // e.g. '4for100', '12for100'
  // ── רווחיות ──────────────────────────────────────────────────────────────
  purchasePrice?: number;          // מחיר קנייה מהספק
  finalPrice?: number;             // מחיר סופי אחרי הנחות
  discountApplied?: {
    type: 'bundle' | 'coupon' | 'temp_price' | 'event_print' | 'none';
    amount?: number;               // ₪ הנחה
    percent?: number;              // % הנחה
    code?: string;                 // קוד קופון אם יש
  };
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
    // kippot bulk order extras
    designText?: string;
    addSide?: boolean;
    addSideText?: string;
    kippahStyle?: string;
    kippahLabel?: string;
    printType?: string;
  };
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: CartItem) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
  promoSavings: number;
  kippotQty: number;
  kippotDiscountActive: boolean;
  kippotDiscountAmount: number;
  bundleDiscountAmount: number;
  discountableTotal: number;
  // ── רווחיות ──────────────────────────────────────────────────────────────
  totalCost: number;               // סה"כ קנייה (purchasePrice × qty)
  totalProfit: number;             // סה"כ רווח
  profitPercent: number;           // % רווח כללי
  // A4 — gift
  giftEnabled:   boolean;
  giftThreshold: number;
  giftEligible:  boolean;
  amountToGift:  number;
  selectedGift:  string | null;
  setSelectedGift: (id: string | null) => void;
  // ── coupon — shared between cart and checkout ─────────────────────────────
  appliedCoupon: { code: string; discount: number; type: 'percent' | 'fixed' } | null;
  setAppliedCoupon: (c: { code: string; discount: number; type: 'percent' | 'fixed' } | null) => void;
  couponInput: string;
  setCouponInput: (v: string) => void;
  couponLoading: boolean;
  couponError: string;
  applyCoupon: () => Promise<void>;
  discountAmount: number;
}

// ── Bundle promo parser ────────────────────────────────────────────────────────
function parseBundle(key: string): { n: number; bundlePrice: number } | null {
  const m = key.match(/^(\d+)for(\d+)$/);
  if (!m) return null;
  return { n: parseInt(m[1]), bundlePrice: parseInt(m[2]) };
}

// ── Totals calculation ────────────────────────────────────────────────────────

function calcTotals(items: CartItem[]) {
  // Print-service items (cat='הדפסה') are charged at face value — no kippot discount.
  const kippotQty = items
    .filter(i => i.cat === 'כיפות')
    .reduce((s, i) => s + i.quantity, 0);
  const kippotDiscountActive = false;
  const kippotDiscountRate   = 0;

  let total          = 0;
  let kippotSubtotal = 0;
  let discountable   = 0; // items eligible for coupon

  for (const item of items) {
    // When 30% wins, kippot bundlePromo are processed here (not in bundleGroups below)
    if (item.bundlePromo && !(item.cat === 'כיפות' && kippotDiscountActive)) continue;

    const isKippot       = item.cat === 'כיפות';
    const isPrintService = item.cat === 'הדפסה';

    if (isKippot) {
      const orig = item.price * item.quantity;
      kippotSubtotal += orig;
      total += orig * (1 - kippotDiscountRate);
      // Kippot receiving 30% are NOT eligible for coupon
      if (!kippotDiscountActive) discountable += orig;

    } else if (isPrintService) {
      // Print service charged at face value (tiered rate already embedded in price)
      // NOT eligible for coupon
      total += item.price * item.quantity;

    } else if (item.promoPlan === '2+1' && item.quantity >= 3) {
      const sets      = Math.floor(item.quantity / 3);
      const remainder = item.quantity % 3;
      const subtotal  = sets * item.price * 2 + remainder * item.price;
      total      += subtotal;
      discountable += subtotal;

    } else {
      const subtotal = item.price * item.quantity;
      total      += subtotal;
      discountable += subtotal;
    }
  }

  // ── Bundle promo (NforX) ─────────────────────────────────────────────────────
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
    // When 30% wins, kippot bundlePromo were already handled in the main loop above
    const activeItems = kippotDiscountActive
      ? grpItems.filter(i => i.cat !== 'כיפות')
      : grpItems;

    const parsed = parseBundle(promoKey);
    if (!parsed) {
      for (const item of activeItems) {
        const orig = item.price * item.quantity;
        total += orig;
        discountable += orig;
      }
      continue;
    }

    if (activeItems.length === 0) continue;

    const { n, bundlePrice } = parsed;

    const units: number[] = [];
    for (const item of activeItems) {
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
    discountable += discPromo + remainderCost; // Bundle items eligible for coupon
  }

  const bundleDiscountAmount = Math.round((bundleOriginalSubtotal - bundleDiscountedSubtotal) * 100) / 100;

  return {
    total:                Math.round(total         * 100) / 100,
    kippotQty,
    kippotDiscountActive,
    kippotDiscountAmount: Math.round(kippotSubtotal * kippotDiscountRate * 100) / 100,
    bundleDiscountAmount,
    discountableTotal:    Math.round(discountable   * 100) / 100,
  };
}

// ── Context ───────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedGift, setSelectedGift] = useState<string | null>(null);
  const [giftEnabled,   setGiftEnabled]   = useState(false);
  const [giftThreshold, setGiftThreshold] = useState(250);

  // ── Coupon state — shared between cart page and checkout page ─────────────
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; type: 'percent' | 'fixed' } | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    getDoc(doc(db, 'siteConfig', 'gifts'))
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          setGiftEnabled(d.enabled ?? false);
          setGiftThreshold(d.threshold ?? 250);
        }
      })
      .catch(() => {});
  }, []);

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

  // A3: enforce minimum 5 units for cheap non-kippot items
  function updateQty(id: string, qty: number) {
    if (qty <= 0) { removeItem(id); return; }
    const item = items.find(x => x.id === id);
    const minQty = (item && item.price > 0 && item.price < 25 && item.cat !== 'כיפות') ? 5 : 1;
    setItems(prev => prev.map(x => x.id === id ? { ...x, quantity: Math.max(qty, minQty) } : x));
  }

  function clearCart() {
    setItems([]);
    setSelectedGift(null);
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  }

  const regularTotal = items.reduce((sum, x) => sum + x.price * x.quantity, 0);
  const {
    total, kippotQty, kippotDiscountActive, kippotDiscountAmount,
    bundleDiscountAmount, discountableTotal,
  } = calcTotals(items);
  const promoSavings = Math.round((regularTotal - total) * 100) / 100;
  const count        = items.reduce((sum, x) => sum + x.quantity, 0);

  // רווחיות
  const totalCost    = items.reduce((s, x) => s + (x.purchasePrice ?? 0) * x.quantity, 0);
  const totalProfit  = total - totalCost;
  const profitPercent = total > 0 ? Math.round((totalProfit / total) * 1000) / 10 : 0;

  // A4: gift eligibility — driven by Firestore config
  const giftEligible = giftEnabled && total >= giftThreshold;
  const amountToGift = giftEligible ? 0 : Math.round((giftThreshold - total) * 100) / 100;

  // Clear gift selection when ineligible (threshold not met or feature disabled)
  useEffect(() => {
    if (!giftEligible && selectedGift) setSelectedGift(null);
  }, [giftEligible, selectedGift]);

  // ── Coupon discount — same formula as checkout ────────────────────────────
  const discountAmount = appliedCoupon
    ? appliedCoupon.type === 'fixed'
      ? Math.min(appliedCoupon.discount, discountableTotal)
      : Math.round(discountableTotal * appliedCoupon.discount / 100 * 100) / 100
    : 0;

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    if (appliedCoupon) { setCouponError('קופון כבר מוחל'); return; }
    setCouponLoading(true); setCouponError('');
    try {
      const snap = await getDoc(doc(db, 'coupons', code));
      if (!snap.exists()) { setCouponError('קוד קופון לא נמצא'); return; }
      const data = snap.data();
      if (!data.active) { setCouponError('קוד הקופון אינו פעיל'); return; }
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) { setCouponError('קוד הקופון פג תוקף'); return; }
      if (data.minOrder && total < data.minOrder) { setCouponError(`קופון זה תקף להזמנות מעל ₪${data.minOrder}`); return; }
      // A2: single-use coupon check
      if (data.singleUse && Array.isArray(data.usedBy) && data.usedBy.length > 0) {
        setCouponError('קוד קופון כבר נוצל'); return;
      }
      const couponType: 'percent' | 'fixed' = data.type === 'fixed' ? 'fixed' : 'percent';
      setAppliedCoupon({ code, discount: data.discount, type: couponType });
      setCouponInput('');
    } catch { setCouponError('שגיאה בבדיקת הקופון'); }
    finally { setCouponLoading(false); }
  }

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQty, clearCart,
      total, count, promoSavings,
      kippotQty, kippotDiscountActive, kippotDiscountAmount,
      bundleDiscountAmount,
      discountableTotal,
      totalCost, totalProfit, profitPercent,
      giftEnabled, giftThreshold, giftEligible, amountToGift, selectedGift, setSelectedGift,
      appliedCoupon, setAppliedCoupon,
      couponInput, setCouponInput,
      couponLoading, couponError,
      applyCoupon,
      discountAmount,
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
