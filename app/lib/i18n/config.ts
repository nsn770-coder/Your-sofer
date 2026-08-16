// ─────────────────────────────────────────────────────────────────────────────
// i18n — הגדרת השפות של YourSofer (מקור אמת יחיד)
// עברית היא שפת ברירת המחדל ויושבת על השורש ללא קידומת (/) — כדי לא לגעת
// באף כתובת קיימת ובדירוגי ה-SEO העבריים. כל שאר השפות מקבלות קידומת:
// /en, /fr, /es, /ar, /ru
// ─────────────────────────────────────────────────────────────────────────────

export interface LocaleDef {
  code: string;
  /** שם השפה בשפה עצמה — מה שהמשתמש רואה בתפריט */
  label: string;
  /** דגל כאימוג'י (עובד בכל מערכת, בלי קבצי תמונה ובלי בקשות רשת) */
  flag: string;
  dir: 'rtl' | 'ltr';
  /** ערך ל-<html lang> ול-hreflang */
  htmlLang: string;
  ogLocale: string;
}

export const LOCALES: LocaleDef[] = [
  { code: 'he', label: 'עברית',    flag: '🇮🇱', dir: 'rtl', htmlLang: 'he', ogLocale: 'he_IL' },
  { code: 'en', label: 'English',  flag: '🇺🇸', dir: 'ltr', htmlLang: 'en', ogLocale: 'en_US' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', dir: 'ltr', htmlLang: 'fr', ogLocale: 'fr_FR' },
  { code: 'es', label: 'Español',  flag: '🇪🇸', dir: 'ltr', htmlLang: 'es', ogLocale: 'es_ES' },
  { code: 'ar', label: 'العربية',  flag: '🇦🇪', dir: 'rtl', htmlLang: 'ar', ogLocale: 'ar_AE' },
  { code: 'ru', label: 'Русский',  flag: '🇷🇺', dir: 'ltr', htmlLang: 'ru', ogLocale: 'ru_RU' },
];

export type LocaleCode = string;

export const DEFAULT_LOCALE = 'he';

/** השפות שיושבות תחת קידומת בנתיב — הכול חוץ מעברית */
export const PREFIXED_LOCALES = LOCALES.filter(l => l.code !== DEFAULT_LOCALE).map(l => l.code);

export const LOCALE_CODES = LOCALES.map(l => l.code);

export function isLocale(code: string | undefined | null): boolean {
  return !!code && LOCALE_CODES.includes(code);
}

export function getLocale(code: string | undefined | null): LocaleDef {
  return LOCALES.find(l => l.code === code) ?? LOCALES[0];
}

export function dirOf(code: string): 'rtl' | 'ltr' {
  return getLocale(code).dir;
}

// ─────────────────────────────────────────────────────────────────────────────
// זיהוי לפי מדינה (x-vercel-ip-country) — רק כרמז ראשוני;
// Accept-Language של הדפדפן גובר עליו כשהוא מפורש.
// ─────────────────────────────────────────────────────────────────────────────
export const COUNTRY_TO_LOCALE: Record<string, string> = {
  IL: 'he',
  // English
  US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en', ZA: 'en', IN: 'en',
  SG: 'en', PH: 'en', NG: 'en', KE: 'en', JM: 'en', UA: 'en',
  // French
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr', SN: 'fr', CI: 'fr', CM: 'fr', HT: 'fr',
  // Spanish
  ES: 'es', MX: 'es', AR: 'es', CL: 'es', CO: 'es', PE: 'es', VE: 'es', EC: 'es',
  UY: 'es', BO: 'es', PY: 'es', CR: 'es', PA: 'es', DO: 'es', GT: 'es', HN: 'es',
  SV: 'es', NI: 'es', CU: 'es', PR: 'es',
  // Arabic
  AE: 'ar', SA: 'ar', EG: 'ar', MA: 'ar', JO: 'ar', QA: 'ar', KW: 'ar', BH: 'ar',
  OM: 'ar', TN: 'ar', DZ: 'ar', LB: 'ar', IQ: 'ar', LY: 'ar', YE: 'ar', SD: 'ar',
  // Russian
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru', AM: 'ru', AZ: 'ru', MD: 'ru', UZ: 'ru',
};

/**
 * פירוק Accept-Language עם משקלי q והחזרת השפה הנתמכת המועדפת.
 * דוגמה: "en-US,en;q=0.9,he;q=0.8" → 'en'
 */
export function localeFromAcceptLanguage(header: string | null | undefined): string | null {
  if (!header) return null;
  const parsed = header
    .split(',')
    .map(part => {
      const [tag, ...params] = part.trim().split(';');
      const q = params
        .map(p => p.trim())
        .filter(p => p.startsWith('q='))
        .map(p => parseFloat(p.slice(2)))[0];
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 1 };
    })
    .filter(x => x.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of parsed) {
    const base = tag.split('-')[0];
    // 'iw' הוא הקוד הישן של עברית — עדיין נשלח ע"י חלק מהמכשירים
    const normalized = base === 'iw' ? 'he' : base;
    if (LOCALE_CODES.includes(normalized)) return normalized;
  }
  return null;
}

/**
 * ההחלטה הסופית: שפת הדפדפן קודמת (היא מה שהמשתמש בחר במכשיר שלו),
 * ורק אם היא לא נתמכת — נופלים למדינה לפי ה-IP.
 */
export function detectLocale(
  acceptLanguage: string | null | undefined,
  country: string | null | undefined,
): string {
  const fromBrowser = localeFromAcceptLanguage(acceptLanguage);
  if (fromBrowser) return fromBrowser;
  const fromCountry = country ? COUNTRY_TO_LOCALE[country.toUpperCase()] : undefined;
  return fromCountry ?? DEFAULT_LOCALE;
}

// ─────────────────────────────────────────────────────────────────────────────
// עזרי נתיבים
// ─────────────────────────────────────────────────────────────────────────────

/** מפריד קידומת שפה מנתיב: '/en/cart' → { locale:'en', path:'/cart' } */
export function splitLocalePath(pathname: string): { locale: string; path: string } {
  const seg = pathname.split('/')[1];
  if (seg && PREFIXED_LOCALES.includes(seg)) {
    const rest = pathname.slice(seg.length + 1);
    return { locale: seg, path: rest || '/' };
  }
  return { locale: DEFAULT_LOCALE, path: pathname || '/' };
}

/** בונה נתיב לשפה מסוימת: ('/cart','en') → '/en/cart' · ('/cart','he') → '/cart' */
export function localizePath(path: string, locale: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
}

/**
 * ⚠️ רשימת הנתיבים שכבר קיימים מתורגמים.
 * ה-middleware מפנה אוטומטית רק לנתיבים שברשימה — כדי שלקוח מחו"ל
 * לא יינחת על 404. מרחיבים אותה בכל פעם שעמוד נוסף מתורגם.
 */
export const TRANSLATED_PATHS: string[] = ['/', '/cart'];

export function hasTranslation(path: string): boolean {
  return TRANSLATED_PATHS.some(p => (p === '/' ? path === '/' : path === p || path.startsWith(`${p}/`)));
}

/** כתובות hreflang לכל השפות עבור נתיב נתון */
export function hreflangAlternates(path: string, baseUrl = 'https://your-sofer.com'): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of LOCALES) out[l.htmlLang] = `${baseUrl}${localizePath(path, l.code)}`;
  out['x-default'] = `${baseUrl}${localizePath(path, DEFAULT_LOCALE)}`;
  return out;
}
