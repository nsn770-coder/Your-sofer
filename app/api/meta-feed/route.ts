import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const SITE = 'https://your-sofer.com';

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection('products').get();

    const items: string[] = [];

    snap.forEach(doc => {
      const d = doc.data();
      const id: string = doc.id;
      const name: string = d.name ?? '';
      const price: number = d.price ?? 0;
      const was: number | null = d.was ?? null;
      const cat: string = d.cat ?? d.category ?? '';
      const desc: string = d.desc ?? d.description ?? name;

      if (!name || !price) return;

      const availability: string = d.availability ?? 'in stock';
      const condition: string = d.condition ?? 'new';
      const brand: string = d.brand ?? 'YourSofer';

      const link = `${SITE}/product/${id}`;

      const CDN = 'https://res.cloudinary.com/dyxzq3ucy/image/upload/';
      const normalizeImg = (u: unknown): string | null => {
        if (!u || typeof u !== 'string' || !u.trim()) return null;
        return u.startsWith('http') ? u : CDN + u;
      };

      const allImages: string[] = [
        normalizeImg(d.imgUrl ?? d.image_url ?? d.img1),
        normalizeImg(d.imgUrl2 ?? d.img2),
        normalizeImg(d.imgUrl3 ?? d.img3),
        normalizeImg(d.imgUrl4),
      ].filter((u): u is string => u !== null);

      // Use AI-generated image (index 1) as primary when available, same as product page
      const imageLink = allImages.length >= 2 ? allImages[1] : (allImages[0] ?? '');
      const additionalImages: string[] =
        allImages.length >= 2
          ? [allImages[0], ...allImages.slice(2)]
          : [];

      items.push(`    <item>
      <id>${esc(id)}</id>
      <title>${esc(name)}</title>
      <description>${esc(desc.slice(0, 9999))}</description>
      <link>${esc(link)}</link>
      ${imageLink ? `<image_link>${esc(imageLink)}</image_link>` : ''}
      ${additionalImages.map(u => `<additional_image_link>${esc(u)}</additional_image_link>`).join('\n      ')}
      <availability>${esc(availability)}</availability>
      <condition>${esc(condition)}</condition>
      <price>${(was ?? price).toFixed(2)} ILS</price>
      ${was ? `<sale_price>${price.toFixed(2)} ILS</sale_price>` : ''}
      <brand>${esc(brand)}</brand>
      ${cat ? `<product_type>${esc(cat)}</product_type>` : ''}
    </item>`);
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Your Sofer — חנות סת"מ</title>
    <link>${SITE}</link>
    <description>מזוזות, תפילין, קלפים ויודאיקה מסופרים מוסמכים</description>
${items.join('\n')}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    console.error('[meta-feed]', err.message);
    return new NextResponse('Feed generation failed', { status: 500 });
  }
}
