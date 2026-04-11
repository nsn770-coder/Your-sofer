import { MetadataRoute } from 'next';

const BASE_URL = 'https://yoursofer.com';
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

const CATEGORIES = [
  'סט טלית תפילין', 'מזוזות', 'יודאיקה', 'כיסוי תפילין',
  'מתנות', 'מגילות', 'תפילין קומפלט', 'קלפי מזוזה',
  'קלפי תפילין', 'ספרי תורה',
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
    { url: `${BASE_URL}/madrich`,                 lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/madrich/bechira`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/madrich/bedika`,          lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/madrich/faq`,             lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/madrich/mehudar`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/madrich/mezuza-zola`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/madrich/shuk`,            lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/madrich/soferim`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/soferim`,                 lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.75 },
    { url: `${BASE_URL}/join`,                    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
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
