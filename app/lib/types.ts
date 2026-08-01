// ============================================
// Central Type Definitions for Your Sofer
// ============================================

export interface Product {
  // Core
  id: string;
  name: string;
  price: number;

  // Images
  imgUrl?: string;
  image_url?: string;
  imgUrl2?: string;
  imgUrl3?: string;

  // Display
  priority?: number;
  isBestSeller?: boolean;
  badge?: string | null;
  was?: number | null;
  filterAttributes?: Record<string, string>;
  stars?: number;
  status?: string;
  days?: string;
  hidden?: boolean;
  eventsOnly?: boolean; // מוצג רק בדף "כיפות ומזכרות לאירועים" — מוסתר מקטגוריות/חיפוש/פיד/דף הבית

  // Sofer / Vendor
  sofer?: string;
  soferId?: string;
  soferName?: string;
  vendor?: string;

  // Categorization
  cat?: string;
  subCategory?: string;
  nusach?: string;
  level?: string;
  styleTag?: string[];
  lookTag?: string;
  collection?: string;

  // Product Features
  hasKlafSelection?: boolean;
  isExpertRecommended?: boolean;
  isEventKippot?: boolean;
  isEventProduct?: boolean;
  // ── תוספות בתשלום (הטבעה / אריזת מתנה וכו') — פר מוצר ────────────────────
  addons?: ProductAddon[];
  // ── אפשרויות בחירה (נוסח / צבע) — פר מוצר ────────────────────────────────
  variantOptions?: ProductVariantOption[];
  minOrderQty?: number;             // מינימום הזמנה אצל הספק (אינפורמטיבי)
  outOfStock?: boolean;
  coverStyle?: string;
  bundlePromo?: string | null;
  bundleComponentCodes?: string[];  // מוצר מארז — עד 4 קודי מוצר (מק"ט/ID) של הרכיבים
  eventScrollSection?: string | null; // שיוך לסקרול בדף כיפות לאירועים (bundles/headcovers/birkonim/havdalah)

  // Profitability & Inventory
  soferBasePrice?: number;           // legacy — הועתק ל-supplierCost
  supplierCost?: number;             // מחיר ספק גולמי (לפני הנחה ומע"מ)
  sku?: string;                     // UK codes וכו'
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  inStock?: number;                 // כמות בחנות
  receivedFromSupplier?: number;    // סה"כ קבלנו

  // Clearance
  clearanceDiscount?: boolean;      // סימון להנחת מלאי -10%
  clearanceSalePrice?: number;      // מחיר עם 10% הנחה
  originalPrice?: number;           // מחיר מקורי לשחזור
  lastInventoryCheck?: Date;        // מתי עודכן לאחרונה

  // Sale / Promotion
  isOnSale?: boolean;
  salePrice?: number;
  salePercent?: number;
  saleCampaignId?: string | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;

  // Warehouse location
  storageColumn?: string;           // A–G
  storageShelf?: string | number;   // 1–7
  storageNote?: string;
  warehouseBox?: string;            // מספר ארגז במחסן

  // Metadata
  createdAt?: { seconds: number };
}

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  discountType: 'percent';
  discountValue: number;
  active: boolean;
  applyTo: 'all_in_stock' | 'manual';
  productIds: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  affectedCount?: number;
}

// ── תוספת בתשלום למוצר (הטבעת הקדשה / הטבעת שם / אריזת מתנה וכו') ────────────
export interface ProductAddon {
  id: string;                      // מזהה קבוע, למשל 'dedication' / 'name' / 'giftwrap'
  label: string;                   // "הטבעת הקדשה"
  price: number;                   // ₪
  pricing: 'flat' | 'perUnit';     // flat = חד־פעמי לשורה | perUnit = לכל יחידה
  minQty?: number;                 // זמין רק מכמות זו ומעלה (למשל 30)
  requiresText?: boolean;          // דורש טקסט חופשי (נוסח ההקדשה / השם)
}

// ── אפשרות בחירה במוצר (נוסח / צבע) ──────────────────────────────────────────
export interface ProductVariantOption {
  name: string;                    // "נוסח" / "צבע"
  values: string[];                // ["אשכנזי", "עדות המזרח"]
  surcharges?: Record<string, number>; // תוספת מחיר ליחידה לפי ערך, למשל { 'משולב': 0.8 }
}

// ── בחירת תוספת בסל ───────────────────────────────────────────────────────────
export interface SelectedAddon {
  id: string;
  label: string;
  price: number;
  pricing: 'flat' | 'perUnit';
  text?: string;                   // טקסט ההקדשה / השם אם נדרש
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariants?: Record<string, string>;  // { 'נוסח': 'אשכנזי', 'צבע': 'שמנת' }
  selectedAddons?: SelectedAddon[];
  addonsPerUnitSurcharge?: number; // סה"כ תוספות ליחידה — כלול במחיר הפריט
  addonsFlatSurcharge?: number;    // תוספות חד־פעמיות לשורה — מתווסף בחישוב הסל
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
    logoWidthPct?: number;
    mockupUrl?: string;
  };

  // Profitability per item
  finalPrice?: number;
  discountApplied?: {
    type: 'bundle' | 'coupon' | 'temp_price' | 'event_print' | 'none';
    amount?: number;
    percent?: number;
    code?: string;
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone?: string;
  email?: string;
  address?: string;
  total: number;
  status?: string;
  shaliachName?: string;
  items?: OrderItem[];
  createdAt?: Date | { seconds: number };
  printCustomization?: unknown;
  selectedGift?: unknown;
  couponCode?: string;
}

export interface OrderItem {
  productId?: string;
  productName?: string;
  quantity: number;
  price: number;

  // Profitability tracking
  soferBasePrice?: number;
  finalPrice?: number;
  profit?: number;
  discountApplied?: {
    type: string;
    amount?: number;
    percent?: number;
  };
}

export interface Curation {
  id: string;
  category: string;
  activeTag: string;
  bannerTitle: string;
  bannerImageUrl: string;
}

export interface FilterState {
  minPrice: string;
  maxPrice: string;
  level: string;
  nusachFilter: string;
  minRating: number;
}

export interface Sofer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialty?: string;
  rating?: number;
  productsCount?: number;
}

export interface Shaliach {
  id: string;
  name: string;
  email: string;
  phone?: string;
  commissionPercent?: number;
}
