import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const SITE = 'https://your-sofer.com';
const CDN  = 'https://res.cloudinary.com/dyxzq3ucy/image/upload/';

const HEADERS = ['id','title','description','availability','condition','price','link','image_link','brand','product_type'];

function csvCell(val: string): string {
  const s = String(val ?? '').replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
}

function normalizeImg(u: unknown): string | null {
  if (!u || typeof u !== 'string' || !u.trim()) return null;
  return u.startsWith('http') ? u : CDN + u;
}

export async function GET() {
  try {
    const db   = getAdminDb();
    const snap = await db.collection('products').get();

    const rows: string[] = [HEADERS.join(',')];

    snap.forEach(doc => {
      const d    = doc.data();
      const id   = doc.id;
      const name: string  = d.name ?? '';
      const price: number = d.price ?? 0;

      if (!name || !price) return;

      const desc: string = (d.desc ?? d.description ?? name).slice(0, 9999);
      const cat:  string = d.cat ?? d.category ?? '';

      const inStock: boolean =
        d.availability === undefined
          ? true
          : String(d.availability).toLowerCase() !== 'out of stock';
      const availability = inStock ? 'in stock' : 'out of stock';

      const condition: string = d.condition ?? 'new';
      const brand:     string = d.brand ?? 'YourSofer';
      const formattedPrice    = `${price.toFixed(2)} ILS`;
      const link              = `${SITE}/product/${id}`;

      const allImages = [
        normalizeImg(d.imgUrl ?? d.image_url ?? d.img1),
        normalizeImg(d.imgUrl2 ?? d.img2),
        normalizeImg(d.imgUrl3 ?? d.img3),
        normalizeImg(d.imgUrl4),
      ].filter((u): u is string => u !== null);

      // AI-generated image (index 1) preferred as primary, same logic as product page
      const imageLink = allImages.length >= 2 ? allImages[1] : (allImages[0] ?? '');

      const row = [
        id,
        name,
        desc,
        availability,
        condition,
        formattedPrice,
        link,
        imageLink,
        brand,
        cat,
      ].map(csvCell).join(',');

      rows.push(row);
    });

    const csv = '\uFEFF' + rows.join('\r\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    console.error('[meta-feed-csv]', err.message);
    return new NextResponse('Feed generation failed', { status: 500 });
  }
}
