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
      const cat: string = d.cat ?? d.category ?? '';
      const desc: string = d.desc ?? d.description ?? name;
      const imgUrl: string = d.imgUrl ?? d.image_url ?? d.img1 ?? '';
      const badge: string = d.badge ?? '';

      // Skip products with no name or price
      if (!name || !price) return;

      const availability: string = d.availability ?? 'in_stock';
      const condition: string = d.condition ?? 'new';
      const brand: string = d.brand ?? 'YourSofer';
      const identifierExists: string = d.identifier_exists ?? 'no';
      const googleProductCategory: string = d.google_product_category ?? '';
      const material: string = d.material ?? '';
      const color: string = d.color ?? '';

      const link = `${SITE}/product/${id}`;
      const imageLink = imgUrl.startsWith('http') ? imgUrl : '';

      const additionalImages: string[] = (d.images ?? [])
        .filter((u: string) => u.startsWith('http') && u !== imageLink)
        .slice(0, 10);

      items.push(`    <item>
      <g:id>${esc(id)}</g:id>
      <g:title>${esc(name)}</g:title>
      <g:description>${esc(desc.slice(0, 5000))}</g:description>
      <g:link>${esc(link)}</g:link>
      ${imageLink ? `<g:image_link>${esc(imageLink)}</g:image_link>` : ''}
      ${additionalImages.map(u => `<g:additional_image_link>${esc(u)}</g:additional_image_link>`).join('\n      ')}
      <g:availability>${esc(availability)}</g:availability>
      <g:price>${price.toFixed(2)} ILS</g:price>
      ${d.was ? `<g:sale_price>${price.toFixed(2)} ILS</g:sale_price>` : ''}
      <g:brand>${esc(brand)}</g:brand>
      <g:condition>${esc(condition)}</g:condition>
      <g:identifier_exists>${esc(identifierExists)}</g:identifier_exists>
      ${googleProductCategory ? `<g:google_product_category>${esc(googleProductCategory)}</g:google_product_category>` : ''}
      ${cat ? `<g:product_type>${esc(cat)}</g:product_type>` : ''}
      ${material ? `<g:material>${esc(material)}</g:material>` : ''}
      ${color ? `<g:color>${esc(color)}</g:color>` : ''}
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
      <g:shipping>
        <g:country>US</g:country>
        <g:service>International Shipping</g:service>
        <g:price>50 ILS</g:price>
        <g:min_handling_time>1</g:min_handling_time>
        <g:max_handling_time>3</g:max_handling_time>
        <g:min_transit_time>7</g:min_transit_time>
        <g:max_transit_time>21</g:max_transit_time>
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
