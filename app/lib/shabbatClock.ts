/**
 * shabbatClock — סגירה אוטומטית של הסליקה בשבת ובחג.
 *
 * מקור הזמנים: החבילה `@hebcal/core` (hebcal.com) — מאגר הזמנים והחגים
 * הסטנדרטי בעולם היהודי, שממנו נגזרים גם לוחות השבת של hebcal.com.
 * החישוב מקומי לחלוטין (אין קריאת רשת בזמן אמת) ולכן אינו תלוי בשירות חיצוני
 * בנתיב התשלום, ונכון לכל שנה קדימה — כולל חגים, ערבי חג ושבת שחלה בחג.
 *
 * הזמנים מחושבים לפי מיקום החנות (דימונה):
 *   כניסת שבת/חג = 20 דקות לפני השקיעה · צאת שבת/חג = 42 דקות אחרי השקיעה
 * ועליהם נוסף באפר ביטחון (סוגרים 10 דק' לפני, פותחים 5 דק' אחרי).
 *
 * הזמנים הם נקודות זמן מוחלטות (UTC), ולכן החישוב נכון גם ללקוח שגולש
 * מחו"ל — הסגירה תמיד לפי השבת בישראל.
 */

import { HebrewCalendar, Location, TimedEvent } from '@hebcal/core';

export const SHABBAT_CONFIG = {
  /** מיקום החנות — דימונה */
  lat: 31.0689,
  lon: 35.0325,
  tzid: 'Asia/Jerusalem',
  cityHe: 'דימונה',
  /** דקות לפני השקיעה — הדלקת נרות */
  candleLightingMins: 20,
  /** דקות אחרי השקיעה — צאת השבת (תקן הרבנות) */
  havdalahMins: 42,
  /** באפר ביטחון: סוגרים כמה דקות לפני הכניסה */
  closeBufferMins: 10,
  /** באפר ביטחון: פותחים כמה דקות אחרי הצאת */
  openBufferMins: 5,
} as const;

export interface ShabbatStatus {
  /** האם כרגע סגור לרכישות */
  closed: boolean;
  /** שם היום הנוכחי/הקרוב — 'שבת', 'יום כיפור', 'סוכות א׳' … */
  label: string;
  /** מתי נפתח שוב (ISO) — כשסגור */
  opensAt: string | null;
  /** מתי נסגר בפעם הבאה (ISO) — כשפתוח */
  nextCloseAt: string | null;
  /** הודעה מוכנה להצגה ללקוח */
  message: string;
  /** true אם הזמנים חושבו בנוסחת גיבוי גסה (כשל בחישוב) */
  fallback?: boolean;
}

const location = new Location(
  SHABBAT_CONFIG.lat,
  SHABBAT_CONFIG.lon,
  true,               // ישראל — לוח חגים ישראלי (יום טוב אחד)
  SHABBAT_CONFIG.tzid,
  SHABBAT_CONFIG.cityHe,
  'IL',
);

const DAY_MS = 24 * 60 * 60 * 1000;

/** הסרת ניקוד משמות שרנדר Hebcal */
function stripNikud(s: string): string {
  return s.replace(/[֑-ׇ]/g, '').replace(/\s+/g, ' ').trim();
}

interface ClosureWindow { from: Date; to: Date; label: string }

/** בניית חלונות הסגירה (כניסת שבת/חג → צאת שבת/חג) סביב תאריך נתון */
function buildWindows(now: Date): ClosureWindow[] {
  const events = HebrewCalendar.calendar({
    start: new Date(now.getTime() - 3 * DAY_MS),
    end: new Date(now.getTime() + 21 * DAY_MS),
    location,
    il: true,
    candlelighting: true,
    candleLightingMins: SHABBAT_CONFIG.candleLightingMins,
    havdalahMins: SHABBAT_CONFIG.havdalahMins,
  });

  const windows: ClosureWindow[] = [];
  let openFrom: Date | null = null;

  for (const ev of events) {
    if (!(ev instanceof TimedEvent)) continue;   // מדלגים על אירועים ללא שעה
    const time = ev.eventTime;
    if (!time) continue;
    const desc = ev.getDesc();
    if (desc === 'Candle lighting') {
      // כניסה ראשונה בלבד — רצף שבת+חג נסגר כבלוק אחד עד ההבדלה האחרונה
      if (!openFrom) openFrom = new Date(time.getTime() - SHABBAT_CONFIG.closeBufferMins * 60_000);
    } else if (desc === 'Havdalah' && openFrom) {
      const linked = ev.linkedEvent;
      const label = linked ? stripNikud(linked.render('he')) : 'שבת';
      windows.push({
        from: openFrom,
        to: new Date(time.getTime() + SHABBAT_CONFIG.openBufferMins * 60_000),
        label,
      });
      openFrom = null;
    }
  }
  return windows;
}

function formatIsraelTime(d: Date): string {
  const day = new Intl.DateTimeFormat('he-IL', {
    timeZone: SHABBAT_CONFIG.tzid, weekday: 'long', day: 'numeric', month: 'numeric',
  }).format(d);
  const time = new Intl.DateTimeFormat('he-IL', {
    timeZone: SHABBAT_CONFIG.tzid, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
  return `${day} בשעה ${time}`;
}

/**
 * גיבוי גס למקרה שחישוב הזמנים נכשל: סגור מיום שישי 15:00 עד מוצ"ש 21:00
 * (שעון ישראל). עדיף לסגור רחב מדי מאשר לסלוק בשבת.
 */
function fallbackStatus(now: Date): ShabbatStatus {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SHABBAT_CONFIG.tzid,
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find(p => p.type === 'weekday')?.value ?? '';
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
  const closed = (weekday === 'Fri' && hour >= 15) || (weekday === 'Sat' && hour < 21);
  return {
    closed,
    label: 'שבת',
    opensAt: null,
    nextCloseAt: null,
    message: closed
      ? 'האתר סגור לרכישות בשבת. אפשר להמשיך לעיין ולהוסיף לסל — ההזמנה תתאפשר במוצאי שבת.'
      : '',
    fallback: true,
  };
}

/** מצב החנות כרגע — סגור בשבת/חג או פתוח */
export function getShabbatStatus(now: Date = new Date()): ShabbatStatus {
  try {
    const windows = buildWindows(now);
    const current = windows.find(w => now >= w.from && now < w.to);

    if (current) {
      const opens = formatIsraelTime(current.to);
      const isShabbat = current.label === 'שבת';
      return {
        closed: true,
        label: current.label,
        opensAt: current.to.toISOString(),
        nextCloseAt: null,
        message:
          `האתר סגור לרכישות ב${isShabbat ? 'שבת' : current.label}. ` +
          `אפשר להמשיך לעיין ולהוסיף לסל — הרכישה תיפתח שוב ב${opens}.`,
      };
    }

    const next = windows.find(w => w.from > now) ?? null;
    return {
      closed: false,
      label: next?.label ?? '',
      opensAt: null,
      nextCloseAt: next ? next.from.toISOString() : null,
      message: '',
    };
  } catch (e) {
    console.error('[shabbatClock] calculation failed, using fallback:', e);
    return fallbackStatus(now);
  }
}
