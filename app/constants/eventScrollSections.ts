// ============================================
// סקרולים בדף "כיפות לאירועים" (/event-kippot)
// מקור אמת יחיד — משמש גם את האדמין וגם את הדף עצמו
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
