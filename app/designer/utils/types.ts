// ── עורך כיפה מותאמת אישית — טיפוסים וקבועים ─────────────────────────────────
// תוספת בלבד: השדה customDesign על פריט עגלה/הזמנה הוא אופציונלי,
// ומוצר רגיל ממשיך לזרום בדיוק כמו היום.

export interface KippaDesign {
  designId: string;
  baseColor: string;
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

export const KIPPA_BASE_COLORS: { hex: string; name: string }[] = [
  { hex: '#1E40AF', name: 'כחול כהה' },
  { hex: '#FFFFFF', name: 'לבן' },
  { hex: '#000000', name: 'שחור' },
  { hex: '#16A34A', name: 'ירוק' },
  { hex: '#DC2626', name: 'אדום' },
  { hex: '#EAB308', name: 'זהב' },
];

export const KIPPA_TEXT_COLORS: { hex: string; name: string }[] = [
  { hex: '#FFFFFF', name: 'לבן' },
  { hex: '#000000', name: 'שחור' },
  { hex: '#EAB308', name: 'זהב' },
  { hex: '#C0C0C0', name: 'כסף' },
  { hex: '#1E40AF', name: 'כחול' },
  { hex: '#DC2626', name: 'אדום' },
];

export const KIPPA_FONTS: { id: string; label: string; css: string }[] = [
  { id: 'Rubik',  label: 'רוביק',  css: "'Rubik', sans-serif" },
  { id: 'Miriam', label: 'מרים',   css: "'Miriam Libre', 'Miriam', serif" },
  { id: 'Arial',  label: 'אריאל', css: 'Arial, sans-serif' },
];

export const KIPPA_FONT_MIN = 14;
export const KIPPA_FONT_MAX = 48;

export const KIPPA_POSITIONS: { id: KippaDesign['position']; label: string }[] = [
  { id: 'top',    label: 'למעלה' },
  { id: 'center', label: 'מרכז' },
  { id: 'bottom', label: 'למטה' },
];
