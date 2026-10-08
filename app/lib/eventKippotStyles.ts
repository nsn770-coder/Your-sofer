// דגמי כיפות האירועים לשימוש סטודיו הלוגו — זהה לרשימות שב-/event-kippot וב-/kippot-order.
// (בעדכון דגם — לעדכן גם שם.)
// id = מזהה הדגם ב-URL וב-settings/eventKippotStyles (שיוך למוצר אמיתי לניכוי מלאי).
import { getKipaMaterial, type KipaMaterial } from './kippot';

export interface EventKippahStyle { id: string; label: string; img: string }

export const EVENT_KIPPOT_STYLES: EventKippahStyle[] = [
  { id: 'lavan',       label: 'לבן ורדרד',    img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636051/%D7%9B%D7%99%D7%A4%D7%94_%D7%9C%D7%91%D7%9F_%D7%95%D7%A8%D7%93%D7%A8%D7%93_nauwhq.png' },
  { id: 'beige',       label: "בז'",           img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636052/%D7%9B%D7%99%D7%A4%D7%94_%D7%91%D7%96_fhrr09.png' },
  { id: 'linen-tchelet', label: 'תכלת',       img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1789036165/gpmma8td8rvvqvhyptel.png' },
  { id: 'white',       label: 'לבן',           img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1784407273/ChatGPT_Image_Jul_18_2026_11_38_25_PM_mcqhle.png' },
  { id: 'beige-natural', label: "בז' טבעי",    img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1784407273/ChatGPT_Image_Jul_18_2026_11_38_58_PM_wva57o.png' },
  { id: 'beige-luxury', label: "בז' יוקרתי",   img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1787821187/yu4zdyfhd4leqe4h5l4b.png' },
  { id: 'navy',        label: 'כחול כהה',      img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1787821093/kmmuycfw287ui8kcnyrs.png' },
  { id: 'satin-white', label: 'סאטן',          img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1781586601/a8c7n05vniv34n4qw44g.jpg' },
  { id: 'satin-white-18', label: 'סאטן לבן 18 ס"מ', img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1781587426/eu12gjypbrxlyhfi40tk.jpg' },
];

export function getEventKippahStyle(id: string): EventKippahStyle | undefined {
  return EVENT_KIPPOT_STYLES.find(s => s.id === id);
}

export function eventKippahMaterial(id: string): KipaMaterial {
  return getKipaMaterial(id);
}
