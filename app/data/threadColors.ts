// app/data/threadColors.ts
// קטלוג צבעי חוט לרקמה — ממוספר 1–23 לפי הקטלוג.

export interface ThreadColor {
  id: string;
  name: string;
  hex: string;
}

export const THREAD_COLORS: ThreadColor[] = [
  { id: "1", name: "צהוב", hex: "#FFD600" },
  { id: "2", name: "כתום", hex: "#FF8A00" },
  { id: "3", name: "בז׳", hex: "#C9A56A" },
  { id: "4", name: "שמנת", hex: "#E8DEC5" },
  { id: "5", name: "חום כהה", hex: "#3A2416" },
  { id: "6", name: "חום נחושת", hex: "#B87333" },
  { id: "7", name: "זהב", hex: "#C9A227" },
  { id: "8", name: "ורוד בהיר", hex: "#F6AFC8" },
  { id: "9", name: "ורוד פוקסיה", hex: "#E6007E" },
  { id: "10", name: "אדום", hex: "#E60012" },
  { id: "11", name: "ירוק זית", hex: "#8A8C2A" },
  { id: "12", name: "סגול", hex: "#7A1FA2" },
  { id: "13", name: "ירוק כהה", hex: "#0B5A32" },
  { id: "14", name: "טורקיז", hex: "#008C95" },
  { id: "15", name: "תכלת", hex: "#7ECDEB" },
  { id: "16", name: "ורוד עתיק", hex: "#C86B82" },
  { id: "17", name: "כחול רויאל", hex: "#0057D8" },
  { id: "18", name: "כחול כהה", hex: "#0B2A5B" },
  { id: "19", name: "כחול אפור", hex: "#5C6F86" },
  { id: "20", name: "כסף בהיר", hex: "#C8D0D2" },
  { id: "21", name: "אפור כהה", hex: "#3E3E3E" },
  { id: "22", name: "לבן", hex: "#FFFFFF" },
  { id: "23", name: "שחור", hex: "#000000" },
];

// צבע מותג — מסגרת צבע נבחר + כפתורים.
export const BRAND_COLOR = "#373A5A";

// עוזר: מחזיר צבע לפי id.
export function getThreadColorById(id?: string | null): ThreadColor | undefined {
  if (!id) return undefined;
  return THREAD_COLORS.find((c) => c.id === id);
}
