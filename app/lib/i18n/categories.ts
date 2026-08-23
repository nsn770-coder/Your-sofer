// ─────────────────────────────────────────────────────────────────────────────
// תרגום שמות קטגוריות ותת-קטגוריות — לתצוגה בלבד.
//
// ⚠️ קריטי: המחרוזות העבריות כאן הן ערכי ה-cat / subCategory האמיתיים ב-Firestore
// והן משמשות לשאילתות ולכתובות URL. הקובץ הזה לא משנה אותן — הוא רק מספק
// תווית תצוגה בשפת המשתמש. אין לתרגם או "לנקות" את המפתחות עצמם.
//
// מקור המפתחות:
//   · app/constants/categories.ts  (CATS + SUB_CATS)
//   · data/categoriesMenu.ts       (כל cat / filter / title בתפריט המגה)
//   · אוסף categories ב-Firestore  (תת-הקטגוריות של הכיפות, parentCategory="כיפות")
//
// כשמוסיפים תת-קטגוריה חדשה לפיירסטור צריך להוסיף אותה גם כאן, אחרת היא
// תופיע בעברית בתוך תפריט אנגלי. אין נפילה אוטומטית לתרגום מכונה — בכוונה.
// ─────────────────────────────────────────────────────────────────────────────

import { attrValueLabel } from './attributes';

type LabelSet = { en: string; fr: string; es: string; ru: string };

