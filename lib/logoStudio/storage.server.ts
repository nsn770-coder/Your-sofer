// Private asset storage on Cloudinary (type "authenticated").
//
// Logos, mockups and inspiration images are uploaded as AUTHENTICATED assets:
// the plain /upload/ URL does not work for them — only URLs signed with the
// API secret do. Signed URLs are produced only by API routes that already
// checked the caller owns the project (or is an admin), so one customer cannot
// enumerate or open another customer's files.
// Uses the official `cloudinary` SDK already listed in package.json.

import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import crypto from 'node:crypto';

let configured = false;

export class StorageNotConfiguredError extends Error {
  constructor() { super('storage_not_configured'); this.name = 'StorageNotConfiguredError'; }
}

export function storageConfigured(): boolean {
  return !!(process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function ensure() {
  if (!storageConfigured()) throw new StorageNotConfiguredError();
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dyxzq3ucy',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

export interface StoredAsset {
  publicId: string;
  version: number;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export async function uploadPrivate(buf: Buffer, folder: string, format: 'png' | 'jpg' | 'webp'): Promise<StoredAsset> {
  ensure();
  const publicId = crypto.randomBytes(12).toString('hex');
  const res = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { type: 'authenticated', resource_type: 'image', folder, public_id: publicId, overwrite: false, format },
      (err, out) => (err || !out ? reject(err ?? new Error('upload_failed')) : resolve(out)),
    );
    stream.end(buf);
  });
  return { publicId: res.public_id, version: res.version, format: res.format, width: res.width, height: res.height, bytes: res.bytes };
}

export interface SignOptions {
  width?: number;       // thumbnail width (adds a transformation)
  attachment?: string;  // force download with this file name (no extension)
}

/** Signed delivery URL for an authenticated asset. */
export function signedUrl(asset: Pick<StoredAsset, 'publicId' | 'version' | 'format'>, opts: SignOptions = {}): string {
  ensure();
  const transformation: Record<string, unknown>[] = [];
  if (opts.width) transformation.push({ width: opts.width, crop: 'limit' });
  if (opts.attachment) transformation.push({ flags: `attachment:${opts.attachment.replace(/[^A-Za-z0-9_-]/g, '_')}` });
  return cloudinary.url(asset.publicId, {
    type: 'authenticated',
    resource_type: 'image',
    sign_url: true,
    secure: true,
    version: asset.version,
    format: asset.format,
    ...(transformation.length ? { transformation } : {}),
  });
}

/** Server-side download of our own private asset (for compositing). */
export async function downloadPrivate(asset: Pick<StoredAsset, 'publicId' | 'version' | 'format'>): Promise<Buffer> {
  const url = signedUrl(asset);
  const res = await fetch(url, { redirect: 'error' });
  if (!res.ok) throw new Error(`asset_download_${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
