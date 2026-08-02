// ── עורך כיפה מותאמת אישית — טיפוסים וקבועים ─────────────────────────────────
// תוספת בלבד: השדה customDesign על פריט עגלה/הזמנה הוא אופציונלי,
// ומוצר רגיל ממשיך לזרום בדיוק כמו היום.

export interface KippaDesign {
  designId: string;
  /** צבע בסיס — ריק כשהעיצוב על תמונת המוצר המקורית */
  baseColor: string;
  /** תמונת המוצר שעליה הונח הטקסט (הלקוח כבר בחר צבע/סוג בכרטיס המוצר) */
  productImageUrl?: string;
  text: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  position: 'top' | 'center' | 'bottom';
  quantity: number;
  /** תמונת preview שהועלתה ל-Cloudinary (PNG באיכות הדפסה, pixelRatio 3) */
  previewImageUrl: string;
  createdAt: string;
}

// פלטת צבעי טקסט רחבה — "לוח צבעים" מלא
export const KIPPA_TEXT_COLORS: { hex: string; name: string }[] = [
  { hex: '#FFFFFF', name: 'לבן' },
  { hex: '#F3F4F6', name: 'שמנת' },
  { hex: '#C0C0C0', name: 'כסף' },
  { hex: '#6B7280', name: 'אפור' },
  { hex: '#000000', name: 'שחור' },
  { hex: '#7C2D12', name: 'חום' },
  { hex: '#EAB308', name: 'זהב' },
  { hex: '#F59E0B', name: 'ענבר' },
  { hex: '#F97316', name: 'כתום' },
  { hex: '#DC2626', name: 'אדום' },
  { hex: '#BE123C', name: 'בורדו' },
  { hex: '#EC4899', name: 'ורוד' },
  { hex: '#A855F7', name: 'סגול' },
  { hex: '#6D28D9', name: 'סגול כהה' },
  { hex: '#1E40AF', name: 'כחול כהה' },
  { hex: '#2563EB', name: 'כחול' },
  { hex: '#0EA5E9', name: 'תכלת' },
  { hex: '#06B6D4', name: 'טורקיז' },
  { hex: '#0D9488', name: 'ים' },
  { hex: '#16A34A', name: 'ירוק' },
  { hex: '#15803D', name: 'ירוק כהה' },
  { hex: '#84CC16', name: 'ליים' },
  { hex: '#78716C', name: 'אבן' },
  { hex: '#FDE68A', name: 'זהב בהיר' },
];

// מבחר פונטים עבריים רחב — נטענים מ-Google Fonts בתוך העורך
export const KIPPA_FONTS: { id: string; label: string; css: string; gf: string }[] = [
  { id: 'Rubik',            label: 'רוביק',          css: "'Rubik', sans-serif",             gf: 'Rubik:wght@700' },
  { id: 'Heebo',            label: 'היבו',           css: "'Heebo', sans-serif",             gf: 'Heebo:wght@700' },
  { id: 'Assistant',        label: 'אסיסטנט',        css: "'Assistant', sans-serif",         gf: 'Assistant:wght@700' },
  { id: 'Varela Round',     label: 'ורלה עגול',      css: "'Varela Round', sans-serif",      gf: 'Varela+Round' },
  { id: 'Secular One',      label: 'סקולר',          css: "'Secular One', sans-serif",       gf: 'Secular+One' },
  { id: 'Suez One',         label: 'סואץ (מודגש)',   css: "'Suez One', serif",               gf: 'Suez+One' },
  { id: 'Frank Ruhl Libre', label: 'פרנק-ריהל',      css: "'Frank Ruhl Libre', serif",       gf: 'Frank+Ruhl+Libre:wght@700' },
  { id: 'David Libre',      label: 'דוד',            css: "'David Libre', serif",            gf: 'David+Libre:wght@700' },
  { id: 'Miriam Libre',     label: 'מרים',           css: "'Miriam Libre', sans-serif",      gf: 'Miriam+Libre:wght@700' },
  { id: 'Alef',             label: 'אלף',            css: "'Alef', sans-serif",              gf: 'Alef:wght@700' },
  { id: 'Amatic SC',        label: 'אמטיק (כתב יד)', css: "'Amatic SC', cursive",            gf: 'Amatic+SC:wght@700' },
  { id: 'Arial',            label: 'אריאל',          css: 'Arial, sans-serif',               gf: '' },
];

/** URL לטעינת כל הפונטים מ-Google Fonts (משפחה אחת עם | היה נתמך בעבר — משתמשים בפורמט css2) */
export const KIPPA_FONTS_GOOGLE_URL =
  'https://fonts.googleapis.com/css2?' +
  KIPPA_FONTS.filter(f => f.gf).map(f => `family=${f.gf}`).join('&') +
  '&display=swap';

export const KIPPA_FONT_MIN = 14;
export const KIPPA_FONT_MAX = 48;

export const KIPPA_POSITIONS: { id: KippaDesign['position']; label: string }[] = [
  { id: 'top',    label: 'למעלה' },
  { id: 'center', label: 'מרכז' },
  { id: 'bottom', label: 'למטה' },
];
