// ── כיפות לעיצוב אישי (סטודיו) — מקור אמת יחיד: Firestore studioKippot/{id} ──
//
// כל כיפה שמוצגת ברשימת הבחירה בעמוד "כיפות לאירועים" (/event-kippot),
// ב-/kippot-order ובסטודיו הלוגו (כמוצר וירטואלי "style:<id>") נטענת מכאן.
// מנוהל מהדשבורד: /admin/logo-studio → "כיפות והדמיה".
// כתיבה — רק אדמין (API /api/admin/studio-kippot + Firestore rules). קריאה — ציבורית.
//
// id המסמך = מזהה הדגם ב-URL (?style=<id>), בהזמנות (kippahStyle) ובפרויקטים
// של הסטודיו (style:<id>) — לכן הוא לא משתנה אחרי היצירה.

import type { KipaMaterial } from './kippot';
import { getKipaMaterial, getKipaUnitPrice, DEFAULT_STYLE_PRODUCT_MAP, KIPA_EMBROIDERY_SURCHARGE } from './kippot';
import { EVENT_KIPPOT_STYLES } from './eventKippotStyles';

export const STUDIO_KIPPOT_COLLECTION = 'studioKippot';
export const STUDIO_KIPPAH_ID_RE = /^[a-z0-9-]{1,40}$/;

export type PrintArea = { cx: number; cy: number; minW: number; maxW: number; defaultW: number; maxShift: number };

/** הגדרות הדמיה בסטודיו (אזור הדפסה, רוחב במ״מ, גימורים) */
export interface StudioKippahStudioConfig {
  printArea?: PrintArea;
  bottomPrintArea?: PrintArea;
  maxPrintWidthMm?: number | null;
  bottomMaxPrintWidthMm?: number | null;
  finishes?: ('print' | 'embroidery')[];
}

export interface StudioKippah {
  id: string;
  /** שם הכיפה כפי שמוצג ללקוח */
  label: string;
  /** פשתן / סאטן — קובע את מדרגות המחיר */
  material: KipaMaterial;
  /** כיפה עם רקמה (דגם רקום) — +₪5 לכל כיפה בכל מדרגות הכמות */
  embroidered: boolean;
  /** תמונת המוצר — מוצגת ברשימת הבחירה בעמוד כיפות לאירועים */
  listImage: string;
  /** תמונת העיצוב לצד העליון — משטח העיצוב בסטודיו (ריק = fallback לתמונת המוצר) */
  topDesignImage: string | null;
  /** תמונת העיצוב לצד התחתון — משטח העיצוב בסטודיו (ריק = אין הדמיה לצד התחתון) */
  bottomDesignImage: string | null;
  /** צדדי הדפסה זמינים */
  sides: { top: boolean; bottom: boolean };
  /** פעיל = מוצג באתר. לא פעיל = מוסתר מעמוד כיפות לאירועים ומהסטודיו */
  active: boolean;
  sortOrder: number;
  /** מוצר קיים בחנות המשויך לכיפה (ניכוי מלאי ורווחיות) */
  productId: string | null;
  sku: string | null;
  productName: string | null;
  studio: StudioKippahStudioConfig;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** מסמך Firestore → StudioKippah (עמיד לשדות חסרים) */
export function normalizeStudioKippah(id: string, d: Record<string, unknown> | undefined | null): StudioKippah {
  const data = d ?? {};
  const sides = (data.sides && typeof data.sides === 'object' ? data.sides : {}) as Record<string, unknown>;
  const top = sides.top !== false;
  const bottom = sides.bottom !== false;
  const studio = (data.studio && typeof data.studio === 'object' ? data.studio : {}) as StudioKippahStudioConfig;
  return {
    id,
    label: str(data.label) ?? id,
    material: data.material === 'satin' ? 'satin' : 'linen',
    embroidered: data.embroidered === true,
    listImage: str(data.listImage) ?? '',
    topDesignImage: str(data.topDesignImage),
    bottomDesignImage: str(data.bottomDesignImage),
    sides: top || bottom ? { top, bottom } : { top: true, bottom: false },
    active: data.active !== false,
    sortOrder: typeof data.sortOrder === 'number' && Number.isFinite(data.sortOrder) ? data.sortOrder : 999,
    productId: str(data.productId),
    sku: str(data.sku),
    productName: str(data.productName),
    studio,
  };
}

export function sortStudioKippot(list: StudioKippah[]): StudioKippah[] {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'he'));
}

/**
 * רשת ביטחון זמנית: הכיפות שהיו מוגדרות בקוד לפני המעבר ל-Firestore.
 * משמשת רק אם האוסף studioKippot עדיין ריק (לפני הרצת המיגרציה),
 * כדי שהאתר לא יישבר בין הפריסה להרצת הסקריפט. אחרי המיגרציה — לא בשימוש.
 */
export const LEGACY_STUDIO_KIPPOT: StudioKippah[] = EVENT_KIPPOT_STYLES.map((s, i) => {
  const m = DEFAULT_STYLE_PRODUCT_MAP[s.id];
  return {
    id: s.id,
    label: s.label,
    material: getKipaMaterial(s.id),
    embroidered: false,
    listImage: s.img,
    topDesignImage: null,
    bottomDesignImage: null,
    sides: { top: true, bottom: true },
    active: true,
    sortOrder: (i + 1) * 10,
    productId: m?.productId ?? null,
    sku: m?.sku ?? null,
    productName: m?.name ?? null,
    studio: {},
  };
});

/** תוספת לכל כיפה בדגם רקמה */
export const studioKippahSurcharge = (k: Pick<StudioKippah, 'embroidered'> | null | undefined): number =>
  k?.embroidered ? KIPA_EMBROIDERY_SURCHARGE : 0;

/** מחיר בסיס לכיפה לפי כמות: מדרגות הבד (פשתן/סאטן) + תוספת רקמה אם הדגם רקום */
export function studioKippahUnitPrice(k: Pick<StudioKippah, 'material' | 'embroidered'> | null | undefined, qty: number): number {
  return getKipaUnitPrice(qty, k?.material ?? 'linen') + studioKippahSurcharge(k);
}

/** תמונת משטח העיצוב בסטודיו לצד מסוים — עם fallback לתמונה הקיימת */
export function designImageFor(k: Pick<StudioKippah, 'listImage' | 'topDesignImage' | 'bottomDesignImage'>, side: 'top' | 'bottom'): string | null {
  return side === 'bottom' ? k.bottomDesignImage : (k.topDesignImage || k.listImage || null);
}

// ── קריאה בצד הלקוח (עמודי האתר) ────────────────────────────────────────────
/** כל הכיפות (כולל לא פעילות אם includeInactive) — מ-Firestore, ממוינות. */
export async function fetchStudioKippotClient(opts: { includeInactive?: boolean } = {}): Promise<StudioKippah[]> {
  try {
    const [{ collection, getDocs }, { db }] = await Promise.all([import('firebase/firestore'), import('@/app/firebase')]);
    const snap = await getDocs(collection(db, STUDIO_KIPPOT_COLLECTION));
    if (snap.empty) return LEGACY_STUDIO_KIPPOT;
    const list = snap.docs.map(d => normalizeStudioKippah(d.id, d.data()));
    return sortStudioKippot(opts.includeInactive ? list : list.filter(k => k.active));
  } catch (e) {
    console.error('[studioKippot] load failed — using legacy list:', e);
    return LEGACY_STUDIO_KIPPOT;
  }
}
