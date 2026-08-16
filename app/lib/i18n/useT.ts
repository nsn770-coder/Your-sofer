'use client';

// ─────────────────────────────────────────────────────────────────────────────
// useT — הוק התרגום לקומפוננטות לקוח
//
// השפה נגזרת מהנתיב (usePathname) ולא מ-Context, בכוונה:
//  · אין צורך ב-Provider שעוטף את כל האתר
//  · usePathname עובד גם בזמן ה-prerender הסטטי, כך ש-/en נבנה מתורגם
//    בזמן build ולא אחרי hydration — אין הבזק של עברית ואין פגיעה ב-SSG
// ─────────────────────────────────────────────────────────────────────────────

import { usePathname } from 'next/navigation';
import { splitLocalePath, getLocale, localizePath, type LocaleDef } from './config';
import { getDictionary, type DictKey } from './dictionaries';
import { categoryLabel } from './categories';

export interface Translator {
  /** קוד השפה הנוכחית ('he' | 'en' | …) */
  locale: string;
  /** הגדרת השפה המלאה — dir, דגל, htmlLang */
  def: LocaleDef;
  /** true כשהשפה אינה עברית — שימושי לתצוגות שצריכות טיפול מיוחד */
  isTranslated: boolean;
  dir: 'rtl' | 'ltr';
  /** תרגום מפתח ממילון הממשק */
  t: (key: DictKey) => string;
  /** תרגום שם קטגוריה של Firestore לתצוגה (הערך המקורי נשאר לשאילתות) */
  tc: (hebrewCategory: string | undefined | null) => string;
  /** בונה קישור פנימי בשפה הנוכחית: '/cart' → '/en/cart' */
  href: (path: string) => string;
}

export function useT(): Translator {
  const pathname = usePathname() || '/';
  const { locale } = splitLocalePath(pathname);
  const dict = getDictionary(locale);
  const def = getLocale(locale);

  return {
    locale,
    def,
    isTranslated: locale !== 'he',
    dir: def.dir,
    t: (key: DictKey) => dict[key] ?? key,
    tc: (cat: string | undefined | null) => categoryLabel(cat, locale),
    href: (path: string) => localizePath(path, locale),
  };
}
