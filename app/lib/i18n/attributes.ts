// ─────────────────────────────────────────────────────────────────────────────
// תרגום מסנני הקטלוג — מפתחות וערכים — לתצוגה בלבד
//
// ⚠️ כמו ב-categories.ts: המחרוזות העבריות כאן הן ערכי filterAttributes
// האמיתיים ב-Firestore, והן משמשות להשוואה בקוד הסינון. הקובץ מתרגם תווית
// תצוגה בלבד; שינוי מפתח כאן שובר את הסינון בקטלוג.
//
// החלטת תרגום: מונחי סת"ם והלכה (מהודר, מהדרין, אשכנז, חב"ד…) מתועתקים
// לאותיות לטיניות ולא מתורגמים. "מהודר" הוא מונח מקצועי שקונה סת"ם מכיר,
// ותרגומו ל-"enhanced" היה מאבד את המשמעות ההלכתית ומטעה את הלקוח.
// ─────────────────────────────────────────────────────────────────────────────

type LabelSet = { en: string; fr: string; es: string; ar: string; ru: string };

/** שמות המסננים עצמם */
const ATTR_KEY_LABELS: Record<string, LabelSet> = {
  'חומר':       { en: 'Material',      fr: 'Matière',       es: 'Material',    ar: 'الخامة',        ru: 'Материал' },
  'גודל':       { en: 'Size',          fr: 'Taille',        es: 'Tamaño',      ar: 'الحجم',         ru: 'Размер' },
  'צבע':        { en: 'Color',         fr: 'Couleur',       es: 'Color',       ar: 'اللون',         ru: 'Цвет' },
  'כשרות':      { en: 'Kashrut level', fr: 'Niveau de cacherout', es: 'Nivel de cashrut', ar: 'مستوى الكشروت', ru: 'Уровень кашрута' },
  'נוסח':       { en: 'Nusach',        fr: 'Noussah',       es: 'Nusaj',       ar: 'النسخة',        ru: 'Нусах' },
  'כתב':        { en: 'Script',        fr: 'Écriture',      es: 'Escritura',   ar: 'الخط',          ru: 'Письмо' },
  'סוג סט':     { en: 'Set type',      fr: 'Type d’ensemble', es: 'Tipo de set', ar: 'نوع الطقم',   ru: 'Тип набора' },
  'רמת הידור':  { en: 'Hidur level',   fr: 'Niveau de hidour', es: 'Nivel de hidur', ar: 'مستوى الإتقان', ru: 'Уровень хидура' },
  'גודל טלית':  { en: 'Tallit size',   fr: 'Taille du talit', es: 'Tamaño del talit', ar: 'مقاس الطاليت', ru: 'Размер талита' },
};

