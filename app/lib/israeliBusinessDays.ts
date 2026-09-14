/**
 * israeliBusinessDays — חישוב ימי עסקים בישראל.
 *
 * ימי עסקים = ראשון–חמישי בלבד (שישי ושבת אינם ימי עסקים אצל חברות
 * המשלוחים בישראל), ובניכוי חגי ישראל וימי חול המועד.
 *
 * מקור החגים: לוח השנה העברי המובנה במנוע ה-JS (Intl, calendar=hebrew),
 * שממנו נגזר התאריך העברי של כל יום לועזי. רשימת התאריכים העבריים שמוגדרים
 * כאן כימי חופש תואמת ללוח החגים של Hebcal לישראל
 * (https://www.hebcal.com/holidays/ — Israel schedule).
 * היתרון על פני API חיצוני: אין קריאת רשת, אין תלות חיצונית, והחישוב
 * נכון לכל שנה קדימה — כולל שנים מעוברות (פורים באדר ב').
 */

export type HebrewDate = { day: number; month: string; year: number };

const hebrewFormatter = new Intl.DateTimeFormat('en-u-ca-hebrew', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** תאריך עברי של יום לועזי נתון (שמות חודשים באנגלית: Tishri, Nisan, Adar II …) */
export function toHebrewDate(date: Date): HebrewDate {
  // אמצע היום מנטרל הפרשי אזור-זמן / שעון קיץ בהמרה
  const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const parts = hebrewFormatter.formatToParts(noon);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return {
    day: parseInt(get('day'), 10),
    month: get('month').trim(),
    year: parseInt(get('year').replace(/\D/g, ''), 10),
  };
}

/**
 * האם היום הזה הוא חג / ערב חג / חול המועד — כלומר לא יום עבודה בישראל.
 * כולל ערבי חג, שבהם חברות המשלוחים לא מחלקות.
 */
export function isIsraeliHoliday(date: Date): boolean {
  const { day, month } = toHebrewDate(date);
  const weekday = date.getDay(); // 0=ראשון … 6=שבת

  // ערב ראש השנה
  if (month === 'Elul' && day === 29) return true;
  // ראש השנה
  if (month === 'Tishri' && (day === 1 || day === 2)) return true;
  // ערב יום כיפור + יום כיפור
  if (month === 'Tishri' && (day === 9 || day === 10)) return true;
  // ערב סוכות, סוכות, חול המועד, הושענא רבה, שמחת תורה
  if (month === 'Tishri' && day >= 14 && day <= 22) return true;
  // ערב פסח, פסח, חול המועד, שביעי של פסח
  if (month === 'Nisan' && day >= 14 && day <= 21) return true;
  // ערב שבועות + שבועות
  if (month === 'Sivan' && (day === 5 || day === 6)) return true;
  // פורים — באדר, ובשנה מעוברת באדר ב'
  if ((month === 'Adar' || month === 'Adar II') && day === 14) return true;

  // יום העצמאות — ה' באייר, עם הקדמה/דחייה לפי חוק:
  // חל בשישי/שבת → מוקדם ליום חמישי; חל בשני → נדחה ליום שלישי.
  if (month === 'Iyar') {
    if (day === 5 && weekday !== 5 && weekday !== 6 && weekday !== 1) return true;
    if ((day === 3 || day === 4) && weekday === 4) return true; // הוקדם ליום חמישי
    if (day === 6 && weekday === 2) return true;                // נדחה ליום שלישי
  }

  return false;
}

/** יום עסקים = ראשון–חמישי שאינו חג / ערב חג / חול המועד */
export function isBusinessDay(date: Date): boolean {
  const weekday = date.getDay();
  if (weekday === 5 || weekday === 6) return false; // שישי, שבת
  return !isIsraeliHoliday(date);
}

/**
 * הוספת N ימי עסקים לתאריך. הספירה מתחילה מהיום שאחרי `from`
 * (יום ההזמנה עצמו אינו נספר).
 */
export function addBusinessDays(from: Date, businessDays: number): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let left = businessDays;
  let guard = 0;
  while (left > 0 && guard < 400) {
    d.setDate(d.getDate() + 1);
    if (isBusinessDay(d)) left--;
    guard++;
  }
  return d;
}
