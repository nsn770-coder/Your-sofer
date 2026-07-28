import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { effectivePrice } from '@/app/lib/utils';

export const dynamic = 'force-dynamic';

const SITE = 'https://your-sofer.com';

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Apparel categories that require color, gender, age_group
const APPAREL_CATS = new Set([
  'כיפות',
  'טליתות וציציות',
  'סט טלית תפילין',
]);

const COLOR_MAP: Record<string, string> = {
  'שחור': 'Black',
  'לבן': 'White',
  'כחול': 'Blue',
  'אדום': 'Red',
  'חום': 'Brown',
  'אפור': 'Gray',
  'זהב': 'Gold',
  'כסף': 'Silver',
  'ירוק': 'Green',
  'סגול': 'Purple',
  'צבעוני': 'Multicolor',
  'בורדו': 'Burgundy',
  'בז': 'Beige',
  'נייבי': 'Navy',
};

function resolveColor(d: Record<string, unknown>): string {
  if (d.color && typeof d.color === 'string' && (d.color as string).trim()) {
    return (d.color as string).trim();
  }
  const name = ((d.name ?? d.title ?? '') as string).toLowerCase();
  for (const [heb, eng] of Object.entries(COLOR_MAP)) {
    if (name.includes(heb)) return eng;
  }
  return 'Multicolor';
}

function getGender(_cat: string): string {
  return 'male';
}

export async function GET(req: Request) {
  try {
    const db = getAdminDb();
    const snap = await db.collection('products').get();

    const items: string[] = [];
    // Diagnostics: skip counts by reason (exposed via ?diag=1)
    const skipped: Record<string, number> = {};
    const seenIds = new Set<string>();
    let duplicateIds = 0;
    const skip = (reason: string) => { skipped[reason] = (skipped[reason] ?? 0) + 1; };

    snap.forEach(doc => {
      const d = doc.data();
      const id: string = doc.id;
      const name: string = d.name ?? '';
      const price: number = typeof d.price === 'number' ? d.price : Number(d.price) || 0;
      const cat: string = d.cat ?? d.category ?? '';
      const desc: string = d.desc ?? d.description ?? name;
      const badge: string = d.badge ?? '';

      // Skip hidden products
      if (d.hidden === true) return skip('hidden');
      // Whitelist statuses: only 'active' or legacy products with no status
      // (previously a blacklist — 'rejected'/'pending' products leaked into the feed)
      if (d.status && d.status !== 'active') return skip(`status_${d.status}`);

      // Skip products with no name or price
      if (!name) return skip('missing_name');
      if (!price) return skip('missing_or_zero_price');

      // Guard against duplicate ids (should not happen with doc.id, but track it)
      if (seenIds.has(id)) { duplicateIds++; return skip('duplicate_id'); }
      seenIds.add(id);

      const availability: string = d.availability ?? 'in_stock';
      const condition: string = d.condition ?? 'new';
      const brand: string = d.brand ?? 'YourSofer';
      const identifierExists: string = d.identifier_exists ?? 'no';
      const googleProductCategory: string = d.google_product_category ?? '';
      const material: string = d.material ?? '';
      const color: string = d.color ?? '';

      const link = `${SITE}/product/${id}`;

      // Build ordered image list from all known image fields
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

      // Skip products with no image
      if (allImages.length === 0) return skip('missing_image');

      const imageLink = allImages[0];
      const additionalImages: string[] = allImages.slice(1);

      items.push(`    <item>
      <g:id>${esc(id)}</g:id>
      <g:title>${esc(name)}</g:title>
      <g:description>${esc(desc.slice(0, 5000))}</g:description>
      <g:link>${esc(link)}</g:link>
      ${imageLink ? `<g:image_link>${esc(imageLink)}</g:image_link>` : ''}
      ${additionalImages.map(u => `<g:additional_image_link>${esc(u)}</g:additional_image_link>`).join('\n      ')}
      <g:availability>${esc(availability)}</g:availability>
      <g:price>${price.toFixed(2)} ILS</g:price>
      ${(() => { const eff = effectivePrice(d); return eff > 0 && eff < price ? `<g:sale_price>${eff.toFixed(2)} ILS</g:sale_price>` : ''; })()}
      <g:brand>${esc(brand)}</g:brand>
      <g:condition>${esc(condition)}</g:condition>
      <g:identifier_exists>${esc(identifierExists)}</g:identifier_exists>
      ${googleProductCategory ? `<g:google_product_category>${esc(googleProductCategory)}</g:google_product_category>` : ''}
      ${cat ? `<g:product_type>${esc(cat)}</g:product_type>` : ''}
      ${material ? `<g:material>${esc(material)}</g:material>` : ''}
      ${APPAREL_CATS.has(cat) ? `<g:color>${esc(resolveColor(d))}</g:color>` : (color ? `<g:color>${esc(color)}</g:color>` : '')}
      ${d.size ? `<g:size>${esc(d.size as string)}</g:size>` : ''}
      ${APPAREL_CATS.has(cat) ? `<g:gender>${getGender(cat)}</g:gender>` : ''}
      ${APPAREL_CATS.has(cat) ? `<g:age_group>adult</g:age_group>` : ''}
      ${badge ? `<g:custom_label_0>${esc(badge)}</g:custom_label_0>` : ''}
      <g:shipping>
        <g:country>IL</g:country>
        <g:service>משלוח עד הבית</g:service>
        <g:price>30 ILS</g:price>
        <g:min_handling_time>1</g:min_handling_time>
        <g:max_handling_time>2</g:max_handling_time>
        <g:min_transit_time>5</g:min_transit_time>
        <g:max_transit_time>8</g:max_transit_time>
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

    // Diagnostics mode: /api/google-feed?diag=1 returns counts instead of XML.
    // Exposes aggregate counts only (no product data beyond what's already public).
    if (new URL(req.url).searchParams.get('diag') === '1') {
      return NextResponse.json({
        totalDocs: snap.size,
        includedInFeed: items.length,
        skipped,
        skippedTotal: Object.values(skipped).reduce((a, b) => a + b, 0),
        duplicateIds,
        generatedAt: new Date().toISOString(),
      });
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Your Sofer — אתר היודאיקה הגדול בישראל</title>
    <link>${SITE}</link>
    <description>כיפות בעיצוב אישי, מזכרות ומתנות לאירועים, תשמישי קדושה ויודאיקה לבית היהודי</description>
${items.join('\n')}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        // הפיד מיועד למרצ'נט בלבד — לא לאינדוקס בחיפוש (מנע snippet "חנות סת"מ")
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (err: any) {
    console.error('[google-feed]', err.message);
    return new NextResponse('Feed generation failed', { status: 500 });
  }
}
