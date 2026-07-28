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
  nameContains?: string[];
  tabLabel?: string;
}

export interface LifeEvent {
  id: string;
  title: string;
  emotionalTitle: string;
  description: string;
  image: string;
  relatedCategories: CategoryFilter[];
  externalLinks?: { label: string; href: string }[];
  promo?: null | { type: string; description: string };
}

export const lifeEvents: LifeEvent[] = [
  {
    id: 'wedding',
    title: 'חתונה והפרשת חלה',
    emotionalTitle: 'תחילת הבית היהודי',
    description: 'מתנות לחתן וכלה, סטים מיוחדים, תכשיטים ועיצוב לבית החדש שמתחיל.',
    image: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780586286/%D7%94%D7%A4%D7%A8%D7%A9%D7%AA_%D7%97%D7%9C%D7%94_1_badjmr.png',
    relatedCategories: [
      { category: 'סט טלית תפילין',  subCategories: 'all' },
      { category: 'טליתות וציציות',   subCategories: 'all' },
      { category: 'תכשיטים',          subCategories: 'all' },
      { category: 'שבת', subCategories: ['הפרשת חלה'],                                  tabLabel: 'הפרשת חלה' },
      { category: 'שבת', subCategories: ['חתן וכלה'], nameContains: ['חלה', 'הפרשת'], tabLabel: 'הפרשת חלה' },
      { category: 'שבת', subCategories: ['חתן וכלה'],                                   tabLabel: 'חתן וכלה'  },
    ],
  },
  {
    id: 'new-baby',
    title: 'לידה ומשפחה',
    emotionalTitle: 'ממתי הוא יהודי',
    description: 'מזוזה לחדר הילדים, כיפה ראשונה, מתנות ברית ולידה — הרגעים הקטנים שמתחילים הכל.',
    image: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780390730/ChatGPT_Image_Jun_2_2026_11_33_20_AM_uwohai.png',
    relatedCategories: [
      { category: 'בתי מזוזה',          subCategories: 'all' },
      { category: 'כיפות',              subCategories: 'all' },
      { category: 'ספרי קודש וסידורים', subCategories: 'all' },
      { category: 'מתנות',              subCategories: 'all' },
      { category: 'יודאיקה',            subCategories: ['דמויות חסידים', 'מגנטים'] },
    ],
  },
  {
    id: 'new-home',
    title: 'בית חדש',
    emotionalTitle: 'המזוזה הראשונה בבית שלך',
    description: 'עוברים דירה? קובעים מזוזות על הפתחים החדשים עם קלפים מסופרים מוסמכים ובתים יפים לכל סגנון.',
    image: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780390736/%D7%9E%D7%96%D7%95%D7%96%D7%94_%D7%9E%D7%A9%D7%A4%D7%97%D7%94_isoump.png',
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
    image: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780390734/%D7%9E%D7%A9%D7%A4%D7%97%D7%94_%D7%A7%D7%99%D7%93%D7%95%D7%A9_rfwqcc.png',
    relatedCategories: [
      { category: 'שבת',                subCategories: 'all' },
      { category: 'יודאיקה',            subCategories: ['הבדלה'] },
      { category: 'כלי שולחן והגשה',   subCategories: ['כוסות', 'קנקנים'] },
      { category: 'עיצוב הבית',         subCategories: ['פמוטים', 'מעמדות לנר'] },
    ],
  },
  {
    id: 'holidays',
    title: 'חגים וזמנים',
    emotionalTitle: 'כל חג יש לו ריח',
    description: 'חנוכיות, קערות סדר, שופרות — מוצרים לכל חג וזמן בלוח השנה היהודי.',
    image: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780390735/%D7%9E%D7%A9%D7%A4%D7%97%D7%94_%D7%97%D7%A0%D7%95%D7%9B%D7%94_muwxhy.png',
    relatedCategories: [
      {
        category: 'יודאיקה',
        subCategories: ['פסח', 'חנוכה', 'חנוכיות', 'ראש השנה', 'פורים', 'סוכות', 'הבדלה'],
      },
    ],
  },
  {
    id: 'bar-mitzvah',
    title: 'בר מצווה',
    emotionalTitle: 'הרגע הגדול שלו',
    description: 'תפילין, טלית, תיק, כיסוי — כל מה שצריך ליום המיוחד, עם ייעוץ אישי מהסופרים שלנו.',
    image: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780390727/%D7%91%D7%A8_%D7%9E%D7%A6%D7%95%D7%94_%D7%9E%D7%A9%D7%A4%D7%97%D7%94_stgs8v.jpg',
    relatedCategories: [
      { category: 'סט טלית תפילין',      subCategories: 'all' },
      { category: 'תפילין קומפלט',        subCategories: 'all' },
      { category: 'כיסוי תפילין',         subCategories: 'all' },
      { category: 'תיקי טלית ותפילין',   subCategories: 'all' },
      { category: 'קלפי תפילין',          subCategories: 'all' },
      { category: 'בר מצווה',             subCategories: 'all' },
      { category: 'כיפות',               subCategories: 'all' },
      { category: 'טליתות וציציות',       subCategories: 'all' },
      // מוצרי דף המזכרות לאירועים — כפתור סינון "מזכרות לאירועים" בעמוד
      { category: 'מזכרות לאירועים',      subCategories: 'all', tabLabel: 'מזכרות לאירועים' },
    ],
    // הדפסות לאירועים — route בלבד, לא קטגוריה ב-Firestore
    externalLinks: [
      { label: 'הדפסות לאירועים', href: '/print-order' },
    ],
  },
  {
    id: 'reconnect',
    title: 'להתחבר מחדש',
    emotionalTitle: 'לחזור לשורשים',
    description: 'מזוזה שפגה, תפילין שצריכות בדיקה, טלית חדשה — כשרוצים לחזור עם כל הלב.',
    image: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780390734/%D7%9E%D7%A9%D7%A4%D7%97%D7%94_%D7%A0%D7%A8%D7%95%D7%AA_%D7%A9%D7%91%D7%AA_nadzhl.png',
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