const CATEGORY_LABELS: Record<string, LabelSet> = {
  // ── קטגוריות ראשיות ──
  'הכל':                { en: 'All products',           fr: 'Tous les produits',        es: 'Todos los productos',       ru: 'Все товары' },
  'בתי מזוזה':          { en: 'Mezuzah cases',          fr: 'Étuis de mezouza',         es: 'Estuches de mezuzá',        ru: 'Футляры для мезузы' },
  'תפילין קומפלט':      { en: 'Complete tefillin',      fr: 'Tefillin complets',        es: 'Tefilín completos',         ru: 'Тфилин в комплекте' },
  'טליתות':             { en: 'Tallitot',               fr: 'Talitot',                  es: 'Talitot',                   ru: 'Талиты' },
  'טליתות וציציות':     { en: 'Tallitot & tzitzit',     fr: 'Talitot et tsitsit',       es: 'Talitot y tzitzit',         ru: 'Талиты и цицит' },
  'מגילות':             { en: 'Megillot',               fr: 'Meguilot',                 es: 'Meguilot',                  ru: 'Свитки' },
  'ספרי תורה':          { en: 'Torah scrolls',          fr: 'Rouleaux de Torah',        es: 'Rollos de Torá',            ru: 'Свитки Торы' },
  'יודאיקה':            { en: 'Judaica',                fr: 'Judaïca',                  es: 'Judaica',                   ru: 'Иудаика' },
  'חגים':               { en: 'Holidays',               fr: 'Fêtes',                    es: 'Festividades',              ru: 'Праздники' },
  'יודאיקה כללי':       { en: 'General Judaica',        fr: 'Judaïca général',          es: 'Judaica general',           ru: 'Общая иудаика' },
  'מתנות':              { en: 'Gifts',                  fr: 'Cadeaux',                  es: 'Regalos',                   ru: 'Подарки' },
  'בר מצווה':           { en: 'Bar Mitzvah',            fr: 'Bar Mitsva',               es: 'Bar Mitzvá',                ru: 'Бар-мицва' },
  'קלפים':              { en: 'Parchments',             fr: 'Parchemins',               es: 'Pergaminos',                ru: 'Пергаменты' },
  'קלפי מזוזה':         { en: 'Mezuzah scrolls',        fr: 'Parchemins de mezouza',    es: 'Pergaminos de mezuzá',      ru: 'Свитки для мезузы' },
  'קלפי תפילין':        { en: 'Tefillin parchments',    fr: 'Parchemins de tefillin',   es: 'Pergaminos de tefilín',     ru: 'Пергаменты для тфилин' },
  'כיפות':              { en: 'Kippot',                 fr: 'Kippot',                   es: 'Kipot',                     ru: 'Кипы' },
  'ספרי קודש וברכונים': { en: 'Books & benchers',       fr: 'Livres et birkonim',       es: 'Libros y bircones',         ru: 'Книги и бирконы' },
  'תיקי טלית ותפילין':  { en: 'Tallit & tefillin bags', fr: 'Sacs à talit et tefillin', es: 'Bolsas de talit y tefilín', ru: 'Сумки для талита и тфилин' },
  'שבתות וחגים':        { en: 'Shabbat & holidays',     fr: 'Chabbat et fêtes',         es: 'Shabat y festividades',     ru: 'Шаббат и праздники' },
  'מוצרי בית כנסת':     { en: 'Synagogue supplies',     fr: 'Articles de synagogue',    es: 'Artículos de sinagoga',     ru: 'Товары для синагоги' },
  'תכשיטים':            { en: 'Jewelry',                fr: 'Bijoux',                   es: 'Joyería',                   ru: 'Украшения' },

  // ── תת-קטגוריות: כיפות (אוסף categories ב-Firestore, parentCategory="כיפות") ──
  'כיפות מיוחדות':        { en: 'Specialty kippot',           fr: 'Kippot spéciales',         es: 'Kipot especiales',         ru: 'Особые кипы' },
  'כיפות סאטן וטרילין':   { en: 'Satin & terylene kippot',    fr: 'Kippot satin et térylène', es: 'Kipot de satén y tergal',  ru: 'Кипы из сатина и терилена' },
  'כיפות סרוגות':         { en: 'Knitted kippot',             fr: 'Kippot tricotées',         es: 'Kipot tejidas',            ru: 'Вязаные кипы' },
  'כיפות סרוגות DMC':     { en: 'DMC knitted kippot',         fr: 'Kippot tricotées DMC',     es: 'Kipot tejidas DMC',        ru: 'Вязаные кипы DMC' },
  'כיפות סרוגות עם רקמה': { en: 'Embroidered knitted kippot', fr: 'Kippot tricotées brodées', es: 'Kipot tejidas bordadas',   ru: 'Вязаные кипы с вышивкой' },
  'כיפות עור':            { en: 'Leather kippot',             fr: 'Kippot en cuir',           es: 'Kipot de cuero',           ru: 'Кожаные кипы' },
  'כיפות פריק':           { en: 'Frik kippot',                fr: 'Kippot frik',              es: 'Kipot frik',               ru: 'Кипы «фрик»' },
  'כיפות פריק עבודת יד':  { en: 'Handmade frik kippot',       fr: 'Kippot frik faites main',  es: 'Kipot frik hechas a mano', ru: 'Кипы «фрик» ручной работы' },
  'כיפות קטיפה':          { en: 'Velvet kippot',              fr: 'Kippot en velours',        es: 'Kipot de terciopelo',      ru: 'Бархатные кипы' },
  'סיכות לכיפה':          { en: 'Kippah clips',               fr: 'Pinces à kippa',           es: 'Clips para kipá',          ru: 'Заколки для кипы' },
  'כיפות ומזכרות':        { en: 'Kippot & favors',            fr: 'Kippot et souvenirs',      es: 'Kipot y recuerdos',        ru: 'Кипы и сувениры' },
  'מזכרות לאירועים':      { en: 'Event favors',               fr: 'Souvenirs d’événements',   es: 'Recuerdos para eventos',   ru: 'Сувениры для торжеств' },
  'כיפות לאירועים':       { en: 'Event kippot',               fr: 'Kippot pour événements',   es: 'Kipot para eventos',       ru: 'Кипы для торжеств' },
  'כיפות ומזכרות לאירועים': { en: 'Event kippot & favors',   fr: 'Kippot et souvenirs',      es: 'Kipot y recuerdos',        ru: 'Кипы и сувениры для торжеств' },
  'סט בר מצווה':          { en: 'Bar Mitzvah set',            fr: 'Ensemble Bar Mitsva',      es: 'Set de Bar Mitzvá',        ru: 'Набор для бар-мицвы' },
  'טליתות (כללי)':        { en: 'Tallitot (general)',         fr: 'Talitot (général)',        es: 'Talitot (general)',        ru: 'Талиты (общее)' },

  // ── תת-קטגוריות: מזוזות ותפילין ──
  'מזוזות פולימר': { en: 'Polymer mezuzah cases', fr: 'Étuis de mezouza en polymère',  es: 'Estuches de mezuzá de polímero', ru: 'Полимерные футляры для мезузы' },
  'מזוזות מתכת':   { en: 'Metal mezuzah cases',   fr: 'Étuis de mezouza en métal',     es: 'Estuches de mezuzá de metal',    ru: 'Металлические футляры для мезузы' },
  'מזוזות פלסטיק': { en: 'Plastic mezuzah cases', fr: 'Étuis de mezouza en plastique', es: 'Estuches de mezuzá de plástico', ru: 'Пластиковые футляры для мезузы' },
  'מזוזות זכוכית': { en: 'Glass mezuzah cases',   fr: 'Étuis de mezouza en verre',     es: 'Estuches de mezuzá de vidrio',   ru: 'Стеклянные футляры для мезузы' },
  'מזוזות עץ':     { en: 'Wooden mezuzah cases',  fr: 'Étuis de mezouza en bois',      es: 'Estuches de mezuzá de madera',   ru: 'Деревянные футляры для мезузы' },
  'בתי תפילין':    { en: 'Tefillin batim',        fr: 'Batim de tefillin',             es: 'Batim de tefilín',               ru: 'Батим для тфилин' },

  // ── תת-קטגוריות: טליתות, ציציות וסטים ──
  'טלית קטן':              { en: 'Tallit katan',                fr: 'Talit katan',                         es: 'Talit katán',                      ru: 'Талит катан' },
  'טלית צמר':              { en: 'Wool tallit',                 fr: 'Talit en laine',                      es: 'Talit de lana',                    ru: 'Шерстяной талит' },
  'סט טלית תפילין':        { en: 'Tallit & tefillin set',       fr: 'Ensemble talit-tefillin',             es: 'Set de talit y tefilín',           ru: 'Комплект талит и тфилин' },
  'טלית וציצית':           { en: 'Tallit & tzitzit',            fr: 'Talit et tsitsit',                    es: 'Talit y tzitzit',                  ru: 'Талит и цицит' },
  'גופיות ציצית':          { en: 'Tzitzit undershirts',         fr: 'Maillots à tsitsit',                  es: 'Camisetas de tzitzit',             ru: 'Майки с цицит' },
  'סטים ותיקים':           { en: 'Sets & bags',                 fr: 'Ensembles et sacs',                   es: 'Sets y bolsas',                    ru: 'Комплекты и сумки' },
  'סטים עור מדומה':        { en: 'Faux leather sets',           fr: 'Ensembles en simili cuir',            es: 'Sets de cuero sintético',          ru: 'Комплекты из искусственной кожи' },
  'סטים לטלית מעור אמיתי': { en: 'Genuine leather tallit sets', fr: 'Ensembles à talit en cuir véritable', es: 'Sets de talit en cuero auténtico', ru: 'Комплекты для талита из натуральной кожи' },
  'תיקים טרמי':            { en: 'Thermal bags',                fr: 'Sacs thermiques',                     es: 'Bolsas térmicas',                  ru: 'Термосумки' },
  'מארז לחתנים':           { en: 'Groom’s set',                 fr: 'Coffret du marié',                    es: 'Set para el novio',                ru: 'Набор для жениха' },

  // ── תת-קטגוריות: יודאיקה ובית ──
  'נטילת ידיים':                    { en: 'Washing cups',                           fr: 'Coupes à ablutions',                        es: 'Copas de lavado',                         ru: 'Кружки для омовения' },
  'נטילת ידיים ומים אחרונים':       { en: 'Washing cups & mayim acharonim',         fr: 'Coupes à ablutions et mayim aharonim',      es: 'Copas de lavado y mayim ajaronim',        ru: 'Кружки для омовения и маим ахроним' },
  'שבת':                            { en: 'Shabbat',                                fr: 'Chabbat',                                   es: 'Shabat',                                  ru: 'Шаббат' },
  'הבדלה':                          { en: 'Havdalah',                               fr: 'Havdala',                                   es: 'Havdalá',                                 ru: 'Авдала' },
  'סטים ומארזים':                   { en: 'Sets & gift boxes',                      fr: 'Coffrets et ensembles',                     es: 'Sets y estuches',                         ru: 'Наборы и подарочные боксы' },
  'ברכות לתלייה':                   { en: 'Wall blessings',                         fr: 'Bénédictions murales',                      es: 'Bendiciones de pared',                    ru: 'Настенные благословения' },
  'מעמדים וסטנדים':                 { en: 'Stands & holders',                       fr: 'Supports et présentoirs',                   es: 'Soportes y atriles',                      ru: 'Подставки и держатели' },
  'כוסות קידוש':                    { en: 'Kiddush cups',                           fr: 'Coupes de Kiddouch',                        es: 'Copas de Kidush',                         ru: 'Кидушные бокалы' },
  'פמוטים':                         { en: 'Candlesticks',                           fr: 'Bougeoirs',                                 es: 'Candelabros',                             ru: 'Подсвечники' },
  'כיסויי חלה':                     { en: 'Challah covers',                         fr: 'Couvre-hallah',                             es: 'Cubiertas de jalá',                       ru: 'Покрывала для халы' },
  'כיסויי פלטה':                    { en: 'Hotplate covers',                        fr: 'Couvre-plaques de Chabbat',                 es: 'Cubiertas para plancha de Shabat',        ru: 'Покрывала для шабатней плиты' },
  'קרשי חלה, סכינים ומפיונים':      { en: 'Challah boards, knives & napkins',       fr: 'Planches à hallah, couteaux et serviettes', es: 'Tablas de jalá, cuchillos y servilletas', ru: 'Доски для халы, ножи и салфетки' },
  'מצתים, מלחיות ומתקנים לגפרורים': { en: 'Lighters, salt cellars & match holders', fr: 'Briquets, salières et porte-allumettes',    es: 'Encendedores, saleros y porta-cerillas',  ru: 'Зажигалки, солонки и подставки для спичек' },
  'קופות צדקה':                     { en: 'Tzedakah boxes',                         fr: 'Boîtes de tsedaka',                         es: 'Alcancías de tzedaká',                    ru: 'Копилки для цдаки' },
  'חמסות וסגולות':                  { en: 'Hamsas & segulot',                       fr: 'Hamsas et segoulot',                        es: 'Hamsas y segulot',                        ru: 'Хамсы и сгулот' },
  'דמויות חסידים':                  { en: 'Chassidic figurines',                    fr: 'Figurines hassidiques',                     es: 'Figuras jasídicas',                       ru: 'Хасидские фигурки' },
  'מגנטים':                         { en: 'Magnets',                                fr: 'Aimants',                                   es: 'Imanes',                                  ru: 'Магниты' },
  'מחזיקי מפתחות':                  { en: 'Keychains',                              fr: 'Porte-clés',                                es: 'Llaveros',                                ru: 'Брелоки' },
  'עטים':                           { en: 'Pens',                                   fr: 'Stylos',                                    es: 'Bolígrafos',                              ru: 'Ручки' },

  // ── תת-קטגוריות: חגים ומועדים ──
  'חגים ומועדים':         { en: 'Holidays & festivals', fr: 'Fêtes et solennités', es: 'Fiestas y festividades',  ru: 'Праздники и памятные дни' },
  'חגים ומעמדים':         { en: 'Holidays & stands',    fr: 'Fêtes et supports',   es: 'Festividades y soportes', ru: 'Праздники и подставки' },
  'חנוכה':                { en: 'Hanukkah',             fr: 'Hanouka',             es: 'Janucá',                  ru: 'Ханука' },
  'פסח':                  { en: 'Passover',             fr: 'Pessah',              es: 'Pésaj',                   ru: 'Песах' },
  'סוכות':                { en: 'Sukkot',               fr: 'Souccot',             es: 'Sucot',                   ru: 'Суккот' },
  'פורים':                { en: 'Purim',                fr: 'Pourim',              es: 'Purim',                   ru: 'Пурим' },
  'ראש השנה':             { en: 'Rosh Hashanah',        fr: 'Roch Hachana',        es: 'Rosh Hashaná',            ru: 'Рош ха-Шана' },
  'דבשיות לראש השנה':     { en: 'Honey dishes',         fr: 'Pots à miel',         es: 'Mieleras',                ru: 'Медовницы' },
  'צלחות סימני ראש השנה': { en: 'Simanim plates',       fr: 'Plateaux de simanim', es: 'Platos de simanim',       ru: 'Блюда для симаним' },
  'סכיני חלה לראש השנה':  { en: 'Challah knives',       fr: 'Couteaux à hallah',   es: 'Cuchillos de jalá',       ru: 'Ножи для халы' },
  'חתן וכלה':             { en: 'Bride & groom',        fr: 'Mariés',              es: 'Novios',                  ru: 'Жениху и невесте' },
  'יומיומי':              { en: 'Everyday',             fr: 'Au quotidien',        es: 'Uso diario',              ru: 'На каждый день' },

  // ── תת-קטגוריות: בר מצווה ──
  'סטים לבר מצווה':  { en: 'Bar Mitzvah sets',  fr: 'Ensembles Bar Mitsva', es: 'Sets de Bar Mitzvá',    ru: 'Наборы для бар-мицвы' },
  'מתנות לבר מצווה': { en: 'Bar Mitzvah gifts', fr: 'Cadeaux Bar Mitsva',   es: 'Regalos de Bar Mitzvá', ru: 'Подарки на бар-мицву' },
  'מתנות לאירועים':  { en: 'Event gifts',       fr: 'Cadeaux d’événements', es: 'Regalos para eventos',  ru: 'Подарки к торжествам' },

  // ── תת-קטגוריות: ספרי קודש ──
  'סידורים ותהילים': { en: 'Siddurim & Tehillim', fr: 'Sidourim et Tehilim', es: 'Sidurim y Tehilim',   ru: 'Сидуры и Теилим' },
  'ברכונים':         { en: 'Benchers',            fr: 'Birkonim',            es: 'Bircones',            ru: 'Бирконы' },
  'זמירות שבת':      { en: 'Shabbat zemirot',     fr: 'Zemirot de Chabbat',  es: 'Zemirot de Shabat',   ru: 'Шаббатние земирот' },
  'תפילות ותחינות':  { en: 'Prayers & techinot',  fr: 'Prières et tehinot',  es: 'Oraciones y tejinot', ru: 'Молитвы и техинот' },
  'הגדות פסח':       { en: 'Passover Haggadot',   fr: 'Haggadot de Pessah',  es: 'Hagadot de Pésaj',    ru: 'Пасхальные Агады' },
  'מגילות אסתר':     { en: 'Esther scrolls',      fr: 'Rouleaux d’Esther',   es: 'Rollos de Ester',     ru: 'Свитки Эстер' },

  // ── תוויות עזר בתפריט ──
  'עוד': { en: 'More', fr: 'Plus', es: 'Más', ru: 'Ещё' },
};

/**
 * תווית תצוגה לקטגוריה בשפה הנתונה.
 *
 * סדר הנפילה:
 *   1. טבלת הקטגוריות כאן
 *   2. טבלת ערכי המסננים (attributes.ts) — משם מגיעים גם המידות: 12 ס"מ → 12 cm
 *   3. הערך העברי המקורי — עדיף על מפתח גולמי או תיבה ריקה
 */
export function categoryLabel(hebrew: string | undefined | null, locale: string): string {
  if (!hebrew) return '';
  if (locale === 'he') return hebrew;
  const key = hebrew.trim();
  const set = CATEGORY_LABELS[key];
  if (set) return set[locale as keyof LabelSet] ?? hebrew;
  return attrValueLabel(key, locale);
}

/** האם קיים תרגום לקטגוריה — שימושי לבדיקות כיסוי */
export function hasCategoryLabel(hebrew: string): boolean {
  return !!CATEGORY_LABELS[hebrew.trim()];
}

export const TRANSLATED_CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);
