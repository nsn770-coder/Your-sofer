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
  if (!url || !url.includes('cloudinary.com')) return url;

  // If a transform is already present, strip it first to avoid double-transforms
  const cleaned = url.replace(/\/upload\/[^/]+\//, '/upload/');

  const w = snapWidth(width);
  return cleaned.replace('/upload/', `/upload/f_auto,q_auto,w_${w}/`);
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