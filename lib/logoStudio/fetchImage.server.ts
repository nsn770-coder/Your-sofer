// SSRF-safe image fetch. The server only ever fetches catalog images whose URL
// comes from OUR Firestore product document (never from the client), and even
// then only from an allow-list of hosts, over https, without redirects, with a
// size cap and a timeout. The bytes are then decoded by sharp (format check).

import sharp from 'sharp';

const ALLOWED_HOSTS = [
  'res.cloudinary.com',
  'israel-judaica.com',
  'www.israel-judaica.com',
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
];
const MAX_BYTES = 12 * 1024 * 1024;

export class ImageFetchError extends Error {
  constructor(code: string) { super(code); this.name = 'ImageFetchError'; }
}

export function isAllowedImageUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    if (u.username || u.password) return false;
    if (u.port && u.port !== '443') return false;
    if (!ALLOWED_HOSTS.includes(u.hostname)) return false;
    // Cloudinary: only our own cloud
    if (u.hostname === 'res.cloudinary.com') {
      const cloud = process.env.CLOUDINARY_CLOUD_NAME || 'dyxzq3ucy';
      if (!u.pathname.startsWith(`/${cloud}/`)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function fetchCatalogImage(url: string): Promise<Buffer> {
  if (!isAllowedImageUrl(url)) throw new ImageFetchError('host_not_allowed');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, { redirect: 'error', signal: ctrl.signal, headers: { Accept: 'image/*' } });
    if (!res.ok) throw new ImageFetchError(`http_${res.status}`);
    const len = Number(res.headers.get('content-length') || 0);
    if (len > MAX_BYTES) throw new ImageFetchError('too_large');
    const reader = res.body?.getReader();
    if (!reader) throw new ImageFetchError('no_body');
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) { await reader.cancel(); throw new ImageFetchError('too_large'); }
      chunks.push(value);
    }
    const buf = Buffer.concat(chunks);
    const meta = await sharp(buf).metadata().catch(() => null);
    if (!meta || !meta.width || !meta.height || !['jpeg', 'png', 'webp', 'avif', 'gif'].includes(meta.format ?? '')) {
      throw new ImageFetchError('not_an_image');
    }
    return buf;
  } finally {
    clearTimeout(t);
  }
}

/** Validate an uploaded file by its CONTENT (not the declared type) and re-encode it. */
export async function sanitizeUpload(buf: Buffer): Promise<{ png: Buffer; width: number; height: number }> {
  const sig = buf.subarray(0, 12);
  const isPng = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47;
  const isJpg = sig[0] === 0xff && sig[1] === 0xd8 && sig[2] === 0xff;
  const isWebp = sig.subarray(0, 4).toString('ascii') === 'RIFF' && sig.subarray(8, 12).toString('ascii') === 'WEBP';
  if (!isPng && !isJpg && !isWebp) throw new ImageFetchError('bad_type');
  const meta = await sharp(buf, { limitInputPixels: 40_000_000 }).metadata().catch(() => null);
  if (!meta?.width || !meta.height) throw new ImageFetchError('not_an_image');
  // re-encode: strips metadata/EXIF and anything appended to the file
  const out = await sharp(buf, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { png: out.data, width: out.info.width, height: out.info.height };
}
