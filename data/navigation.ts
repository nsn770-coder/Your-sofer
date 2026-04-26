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

  // ── טליתות וציציות ───────────────────────────────────────────────────────
  {
    id: "talitot",
    label: "טליתות וציציות",
    href: "/category/טליתות וציציות",
    columns: [
      {
        title: "טליתות",
        items: [
          { label: "כל הטליתות",       href: "/category/טליתות וציציות" },
          { label: "טליתות חתן",       href: "/category/טליתות וציציות?subcat=טליתות חתן" },
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
          { label: "שבת ✨",           href: "/category/שבתות-וחגים" },
          { label: "סטים ומארזים 🎁", href: "/category/סטים ומארזים" },
          { label: "יודאיקה כללי ✡️", href: "/category/יודאיקה כללי" },
          { label: "כיפות 🧿",         href: "/category/כיפות" },
        ],
      },
      {
        title: "חגים 🕍",
        items: [
          { label: "שבת וחגים", href: "/category/שבתות-וחגים" },
          { label: "חנוכה 🕎",  href: "/category/יודאיקה?filter=חנוכי" },
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
          { label: "מתנות לבית חדש", href: "/category/מתנות?filter=לבית" },
        ],
      },
      {
        title: "קטגוריות מתנה",
        items: [
          { label: "כלי שולחן והגשה 🍽️", href: "/category/כלי שולחן והגשה" },
          { label: "עיצוב הבית 🏠",       href: "/category/עיצוב הבית" },
          { label: "מתנות לחגים 🕍",      href: "/category/שבתות-וחגים" },
          { label: "יודאיקה ✡️",           href: "/category/יודאיקה" },
          { label: "בר מצווה 🎉",          href: "/category/בר מצווה" },
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
    href: "/category/שבתות-וחגים",
    columns: [
      {
        title: "שבת ✨",
        items: [
          { label: "כל מוצרי שבת",      href: "/category/שבתות-וחגים" },
          { label: "גביעי קידוש",        href: "/category/שבתות-וחגים?filter=קידוש" },
          { label: "פמוטים ונרות",       href: "/category/שבתות-וחגים?filter=פמוטים" },
          { label: "הבדלה",              href: "/category/שבתות-וחגים?filter=הבדלה" },
          { label: "חלות ולחמניות",      href: "/category/שבתות-וחגים?filter=חלה" },
        ],
      },
      {
        title: "חנוכה 🕎",
        items: [
          { label: "כל מוצרי חנוכה",    href: "/category/יודאיקה?filter=חנוכי" },
          { label: "חנוכיות",            href: "/category/יודאיקה?filter=חנוכי" },
          { label: "עיצוב חנוכה",        href: "/category/עיצוב הבית?filter=חנוכי" },
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
        title: "כלי הגשה",
        items: [
          { label: "כל כלי ההגשה",      href: "/category/כלי שולחן והגשה" },
          { label: "מגשים",              href: "/category/כלי שולחן והגשה?subcat=מגשים" },
          { label: "כוסות",              href: "/category/כלי שולחן והגשה?subcat=כוסות" },
          { label: "צלחות וקערות",       href: "/category/כלי שולחן והגשה?subcat=צלחות וקערות" },
          { label: "קנקנים",             href: "/category/כלי שולחן והגשה?subcat=קנקנים" },
        ],
      },
      {
        title: "עוד",
        items: [
          { label: "ספלים",              href: "/category/כלי שולחן והגשה?subcat=ספלים" },
          { label: "מערכות אוכל",        href: "/category/כלי שולחן והגשה?subcat=מערכות אוכל" },
          { label: "כלי אכילה",          href: "/category/כלי שולחן והגשה?subcat=כלי אכילה" },
          { label: "כלי הגשה כלליים",    href: "/category/כלי שולחן והגשה?subcat=כלי הגשה" },
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
          { label: "כל עיצוב הבית",      href: "/category/עיצוב הבית" },
          { label: "פמוטים",              href: "/category/עיצוב הבית?subcat=פמוטים" },
          { label: "אגרטלים",             href: "/category/עיצוב הבית?subcat=אגרטלים" },
          { label: "מראות",               href: "/category/עיצוב הבית?subcat=מראות" },
          { label: "נרות ריחניים",        href: "/category/עיצוב הבית?subcat=נרות ריחניים" },
        ],
      },
      {
        title: "עוד",
        items: [
          { label: "עציצים",              href: "/category/עיצוב הבית?subcat=עציצים" },
          { label: "מסגרות תמונה",        href: "/category/עיצוב הבית?subcat=מסגרות תמונה" },
          { label: "מעמדות לנר",          href: "/category/עיצוב הבית?subcat=מעמדות לנר" },
          { label: "קישוטים",             href: "/category/עיצוב הבית?subcat=קישוטים" },
        ],
      },
    ],
  },
];
