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
      const cat: string = d.cat ?? 'יודאיקה';
      const desc: string = d.desc ?? d.description ?? name;
      const imgUrl: string = d.imgUrl ?? d.image_url ?? d.img1 ?? '';
      const badge: string = d.badge ?? '';

      // Skip products with no name or price
      if (!name || !price) return;

      const availability = 'in stock';
      const condition = 'new';
      const brand = 'Your Sofer';
      const link = `${SITE}/product/${id}`;
      const imageLink = imgUrl.startsWith('http') ? imgUrl : '';

      // Map internal category to Google product category (best-effort)
      const googleCat = cat.includes('תפילין')
        ? 'Religious &amp; Ceremonial > Religious Items'
        : cat.includes('מזוזה') || cat.includes('מזוזות')
        ? 'Religious &amp; Ceremonial > Religious Items'
        : 'Religious &amp; Ceremonial > Religious Items';

      items.push(`    <item>
      <g:id>${esc(id)}</g:id>
      <g:title>${esc(name)}</g:title>
      <g:description>${esc(desc.slice(0, 5000))}</g:description>
      <g:link>${esc(link)}</g:link>
      ${imageLink ? `<g:image_link>${esc(imageLink)}</g:image_link>` : ''}
      <g:availability>${availability}</g:availability>
      <g:price>${price.toFixed(2)} ILS</g:price>
      ${d.was ? `<g:sale_price>${price.toFixed(2)} ILS</g:sale_price>` : ''}
      <g:brand>${brand}</g:brand>
      <g:condition>${condition}</g:condition>
      <g:google_product_category>${googleCat}</g:google_product_category>
      <g:product_type>${esc(cat)}</g:product_type>
      ${badge ? `<g:custom_label_0>${esc(badge)}</g:custom_label_0>` : ''}
      <g:shipping>
        <g:country>IL</g:country>
        <g:service>משלוח רגיל</g:service>
        <g:price>0 ILS</g:price>
        <g:min_handling_time>1</g:min_handling_time>
        <g:max_handling_time>3</g:max_handling_time>
        <g:min_transit_time>3</g:min_transit_time>
        <g:max_transit_time>11</g:max_transit_time>
      </g:shipping>
    </item>`);
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
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
    console.error('[google-feed]', err.message);
    return new NextResponse('Feed generation failed', { status: 500 });
  }
}
