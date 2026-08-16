// ─────────────────────────────────────────────────────────────────────────────
// רשימת מדינות למשלוח
//
// מוחזקים כאן קודי ISO בלבד — שמות המדינות מתורגמים בזמן ריצה דרך
// Intl.DisplayNames, כך שלקוח צרפתי רואה "États-Unis" ולקוח רוסי "США"
// בלי שנתחזק טבלת תרגומים של 60 מדינות בשש שפות.
// ─────────────────────────────────────────────────────────────────────────────

/** ישראל תמיד ראשונה — היא ברירת המחדל ורוב ההזמנות */
export const DEFAULT_COUNTRY = 'IL';

/** יעדי משלוח נתמכים (ISO 3166-1 alpha-2) */
export const SHIPPING_COUNTRIES: string[] = [
  'IL',
  // צפון אמריקה
  'US', 'CA', 'MX',
  // בריטניה ואירלנד
  'GB', 'IE',
  // מערב אירופה
  'FR', 'DE', 'BE', 'NL', 'LU', 'CH', 'AT', 'IT', 'ES', 'PT', 'MC',
  // סקנדינביה
  'SE', 'NO', 'DK', 'FI', 'IS',
  // מזרח אירופה
  'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'GR', 'RU', 'UA', 'BY', 'LT', 'LV', 'EE', 'MD',
  // אמריקה הלטינית
  'BR', 'AR', 'CL', 'CO', 'PE', 'UY', 'PA', 'CR',
  // אסיה־פסיפיק
  'AU', 'NZ', 'JP', 'KR', 'SG', 'HK', 'TH', 'IN', 'PH',
  // אפריקה והמזרח התיכון
  'ZA', 'AE', 'TR', 'CY', 'MA', 'GE', 'AZ', 'KZ', 'GI',
];

/**
 * שם המדינה בשפת המשתמש. נופל חזרה לקוד ה-ISO בדפדפנים ישנים
 * שאין בהם Intl.DisplayNames — עדיף "US" מאשר תיבה ריקה.
 */
export function countryName(code: string, locale: string): string {
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'region' });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}

/** הרשימה ממוינת אלפביתית בשפת המשתמש, כשישראל תמיד נשארת ראשונה */
export function sortedCountries(locale: string): { code: string; name: string }[] {
  const rest = SHIPPING_COUNTRIES.filter(c => c !== DEFAULT_COUNTRY)
    .map(code => ({ code, name: countryName(code, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  return [{ code: DEFAULT_COUNTRY, name: countryName(DEFAULT_COUNTRY, locale) }, ...rest];
}

export function isInternational(code: string | undefined | null): boolean {
  return !!code && code !== DEFAULT_COUNTRY;
}
