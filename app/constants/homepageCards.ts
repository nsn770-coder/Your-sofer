// Shared source of truth for homepage category cards.
// Used by HomePageClient.tsx (display) and HomepageConfigTab.tsx (admin editing).

export interface SubItem {
  label: string; // slot label shown in UI, also used as Firestore config key
  href:  string;
  cat:   string; // Firestore `cat` field — used as fallback image lookup
}

export interface CardDef {
  title:    string; // also used as Firestore config key
  href:     string;
  ctaLabel: string;
  items:    SubItem[];
}

export const CARDS: CardDef[] = [
  // ── First 3 are the default-visible cards in the carousel ──────────────────
  {
    title: 'קלפים',
    href: '/category/קלפי מזוזה',
    ctaLabel: 'לכל הקלפים ←',
    items: [
      { label: 'קלפי מזוזה 10 ס"מ', href: '/category/קלפי מזוזה?filter=10', cat: 'קלפי מזוזה' },
      { label: 'קלפי מזוזה 12 ס"מ', href: '/category/קלפי מזוזה?filter=12', cat: 'קלפי מזוזה' },
      { label: 'קלפי תפילין',       href: '/category/קלפי תפילין',          cat: 'קלפי תפילין' },
      { label: 'קלפי מזוזה 15 ס"מ', href: '/category/קלפי מזוזה?filter=15', cat: 'קלפי מזוזה' },
    ],
  },
  {
    title: 'בר מצווה',
    href: '/category/בר מצווה',
    ctaLabel: 'לכל מוצרי בר מצווה ←',
    items: [
      { label: 'סט בר מצווה',     href: '/category/בר מצווה?filter=סט', cat: 'בר מצווה'       },
      { label: 'טלית',            href: '/category/טליתות',              cat: 'טליתות'          },
      { label: 'תפילין',          href: '/category/תפילין קומפלט',      cat: 'תפילין קומפלט'  },
      { label: 'מתנה לבר מצווה', href: '/category/מתנות',               cat: 'מתנות'           },
    ],
  },
  {
    title: 'מתנות',
    href: '/category/מתנות',
    ctaLabel: 'לכל המתנות ←',
    items: [
      { label: 'מתנה לחתן',     href: '/category/מתנות?filter=לחתן',  cat: 'מתנות' },
      { label: 'מתנה לאישה',    href: '/category/מתנות?filter=לאישה', cat: 'מתנות' },
      { label: 'מתנה לגבר',     href: '/category/מתנות?filter=לגבר',  cat: 'מתנות' },
      { label: 'מתנה לבית חדש', href: '/category/מתנות?filter=בית',   cat: 'מתנות' },
    ],
  },
  // ── Remaining 5 revealed by scrolling ─────────────────────────────────────
  {
    title: 'מזוזות',
    href: '/category/מזוזות',
    ctaLabel: 'לכל המזוזות ←',
    items: [
      { label: 'מזוזה אלומיניום', href: '/category/מזוזות?filter=אלומיניום', cat: 'מזוזות' },
      { label: 'מזוזה עץ',        href: '/category/מזוזות?filter=עץ',        cat: 'מזוזות' },
      { label: 'מזוזה כסף',       href: '/category/מזוזות?filter=כסף',       cat: 'מזוזות' },
      { label: 'מזוזה פולימר',    href: '/category/מזוזות?filter=פולימר',    cat: 'מזוזות' },
    ],
  },
  {
    title: 'תפילין',
    href: '/category/תפילין קומפלט',
    ctaLabel: 'לכל התפילין ←',
    items: [
      { label: 'תפילין אשכנז', href: '/category/תפילין קומפלט?filter=אשכנז', cat: 'תפילין קומפלט' },
      { label: 'תפילין ספרד',  href: '/category/תפילין קומפלט?filter=ספרד',  cat: 'תפילין קומפלט' },
      { label: 'תפילין חב"ד',  href: '/category/תפילין קומפלט?filter=חב"ד',  cat: 'תפילין קומפלט' },
      { label: 'כיסוי תפילין', href: '/category/כיסוי תפילין',              cat: 'כיסוי תפילין'  },
    ],
  },
  {
    title: 'טליתות וציצית',
    href: '/category/טליתות',
    ctaLabel: 'לכל הטליתות ←',
    items: [
      { label: 'סט טלית ותפילין', href: '/category/סט טלית תפילין', cat: 'סט טלית תפילין' },
      { label: 'טלית',            href: '/category/טליתות',          cat: 'טליתות'          },
      { label: 'ציצית',           href: '/category/טליתות',          cat: 'טליתות'          },
      { label: 'יודאיקה',         href: '/category/יודאיקה',         cat: 'יודאיקה'         },
    ],
  },
  {
    title: 'ספרי תורה ומגילות',
    href: '/category/ספרי תורה',
    ctaLabel: 'לכל הספרים ←',
    items: [
      { label: 'ספר תורה',    href: '/category/ספרי תורה', cat: 'ספרי תורה' },
      { label: 'מגילת אסתר', href: '/category/מגילות',    cat: 'מגילות'    },
      { label: 'מגילות',     href: '/category/מגילות',    cat: 'מגילות'    },
      { label: 'יודאיקה',    href: '/category/יודאיקה',   cat: 'יודאיקה'   },
    ],
  },
  {
    title: 'חגים ומועדים',
    href: '/category/יודאיקה?filter=חנוכי',
    ctaLabel: 'לכל החגים ←',
    items: [
      { label: 'חנוכה',    href: '/category/יודאיקה?filter=חנוכי',               cat: 'יודאיקה' },
      { label: 'פסח',      href: '/category/כלי שולחן והגשה?filter=פסח',         cat: 'כלי שולחן והגשה' },
      { label: 'ראש השנה', href: '/category/יודאיקה?filter=ראש השנה',            cat: 'יודאיקה' },
      { label: 'פורים',    href: '/category/יודאיקה?filter=פורים',               cat: 'יודאיקה' },
    ],
  },
  {
    title: 'הגשה ואירוח',
    href: '/category/הגשה ואירוח',
    ctaLabel: 'לכל כלי ההגשה ←',
    items: [
      { label: 'מגשים',          href: '/category/הגשה ואירוח?filter=מגש',  cat: 'הגשה ואירוח' },
      { label: 'כוסות וגביעים',  href: '/category/הגשה ואירוח?filter=כוס',  cat: 'הגשה ואירוח' },
      { label: 'קערות',          href: '/category/הגשה ואירוח?filter=קערה', cat: 'הגשה ואירוח' },
      { label: 'בקבוקים וקנקנים', href: '/category/הגשה ואירוח?filter=קנקן', cat: 'הגשה ואירוח' },
    ],
  },
  {
    title: 'עיצוב הבית',
    href: '/category/עיצוב הבית',
    ctaLabel: 'לכל עיצוב הבית ←',
    items: [
      { label: 'פמוטים ונרות',   href: '/category/עיצוב הבית?filter=פמוט',   cat: 'עיצוב הבית' },
      { label: 'קופסאות ומסגרות', href: '/category/עיצוב הבית?filter=קופסה',  cat: 'עיצוב הבית' },
      { label: 'שעונים ועיצוב',  href: '/category/עיצוב הבית?filter=שעון',   cat: 'עיצוב הבית' },
      { label: 'קישוטים ודקור',  href: '/category/עיצוב הבית?filter=קישוט',  cat: 'עיצוב הבית' },
    ],
  },
];

// Deduplicated list of Firestore `cat` values needed for image lookups
export const ALL_CATS = [...new Set(CARDS.flatMap(c => c.items.map(i => i.cat)))];

// Firestore config path
export const CONFIG_COLLECTION = 'homepageConfig';
export const CONFIG_DOC        = 'categoryCards';

// Slot key used as config map key and React key
export function slotKey(cardTitle: string, slotLabel: string) {
  return `${cardTitle}|||${slotLabel}`;
}
