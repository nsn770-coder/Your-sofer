// ─────────────────────────────────────────────────────────────────────────────
// מקצועות היוצרים ב-YourSofer
//
// הפלטפורמה נבנתה במקור לסופרי סת"ם בלבד, ולכן שדות כמו נוסח ורמת כשרות היו
// קבועים בטופס. הקובץ הזה מכליל אותה לכל יוצרי עולם היהדות — נגרי בתי מזוזה,
// אמני רקמה, צורפים וכו' — בלי לפגוע בסופרים הקיימים.
//
// תאימות לאחור: יוצר ללא שדה craft נחשב אוטומטית 'stam'. אין צורך במיגרציה.
// ─────────────────────────────────────────────────────────────────────────────

export type CraftId =
  | 'stam'         // סופר סת"ם — מזוזות, תפילין, מגילות
  | 'wood'         // נגרות ועבודות עץ
  | 'embroidery'   // רקמה ותפירה
  | 'silver'       // צורפות, כסף ומתכת
  | 'ceramic'      // קרמיקה וזכוכית
  | 'paper'        // אמנות נייר, פפירוס והדפס
  | 'other';       // יוצר אחר

/** שדות ייחודיים שרק חלק מהמקצועות זקוקים להם */
export interface CraftFields {
  /** נוסח כתיבה — סת"ם בלבד */
  nusach: boolean;
  /** רמת כשרות — סת"ם בלבד */
  kashrutLevel: boolean;
  /** חומר גלם — רלוונטי לכל מלאכת כפיים חומרית */
  material: boolean;
  /** טכניקת עבודה */
  technique: boolean;
}

export interface Craft {
  id: CraftId;
  /** שם המקצוע ברבים — לשימוש בכותרות ובסינון */
  label: string;
  /** תואר היוצר ביחיד — "סופר סת\"ם", "אמן רקמה" */
  title: string;
  /** תווית לשדה דוגמאות העבודה בפרופיל */
  samplesLabel: string;
  /** תווית לשדה המידה בטופס המוצר */
  sizeLabel: string;
  sizePlaceholder: string;
  fields: CraftFields;
}

const NO_FIELDS: CraftFields = { nusach: false, kashrutLevel: false, material: false, technique: false };

export const CRAFTS: Craft[] = [
  {
    id: 'stam',
    label: 'סת"ם',
    title: 'סופר סת"ם',
    samplesLabel: 'דוגמאות כתב',
    sizeLabel: 'גודל / מידה',
    sizePlaceholder: '12 שורות, גס',
    fields: { nusach: true, kashrutLevel: true, material: false, technique: false },
  },
  {
    id: 'wood',
    label: 'עבודות עץ',
    title: 'נגר ואמן עץ',
    samplesLabel: 'דוגמאות עבודה',
    sizeLabel: 'מידות',
    sizePlaceholder: '15×8×3 ס"מ',
    fields: { nusach: false, kashrutLevel: false, material: true, technique: true },
  },
  {
    id: 'embroidery',
    label: 'רקמה ותפירה',
    title: 'אמן רקמה',
    samplesLabel: 'דוגמאות עבודה',
    sizeLabel: 'מידות',
    sizePlaceholder: '50×180 ס"מ',
    fields: { nusach: false, kashrutLevel: false, material: true, technique: true },
  },
  {
    id: 'silver',
    label: 'צורפות ומתכת',
    title: 'צורף',
    samplesLabel: 'דוגמאות עבודה',
    sizeLabel: 'מידות / משקל',
    sizePlaceholder: '8 ס"מ, 120 גרם',
    fields: { nusach: false, kashrutLevel: false, material: true, technique: true },
  },
  {
    id: 'ceramic',
    label: 'קרמיקה וזכוכית',
    title: 'אמן קרמיקה',
    samplesLabel: 'דוגמאות עבודה',
    sizeLabel: 'מידות',
    sizePlaceholder: 'קוטר 20 ס"מ',
    fields: { nusach: false, kashrutLevel: false, material: true, technique: true },
  },
  {
    id: 'paper',
    label: 'אמנות נייר והדפס',
    title: 'אמן נייר',
    samplesLabel: 'דוגמאות עבודה',
    sizeLabel: 'מידות',
    sizePlaceholder: 'A3 · 42×30 ס"מ',
    fields: { nusach: false, kashrutLevel: false, material: true, technique: false },
  },
  {
    id: 'other',
    label: 'יצירה אחרת',
    title: 'יוצר',
    samplesLabel: 'דוגמאות עבודה',
    sizeLabel: 'מידות',
    sizePlaceholder: '',
    fields: { ...NO_FIELDS, material: true },
  },
];

const FALLBACK = CRAFTS[0];

/**
 * מחזיר את הגדרת המקצוע. יוצרים ותיקים נשמרו לפני שהשדה craft נוסף —
 * ולכן ערך ריק מתפרש כסת"ם ולא שובר אותם.
 */
export function getCraft(craftId?: string | null): Craft {
  if (!craftId) return FALLBACK;
  return CRAFTS.find(c => c.id === craftId) ?? FALLBACK;
}

/** חומרי גלם נפוצים — רשימת הצעות, לא סגורה */
export const MATERIAL_SUGGESTIONS = [
  'עץ זית', 'עץ אגוז', 'עץ אלון', 'עץ בוק',
  'כסף 925', 'זהב', 'פליז', 'נחושת', 'אלומיניום',
  'זכוכית', 'קרמיקה', 'חרס',
  'צמר', 'משי', 'כותנה', 'פשתן',
  'עור', 'קלף', 'נייר כותנה',
  'אבן', 'שיש', 'רזין',
];

/** טכניקות עבודה נפוצות */
export const TECHNIQUE_SUGGESTIONS = [
  'עבודת יד מלאה', 'חריטת לייזר', 'חריטה ידנית',
  'ריקוע', 'יציקה', 'הלחמה', 'פיליגרן',
  'רקמה ידנית', 'רקמת מכונה', 'אריגה',
  'צריבה', 'שיבוץ', 'ליטוש', 'צביעה ידנית',
];
