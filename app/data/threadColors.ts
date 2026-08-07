// app/data/threadColors.ts
// קטלוג צבעי חוט לרקמה — ממוספר 1–23 לפי הקטלוג.
//
// cx / cy — מיקום מרכז הגליל בתמונת הקטלוג (Cloudinary) כשבר יחסי
// לרוחב/גובה התמונה (0–1). משמש להצגת תמונת הגליל האמיתי בבורר
// הצבעים (CSS sprite). אם התמונה לא נטענת — נופלים חזרה לעיגולי hex.

export interface ThreadColor {
  id: string;
  name: string;
  hex: string;
  /** מרכז הגליל בתמונת הקטלוג — שבר יחסי לרוחב (0–1) */
  cx: number;
  /** מרכז הגליל בתמונת הקטלוג — שבר יחסי לגובה (0–1) */
  cy: number;
}

// נתיבי תמונת הקטלוג — הראשון שנטען בהצלחה מנצח.
// Cloudinary עם f_auto,q_auto — דחיסה אוטומטית (webp/avif).
export const THREAD_SPRITE_CANDIDATES = [
  "https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto/v1784695293/ChatGPT_Image_Jul_22_2026_07_41_21_AM_wbsl6x.png",
  "/embroidery-threads.jpg",
];

// כמה "אריחים" נכנסים ברוחב התמונה — קובע את רמת הזום של כל גליל.
export const SPRITE_ZOOM = 5.2;

export const THREAD_COLORS: ThreadColor[] = [
  { id: "1", name: "צהוב", hex: "#FFD600", cx: 0.695, cy: 0.851 },
  { id: "2", name: "כתום", hex: "#FF8A00", cx: 0.479, cy: 0.851 },
  { id: "3", name: "בז׳", hex: "#C9A56A", cx: 0.264, cy: 0.851 },
  { id: "4", name: "שמנת", hex: "#E8DEC5", cx: 0.861, cy: 0.652 },
  { id: "5", name: "חום כהה", hex: "#3A2416", cx: 0.668, cy: 0.652 },
  { id: "6", name: "חום נחושת", hex: "#B87333", cx: 0.482, cy: 0.652 },
  { id: "7", name: "זהב", hex: "#C9A227", cx: 0.296, cy: 0.652 },
  { id: "8", name: "ורוד בהיר", hex: "#F6AFC8", cx: 0.124, cy: 0.652 },
  { id: "9", name: "ורוד פוקסיה", hex: "#E6007E", cx: 0.84, cy: 0.458 },
  { id: "10", name: "אדום", hex: "#E60012", cx: 0.664, cy: 0.458 },
  { id: "11", name: "ירוק זית", hex: "#8A8C2A", cx: 0.482, cy: 0.458 },
  { id: "12", name: "סגול", hex: "#7A1FA2", cx: 0.306, cy: 0.458 },
  { id: "13", name: "ירוק כהה", hex: "#0B5A32", cx: 0.138, cy: 0.458 },
  { id: "14", name: "טורקיז", hex: "#008C95", cx: 0.833, cy: 0.273 },
  { id: "15", name: "תכלת", hex: "#7ECDEB", cx: 0.65, cy: 0.273 },
  { id: "16", name: "ורוד עתיק", hex: "#C86B82", cx: 0.474, cy: 0.273 },
  { id: "17", name: "כחול רויאל", hex: "#0057D8", cx: 0.308, cy: 0.273 },
  { id: "18", name: "כחול כהה", hex: "#0B2A5B", cx: 0.146, cy: 0.273 },
  { id: "19", name: "כחול אפור", hex: "#5C6F86", cx: 0.824, cy: 0.108 },
  { id: "20", name: "כסף בהיר", hex: "#C8D0D2", cx: 0.658, cy: 0.108 },
  { id: "21", name: "אפור כהה", hex: "#3E3E3E", cx: 0.492, cy: 0.108 },
  { id: "22", name: "לבן", hex: "#FFFFFF", cx: 0.324, cy: 0.108 },
  { id: "23", name: "שחור", hex: "#000000", cx: 0.154, cy: 0.108 },
];

// צבע מותג — מסגרת צבע נבחר + כפתורים.
export const BRAND_COLOR = "#373A5A";

// עוזר: מחזיר צבע לפי id.
export function getThreadColorById(id?: string | null): ThreadColor | undefined {
  if (!id) return undefined;
  return THREAD_COLORS.find((c) => c.id === id);
}
