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

type LabelSet = { en: string; fr: string; es: string; ru: string };

/** שמות המסננים עצמם */
const ATTR_KEY_LABELS: Record<string, LabelSet> = {
  'חומר':       { en: 'Material',      fr: 'Matière',       es: 'Material',    ru: 'Материал' },
  'גודל':       { en: 'Size',          fr: 'Taille',        es: 'Tamaño',      ru: 'Размер' },
  'צבע':        { en: 'Color',         fr: 'Couleur',       es: 'Color',       ru: 'Цвет' },
  'כשרות':      { en: 'Kashrut level', fr: 'Niveau de cacherout', es: 'Nivel de cashrut', ru: 'Уровень кашрута' },
  'נוסח':       { en: 'Nusach',        fr: 'Noussah',       es: 'Nusaj',       ru: 'Нусах' },
  'כתב':        { en: 'Script',        fr: 'Écriture',      es: 'Escritura',   ru: 'Письмо' },
  'סוג סט':     { en: 'Set type',      fr: 'Type d’ensemble', es: 'Tipo de set', ru: 'Тип набора' },
  'רמת הידור':  { en: 'Hidur level',   fr: 'Niveau de hidour', es: 'Nivel de hidur', ru: 'Уровень хидура' },
  'גודל טלית':  { en: 'Tallit size',   fr: 'Taille du talit', es: 'Tamaño del talit', ru: 'Размер талита' },
};

/** ערכי המסננים */
const ATTR_VALUE_LABELS: Record<string, LabelSet> = {
  // ── חומרים ──
  'עץ':          { en: 'Wood',      fr: 'Bois',        es: 'Madera',    ru: 'Дерево' },
  'כסף':         { en: 'Silver',    fr: 'Argent',      es: 'Plata',     ru: 'Серебро' },
  'זהב':         { en: 'Gold',      fr: 'Or',          es: 'Oro',       ru: 'Золото' },
  'מתכת':        { en: 'Metal',     fr: 'Métal',       es: 'Metal',     ru: 'Металл' },
  'זכוכית':      { en: 'Glass',     fr: 'Verre',       es: 'Vidrio',    ru: 'Стекло' },
  'קרמיקה':      { en: 'Ceramic',   fr: 'Céramique',   es: 'Cerámica',  ru: 'Керамика' },
  'אלומיניום':   { en: 'Aluminium', fr: 'Aluminium',   es: 'Aluminio',  ru: 'Алюминий' },
  'פלסטיק':      { en: 'Plastic',   fr: 'Plastique',   es: 'Plástico',  ru: 'Пластик' },
  'פולימר':      { en: 'Polymer',   fr: 'Polymère',    es: 'Polímero',  ru: 'Полимер' },
  'בטון וסמנט':  { en: 'Concrete',  fr: 'Béton',       es: 'Hormigón',  ru: 'Бетон' },
  'שיש':         { en: 'Marble',    fr: 'Marbre',      es: 'Mármol',    ru: 'Мрамор' },
  'בד':          { en: 'Fabric',    fr: 'Tissu',       es: 'Tela',      ru: 'Ткань' },
  'זמש':         { en: 'Suede',     fr: 'Daim',        es: 'Ante',      ru: 'Замша' },
  'פשתן':        { en: 'Linen',     fr: 'Lin',         es: 'Lino',      ru: 'Лён' },
  'משי':         { en: 'Silk',      fr: 'Soie',        es: 'Seda',      ru: 'Шёлк' },
  'ארטמן':       { en: 'Artman',    fr: 'Artman',      es: 'Artman',    ru: 'Артман' },
  'סרוגות':      { en: 'Knitted',   fr: 'Tricotées',   es: 'Tejidas',   ru: 'Вязаные' },

  // ── צבעים ──
  'לבן':         { en: 'White',     fr: 'Blanc',       es: 'Blanco',    ru: 'Белый' },
  'שחור':        { en: 'Black',     fr: 'Noir',        es: 'Negro',     ru: 'Чёрный' },
  'חום':         { en: 'Brown',     fr: 'Marron',      es: 'Marrón',    ru: 'Коричневый' },
  'צבעוני':      { en: 'Multicolor',fr: 'Multicolore', es: 'Multicolor',ru: 'Разноцветный' },

  // ── מונחי סת"ם והלכה — תעתיק, לא תרגום ──
  'מהודר':          { en: 'Mehudar',            fr: 'Mehoudar',            es: 'Mehudar',            ru: 'Мехудар' },
  'מהדרין':         { en: 'Mehadrin',           fr: 'Mehadrin',            es: 'Mehadrin',           ru: 'Мехадрин' },
  'מהודר בתכלית':   { en: 'Mehudar B’Tachlit',  fr: 'Mehoudar Betakhlit',  es: 'Mehudar Betajlit',   ru: 'Мехудар бетахлит' },
  'פשוט':           { en: 'Standard',           fr: 'Standard',            es: 'Estándar',           ru: 'Обычный' },
  'רגיל':           { en: 'Regular',            fr: 'Classique',           es: 'Regular',            ru: 'Обычный' },
  'כשר לכתחילה':    { en: 'Kosher Lechatchila', fr: 'Cacher Lekhatehila',  es: 'Kosher Lejatjila',   ru: 'Кошер лехатхила' },

  // ── נוסחים ──
  'אשכנז':       { en: 'Ashkenaz',  fr: 'Achkenaz',   es: 'Ashkenaz',  ru: 'Ашкеназ' },
  'אשכנזי':      { en: 'Ashkenazi', fr: 'Achkénaze',  es: 'Ashkenazí', ru: 'Ашкеназский' },
  'ספרד':        { en: 'Sepharad',  fr: 'Sefarad',    es: 'Sefarad',   ru: 'Сфарад' },
  'ספרדי':       { en: 'Sephardi',  fr: 'Séfarade',   es: 'Sefardí',   ru: 'Сфардийский' },
  'חב"ד':        { en: 'Chabad',    fr: 'Habad',      es: 'Jabad',     ru: 'Хабад' },
  'תימני':       { en: 'Teimani',   fr: 'Téimani',    es: 'Teimaní',   ru: 'Тейманский' },
  'עדות המזרח':  { en: 'Edot HaMizrach', fr: 'Edot HaMizrah', es: 'Edot HaMizraj', ru: 'Эдот ха-Мизрах' },

  // ── סוגי סט ──
  'עם תפילין':   { en: 'With tefillin', fr: 'Avec tefillin', es: 'Con tefilín', ru: 'С тфилин' },
  'עם טלית':     { en: 'With tallit',   fr: 'Avec talit',    es: 'Con talit',   ru: 'С талитом' },
  'קומפלט':      { en: 'Complete set',  fr: 'Ensemble complet', es: 'Set completo', ru: 'Полный комплект' },

  // ── כללי ──
  'הכל':         { en: 'All',       fr: 'Tout',       es: 'Todo',      ru: 'Все' },
};

/** ‎7 ס"מ‎ → ‎7 cm‎ — נגזר בתבנית ולא נשמר ערך-ערך */
const CM_UNITS: Record<string, string> = {
  en: 'cm', fr: 'cm', es: 'cm', ru: 'см',
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
