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
  {
    id: "stam",
    label: "מזוזות, תפילין וטלית",
    columns: [
      {
        title: "מזוזות",
        items: [
          { label: "בתי מזוזה", href: "/category/mezuzah-cases" },
          { label: "קלף מזוזה", href: "/category/klaf-mezuzah" },
        ],
      },
      {
        title: "תפילין",
        items: [
          { label: "תפילין", href: "/category/tefillin" },
          { label: "כיסויים לטלית ותפילין", href: "/category/tefillin-covers" },
        ],
      },
      {
        title: "טלית וציצית",
        items: [
          { label: "ציציות וטליתות", href: "/category/tallit" },
        ],
      },
    ],
    promo: {
      image: "/images/promo-mezuzah.jpg",
      title: "קלפים מוסמכים",
      description: "קלפי מזוזה ותפילין בכתב יד סופר מומחה",
      ctaLabel: "לכל הקלפים",
      ctaHref: "/category/klafim",
    },
  },
  {
    id: "shabbat",
    label: "שבת וחגים",
    columns: [
      {
        title: "שבת",
        items: [
          { label: "פמוטים", href: "/category/candlesticks" },
          { label: "מגשי חלה וכיסויי חלה", href: "/category/challah" },
          { label: "גביעי קידוש", href: "/category/kiddush-cups" },
          { label: "סטים לקידוש והבדלה", href: "/category/kiddush-sets" },
          { label: "הבדלה", href: "/category/havdalah" },
        ],
      },
      {
        title: "שולחן שבת",
        items: [
          { label: "ברכונים, זמירות וברכות", href: "/category/brachot" },
          { label: "נטלה / כוס נטילה", href: "/category/netilah" },
          { label: "חלות ואירוח שבת", href: "/category/shabbat-hosting" },
          { label: "מפות שולחן ורנרים", href: "/category/tablecloths" },
        ],
      },
      {
        title: "חגים",
        items: [
          { label: "חנוכה", href: "/category/chanukah" },
          { label: "פורים", href: "/category/purim" },
          { label: "פסח", href: "/category/pesach" },
          { label: "סוכות", href: "/category/sukkot" },
          { label: "ראש השנה", href: "/category/rosh-hashana" },
          { label: "שבועות", href: "/category/shavuot" },
          { label: "יום כיפור", href: "/category/yom-kippur" },
          { label: `ט"ו בשבט`, href: "/category/tu-bishvat" },
        ],
      },
    ],
  },
  {
    id: "home",
    label: "לבית ולאירוח",
    columns: [
      {
        title: "לבית",
        items: [
          { label: "ברכות הבית", href: "/category/home-blessings" },
          { label: "סידורים וברכונים לבית", href: "/category/siddurim" },
          { label: "תמונות / פסוקים לקיר", href: "/category/wall-art" },
          { label: "קופות צדקה", href: "/category/tzedakah" },
        ],
      },
      {
        title: "אירוח ושולחן",
        items: [
          { label: "כלי הגשה", href: "/category/serving" },
          { label: "מגשים", href: "/category/trays" },
          { label: "סטים לאירוח ושולחן", href: "/category/hosting-sets" },
          { label: "כוסות, בקבוקים וקנקנים", href: "/category/glasses" },
          { label: "קערות וקעריות", href: "/category/bowls" },
          { label: `סכו"ם והגשה`, href: "/category/cutlery" },
        ],
      },
      {
        title: "פריטי בית",
        items: [
          { label: "נטילת ידיים ומים אחרונים", href: "/category/handwashing" },
          { label: "שלטים לדלת בעיצוב אישי", href: "/category/door-signs" },
          { label: "מוצרי כניסה לבית", href: "/category/entrance" },
          { label: "ריח / אווירה לבית", href: "/category/home-scent" },
        ],
      },
    ],
  },
  {
    id: "gifts",
    label: "מתנות ומארזים",
    columns: [
      {
        title: "מתנות לפי אדם",
        items: [
          { label: "מתנות לאישה", href: "/category/gifts-women" },
          { label: "מתנות לגבר", href: "/category/gifts-men" },
          { label: "מתנות לחתן", href: "/category/gifts-groom" },
          { label: "מתנות לכלה", href: "/category/gifts-bride" },
          { label: "מתנות ליולדת", href: "/category/gifts-newborn" },
        ],
      },
      {
        title: "מתנות לפי צורך",
        items: [
          { label: "מתנות לבית חדש", href: "/category/gifts-new-home" },
          { label: "מתנות לאירוח", href: "/category/gifts-hosting" },
          { label: "מתנות לחגים", href: "/category/gifts-holidays" },
          { label: "מתנות בהתאמה אישית", href: "/category/gifts-custom" },
          { label: "מארז סט לטלית ותפילין", href: "/category/tallit-set" },
        ],
      },
    ],
    promo: {
      image: "/images/promo-gifts.jpg",
      title: "מארזי מתנה מיוחדים",
      description: "מארזים מעוצבים לכל אירוע — מוכנים לשליחה",
      ctaLabel: "לכל המארזים",
      ctaHref: "/category/gift-sets",
    },
  },
  {
    id: "kids",
    label: "ילדים ותינוקות",
    columns: [
      {
        title: "ילדים ותינוקות",
        items: [
          { label: "מתנות לתינוק / לידה", href: "/category/baby-gifts" },
          { label: "מתנות לילדים", href: "/category/kids-gifts" },
          { label: `יודאיקה לבית ספר / גן`, href: "/category/school-judaica" },
          { label: "מתנות לבר מצווה / בת מצווה", href: "/category/bar-mitzvah" },
        ],
      },
    ],
  },
  {
    id: "art",
    label: "אומנות ואקססוריז",
    columns: [
      {
        title: "אומנות ואקססוריז",
        items: [
          { label: "תמונות ואמנות קיר", href: "/category/wall-art-gallery" },
          { label: "פסלים ודקורציה", href: "/category/sculptures" },
          { label: "פריטי נוי לבית", href: "/category/decor" },
          { label: "אומנות שולחנית", href: "/category/table-art" },
          { label: "פריטי השראה / פסוקים מעוצבים", href: "/category/inspirational" },
          { label: "יצירות בעבודת יד", href: "/category/handmade" },
        ],
      },
    ],
  },
];
