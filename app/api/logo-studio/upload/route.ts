import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireUser, errorResponse, HttpError } from '@/lib/logoStudio/auth.server';
import { consumeRate } from '@/lib/logoStudio/rateLimit.server';
import { db } from '@/lib/logoStudio/projects.server';
import { sanitizeUpload, ImageFetchError } from '@/lib/logoStudio/fetchImage.server';
import { uploadPrivate, signedUrl, storageConfigured } from '@/lib/logoStudio/storage.server';
import { COL } from '@/lib/logoStudio/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 6 * 1024 * 1024;

/**
 * Inspiration image upload. Accepts a FILE only (no URLs → no SSRF). The type
 * is checked by magic bytes, size is capped, and the image is re-encoded
 * (EXIF and any trailing payload removed) before private storage.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!storageConfigured()) throw new HttpError(503, 'storage_not_configured', 'העלאת קבצים אינה זמינה כרגע.');
    const len = Number(req.headers.get('content-length') || 0);
    if (len > MAX_BYTES + 64 * 1024) throw new HttpError(413, 'too_large', 'הקובץ גדול מדי (עד 6MB).');
    await consumeRate(db(), 'upload', user.uid);
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) throw new HttpError(400, 'no_file', 'לא נבחר קובץ.');
    if (file.size > MAX_BYTES) throw new HttpError(413, 'too_large', 'הקובץ גדול מדי (עד 6MB).');
    let clean;
    try { clean = await sanitizeUpload(Buffer.from(await file.arrayBuffer())); }
    catch (e) {
      if (e instanceof ImageFetchError) throw new HttpError(415, 'bad_type', 'אפשר להעלות רק תמונות JPG, PNG או WEBP.');
      throw e;
    }
    const asset = await uploadPrivate(clean.png, `logo-studio/${user.uid}/inspiration`, 'png');
    const assetId = crypto.randomBytes(10).toString('hex');
    await getAdminDb().collection(COL.assets).doc(assetId).set({ ...asset, uid: user.uid, kind: 'inspiration', createdAt: Date.now() });
    return NextResponse.json({ assetId, thumb: signedUrl(asset, { width: 300 }) });
  } catch (e) {
    return errorResponse(e, 'upload');
  }
}
