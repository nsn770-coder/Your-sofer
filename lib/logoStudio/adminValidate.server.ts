// Shared input validation for the admin studio routes.
import { HttpError } from './auth.server';
import { isAllowedImageUrl } from './fetchImage.server';
import type { PrintArea } from '@/app/lib/studioKippot';

/** '' / null → null. Otherwise must be an https URL on our Cloudinary (or another allowed host). */
export function parseImageUrl(val: unknown, label: string): string | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val !== 'string' || val.length > 1000 || !isAllowedImageUrl(val.trim())) {
    throw new HttpError(400, 'image_host_not_allowed', `כתובת ${label} לא מאושרת — יש להעלות ל-Cloudinary של האתר.`);
  }
  return val.trim();
}

export function parsePrintArea(val: unknown, label: string): PrintArea {
  const pa = (val && typeof val === 'object' ? val : {}) as Record<string, unknown>;
  const n = (k: string) => Number(pa[k]);
  const a = { cx: n('cx'), cy: n('cy'), minW: n('minW'), maxW: n('maxW'), defaultW: n('defaultW'), maxShift: n('maxShift') };
  if (!Object.values(a).every(v => Number.isFinite(v) && v >= 0 && v <= 1) || a.minW >= a.maxW || a.defaultW < a.minW || a.defaultW > a.maxW) {
    throw new HttpError(400, 'invalid_print_area', `${label} אינו תקין.`);
  }
  return a;
}

export function parseMm(val: unknown): number | null {
  const v = val === null || val === '' || val === undefined ? null : Number(val);
  if (v !== null && !(v > 5 && v < 500)) throw new HttpError(400, 'invalid_width', 'רוחב ההדפסה במ״מ אינו תקין.');
  return v;
}

export function parseFinishes(val: unknown): ('print' | 'embroidery')[] {
  const f = (Array.isArray(val) ? val : []).filter((x): x is 'print' | 'embroidery' => x === 'print' || x === 'embroidery');
  return f.length ? [...new Set(f)] : ['print'];
}
