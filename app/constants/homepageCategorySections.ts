// app/constants/homepageCategorySections.ts
//
// Admin-controlled category display for the homepage:
//   top  — "קטגוריות נבחרות" (upper section)
//   stam — "קטגוריות סת״ם"   (lower section, under the soferim row)
//   more — "עוד קטגוריות"    (horizontal scroll strip near the page bottom)
//
// The admin dashboard (categories tab) edits this config; the homepage reads it.
// Stored in Firestore at homepageConfig/categorySections. When the doc is
// missing/empty the homepage falls back to DEFAULT_SECTIONS (the historical
// hardcoded lists), so nothing changes until the admin actively edits.

export type SectionKey = 'top' | 'stam' | 'more';

export type ItemWidth = 'half' | 'full'; // half = 2 per row, full = whole row

export interface HomepageCategoryItem {
  id: string;            // stable unique key (admin-generated)
  label: string;         // display name on the card
  cat: string;           // Firestore category value / category page slug
  subCategory?: string;  // optional sub-category (rendered as ?filter=…)
  href?: string;         // explicit link override (wins over cat/subCategory)
  imageUrl?: string;     // explicit image override (wins over categories collection)
  emoji?: string;        // fallback when no image resolves
  width: ItemWidth;
}

export interface HomepageCategorySections {
  top: HomepageCategoryItem[];
  stam: HomepageCategoryItem[];
  more: HomepageCategoryItem[];
}

// Firestore config path (same collection as the category-cards config)
export const SECTIONS_COLLECTION = 'homepageConfig';
export const SECTIONS_DOC        = 'categorySections';

/** Builds the target link for an item. */
export function buildCategoryHref(item: Pick<HomepageCategoryItem, 'cat' | 'subCategory' | 'href'>): string {
  if (item.href) return item.href;
  const base = `/category/${encodeURIComponent(item.cat)}`;
  return item.subCategory ? `${base}?filter=${encodeURIComponent(item.subCategory)}` : base;
}

// ─── Defaults — mirror the historical hardcoded homepage lists exactly ────────

export const DEFAULT_SECTIONS: HomepageCategorySections = {
  top: [
    { id: 'top-hanuka',   label: 'חנוכה',           cat: 'חנוכה',           emoji: '🕎', width: 'half' },
    { id: 'top-barmitzva', label: 'סט בר מצווה',     cat: 'בר מצווה',        emoji: '✡️', width: 'half',
      imageUrl: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1777989198/fqm7twz1berprum03u7u.png' },
    { id: 'top-batei',    label: 'בתי מזוזה',        cat: 'בתי מזוזה',       emoji: '📜', width: 'half' },
    { id: 'top-setalit',  label: 'סט טלית תפילין',  cat: 'סט טלית תפילין', emoji: '🕍', width: 'half' },
    { id: 'top-judaica',  label: 'יודאיקה',          cat: 'יודאיקה',         emoji: '✡️', width: 'half' },
    { id: 'top-kipot',    label: 'כיפות',            cat: 'כיפות',           emoji: '🎩', width: 'half' },
    { id: 'top-shabbat',  label: 'שבתות וחגים',     cat: 'שבתות וחגים',    emoji: '🕯️', width: 'half',
      imageUrl: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto,w_800/v1776635301/lsgvbw3tbwfbnv626xv7_ebthks.png' },
    { id: 'top-sets',     label: 'סטים ומארזים',    cat: 'סטים ומארזים',   emoji: '🎁', width: 'half' },
  ],
  stam: [
    { id: 'stam-sifrei',  label: 'ספרי תורה',        cat: 'ספרי תורה',       emoji: '📜', width: 'half' },
    { id: 'stam-klafT',   label: 'קלפי תפילין',      cat: 'קלפי תפילין',     emoji: '📄', width: 'half' },
    { id: 'stam-tfilin',  label: 'תפילין קומפלט',   cat: 'תפילין קומפלט',  emoji: '🖊️', width: 'half' },
    { id: 'stam-klafM',   label: 'קלפי מזוזה',       cat: 'קלפי מזוזה',      emoji: '📜', width: 'half' },
    { id: 'stam-barmitz', label: 'בר מצווה',          cat: 'בר מצווה',        emoji: '✡️', width: 'half' },
    { id: 'stam-setalit', label: 'סט טלית תפילין',  cat: 'סט טלית תפילין', emoji: '🎒', width: 'half' },
  ],
  // "עוד קטגוריות" — horizontal scroll strip near the bottom of the homepage.
  // Mirrors the historical hardcoded MORE_CAT_DEFS list + the event-kippot page.
  more: [
    { id: 'more-eventkip', label: 'כיפות ומזכרות לאירועים', cat: 'כיפות לאירועים', href: '/event-kippot', emoji: '🎩', width: 'half' },
    { id: 'more-setalit',  label: 'סט טלית תפילין',  cat: 'סט טלית תפילין', emoji: '🕍', width: 'half' },
    { id: 'more-sifrei',   label: 'ספרי תורה',        cat: 'ספרי תורה',       emoji: '📜', width: 'half' },
    { id: 'more-pesach',   label: 'פסח',              cat: 'פסח',             emoji: '🍷', width: 'half' },
    { id: 'more-klafT',    label: 'קלפי תפילין',     cat: 'קלפי תפילין',    emoji: '📄', width: 'half' },
    { id: 'more-tfilin',   label: 'תפילין קומפלט',   cat: 'תפילין קומפלט',  emoji: '⬛', width: 'half' },
    { id: 'more-klafM',    label: 'קלפי מזוזה',       cat: 'קלפי מזוזה',      emoji: '📜', width: 'half' },
    { id: 'more-barmitz',  label: 'בר מצווה',         cat: 'בר מצווה',        emoji: '🎉', width: 'half' },
  ],
};

/** Normalizes a raw Firestore doc into a valid sections object (with fallbacks). */
export function normalizeSections(raw: unknown): HomepageCategorySections {
  const d = (raw ?? {}) as Partial<HomepageCategorySections>;
  const clean = (arr: unknown, fallback: HomepageCategoryItem[]): HomepageCategoryItem[] => {
    if (!Array.isArray(arr) || arr.length === 0) return fallback;
    return arr
      .filter((it): it is HomepageCategoryItem => !!it && typeof it === 'object' && !!(it as HomepageCategoryItem).cat)
      .map((it, i) => ({
        id: it.id || `item-${i}-${it.cat}`,
        label: it.label || it.cat,
        cat: it.cat,
        ...(it.subCategory ? { subCategory: it.subCategory } : {}),
        ...(it.href ? { href: it.href } : {}),
        ...(it.imageUrl ? { imageUrl: it.imageUrl } : {}),
        ...(it.emoji ? { emoji: it.emoji } : {}),
        width: it.width === 'full' ? 'full' : 'half',
      }));
  };
  return {
    top:  clean(d.top,  DEFAULT_SECTIONS.top),
    stam: clean(d.stam, DEFAULT_SECTIONS.stam),
    more: clean(d.more, DEFAULT_SECTIONS.more),
  };
}
