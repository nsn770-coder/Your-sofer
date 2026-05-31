import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || 'dyxzq3ucy';

  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', 'yoursofer_upload');
  body.append('folder', 'print-orders');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: 'POST',
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ url: data.secure_url as string });
}
