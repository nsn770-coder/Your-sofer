// ============================================
// סקרולים / באנרים בדף "כיפות ומזכרות לאירועים" (/event-kippot)
// מקור אמת יחיד — משמש גם את האדמין (בחירת שיוך) וגם את הדף עצמו
// ============================================

export const EVENT_SCROLL_SECTIONS = [
  { id: 'bundles',       label: 'מארזים מוכנים',        emoji: '🎁' },
  { id: 'headcovers',    label: 'כיסויי ראש',            emoji: '🧕' },
  { id: 'birkonim',      label: 'ברכונים',               emoji: '📖' },
  { id: 'havdalah',      label: 'נרות הבדלה ובשמים',    emoji: '🕯️' },
  { id: 'mizmor-letoda', label: 'מזכרת מזמור לתודה',    emoji: '🎵' },
] as const;

export type EventScrollSectionId = typeof EVENT_SCROLL_SECTIONS[number]['id'];

export const EVENT_SCROLL_SECTION_IDS = EVENT_SCROLL_SECTIONS.map(s => s.id) as EventScrollSectionId[];

// ─────────────────────────────────────────────────────────────────────────────
// באנרים בעמוד — "צפה במזכרות" לפי קטגוריה
// כל באנר מציג את המוצרים ששויכו אליו באדמין (eventScrollSection),
// ובנוסף — אם הוגדר extraSource — נשלפות בלחיצה גם קטגוריות מהחנות.
// ─────────────────────────────────────────────────────────────────────────────

export interface EventBannerExtraSource {
  /** ערך cat מדויק ב-Firestore (case sensitive) */
  cat: string;
  /** תת-קטגוריות לצירוף; ריק/undefined = כל הקטגוריה */
  subCategories?: string[];
}

export interface EventBanner {
  id: string;
  label: string;
  emoji: string;
  /** תיאור קצר מתחת לכותרת הבאנר */
  blurb: string;
  /** תמונת באנר קבועה (Cloudinary). ריק = נלקחת תמונת המוצר הראשון בקטגוריה */
  img?: string;
  /** קטגוריות מהחנות שמצטרפות לבאנר (נטענות בלחיצה — לא בטעינת העמוד) */
  extraSource?: EventBannerExtraSource[];
  /** באנר "שאר המוצרים" — כל מוצר לאירוע שלא שויך לבאנר אחר */
  isCatchAll?: boolean;
}

export const EVENT_BANNERS: EventBanner[] = [
  {
    id: 'bundles',
    label: 'מארזים מוכנים',
    emoji: '🎁',
    blurb: 'הכול ארוז ומוכן לאירוע',
  },
  {
    id: 'birkonim',
    label: 'ברכונים וסידורים',
    emoji: '📖',
    blurb: 'ברכונים, סידורים, זמירות ותהילים',
    // צירוף קטגוריות החנות לבאנר הברכונים
    extraSource: [
      { cat: 'ספרי קודש וברכונים', subCategories: ['ברכונים', 'סידורים ותהילים', 'זמירות שבת'] },
    ],
  },
  {
    id: 'headcovers',
    label: 'כיסויי ראש',
    emoji: '🧕',
    blurb: 'מטפחות, כיסויי ראש ומטריות תחרה',
  },
  {
    id: 'havdalah',
    label: 'נרות הבדלה ובשמים',
    emoji: '🕯️',
    blurb: 'נרות מעוצבים, בשמים ומעמדים',
  },
  {
    id: 'mizmor-letoda',
    label: 'מזמור לתודה',
    emoji: '🎵',
    blurb: 'מזכרות מזמור לתודה בעיצוב אישי',
  },
  {
    id: 'other',
    label: 'עוד מזכרות ומתנות',
    emoji: '✨',
    blurb: 'כל שאר המזכרות שסימנו לאירועים',
    isCatchAll: true,
  },
];
