// Single source of truth for the site's category → subcategory tree.
// Used by the NavBar mega menu AND the footer categories section.
// URL scheme: /category/{cat}?filter={filter}

export interface NavSubItem {
  label: string;
  cat: string;
  filter?: string;
}

export interface NavColumn {
  title: string;
  items: NavSubItem[];
}

export interface NavMenuItem {
  id: string;
  label: string;
  cat: string;
  columns: NavColumn[];
}

export const MEGA_MENU_DATA: NavMenuItem[] = [
  {
    id: "event-gifts", label: "מתנות לאירועים", cat: "מתנות",
    columns: [
      {
        title: "מתנות לאירועים",
        items: [
          { label: "כל המתנות לאירועים", cat: "מתנות" },
          { label: "מתנות לבר מצווה", cat: "מתנות" },
          { label: "מתנות לחתונה", cat: "מתנות" },
        ],
      },
    ],
  },
  {
    id: "event-kippot", label: "כיפות ומזכרות לאירועים", cat: "כיפות",
    columns: [
      {
        title: "כיפות ומזכרות",
        items: [
          { label: "כל הכיפות", cat: "כיפות" },
          { label: "מזכרות לאירועים", cat: "מזכרות לאירועים" },
        ],
      },
    ],
  },
  {
    id: "mezuzot", label: "בתי מזוזה", cat: "בתי מזוזה",
    columns: [
      {
        title: "קלפי מזוזה",
        items: [
          { label: "כל הקלפים",  cat: "קלפי מזוזה" },
          { label: '10 ס"מ',    cat: "קלפי מזוזה", filter: '10 ס"מ' },
          { label: '12 ס"מ',    cat: "קלפי מזוזה", filter: '12 ס"מ' },
          { label: '15 ס"מ',    cat: "קלפי מזוזה", filter: '15 ס"מ' },
          { label: '20 ס"מ',    cat: "קלפי מזוזה", filter: '20 ס"מ' },
        ],
      },
      {
        title: "בתי מזוזה",
        items: [
          { label: "כל בתי המזוזה", cat: "בתי מזוזה" },
          { label: "מזוזות פולימר",  cat: "בתי מזוזה", filter: "מזוזות פולימר" },
          { label: "מזוזות מתכת",    cat: "בתי מזוזה", filter: "מזוזות מתכת" },
          { label: "מזוזות פלסטיק",  cat: "בתי מזוזה", filter: "מזוזות פלסטיק" },
          { label: "מזוזות זכוכית",  cat: "בתי מזוזה", filter: "מזוזות זכוכית" },
          { label: "מזוזות עץ",      cat: "בתי מזוזה", filter: "מזוזות עץ" },
        ],
      },
    ],
  },
  {
    id: "tefillin", label: "תפילין", cat: "תפילין קומפלט",
    columns: [
      {
        title: "קלפים",
        items: [
          { label: "קלפי מזוזה",    cat: "קלפי מזוזה" },
          { label: "קלפי תפילין",   cat: "קלפי תפילין" },
          { label: "תפילין קומפלט", cat: "תפילין קומפלט" },
        ],
      },
      {
        title: "סטים ותיקים",
        items: [
          { label: "כל הסטים",           cat: "סט טלית תפילין" },
          { label: "סטים עור מדומה",     cat: "סט טלית תפילין",   filter: "סטים עור מדומה" },
          { label: "תיקים טרמי",         cat: "סט טלית תפילין",   filter: "תיקים טרמי" },
          { label: "בתי תפילין",         cat: "סט טלית תפילין",   filter: "בתי תפילין" },
        ],
      },
      {
        title: "טלית וציצית",
        items: [
          { label: "טליתות וציציות", cat: "טליתות וציציות" },
          { label: "גופיות ציצית",  cat: "טליתות וציציות", filter: "גופיות ציצית" },
          { label: "טליתות",        cat: "טליתות וציציות", filter: "טליתות" },
        ],
      },
    ],
  },
  {
    id: "tallitot", label: "טליתות וציציות", cat: "טליתות וציציות",
    columns: [
      {
        title: "טליתות",
        items: [
          { label: "כל הטליתות והציציות", cat: "טליתות וציציות" },
          { label: "טליתות צמר",          cat: "טליתות וציציות", filter: "טלית צמר" },
          { label: "גופיות ציצית",        cat: "טליתות וציציות", filter: "גופיות ציצית" },
        ],
      },
      {
        title: "סטים ומארזים",
        items: [
          { label: "סטי טלית ותפילין", cat: "סט טלית תפילין" },
          { label: "מארזים לחתן",      cat: "תיקי טלית ותפילין", filter: "מארז לחתנים" },
        ],
      },
    ],
  },
  {
    id: "tikim", label: "תיקי טלית ותפילין", cat: "תיקי טלית ותפילין",
    columns: [
      {
        title: "תיקי טלית ותפילין",
        items: [
          { label: "כל התיקים", cat: "תיקי טלית ותפילין" },
          { label: "סטים לטלית מעור אמיתי", cat: "תיקי טלית ותפילין", filter: "סטים לטלית מעור אמיתי" },
          { label: "מארזים לחתן", cat: "תיקי טלית ותפילין", filter: "מארז לחתנים" },
        ],
      },
    ],
  },
  {
    id: "kipot", label: "כיפות", cat: "כיפות",
    columns: [
      {
        title: "כיפות",
        items: [
          { label: "כל הכיפות", cat: "כיפות" },
        ],
      },
    ],
  },
  {
    id: "shabbat", label: "שבת", cat: "שבת",
    columns: [
      {
        title: "שבת",
        items: [
          { label: "כל שבת",         cat: "שבת" },
          { label: "פמוטים",         cat: "שבת", filter: "פמוטים" },
          { label: "כיסויי חלה",    cat: "שבת", filter: "כיסויי חלה" },
          { label: "כוסות קידוש",   cat: "שבת", filter: "כוסות קידוש" },
          { label: "מלחיות ומצתים", cat: "שבת", filter: "מצתים, מלחיות ומתקנים לגפרורים" },
          { label: "קרשי חלה",      cat: "שבת", filter: "קרשי חלה, סכינים ומפיונים" },
          { label: "כיסויי פלטה",   cat: "שבת", filter: "כיסויי פלטה" },
          { label: "חתן וכלה",      cat: "שבת", filter: "חתן וכלה" },
        ],
      },
    ],
  },
  {
    id: "judaica", label: "יודאיקה", cat: "יודאיקה",
    columns: [
      {
        title: "יומיומי",
        items: [
          { label: "כל היודאיקה",    cat: "יודאיקה" },
          { label: "נטלות",          cat: "יודאיקה", filter: "נטילת ידיים ומים אחרונים" },
          { label: "ברכונים",        cat: "יודאיקה", filter: "ברכונים" },
          { label: "מחזיקי מפתחות", cat: "יודאיקה", filter: "מחזיקי מפתחות" },
          { label: "קופות צדקה",    cat: "יודאיקה", filter: "קופות צדקה" },
          { label: "הבדלה",         cat: "יודאיקה", filter: "הבדלה" },
          { label: "דמויות חסידים", cat: "יודאיקה", filter: "דמויות חסידים" },
          { label: "חמסות וסגולות", cat: "יודאיקה", filter: "חמסות וסגולות" },
        ],
      },
      {
        title: "חגים",
        items: [
          { label: "פסח",      cat: "חגים", filter: "פסח" },
          { label: "חנוכה",    cat: "חגים", filter: "חנוכה" },
          { label: "ראש השנה", cat: "חגים", filter: "ראש השנה" },
          { label: "דבשיות לראש השנה",     cat: "חגים", filter: "דבשיות לראש השנה" },
          { label: "צלחות סימני ראש השנה", cat: "חגים", filter: "צלחות סימני ראש השנה" },
          { label: "סכיני חלה לראש השנה",  cat: "חגים", filter: "סכיני חלה לראש השנה" },
          { label: "פורים",    cat: "חגים", filter: "פורים" },
          { label: "סוכות",    cat: "חגים", filter: "סוכות" },
        ],
      },
      {
        title: "עוד",
        items: [
          { label: "סטים ומארזים", cat: "יודאיקה", filter: "סטים ומארזים" },
          { label: "מגנטים",      cat: "יודאיקה", filter: "מגנטים" },
          { label: "עטים",        cat: "יודאיקה", filter: "עטים" },
        ],
      },
    ],
  },
  {
    id: "jewelry", label: "תכשיטים", cat: "תכשיטים",
    columns: [
      {
        title: "תכשיטים",
        items: [
          { label: "כל התכשיטים", cat: "תכשיטים" },
        ],
      },
    ],
  },
  {
    id: "hagim", label: "חגים", cat: "חגים",
    columns: [
      {
        title: "חגים ומועדים",
        items: [
          { label: "כל החגים",  cat: "חגים" },
          { label: "חנוכה",     cat: "חגים", filter: "חנוכה" },
          { label: "פסח",       cat: "חגים", filter: "פסח" },
          { label: "סוכות",     cat: "חגים", filter: "סוכות" },
          { label: "פורים",     cat: "חגים", filter: "פורים" },
          { label: "ראש השנה",  cat: "חגים", filter: "ראש השנה" },
        ],
      },
    ],
  },
  {
    id: "matanot", label: "מתנות", cat: "מתנות",
    columns: [
      {
        title: "מתנות",
        items: [
          { label: "כל המתנות", cat: "מתנות" },
        ],
      },
    ],
  },
  {
    id: "synagogue", label: "מוצרי בית כנסת", cat: "מוצרי בית כנסת",
    columns: [
      {
        title: "מוצרי בית כנסת",
        items: [
          { label: "כל המוצרים", cat: "מוצרי בית כנסת" },
        ],
      },
    ],
  },
  {
    id: "books", label: "ספרי קודש וברכונים", cat: "ספרי קודש וברכונים",
    columns: [
      {
        title: "ספרי קודש וברכונים",
        items: [
          { label: "כל הספרים",        cat: "ספרי קודש וברכונים" },
          { label: "סידורים ותהילים",  cat: "ספרי קודש וברכונים", filter: "סידורים ותהילים" },
          { label: "ברכונים",          cat: "ספרי קודש וברכונים", filter: "ברכונים" },
          { label: "זמירות שבת",       cat: "ספרי קודש וברכונים", filter: "זמירות שבת" },
          { label: "תפילות ותחינות",   cat: "ספרי קודש וברכונים", filter: "תפילות ותחינות" },
        ],
      },
      {
        title: "חגים ומעמדים",
        items: [
          { label: "הגדות פסח",        cat: "ספרי קודש וברכונים", filter: "הגדות פסח" },
          { label: "מגילות אסתר",      cat: "ספרי קודש וברכונים", filter: "מגילות אסתר" },
          { label: "מעמדים וסטנדים",   cat: "ספרי קודש וברכונים", filter: "מעמדים וסטנדים" },
        ],
      },
    ],
  },
];

/** URL for a category / subcategory — mirrors NavBar's handleSelect. */
export function categoryUrl(cat: string, filter?: string): string {
  let url = `/category/${encodeURIComponent(cat)}`;
  if (filter) url += `?filter=${encodeURIComponent(filter)}`;
  return url;
}
