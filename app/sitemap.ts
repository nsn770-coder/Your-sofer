import { MetadataRoute } from 'next';
import { OCCASIONS } from '@/data/occasions';

const BASE_URL = 'https://your-sofer.com';
const FIREBASE_PROJECT = 'your-sofer';
const FIREBASE_API_KEY = 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I';

async function getAllProductIds(): Promise<string[]> {
  try {
    const ids: string[] = [];
    let pageToken: string | undefined;
    do {
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/products?pageSize=300&key=${FIREBASE_API_KEY}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) break;
      const data = await res.json();
      (data.documents ?? []).forEach((doc: { name: string }) => {
        ids.push(doc.name.split('/').pop() as string);
      });
      pageToken = data.nextPageToken;
    } while (pageToken);
    return ids;
  } catch {
    return [];
  }
}

async function getActiveSoferIds(): Promise<string[]> {
  try {
    const body = {
      structuredQuery: {
        from: [{ collectionId: 'soferim' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'status' },
            op: 'EQUAL',
            value: { stringValue: 'active' },
          },
        },
        select: { fields: [{ fieldPath: 'name' }] },
        limit: 200,
      },
    };
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return [];
    const results = await res.json();
    return (results as Array<{ document?: { name: string } }>)
      .filter(r => r.document)
      .map(r => r.document!.name.split('/').pop() as string);
  } catch {
    return [];
  }
}

// All live top-level categories (matches MEGA_MENU_DATA in data/categoriesMenu.ts).
// Updated 2026-07-22 after the big catalog import (~6,000 products).
const CATEGORIES = [
  'בתי מזוזה',
  'יודאיקה',
  'כיפות',
  'סט טלית תפילין',
  'תיקי טלית ותפילין',
  'מתנות',
  'בר מצווה',
  'קלפי מזוזה',
  'טליתות וציציות',
  'מגילות',
  'ספרי תורה',
  'שבת',
  'תפילין קומפלט',
  'חגים',
  'תכשיטים',
  'מוצרי בית כנסת',
  'ספרי קודש וסידורים',
];

// All madrich (guide) pages — every app/madrich/*/page.tsx.
const MADRICH_SLUGS = [
  'bar-mitzva-tefillin', 'bar-mitzva-tfillin-tfilot', 'batei-mezuza', 'bdika-mezuzot',
  'bechira', 'bedika', 'behema-gasa', 'brachot-mezuza', 'chavilot-bar-mitzva',
  'dio-stam', 'faq', 'godel-mezuza', 'kesidran', 'klaf-ivduat-yad', 'klaf-meshurtat',
  'knia-online', 'kulmus', 'kviyas-mezuza', 'lamah-your-sofer', 'mah-kadai-mezuza',
  'matana-chanuka-bayit', 'mehudar', 'mezuza-asak', 'mezuza-yeladim', 'mezuza-zola',
  'michrei-soferim', 'mishloach-lachul', 'nosachim', 'otiyot-vetaguim', 'proyect-binyan',
  'rashi-rabenu-tam', 'sefer-torah', 'set-chatan', 'shema-israel', 'shuk',
  'sofer-ruach', 'soferim', 'tallit-tefillin', 'tefillin-itar', 'tefillin-nesia',
  'tefillin-perudot', 'tefillin-sfaradi', 'tehlich-ktiva', 'tikun-tefillin',
  'tiyug-stam', 'ultimate-faq', 'yirat-shamayim', 'ziyufei-stam',
  'sugei-kipot', 'kipot-le-eruim', 'sidur-tfila',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productIds, soferIds] = await Promise.all([getAllProductIds(), getActiveSoferIds()]);

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map(cat => ({
    url: `${BASE_URL}/category/${encodeURIComponent(cat)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL,                              lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/about`,                   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/faq`,                     lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE_URL}/contact`,                 lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/kashrut`,                 lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/bar-mitzva`,              lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/bar-mitzvah-kippot`,      lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${BASE_URL}/collections`,             lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/search`,                  lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.5 },
    { url: `${BASE_URL}/madrich`,                 lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    ...MADRICH_SLUGS.map(slug => ({
      url: `${BASE_URL}/madrich/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    { url: `${BASE_URL}/categories`,              lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE_URL}/event-kippot`,            lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
    ...['wedding', 'new-baby', 'new-home', 'shabbat-home', 'holidays', 'bar-mitzvah', 'reconnect'].map(m => ({
      url: `${BASE_URL}/moment/${m}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    { url: `${BASE_URL}/build`,                   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/gifts`,                   lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.85 },
    ...OCCASIONS.map(o => ({
      url: `${BASE_URL}/gifts/${o.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    { url: `${BASE_URL}/legal/shipping`,          lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/legal/returns`,           lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/legal/privacy`,           lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/legal/takanon`,           lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  const productRoutes: MetadataRoute.Sitemap = productIds.map((id) => ({
    url: `${BASE_URL}/product/${id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const soferRoutes: MetadataRoute.Sitemap = soferIds.map((id) => ({
    url: `${BASE_URL}/soferim/${id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...categoryRoutes, ...staticRoutes, ...productRoutes, ...soferRoutes];
}
