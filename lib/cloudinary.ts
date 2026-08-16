/**
 * Cloudinary utilities — YourSofer
 *
 * COST OPTIMIZATION: All sizes snap to 4 fixed widths only.
 * This means Cloudinary caches at most 4 derived versions per image
 * instead of dozens, cutting transformations & bandwidth dramatically.
 *
 * Allowed widths: 200 | 400 | 800 | 1200
 */

type ImageContext = 'thumbnail' | 'card' | 'full' | 'hero';

// ── Snap any requested width to the nearest allowed size ──────────────────────

function snapWidth(width: number): 200 | 400 | 800 | 1200 {
  if (width <= 200) return 200;
  if (width <= 400) return 400;
  if (width <= 800) return 800;
  return 1200;
}

// ── Primary helper — used throughout the app ──────────────────────────────────
// Replaces the old optimizeCloudinaryUrl(url, width, quality) signature.
// quality param kept for backwards-compat but ignored — always auto:good.

export function optimizeCloudinaryUrl(
  url: string,
  width: number = 800,
  _quality?: string        // ignored — kept so existing call-sites don't break
): string {
  if (!url) return url;

  if (url.includes('cloudinary.com')) {
    // If a transform is already present, strip it first to avoid double-transforms
    const cleaned = url.replace(/\/upload\/[^/]+\//, '/upload/');
    const w = snapWidth(width);
    return cleaned.replace('/upload/', `/upload/f_auto,q_auto,w_${w}/`);
  }

  if (url.includes('israel-judaica.com')) {
    const w = snapWidth(width);
    return `https://res.cloudinary.com/dyxzq3ucy/image/fetch/f_auto,q_auto,w_${w}/${encodeURIComponent(url)}`;
  }

  return url;
}

// ── Context-based helper — use when you know the display context ──────────────

export function getCloudinaryUrl(
  urlOrPublicId: string,
  context: ImageContext = 'card'
): string {
  const transforms: Record<ImageContext, string> = {
    thumbnail: 'w_200,q_auto,f_auto',   // sofer avatars, klaf gallery thumbs
    card:      'w_400,q_auto,f_auto',   // product cards (catalog grid)
    full:      'w_800,q_auto,f_auto',   // product page main image
    hero:      'w_1200,q_auto,f_auto',  // banners, hero sections
  };

  if (!urlOrPublicId) return '';

  // If a full Cloudinary URL was passed, use optimizeCloudinaryUrl
  if (urlOrPublicId.includes('cloudinary.com')) {
    const widthMap: Record<ImageContext, number> = {
      thumbnail: 200, card: 400, full: 800, hero: 1200,
    };
    return optimizeCloudinaryUrl(urlOrPublicId, widthMap[context]);
  }

  // If a raw public_id was passed
  const base = 'https://res.cloudinary.com/dyxzq3ucy/image/upload';
  return `${base}/${transforms[context]}/${urlOrPublicId}`;
}
// ── Hero banners — format/quality only, never resize ──────────────────────────
/**
 * PERF (08/2026): כתובות באנרי ה-Hero נשמרות ב-Firestore כקישור Cloudinary גולמי,
 * ולכן הדפדפן מקבל את **קובץ המקור** — PNG של ~1MB לכל שקופית (ארבע השקופיות
 * הפעילות ≈ 4.2MB, והראשונה היא ה-LCP במובייל).
 *
 * מוסיפים f_auto,q_auto בלבד — בלי w_, בלי c_, בלי שום שינוי ממדים: אותה תמונה,
 * אותו רוחב וגובה, אותו crop, אותו יחס. רק הפורמט והדחיסה נבחרים אוטומטית
 * (WebP/AVIF בדפדפנים שתומכים). נמדד: 988KB→65KB במובייל, 830KB→53KB בדסקטופ,
 * באותם 1080×810 / 1400×480 בדיוק.
 *
 * שמרנות בכוונה: נוגעים אך ורק בכתובת בצורה
 *   https://res.cloudinary.com/<cloud>/image/upload/v<digits>/<path>
 * כלומר כתובת שאין בה כבר טרנספורמציה. כל צורה אחרת — תיקייה ללא גרסה, כתובת
 * שכבר עברה אופטימיזציה, או דומיין אחר — מוחזרת כמו שהיא, כדי שלא תישבר תמונה.
 *
 * ⚠️ הפונקציה יושבת כאן ולא ב-HeroCarousel.tsx בכוונה: HeroCarousel הוא
 * 'use client', ו-app/page.tsx (server component) חייב לקרוא לה בזמן בנייה כדי
 * לבנות את ה-preload. קריאה לפונקציה שמיוצאת ממודול 'use client' מהשרת נכשלת
 * ב-build ("Attempted to call heroSrc() from the server").
 */
const CLD_RAW_RE = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/;

export function heroSrc(url: string): string;
export function heroSrc(url: string | undefined): string | undefined;
export function heroSrc(url: string | undefined): string | undefined {
  if (!url) return url;
  const m = CLD_RAW_RE.exec(url);
  return m ? `${m[1]}f_auto,q_auto/${m[2]}` : url;
}
