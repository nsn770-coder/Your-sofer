// אירועי חיים של הבית היהודי
// relatedCategories: ערכי cat + subCategory מדויקים מ-Firestore (אל תשנה כתיב)
// subCategories: 'all' = כל המוצרים בקטגוריה | string[] = סינון לפי subCategory
//
// DEDUP: כשעמוד ה-hub ימשוך מוצרים מ-relatedCategories מרובות, יש לעשות דה-דופ
// לפי product ID לפני הרנדור — מוצר יכול להופיע תחת קטגוריות שונות
// (למשל פמוטים גם ב-"שבת" וגם ב-"עיצוב הבית"), ואסור שיוצג פעמיים.

export interface CategoryFilter {
  category: string;
  subCategories: 'all' | string[];
}

export interface LifeEvent {
  id: string;
  title: string;
  emotionalTitle: string;
  description: string;
  relatedCategories: CategoryFilter[];
  externalLinks?: { label: string; href: string }[];
  promo?: null | { type: string; description: string };
}

export const lifeEvents: LifeEvent[] = [
  {
    id: 'new-home',
    title: 'בית חדש',
    emotionalTitle: 'המזוזה הראשונה בבית שלך',
    description: 'עוברים דירה? קובעים מזוזות על הפתחים החדשים עם קלפים מסופרים מוסמכים ובתים יפים לכל סגנון.',
    relatedCategories: [
      { category: 'קלפי מזוזה',   subCategories: 'all' },
      { category: 'בתי מזוזה',    subCategories: 'all' },
      { category: 'עיצוב הבית',   subCategories: ['אגרטלים', 'מראות', 'מסגרות תמונה', 'עיטורים וזרים'] },
    ],
    promo: null, // כאן יוגדר מבצע 2+1 בעתיד
  },
  {
    id: 'shabbat-home',
    title: 'שבת בבית',
    emotionalTitle: 'שולחן השבת שלך',
    description: 'כוסות קידוש, פמוטים, כיסויי חלה, מפות שולחן — כל מה שהופך שישי בערב לחוויה.',
    relatedCategories: [
      { category: 'שבת',                subCategories: 'all' },
      { category: 'יודאיקה',            subCategories: ['הבדלה'] },
      { category: 'כלי שולחן והגשה',   subCategories: ['כוסות', 'קנקנים'] },
      { category: 'עיצוב הבית',         subCategories: ['פמוטים', 'מעמדות לנר'] },
    ],
  },
  {
    id: 'bar-mitzvah',
    title: 'בר מצווה',
    emotionalTitle: 'הרגע הגדול שלו',
    description: 'תפילין, טלית, תיק, כיסוי — כל מה שצריך ליום המיוחד, עם ייעוץ אישי מהסופרים שלנו.',
    relatedCategories: [
      { category: 'סט טלית תפילין',      subCategories: 'all' },
      { category: 'תפילין קומפלט',        subCategories: 'all' },
      { category: 'כיסוי תפילין',         subCategories: 'all' },
      { category: 'תיקי טלית ותפילין',   subCategories: 'all' },
      { category: 'קלפי תפילין',          subCategories: 'all' },
      { category: 'בר מצווה',             subCategories: 'all' },
      { category: 'כיפות',               subCategories: 'all' },
      { category: 'טליתות וציציות',       subCategories: 'all' },
    ],
    // הדפסות לאירועים — route בלבד, לא קטגוריה ב-Firestore
    externalLinks: [
      { label: 'הדפסות לאירועים', href: '/print-order' },
    ],
  },
  {
    id: 'wedding',
    title: 'חתונה',
    emotionalTitle: 'תחילת הבית היהודי',
    description: 'מתנות לחתן וכלה, סטים מיוחדים, תכשיטים ועיצוב לבית החדש שמתחיל.',
    relatedCategories: [
      { category: 'סט טלית תפילין',  subCategories: 'all' },
      { category: 'טליתות וציציות',   subCategories: 'all' },
      { category: 'תכשיטים',          subCategories: 'all' },
      { category: 'עיצוב הבית',       subCategories: ['פמוטים'] },
    ],
  },
  {
    id: 'new-baby',
    title: 'לידה ומשפחה',
    emotionalTitle: 'ממתי הוא יהודי',
    description: 'מזוזה לחדר הילדים, כיפה ראשונה, מתנות ברית ולידה — הרגעים הקטנים שמתחילים הכל.',
    relatedCategories: [
      { category: 'בתי מזוזה',          subCategories: 'all' },
      { category: 'כיפות',              subCategories: 'all' },
      { category: 'ספרי קודש וסידורים', subCategories: 'all' },
      { category: 'מתנות',              subCategories: 'all' },
      { category: 'יודאיקה',            subCategories: ['דמויות חסידים', 'מגנטים'] },
    ],
  },
  {
    id: 'holidays',
    title: 'חגים וזמנים',
    emotionalTitle: 'כל חג יש לו ריח',
    description: 'חנוכיות, קערות סדר, שופרות — מוצרים לכל חג וזמן בלוח השנה היהודי.',
    relatedCategories: [
      {
        category: 'יודאיקה',
        subCategories: ['פסח', 'חנוכה', 'חנוכיות', 'ראש השנה', 'פורים', 'סוכות', 'הבדלה'],
      },
    ],
  },
  {
    id: 'reconnect',
    title: 'להתחבר מחדש',
    emotionalTitle: 'לחזור לשורשים',
    description: 'מזוזה שפגה, תפילין שצריכות בדיקה, טלית חדשה — כשרוצים לחזור עם כל הלב.',
    relatedCategories: [
      { category: 'קלפי מזוזה',          subCategories: 'all' },
      { category: 'תפילין קומפלט',        subCategories: 'all' },
      { category: 'טליתות וציציות',       subCategories: 'all' },
      { category: 'ספרי קודש וסידורים',  subCategories: 'all' },
      { category: 'מוצרי בית כנסת',      subCategories: 'all' },
      { category: 'מגילות',              subCategories: 'all' },
      { category: 'ספרי תורה',           subCategories: 'all' },
    ],
  },
];

export default lifeEvents;
