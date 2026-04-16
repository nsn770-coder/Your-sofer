// data/navigation.ts
// Central navigation data — edit here to update the entire menu system

export interface SubItem {
  label: string;
  href: string;
}

export interface NavColumn {
  title: string;
  items: SubItem[];
}

export interface PromoCard {
  image: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  columns?: NavColumn[];
  promo?: PromoCard;
}

export const navigationData: NavItem[] = [
  // ── מזוזות ────────────────────────────────────────────────────────────────
  {
    id: "mezuzot",
    label: "מזוזות",
    href: "/category/מזוזות",
    columns: [
      {
        title: "בתי מזוזה",
        items: [
          { label: "כל המזוזות",        href: "/category/מזוזות" },
          { label: "מזוזות אלומיניום",  href: "/category/מזוזות?filter=אלומיניום" },
          { label: "מזוזות עץ",         href: "/category/מזוזות?filter=עץ" },
          { label: "מזוזות כסף",        href: "/category/מזוזות?filter=כסף" },
          { label: "מזוזות פלסטיק",     href: "/category/מזוזות?filter=פלסטיק" },
        ],
      },
      {
        title: "קלפי מזוזה",
        items: [
          { label: "קלפי מזוזה — כל הגדלים", href: "/category/קלפי מזוזה" },
          { label: 'קלף 10 ס"מ',               href: '/category/קלפי מזוזה?filter=10 ס"מ' },
          { label: 'קלף 12 ס"מ',               href: '/category/קלפי מזוזה?filter=12 ס"מ' },
          { label: 'קלף 15 ס"מ',               href: '/category/קלפי מזוזה?filter=15 ס"מ' },
        ],
      },
    ],
    promo: {
      image: "/images/promo-mezuzah.jpg",
      title: "קלפים מוסמכים",
      description: "קלפי מזוזה ותפילין בכתב יד סופר מומחה",
      ctaLabel: "לכל הקלפים",
      ctaHref: "/category/קלפי מזוזה",
    },
  },

  // ── קלפים ─────────────────────────────────────────────────────────────────
  {
    id: "klafim",
    label: "קלפים",
    href: "/category/קלפי מזוזה",
    columns: [
      {
        title: "קלפים",
        items: [
          { label: "קלפי מזוזה",  href: "/category/קלפי מזוזה" },
          { label: "קלפי תפילין", href: "/category/קלפי תפילין" },
        ],
      },
    ],
  },

  // ── תפילין ────────────────────────────────────────────────────────────────
  {
    id: "tefillin",
    label: "תפילין",
    href: "/category/תפילין קומפלט",
    columns: [
      {
        title: "תפילין",
        items: [
          { label: "תפילין קומפלט",    href: "/category/תפילין קומפלט" },
          { label: "כיסוי תפילין",     href: "/category/כיסוי תפילין" },
          { label: "סט טלית תפילין",   href: "/category/סט טלית תפילין" },
        ],
      },
    ],
  },

  // ── יודאיקה ───────────────────────────────────────────────────────────────
  {
    id: "judaica",
    label: "יודאיקה",
    href: "/category/יודאיקה",
    columns: [
      {
        title: "יודאיקה",
        items: [
          { label: "נטילת ידיים 🤲",  href: "/category/נטילת ידיים" },
          { label: "שבת ✨",           href: "/category/כלי שולחן והגשה?filter=שבת" },
          { label: "סטים ומארזים 🎁", href: "/category/סטים ומארזים" },
          { label: "יודאיקה כללי ✡️", href: "/category/יודאיקה כללי" },
        ],
      },
      {
        title: "חגים 🕍",
        items: [
          { label: "שבת וחגים", href: "/category/כלי שולחן והגשה?filter=שבת" },
          { label: "חנוכה 🕎",  href: "/category/יודאיקה?filter=חנוכ" },
          { label: "פסח 🍷",    href: "/category/כלי שולחן והגשה?filter=פסח" },
        ],
      },
    ],
    promo: {
      image: "/images/promo-judaica.jpg",
      title: "יודאיקה מעוצבת",
      description: "נטלות, חנוכיות, פמוטים וכלי שבת באיכות גבוהה",
      ctaLabel: "לכל היודאיקה",
      ctaHref: "/category/יודאיקה",
    },
  },

  // ── מתנות ─────────────────────────────────────────────────────────────────
  {
    id: "gifts",
    label: "מתנות",
    href: "/category/מתנות",
    columns: [
      {
        title: "מתנות לפי אדם",
        items: [
          { label: "מתנות לאישה",    href: "/category/מתנות?filter=לאישה" },
          { label: "מתנות לגבר",     href: "/category/מתנות?filter=לגבר" },
          { label: "מתנות לחתן",     href: "/category/מתנות?filter=לחתן" },
          { label: "מתנות לבית חדש", href: "/category/מתנות?filter=בית" },
        ],
      },
      {
        title: "עיצוב ואירוח",
        items: [
          { label: "כלי שולחן והגשה 🍽️", href: "/category/כלי שולחן והגשה" },
          { label: "עיצוב הבית 🏠",  href: "/category/עיצוב הבית" },
        ],
      },
    ],
    promo: {
      image: "/images/promo-gifts.jpg",
      title: "מארזי מתנה מיוחדים",
      description: "מארזים מעוצבים לכל אירוע — מוכנים לשליחה",
      ctaLabel: "לכל המארזים",
      ctaHref: "/category/מתנות",
    },
  },

  // ── בר מצוה ───────────────────────────────────────────────────────────────
  {
    id: "bar-mitzva",
    label: "בר מצווה",
    href: "/category/בר מצווה",
    columns: [
      {
        title: "בר מצוה",
        items: [
          { label: "כל מוצרי בר מצוה",    href: "/category/בר מצווה" },
          { label: "סט בר מצוה",           href: "/category/בר מצווה?filter=סט" },
          { label: "תפילין לבר מצוה",      href: "/category/תפילין קומפלט" },
          { label: "סט טלית ותפילין",      href: "/category/סט טלית תפילין" },
        ],
      },
    ],
  },

  // ── מגילות ────────────────────────────────────────────────────────────────
  {
    id: "megilot",
    label: "מגילות",
    href: "/category/מגילות",
    columns: [
      {
        title: "מגילות",
        items: [
          { label: "כל המגילות",     href: "/category/מגילות" },
          { label: "מגילת אסתר",    href: "/category/מגילות?filter=אסתר" },
          { label: "ספרי תורה",     href: "/category/ספרי תורה" },
        ],
      },
    ],
  },

  // ── שבת וחגים ────────────────────────────────────────────────────────────
  {
    id: "shabbat-chagim",
    label: "שבת וחגים",
    href: "/category/כלי שולחן והגשה?filter=שבת",
    columns: [
      {
        title: "שבת ✨",
        items: [
          { label: "כל מוצרי שבת",      href: "/category/כלי שולחן והגשה?filter=שבת" },
          { label: "גביעי קידוש",        href: "/category/כלי שולחן והגשה?filter=קידוש" },
          { label: "פמוטים ונרות",       href: "/category/כלי שולחן והגשה?filter=פמוט" },
          { label: "הבדלה",              href: "/category/יודאיקה?filter=הבדל" },
          { label: "חלות ולחמניות",      href: "/category/יודאיקה?filter=חלה" },
        ],
      },
      {
        title: "חנוכה 🕎",
        items: [
          { label: "כל מוצרי חנוכה",    href: "/category/יודאיקה?filter=חנוכ" },
          { label: "חנוכיות",            href: "/category/יודאיקה?filter=חנוכ" },
          { label: "עיצוב חנוכה",        href: "/category/עיצוב הבית?filter=חנוכ" },
          { label: "פסח 🍷",             href: "/category/כלי שולחן והגשה?filter=פסח" },
        ],
      },
    ],
  },

  // ── כלי שולחן והגשה ──────────────────────────────────────────────────────
  {
    id: "hosting",
    label: "כלי שולחן והגשה",
    href: "/category/כלי שולחן והגשה",
    columns: [
      {
        title: "כלי שולחן והגשה",
        items: [
          { label: "כל כלי ההגשה",     href: "/category/כלי שולחן והגשה" },
          { label: "מגשים",             href: "/category/כלי שולחן והגשה?filter=מגש" },
          { label: "כוסות וגביעים",    href: "/category/כלי שולחן והגשה?filter=כוס" },
          { label: "קערות",             href: "/category/כלי שולחן והגשה?filter=קערה" },
          { label: "בקבוקים וקנקנים",  href: "/category/כלי שולחן והגשה?filter=קנקן" },
        ],
      },
    ],
  },

  // ── עיצוב הבית ────────────────────────────────────────────────────────────
  {
    id: "decor",
    label: "עיצוב הבית",
    href: "/category/עיצוב הבית",
    columns: [
      {
        title: "עיצוב הבית",
        items: [
          { label: "כל עיצוב הבית",     href: "/category/עיצוב הבית" },
          { label: "פמוטים ונרות",      href: "/category/עיצוב הבית?filter=פמוט" },
          { label: "קופסאות ומסגרות",   href: "/category/עיצוב הבית?filter=קופסת" },
          { label: "שעונים ועיצוב",     href: "/category/עיצוב הבית?filter=שעון" },
          { label: "קישוטים ודקור",     href: "/category/עיצוב הבית?filter=קישוט" },
        ],
      },
    ],
  },
];
