import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { effectivePrice } from '@/app/lib/utils';
import { googleCategoryFor, occasionLabelFor, priceBandFor } from '@/app/lib/feedCategories';

// B8: the response is streamed and cached at the CDN (s-maxage below) — a
// ~5,000-product catalog must not be rebuilt on every request.
export const dynamic = 'force-dynamic';

const SITE = 'https://your-sofer.com';
const CDN  = 'https://res.cloudinary.com/dyxzq3ucy/image/upload/';

// B1: required Meta catalog fields + custom labels.
// sale_price is A9-ready: populated only by the shared effectivePrice()
// (clearance/sale mechanisms) — NEVER derived from `was`.
const HEADERS = [
  'id', 'title', 'description', 'availability', 'condition',
  'price', 'sale_price', 'link', 'image_link', 'brand', 'product_type',
  'google_product_category',
  'custom_label_0', 'custom_label_1', 'custom_label_2', 'custom_label_3', 'custom_label_4',
];

function csvCell(val: string): string {
  const s = String(val ?? '').replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
}

// Cloudinary delivery transform for feed images: cap width + auto quality.
// Fixes Meta's 8MB image limit on heavy originals. Format is kept as-is
// (no f_auto) so Meta's fetcher always gets a stable jpg/png URL.
const IMG_TRANSFORM = 'w_1600,c_limit,q_auto';

function normalizeImg(u: unknown): string | null {
  if (!u || typeof u !== 'string' || !u.trim()) return null;
  const url = u.startsWith('http') ? u : CDN + u;
  // Inject the transform only for untransformed Cloudinary upload URLs
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/') && !/\/image\/upload\/[a-z]+_[^/]*\//.test(url)) {
    return url.replace('/image/upload/', `/image/upload/${IMG_TRANSFORM}/`);
  }
  return url;
}

export async function GET(req: Request) {
  try {
    const db = getAdminDb();

    // B6: custom_label_4 comes ONLY from the saved snapshot
    // (scripts/computeMetaCollections.mjs) — never computed per request.
    let collectionOf: Record<string, string> = {};
    try {
      const snapDoc = await db.collection('feedConfig').doc('metaCollectionsSnapshot').get();
      if (snapDoc.exists) collectionOf = snapDoc.data()?.assignments ?? {};
    } catch (e) {
      console.error('[meta-feed-csv] collections snapshot unavailable (non-fatal):', e);
    }

    const snap = await db.collection('products').get();

    const diag = new URL(req.url).searchParams.get('diag') === '1';
    const skipped: Record<string, number> = {};
    const skip = (reason: string) => { skipped[reason] = (skipped[reason] ?? 0) + 1; };
    let included = 0;

    const buildRows = (): string[] => {
      const rows: string[] = [HEADERS.join(',')];
      snap.forEach(doc => {
        const d  = doc.data();
        const id = doc.id;
        const name: string  = d.name ?? '';
        const price: number = typeof d.price === 'number' ? d.price : Number(d.price) || 0;

        // B2: same gate as the Google feed — active, not hidden, title, price > 0, image.
        if (d.hidden === true) return skip('hidden');
        if (d.status && d.status !== 'active') return skip(`status_${d.status}`);
        if (!name) return skip('missing_name');
        if (!(price > 0)) return skip('missing_or_zero_price');

        const allImages = [
          normalizeImg(d.imgUrl ?? d.image_url ?? d.img1),
          normalizeImg(d.imgUrl2 ?? d.img2),
          normalizeImg(d.imgUrl3 ?? d.img3),
          normalizeImg(d.imgUrl4),
        ].filter((u): u is string => u !== null);
        if (allImages.length === 0) return skip('missing_image');

        // B2: availability from the REAL stock fields (inStock/outOfStock).
        // The legacy `availability` field is stale — deliberately ignored.
        const out =
          d.outOfStock === true ||
          (typeof d.inStock === 'number' && d.inStock <= 0 && d.outOfStock !== undefined);
        const availability = out ? 'out of stock' : 'in stock';

        const cat: string    = d.cat ?? d.category ?? '';
        const sub: string    = d.subCategory ?? '';
        const desc: string   = (d.desc ?? d.description ?? name).slice(0, 9999);
        const condition      = d.condition ?? 'new';
        const brand          = d.brand ?? 'YourSofer';
        const link           = `${SITE}/product/${id}`;
        // AI-generated image (index 1) preferred as primary, same as product page
        const imageLink      = allImages.length >= 2 ? allImages[1] : allImages[0];

        // A9: sale_price only from the shared effectivePrice() — never from `was`.
        const eff = effectivePrice(d);
        const salePrice = eff > 0 && eff < price ? `${eff.toFixed(2)} ILS` : '';

        // B3: google_product_category — pre-computed doc field when present,
        // otherwise LIVE from cat + subCategory (covers new products instantly).
        const googleCat: string = d.google_product_category || googleCategoryFor(cat, sub);

        rows.push([
          id,
          name,
          desc,
          availability,
          condition,
          `${price.toFixed(2)} ILS`,
          salePrice,
          link,
          imageLink,
          brand,
          sub ? `${cat} > ${sub}` : cat,        // product_type
          googleCat,
          cat,                                   // custom_label_0 — main category
          sub,                                   // custom_label_1 — subcategory
          occasionLabelFor(cat, sub, name),      // custom_label_2 — audience/occasion
          priceBandFor(price),                   // custom_label_3 — price band
          collectionOf[id] ?? '',                // custom_label_4 — advertising collection (snapshot)
        ].map(csvCell).join(','));
        included++;
      });
      return rows;
    };

    if (diag) {
      buildRows();
      return NextResponse.json({
        totalDocs: snap.size,
        includedInFeed: included,
        skipped,
        skippedTotal: Object.values(skipped).reduce((a, b) => a + b, 0),
        collectionsSnapshotProducts: Object.keys(collectionOf).length,
        generatedAt: new Date().toISOString(),
      });
    }

    // B8/B9: stream the CSV (UTF-8 BOM + CRLF, proper quoting) in chunks so a
    // ~5,000-row body never buffers as one giant string write.
    const encoder = new TextEncoder();
    const rows = buildRows();
    const CHUNK = 500;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([0xEF, 0xBB, 0xBF])); // UTF-8 BOM — Hebrew in Excel/Meta
        for (let i = 0; i < rows.length; i += CHUNK) {
          controller.enqueue(encoder.encode(rows.slice(i, i + CHUNK).join('\r\n') + '\r\n'));
        }
        controller.close();
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        // CDN caches for an hour and serves stale while revalidating — Meta's
        // scheduled fetches hit the cache, not a fresh 5K-product Firestore read.
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (err: any) {
    console.error('[meta-feed-csv]', err.message);
    return new NextResponse('Feed generation failed', { status: 500 });
  }
}
