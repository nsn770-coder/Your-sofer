import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function cloudinarySign(params: Record<string, string>, secret: string): string {
  const str = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(str + secret).digest('hex');
}

export async function POST(req: NextRequest) {
  const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || 'dyxzq3ucy';
  const API_KEY = process.env.CLOUDINARY_API_KEY ?? '';
  const API_SECRET = process.env.CLOUDINARY_API_SECRET ?? '';

  if (!API_KEY || !API_SECRET) {
    return NextResponse.json({ error: 'Missing Cloudinary credentials' }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

  const ts = String(Math.floor(Date.now() / 1000));
  const signParams = { eager: 'e_background_removal', folder: 'print-orders', timestamp: ts };
  const signature = cloudinarySign(signParams, API_SECRET);

  const body = new FormData();
  body.append('file', file);
  body.append('api_key', API_KEY);
  body.append('timestamp', ts);
  body.append('eager', 'e_background_removal');
  body.append('folder', 'print-orders');
  body.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: 'POST',
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }

  const data = await res.json();
  const url: string = data.eager?.[0]?.secure_url ?? data.secure_url;
  return NextResponse.json({ url });
}
