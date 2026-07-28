'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getKipaUnitPrice, isBulkEventKippotLine } from '../lib/kippot';
import { calcSimchaDiscount, PROMO_ACTIVE, SIMCHA_CODE, type SimchaResult } from '../lib/promoRules';

// ── Shipping constants — single source of truth used in cart + checkout ───────
export const SHIPPING_REGULAR = 35;
/** סף משלוח חינם: הזמנות מעל סכום זה (אחרי הנחות קופון) — משלוח חינם אוטומטי */
export const FREE_SHIPPING_THRESHOLD = 500;
/** עלות משלוח בפועל לפי סכום המוצרים אחרי הנחה */
export function getShippingCost(productsTotalAfterDiscount: number): number {
  return productsTotalAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_REGULAR;
}

// ── Event print tiered pricing (A1) ──────────────────────────────────────────
// Applies to print-service items (cat='הדפסה') attached to event kippot orders.
export function getEventPrintPricePerUnit(qty: number): number {
  if (qty >= 100) return 5;
  if (qty >= 50)  return 7;
  return 20;
}

// ── Event kippot tiered pricing — per-unit price by quantity ─────────────────
// מקור אמת יחיד: app/lib/kippot.ts (זהה לסרגל ב-/event-kippot ול-FAQ):
//   פשתן: 30–49 → ₪14 | 50–99 → ₪12 | 100+ → ₪10 (הדפסת לוגו כלולה)
//   סאטן: 30–49 → ₪8  | 50+  → ₪6 (עיצוב אישי כלול)
// basePrice נשמר בחתימה לתאימות לאחור אך אינו משפיע — התמחור לפי כמות וחומר.
export function getEventKippahPricePerUnit(_basePrice: number, qty: number, material: 'linen' | 'satin' = 'linen'): number {
  return getKipaUnitPrice(qty, material);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  /** מזהה מוצר אמיתי ב-Firestore — כשה-id הוא סינתטי (למשל הזמנת כיפות לאירועים).
      זורם לפריט ההזמנה ומאפשר ניכוי מלאי וחישוב רווחיות לפי המוצר. */
  productId?: string;
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
  // ── אפשרויות ותוספות פר-מוצר (נוסח / צבע / הטבעות / אריזת מתנה) ──────────
  selectedVariants?: Record<string, string>;  // { 'נוסח': 'אשכנזי', 'צבע': 'שמנת' }
  selectedAddons?: { id: string; label: string; price: number; pricing: 'flat' | 'perUnit'; text?: string }[];
  addonsPerUnitSurcharge?: number; // תוספות ליחידה — כלולות במחיר הפריט
  addonsFlatSurcharge?: number;    // תוספות חד־פעמיות לשורה — מתווספות בחישוב הסל
  selectedCover?: { id: string; name: string; imgUrl: string };
  promoPlan?: string;              // '2+1' for buy-2-get-1-free
  promoPrice?: number;
  bundlePromo?: string;            // e.g. '4for100', '12for100'
  /** מארז שנבנה ב-/build — מזהי המוצרים של הרכיבים, ללקיטה ולתצוגה בהזמנה.
      ה-id של השורה עצמה סינתטי (bundle-chatan-…) ואינו קיים ב-Firestore. */
  bundleComponentCodes?: string[];
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
    /** סגנון עיצוב שנבחר מגלריית הדוגמאות בעמוד ההזמנה */
    designExample?: string;
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
  appliedCoupon: { code: string; discount: number; type: 'percent' | 'fixed' | 'simcha' } | null;
  setAppliedCoupon: (c: { code: string; discount: number; type: 'percent' | 'fixed' | 'simcha' } | null) => void;
  couponInput: string;
  setCouponInput: (v: string) => void;
  couponLoading: boolean;
  couponError: string;
  applyCoupon: () => Promise<void>;
  discountAmount: number;
  /** תוצאת מבצע SIMCHA — קיימת רק כשהקופון SIMCHA מוחל (מחושבת מחדש על כל שינוי בסל) */
  simchaResult: SimchaResult | null;
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
      // כיפות לאירועים בכמויות (30+) — מחיר מדרגות מלא, בלי הנחת מדרגות ובלי קופון.
      // כיפות רגילות מטופלות אך ורק בבלוק הנחת המדרגות למטה —
      // אסור להוסיף אותן כאן ל-total (ספירה כפולה שגרמה לדחיית תשלום בשרת).
      if (isBulkEventKippotLine(item)) {
        total += orig;
      }

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

  // ── Kippot tiered discount (2nd unit: 10%, 3rd+: 15%) ───────────────────────
  // חל אוטומטית על כל כיפות בקטגוריה כיפות — אך לא על כיפות לאירועים (30+)
  let bundleOriginalSubtotal   = 0;
  let bundleDiscountedSubtotal = 0;

  const kippotItems = items.filter(i => i.cat === 'כיפות' && !isBulkEventKippotLine(i));
  if (kippotItems.length > 0) {
    const kippotPrices: number[] = [];
    for (const item of kippotItems) {
      for (let i = 0; i < item.quantity; i++) {
        kippotPrices.push(item.price);
      }
    }

    if (kippotPrices.length > 0) {
      // Sort by price descending (apply discount to cheapest items)
      const sorted = [...kippotPrices].sort((a, b) => b - a);
      let discountedTotal = 0;

      for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i];
        if (i === 0) {
          discountedTotal += p; // 1st: full price
        } else if (i === 1) {
          discountedTotal += p * 0.9; // 2nd: 10% off
        } else {
          discountedTotal += p * 0.85; // 3rd+: 15% off
        }
      }

      const origTotal = sorted.reduce((s, p) => s + p, 0);
      bundleOriginalSubtotal   = origTotal;
      bundleDiscountedSubtotal = discountedTotal;
      total += discountedTotal;
      discountable += discountedTotal; // Kippot items eligible for coupon
    }
  }

  const bundleDiscountAmount = Math.round((bundleOriginalSubtotal - bundleDiscountedSubtotal) * 100) / 100;

  // ── תוספות חד־פעמיות (למשל הטבעת הקדשה ₪140) — פעם אחת לכל שורת פריט ──────
  for (const item of items) {
    const flat = item.addonsFlatSurcharge ?? 0;
    if (flat > 0) {
      total        += flat;
      discountable += flat;
    }
  }

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
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; type: 'percent' | 'fixed' | 'simcha' } | null>(null);
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
              selectedVariants:       product.selectedVariants       ?? x.selectedVariants,
              selectedAddons:         product.selectedAddons         ?? x.selectedAddons,
              addonsPerUnitSurcharge: product.addonsPerUnitSurcharge ?? x.addonsPerUnitSurcharge,
              addonsFlatSurcharge:    product.addonsFlatSurcharge    ?? x.addonsFlatSurcharge,
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

  const regularTotal = items.reduce((sum, x) => sum + x.price * x.quantity + (x.addonsFlatSurcharge ?? 0), 0);
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

  // ── SIMCHA — שליפת שיוך לעמוד האירועים (isEventProduct) ממסמכי המוצרים ────
  // הדגלים לא נשמרים על פריט הסל, אז נשלפים פעם אחת לכל מוצר כשהקופון פעיל.
  const [eventFlags, setEventFlags] = useState<Record<string, { isEventProduct: boolean; eventSection: string | null }>>({});
  const simchaActive = appliedCoupon?.type === 'simcha';
  useEffect(() => {
    if (!simchaActive) return;
    const missing = items.filter(i => !i.id.startsWith('print-') && eventFlags[i.id] === undefined);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries: [string, { isEventProduct: boolean; eventSection: string | null }][] = [];
      for (const it of missing) {
        try {
          const snap = await getDoc(doc(db, 'products', it.id));
          const d = snap.exists() ? snap.data() : null;
          entries.push([it.id, { isEventProduct: d?.isEventProduct === true, eventSection: d?.eventScrollSection ?? null }]);
        } catch {
          entries.push([it.id, { isEventProduct: false, eventSection: null }]);
        }
      }
      if (!cancelled) setEventFlags(prev => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
    return () => { cancelled = true; };
  }, [simchaActive, items, eventFlags]);

  // ── SIMCHA — מחושב מחדש על כל שינוי בסל (רספונסיבי לכמויות) ───────────────
  const simchaResult: SimchaResult | null = simchaActive
    ? calcSimchaDiscount(items.map(i => ({
        id: i.id, price: i.price, quantity: i.quantity, cat: i.cat,
        hasOtherPromo: !!(i.bundlePromo || i.promoPlan),
        isEventProduct: eventFlags[i.id]?.isEventProduct ?? false,
        eventSection: eventFlags[i.id]?.eventSection ?? null,
      })))
    : null;

  // ── Coupon discount — same formula as checkout ────────────────────────────
  const discountAmount = appliedCoupon
    ? appliedCoupon.type === 'simcha'
      ? (simchaResult?.totalDiscount ?? 0)
      : appliedCoupon.type === 'fixed'
        ? Math.min(appliedCoupon.discount, discountableTotal)
        : Math.round(discountableTotal * appliedCoupon.discount / 100 * 100) / 100
    : 0;

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    if (appliedCoupon) { setCouponError('קופון כבר מוחל'); return; }
    setCouponLoading(true); setCouponError('');
    // ── SIMCHA: קופון מבצע מבוסס-חוקים — לא קיים ב-Firestore ─────────────────
    if (code === SIMCHA_CODE) {
      if (!PROMO_ACTIVE) { setCouponError('קוד הקופון אינו פעיל'); setCouponLoading(false); return; }
      setAppliedCoupon({ code: SIMCHA_CODE, discount: 0, type: 'simcha' });
      setCouponInput('');
      setCouponLoading(false);
      return;
    }
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
      simchaResult,
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
