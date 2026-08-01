import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminToken } from '@/lib/verifyAdmin';
import { algoliasearch } from 'algoliasearch';

export const dynamic     = 'force-dynamic';
export const maxDuration = 60;

const algoliaClient = (() => {
  const appId = process.env.ALGOLIA_APP_ID    ?? '';
  const key   = process.env.ALGOLIA_ADMIN_KEY ?? '';
  return appId && key ? algoliasearch(appId, key) : null;
})();

export async function POST(req: NextRequest) {
  try {
    const adminDb = getAdminDb();

    // ── auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }
    if (!(await verifyAdminToken(idToken))) {
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 });
    }

    if (!algoliaClient) {
      return NextResponse.json({ error: 'Algolia not configured' }, { status: 500 });
    }

    // ── sync products ─────────────────────────────────────────────────────────
    const snap = await adminDb.collection('products').get();

    const records: Record<string, unknown>[] = [];
    for (const doc of snap.docs) {
      const d = doc.data();
      if (d.status !== 'active' || d.hidden === true || d.eventsOnly === true) continue;

      const inStockRaw = d.inStock;
      const outOfStock = d.outOfStock === true;
      const inStock    = !outOfStock && (inStockRaw === true || (typeof inStockRaw === 'number' && inStockRaw > 0));
      const createdAt  = (d.createdAt as { seconds?: number } | null)?.seconds ?? 0;

      records.push({
        objectID:    doc.id,
        id:          doc.id,
        name:        d.name        || '',
        sku:         d.sku         || '',
        price:       typeof d.price === 'number' ? d.price : 0,
        cat:         d.cat         || d.category    || '',
        subCategory: d.subCategory || d.subcategory || '',
        image:       d.imgUrl      || d.image_url   || '',
        description: ((d.desc || d.description || '') as string).slice(0, 500),
        styleTag:    Array.isArray(d.styleTag) ? d.styleTag : [],
        lookTag:     d.lookTag    || '',
        collection:  d.collection || '',
        soferName:   d.soferName  || '',
        inStock,
        createdAt,
        isBestSeller: d.isBestSeller === true,
        badge:        d.badge        ?? null,
        was:          typeof d.was === 'number' ? d.was : null,
        priority:     typeof d.priority === 'number' ? d.priority : 0,
        outOfStock:   d.outOfStock === true,
      });
    }

    // setSettings before replaceAllObjects so the temp index inherits them
    await algoliaClient.setSettings({
      indexName: 'products',
      indexSettings: {
        searchableAttributes:   ['name', 'cat', 'subCategory', 'sku', 'styleTag', 'lookTag', 'collection', 'description'],
        attributesForFaceting:  ['cat', 'subCategory', 'filterOnly(inStock)', 'price'],
        attributesToRetrieve:   ['*'],
        queryLanguages:         ['he'],
        indexLanguages:         ['he'],
        ignorePlurals:          true,
        removeWordsIfNoResults: 'allOptional',
        minWordSizefor1Typo:    3,
        minWordSizefor2Typos:   6,
        replicas: ['products_price_asc', 'products_price_desc', 'products_newest'],
      },
    });

    await algoliaClient.setSettings({ indexName: 'products_price_asc',  indexSettings: { ranking: ['asc(price)',   'typo','geo','words','filters','proximity','attribute','exact','custom'] } });
    await algoliaClient.setSettings({ indexName: 'products_price_desc', indexSettings: { ranking: ['desc(price)',  'typo','geo','words','filters','proximity','attribute','exact','custom'] } });
    await algoliaClient.setSettings({ indexName: 'products_newest',     indexSettings: { ranking: ['desc(createdAt)', 'typo','geo','words','filters','proximity','attribute','exact','custom'] } });

    await algoliaClient.replaceAllObjects({ indexName: 'products', objects: records });

    // ── sync categories ───────────────────────────────────────────────────────
    const catSnap = await adminDb.collection('categories').get();
    const catRecords = catSnap.docs.map(doc => {
      const d = doc.data();
      return {
        objectID:    doc.id,
        name:        doc.id,
        displayName: d.displayName || d.name || doc.id,
        slug:        d.slug        || '',
        priority:    d.priority    ?? 99,
      };
    });

    await algoliaClient.replaceAllObjects({ indexName: 'categories', objects: catRecords });
    await algoliaClient.setSettings({
      indexName: 'categories',
      indexSettings: {
        searchableAttributes: ['name', 'displayName'],
        queryLanguages:       ['he'],
        indexLanguages:       ['he'],
      },
    });

    return NextResponse.json({
      success:    true,
      products:   records.length,
      categories: catRecords.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[algolia-resync]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
