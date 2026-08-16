// ─────────────────────────────────────────────────────────────────────────────
// תרגום שמות קטגוריות ותת-קטגוריות — לתצוגה בלבד.
//
// ⚠️ קריטי: המחרוזות העבריות כאן הן ערכי ה-cat / subCategory האמיתיים ב-Firestore
// והן משמשות לשאילתות ולכתובות URL. הקובץ הזה לא משנה אותן — הוא רק מספק
// תווית תצוגה בשפת המשתמש. אין לתרגם או "לנקות" את המפתחות עצמם.
//
// מקור המפתחות: app/constants/categories.ts (CATS + SUB_CATS).
// ─────────────────────────────────────────────────────────────────────────────

type LabelSet = { en: string; fr: string; es: string; ar: string; ru: string };

const CATEGORY_LABELS: Record<string, LabelSet> = {
  // ── קטגוריות ראשיות ──
  'הכל':                  { en: 'All products',        fr: 'Tous les produits',   es: 'Todos los productos', ar: 'جميع المنتجات',       ru: 'Все товары' },
  'בתי מזוזה':            { en: 'Mezuzah cases',       fr: 'Étuis de mezouza',    es: 'Estuches de mezuzá',  ar: 'علب مزوزة',            ru: 'Футляры для мезузы' },
  'תפילין קומפלט':        { en: 'Complete tefillin',   fr: 'Tefillin complets',   es: 'Tefilín completos',   ar: 'تفيلين كاملة',         ru: 'Тфилин в комплекте' },
  'טליתות':               { en: 'Tallitot',            fr: 'Talitot',             es: 'Talitot',             ar: 'شيلان صلاة',           ru: 'Талиты' },
  'מגילות':               { en: 'Megillot',            fr: 'Meguilot',            es: 'Meguilot',            ar: 'مخطوطات',              ru: 'Свитки' },
  'ספרי תורה':            { en: 'Torah scrolls',       fr: 'Rouleaux de Torah',   es: 'Rollos de Torá',      ar: 'أسفار التوراة',        ru: 'Свитки Торы' },
  'יודאיקה':              { en: 'Judaica',             fr: 'Judaïca',             es: 'Judaica',             ar: 'يهودية',               ru: 'Иудаика' },
  'חגים':                 { en: 'Holidays',            fr: 'Fêtes',               es: 'Festividades',        ar: 'الأعياد',              ru: 'Праздники' },
  'יודאיקה כללי':         { en: 'General Judaica',     fr: 'Judaïca général',     es: 'Judaica general',     ar: 'يهودية عامة',          ru: 'Общая иудаика' },
  'מתנות':                { en: 'Gifts',               fr: 'Cadeaux',             es: 'Regalos',             ar: 'هدايا',                ru: 'Подарки' },
  'בר מצווה':             { en: 'Bar Mitzvah',         fr: 'Bar Mitsva',          es: 'Bar Mitzvá',          ar: 'بار متسفا',            ru: 'Бар-мицва' },
  'קלפים':                { en: 'Parchments',          fr: 'Parchemins',          es: 'Pergaminos',          ar: 'رقوق',                 ru: 'Пергаменты' },
  'קלפי מזוזה':           { en: 'Mezuzah scrolls',     fr: 'Parchemins de mezouza', es: 'Pergaminos de mezuzá', ar: 'رقوق المزوزة',     ru: 'Свитки для мезузы' },
  'קלפי תפילין':          { en: 'Tefillin parchments', fr: 'Parchemins de tefillin', es: 'Pergaminos de tefilín', ar: 'رقوق التفيلين', ru: 'Пергаменты для тфилин' },
  'כיפות':                { en: 'Kippot',              fr: 'Kippot',              es: 'Kipot',               ar: 'قلنسوات',              ru: 'Кипы' },
  'ספרי קודש וברכונים':   { en: 'Books & benchers',    fr: 'Livres et birkonim',  es: 'Libros y bircones',   ar: 'كتب وأدعية',           ru: 'Книги и бирконы' },
  'תיקי טלית ותפילין':    { en: 'Tallit & tefillin bags', fr: 'Sacs à talit et tefillin', es: 'Bolsas de talit y tefilín', ar: 'حقائب الصلاة', ru: 'Сумки для талита и тфилин' },
  'שבתות וחגים':          { en: 'Shabbat & holidays',  fr: 'Chabbat et fêtes',    es: 'Shabat y festividades', ar: 'السبت والأعياد',     ru: 'Шаббат и праздники' },

  // ── תת-קטגוריות: טליתות ──
  'טלית קטן':             { en: 'Tallit katan',        fr: 'Talit katan',         es: 'Talit katán',         ar: 'طاليت قطان',           ru: 'Талит катан' },
  'טלית צמר':             { en: 'Wool tallit',         fr: 'Talit en laine',      es: 'Talit de lana',       ar: 'طاليت صوف',            ru: 'Шерстяной талит' },
  'סט טלית תפילין':       { en: 'Tallit & tefillin set', fr: 'Ensemble talit-tefillin', es: 'Set de talit y tefilín', ar: 'طقم طاليت وتفيلين', ru: 'Комплект талит и тфилин' },

  // ── תת-קטגוריות: יודאיקה ──
  'נטילת ידיים':          { en: 'Washing cups',        fr: 'Coupes à ablutions',  es: 'Copas de lavado',     ar: 'أوعية الغسل',          ru: 'Кружки для омовения' },
  'שבת':                  { en: 'Shabbat',             fr: 'Chabbat',             es: 'Shabat',              ar: 'السبت',                ru: 'Шаббат' },
  'סטים ומארזים':         { en: 'Sets & gift boxes',   fr: 'Coffrets et ensembles', es: 'Sets y estuches',   ar: 'أطقم وعلب هدايا',      ru: 'Наборы и подарочные боксы' },
  'ברכות לתלייה':         { en: 'Wall blessings',      fr: 'Bénédictions murales', es: 'Bendiciones de pared', ar: 'بركات للتعليق',      ru: 'Настенные благословения' },
  'מעמדים וסטנדים':       { en: 'Stands & holders',    fr: 'Supports et présentoirs', es: 'Soportes y atriles', ar: 'حوامل ومساند',      ru: 'Подставки и держатели' },

  // ── תת-קטגוריות: חגים ──
  'חנוכה':                { en: 'Hanukkah',            fr: 'Hanouka',             es: 'Janucá',              ar: 'حانوكا',               ru: 'Ханука' },
  'פסח':                  { en: 'Passover',            fr: 'Pessah',              es: 'Pésaj',               ar: 'عيد الفصح',            ru: 'Песах' },
  'סוכות':                { en: 'Sukkot',              fr: 'Souccot',             es: 'Sucot',               ar: 'عيد المظال',           ru: 'Суккот' },
  'פורים':                { en: 'Purim',               fr: 'Pourim',              es: 'Purim',               ar: 'بوريم',                ru: 'Пурим' },
  'ראש השנה':             { en: 'Rosh Hashanah',       fr: 'Roch Hachana',        es: 'Rosh Hashaná',        ar: 'رأس السنة',            ru: 'Рош ха-Шана' },
  'דבשיות לראש השנה':     { en: 'Honey dishes',        fr: 'Pots à miel',         es: 'Mieleras',            ar: 'أوعية العسل',          ru: 'Медовницы' },
  'צלחות סימני ראש השנה': { en: 'Simanim plates',      fr: 'Plateaux de simanim', es: 'Platos de simanim',   ar: 'أطباق السيمانيم',      ru: 'Блюда для симаним' },
  'סכיני חלה לראש השנה':  { en: 'Challah knives',      fr: 'Couteaux à hallah',   es: 'Cuchillos de jalá',   ar: 'سكاكين الخلة',         ru: 'Ножи для халы' },

  // ── תת-קטגוריות: בר מצווה ──
  'סטים לבר מצווה':       { en: 'Bar Mitzvah sets',    fr: 'Ensembles Bar Mitsva', es: 'Sets de Bar Mitzvá', ar: 'أطقم بار متسفا',       ru: 'Наборы для бар-мицвы' },
  'מתנות לבר מצווה':      { en: 'Bar Mitzvah gifts',   fr: 'Cadeaux Bar Mitsva',  es: 'Regalos de Bar Mitzvá', ar: 'هدايا بار متسفا',   ru: 'Подарки на бар-мицву' },

  // ── תת-קטגוריות: ספרי קודש ──
  'סידורים ותהילים':      { en: 'Siddurim & Tehillim', fr: 'Sidourim et Tehilim', es: 'Sidurim y Tehilim',   ar: 'كتب صلاة ومزامير',     ru: 'Сидуры и Теилим' },
  'ברכונים':              { en: 'Benchers',            fr: 'Birkonim',            es: 'Bircones',            ar: 'كتب البركات',          ru: 'Бирконы' },
  'זמירות שבת':           { en: 'Shabbat zemirot',     fr: 'Zemirot de Chabbat',  es: 'Zemirot de Shabat',   ar: 'ترانيم السبت',         ru: 'Шаббатние земирот' },
  'תפילות ותחינות':       { en: 'Prayers & techinot',  fr: 'Prières et tehinot',  es: 'Oraciones y tejinot', ar: 'أدعية وابتهالات',      ru: 'Молитвы и техинот' },
  'הגדות פסח':            { en: 'Passover Haggadot',   fr: 'Haggadot de Pessah',  es: 'Hagadot de Pésaj',    ar: 'هاجادوت الفصح',        ru: 'Пасхальные Агады' },
  'מגילות אסתר':          { en: 'Esther scrolls',      fr: 'Rouleaux d’Esther',   es: 'Rollos de Ester',     ar: 'مخطوطات إستير',        ru: 'Свитки Эстер' },

  // ── תת-קטגוריות: תיקים ──
  'מארז לחתנים':          { en: 'Groom’s set',         fr: 'Coffret du marié',    es: 'Set para el novio',   ar: 'طقم العريس',           ru: 'Набор для жениха' },
};

/**
 * תווית תצוגה לקטגוריה בשפה הנתונה.
 * חסר תרגום → מוחזר הערך העברי המקורי (עדיף על מפתח גולמי או תיבה ריקה).
 */
export function categoryLabel(hebrew: string | undefined | null, locale: string): string {
  if (!hebrew) return '';
  if (locale === 'he') return hebrew;
  const set = CATEGORY_LABELS[hebrew.trim()];
  if (!set) return hebrew;
  return set[locale as keyof LabelSet] ?? hebrew;
}

/** האם קיים תרגום לקטגוריה — שימושי לבדיקות כיסוי */
export function hasCategoryLabel(hebrew: string): boolean {
  return !!CATEGORY_LABELS[hebrew.trim()];
}

export const TRANSLATED_CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);