/** ערכי המסננים */
const ATTR_VALUE_LABELS: Record<string, LabelSet> = {
  // ── חומרים ──
  'עץ':          { en: 'Wood',      fr: 'Bois',        es: 'Madera',    ar: 'خشب',      ru: 'Дерево' },
  'כסף':         { en: 'Silver',    fr: 'Argent',      es: 'Plata',     ar: 'فضة',      ru: 'Серебро' },
  'זהב':         { en: 'Gold',      fr: 'Or',          es: 'Oro',       ar: 'ذهب',      ru: 'Золото' },
  'מתכת':        { en: 'Metal',     fr: 'Métal',       es: 'Metal',     ar: 'معدن',     ru: 'Металл' },
  'זכוכית':      { en: 'Glass',     fr: 'Verre',       es: 'Vidrio',    ar: 'زجاج',     ru: 'Стекло' },
  'קרמיקה':      { en: 'Ceramic',   fr: 'Céramique',   es: 'Cerámica',  ar: 'سيراميك',  ru: 'Керамика' },
  'אלומיניום':   { en: 'Aluminium', fr: 'Aluminium',   es: 'Aluminio',  ar: 'ألمنيوم',  ru: 'Алюминий' },
  'פלסטיק':      { en: 'Plastic',   fr: 'Plastique',   es: 'Plástico',  ar: 'بلاستيك',  ru: 'Пластик' },
  'פולימר':      { en: 'Polymer',   fr: 'Polymère',    es: 'Polímero',  ar: 'بوليمر',   ru: 'Полимер' },
  'בטון וסמנט':  { en: 'Concrete',  fr: 'Béton',       es: 'Hormigón',  ar: 'إسمنت',    ru: 'Бетон' },
  'שיש':         { en: 'Marble',    fr: 'Marbre',      es: 'Mármol',    ar: 'رخام',     ru: 'Мрамор' },
  'בד':          { en: 'Fabric',    fr: 'Tissu',       es: 'Tela',      ar: 'قماش',     ru: 'Ткань' },
  'זמש':         { en: 'Suede',     fr: 'Daim',        es: 'Ante',      ar: 'شمواه',    ru: 'Замша' },
  'פשתן':        { en: 'Linen',     fr: 'Lin',         es: 'Lino',      ar: 'كتان',     ru: 'Лён' },
  'משי':         { en: 'Silk',      fr: 'Soie',        es: 'Seda',      ar: 'حرير',     ru: 'Шёлк' },
  'ארטמן':       { en: 'Artman',    fr: 'Artman',      es: 'Artman',    ar: 'أرتمان',   ru: 'Артман' },
  'סרוגות':      { en: 'Knitted',   fr: 'Tricotées',   es: 'Tejidas',   ar: 'محاكة',    ru: 'Вязаные' },

  // ── צבעים ──
  'לבן':         { en: 'White',     fr: 'Blanc',       es: 'Blanco',    ar: 'أبيض',     ru: 'Белый' },
  'שחור':        { en: 'Black',     fr: 'Noir',        es: 'Negro',     ar: 'أسود',     ru: 'Чёрный' },
  'חום':         { en: 'Brown',     fr: 'Marron',      es: 'Marrón',    ar: 'بني',      ru: 'Коричневый' },
  'צבעוני':      { en: 'Multicolor',fr: 'Multicolore', es: 'Multicolor',ar: 'متعدد الألوان', ru: 'Разноцветный' },

  // ── מונחי סת"ם והלכה — תעתיק, לא תרגום ──
  'מהודר':          { en: 'Mehudar',            fr: 'Mehoudar',            es: 'Mehudar',            ar: 'مهودار',        ru: 'Мехудар' },
  'מהדרין':         { en: 'Mehadrin',           fr: 'Mehadrin',            es: 'Mehadrin',           ar: 'مهدرين',        ru: 'Мехадрин' },
  'מהודר בתכלית':   { en: 'Mehudar B’Tachlit',  fr: 'Mehoudar Betakhlit',  es: 'Mehudar Betajlit',   ar: 'مهودار بتخليت', ru: 'Мехудар бетахлит' },
  'פשוט':           { en: 'Standard',           fr: 'Standard',            es: 'Estándar',           ar: 'عادي',          ru: 'Обычный' },
  'רגיל':           { en: 'Regular',            fr: 'Classique',           es: 'Regular',            ar: 'عادي',          ru: 'Обычный' },
  'כשר לכתחילה':    { en: 'Kosher Lechatchila', fr: 'Cacher Lekhatehila',  es: 'Kosher Lejatjila',   ar: 'كشير لختحيلا',  ru: 'Кошер лехатхила' },

  // ── נוסחים ──
  'אשכנז':       { en: 'Ashkenaz',  fr: 'Achkenaz',   es: 'Ashkenaz',  ar: 'أشكناز',  ru: 'Ашкеназ' },
  'אשכנזי':      { en: 'Ashkenazi', fr: 'Achkénaze',  es: 'Ashkenazí', ar: 'أشكنازي', ru: 'Ашкеназский' },
  'ספרד':        { en: 'Sepharad',  fr: 'Sefarad',    es: 'Sefarad',   ar: 'سفاراد',  ru: 'Сфарад' },
  'ספרדי':       { en: 'Sephardi',  fr: 'Séfarade',   es: 'Sefardí',   ar: 'سفاردي',  ru: 'Сфардийский' },
  'חב"ד':        { en: 'Chabad',    fr: 'Habad',      es: 'Jabad',     ar: 'حباد',    ru: 'Хабад' },
  'תימני':       { en: 'Teimani',   fr: 'Téimani',    es: 'Teimaní',   ar: 'تيماني',  ru: 'Тейманский' },
  'עדות המזרח':  { en: 'Edot HaMizrach', fr: 'Edot HaMizrah', es: 'Edot HaMizraj', ar: 'عدوت همزراح', ru: 'Эдот ха-Мизрах' },

  // ── סוגי סט ──
  'עם תפילין':   { en: 'With tefillin', fr: 'Avec tefillin', es: 'Con tefilín', ar: 'مع تفيلين', ru: 'С тфилин' },
  'עם טלית':     { en: 'With tallit',   fr: 'Avec talit',    es: 'Con talit',   ar: 'مع طاليت',  ru: 'С талитом' },
  'קומפלט':      { en: 'Complete set',  fr: 'Ensemble complet', es: 'Set completo', ar: 'طقم كامل', ru: 'Полный комплект' },

  // ── כללי ──
  'הכל':         { en: 'All',       fr: 'Tout',       es: 'Todo',      ar: 'الكل',    ru: 'Все' },
};

/** ‎7 ס"מ‎ → ‎7 cm‎ — נגזר בתבנית ולא נשמר ערך-ערך */
const CM_UNITS: Record<string, string> = {
  en: 'cm', fr: 'cm', es: 'cm', ar: 'سم', ru: 'см',
};

const SIZE_RE = /^(\d+(?:\.\d+)?)\s*ס["״']?מ$/;

function pick(set: LabelSet | undefined, locale: string, fallback: string): string {
  if (!set) return fallback;
  return set[locale as keyof LabelSet] ?? fallback;
}

/** תווית תצוגה לשם מסנן (חומר / צבע / נוסח …) */
export function attrKeyLabel(key: string | undefined | null, locale: string): string {
  if (!key) return '';
  if (locale === 'he') return key;
  return pick(ATTR_KEY_LABELS[key.trim()], locale, key);
}

/** תווית תצוגה לערך מסנן (עץ / מהודר / אשכנז …) */
export function attrValueLabel(value: string | undefined | null, locale: string): string {
  if (!value) return '';
  if (locale === 'he') return value;
  const v = value.trim();

  const size = SIZE_RE.exec(v);
  if (size) return `${size[1]} ${CM_UNITS[locale] ?? 'cm'}`;

  return pick(ATTR_VALUE_LABELS[v], locale, v);
}

export function hasAttrValueLabel(value: string): boolean {
  return !!ATTR_VALUE_LABELS[value.trim()] || SIZE_RE.test(value.trim());
}
