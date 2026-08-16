import { NextResponse, type NextRequest } from 'next/server';
import {
  DEFAULT_LOCALE,
  PREFIXED_LOCALES,
  detectLocale,
  hasTranslation,
  localizePath,
} from '@/app/lib/i18n/config';

// ─────────────────────────────────────────────────────────────────────────────
// זיהוי שפה אוטומטי + הפניה   (Next 16: middleware → proxy)
//
// כללי ברזל:
//  1. בוטים (Googlebot וחבריו) לא מופנים לעולם — כל שפה חייבת להיות ניתנת
//     לסריקה בכתובת שלה, אחרת ה-hreflang חסר משמעות והאינדוקס נשבר.
//  2. בחירה ידנית של המשתמש (קוקי) גוברת תמיד על הזיהוי האוטומטי.
//  3. מפנים רק לנתיב שקיים מתורגם (TRANSLATED_PATHS) — אחרת הלקוח נוחת על 404.
//  4. עברית יושבת על השורש ללא קידומת — אף כתובת קיימת לא משתנה.
// ─────────────────────────────────────────────────────────────────────────────

const COOKIE = 'ys_locale';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // שנה

const BOT_RE =
  /bot\b|crawler|spider|crawl|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|sogou|exabot|facebot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|applebot|petalbot|ahrefs|semrush|mj12bot|dotbot|screaming frog|lighthouse|chrome-lighthouse|gtmetrix|pingdom|headlesschrome/i;

/** נתיבים שלא נוגעים בהם בכלל — API, סטטי, וכל אזורי הניהול (עברית בלבד) */
const SKIP_PREFIXES = [
  '/api',
  '/_next',
  '/admin',
  '/ops',
  '/partner',
  '/sofer-dashboard',
  '/sofer-store',
  '/shaliach-dashboard',
  '/verify',
  '/certificate',
  '/moment',
  '/shared-cart',
];

function shouldSkip(pathname: string): boolean {
  if (SKIP_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))) return true;
  // קבצים (robots.txt, sitemap.xml, og-default.png, favicon…)
  return /\.[a-zA-Z0-9]{2,5}$/.test(pathname);
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (shouldSkip(pathname)) return NextResponse.next();

  const firstSeg = pathname.split('/')[1];

  // ── כבר נמצאים על נתיב עם קידומת שפה — רק מקבעים את הבחירה בקוקי ──
  if (firstSeg && PREFIXED_LOCALES.includes(firstSeg)) {
    const res = NextResponse.next();
    if (req.cookies.get(COOKIE)?.value !== firstSeg) {
      res.cookies.set(COOKIE, firstSeg, { path: '/', maxAge: COOKIE_MAX_AGE, sameSite: 'lax' });
    }
    return res;
  }

  // ── מכאן: אנחנו על העץ העברי (ללא קידומת) ──

  // בוטים רואים בדיוק את מה שביקשו
  const ua = req.headers.get('user-agent') || '';
  if (BOT_RE.test(ua)) return NextResponse.next();

  // ?lang=he — דרך מפורשת להישאר בעברית (הבורר משתמש בזה)
  const forced = req.nextUrl.searchParams.get('lang');
  if (forced === DEFAULT_LOCALE) {
    const res = NextResponse.next();
    res.cookies.set(COOKIE, DEFAULT_LOCALE, { path: '/', maxAge: COOKIE_MAX_AGE, sameSite: 'lax' });
    return res;
  }

  // בחירה ידנית קודמת — ומכבדים גם בחירה מפורשת בעברית
  const chosen = req.cookies.get(COOKIE)?.value;
  if (chosen) {
    if (chosen === DEFAULT_LOCALE || !PREFIXED_LOCALES.includes(chosen)) return NextResponse.next();
    if (!hasTranslation(pathname)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = localizePath(pathname, chosen);
    return NextResponse.redirect(url);
  }

  // ── ביקור ראשון: זיהוי לפי שפת הדפדפן, ואם אין — לפי מדינת ה-IP ──
  const country =
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cf-ipcountry') ||
    null;
  const detected = detectLocale(req.headers.get('accept-language'), country);

  const res =
    detected === DEFAULT_LOCALE || !hasTranslation(pathname)
      ? NextResponse.next()
      : NextResponse.redirect(new URL(`${localizePath(pathname, detected)}${search}`, req.url));

  // שומרים את ההחלטה כדי שלא נזהה מחדש בכל בקשה
  res.cookies.set(COOKIE, detected, { path: '/', maxAge: COOKIE_MAX_AGE, sameSite: 'lax' });
  return res;
}

export const config = {
  // כל מה שאינו קובץ סטטי או API — הסינון המדויק נעשה ב-shouldSkip
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
