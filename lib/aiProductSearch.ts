import { getAdminDb } from '@/lib/firebaseAdmin';

export interface AiProductKnowledge {
  productId: string;
  name: string;
  category: string;
  price: number;
  salePrice?: number | null;
  description: string;
  shortDescription: string;
  useCases: string[];
  targetAudience: string[];
  tags: string[];
  customizationOptions?: string[] | null;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  productUrl: string;
  imageUrl: string;
  updatedAt: Date;
}

export interface SearchResult {
  productId: string;
  name: string;
  price: number;
  salePrice?: number | null;
  category: string;
  productUrl: string;
  imageUrl: string;
  description: string;
}

const CAT_USE_CASES: Record<string, string[]> = {
  'קלפי מזוזה': ['מזוזה', 'קידוש הבית', 'מתנה לחג', 'בית חדש', 'הכנסת מזוזה'],
  'מזוזות': ['מזוזה', 'קידוש הבית', 'מתנה לחג', 'בית חדש', 'הכנסת מזוזה'],
  'תפילין קומפלט': ['תפילין', 'בר מצווה', 'מתנה לבר מצווה', 'תפילה', 'בן מצווה'],
  'מגילות': ['מגילת אסתר', 'פורים', 'מתנה', 'בית כנסת'],
  'ספרי תורה': ['ספר תורה', 'בית כנסת', 'הקמת בית כנסת', 'תרומה'],
  'כיפות': ['כיפה', 'בר מצווה', 'חתונה', 'מתנה', 'אביזרי ראש', 'כיפות לאירוע'],
  'כיפות סרוגות': ['כיפה', 'בר מצווה', 'מתנה', 'סרוגה'],
  'הדפסה על כיפות': ['כיפה', 'הדפסה', 'בר מצווה', 'חתונה', 'מתנה', 'עם לוגו', 'מותאם אישית'],
  'טליתות': ['טלית', 'בר מצווה', 'חתונה', 'תפילה', 'מתנה דתית'],
  'כיסויי חלה': ['הפרשת חלה', 'שבת', 'יום טוב', 'מתנת כלה', 'חתונה', 'מתנה', 'ערכת כלה'],
  'פמוטים': ['שבת', 'יום טוב', 'מתנת כלה', 'חתונה', 'מתנה'],
  'תיקי תפילין': ['תפילין', 'בר מצווה', 'מתנה', 'אביזרים', 'בן מצווה'],
  'ערכות הפרשת חלה': ['הפרשת חלה', 'שבת', 'מתנת כלה', 'חתונה', 'מתנה', 'ערכת כלה'],
  'סידורים': ['תפילה', 'סידור', 'מתנה', 'בר מצווה', 'בת מצווה'],
};

const CAT_AUDIENCE: Record<string, string[]> = {
  'קלפי מזוזה': ['משפחות', 'דתיים', 'מסורתיים', 'רוכשי בתים'],
  'מזוזות': ['משפחות', 'דתיים', 'מסורתיים'],
  'תפילין קומפלט': ['נערים', 'בני מצווה', 'משפחות', 'מתחזקים', 'גברים'],
  'כיפות': ['גברים', 'ילדים', 'בני מצווה', 'כלות וחתנים', 'ארגוני אירועים'],
  'כיפות סרוגות': ['גברים', 'ילדים', 'בני מצווה'],
  'הדפסה על כיפות': ['ארגוני אירועים', 'בני מצווה', 'חתנים'],
  'טליתות': ['גברים', 'בני מצווה', 'מסורתיים', 'דתיים'],
  'כיסויי חלה': ['נשים', 'כלות', 'משפחות', 'אוהבי שבת'],
  'פמוטים': ['נשים', 'כלות', 'משפחות', 'אוהבי שבת', 'מעצבי בתים'],
  'ערכות הפרשת חלה': ['נשים', 'כלות', 'משפחות'],
};

// Events → relevant categories for bundle suggestions
export const EVENT_CATEGORIES: Record<string, string[]> = {
  'בר מצווה': ['תפילין קומפלט', 'כיפות', 'טליתות', 'תיקי תפילין'],
  'חתונה': ['כיפות', 'הדפסה על כיפות', 'כיסויי חלה', 'פמוטים', 'ערכות הפרשת חלה'],
  'הפרשת חלה': ['כיסויי חלה', 'ערכות הפרשת חלה', 'פמוטים'],
  'בית חדש': ['קלפי מזוזה', 'מזוזות'],
};

// Cross-sell map: primary category → suggest adding these
export const CROSS_SELL: Record<string, string[]> = {
  'כיפות': ['הדפסה על כיפות', 'טליתות'],
  'כיפות סרוגות': ['הדפסה על כיפות', 'טליתות'],
  'כיסויי חלה': ['פמוטים', 'ערכות הפרשת חלה'],
  'ערכות הפרשת חלה': ['כיסויי חלה', 'פמוטים'],
  'תפילין קומפלט': ['תיקי תפילין', 'טליתות', 'סידורים'],
  'טליתות': ['תפילין קומפלט', 'תיקי תפילין'],
};

export function buildAiKnowledgeDoc(
  productId: string,
  p: Record<string, unknown>,
): AiProductKnowledge {
  const cat = String(p.cat || p.category || '');
  const isOutOfStock =
    Boolean(p.outOfStock) || p.stockStatus === 'out_of_stock';
  const stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = isOutOfStock
    ? 'out_of_stock'
    : p.stockStatus === 'low_stock'
    ? 'low_stock'
    : 'in_stock';

  const tags: string[] = [
    ...((p.styleTag as string[] | undefined) ?? []),
    p.lookTag as string | undefined,
    p.collection as string | undefined,
    p.level as string | undefined,
    p.nusach as string | undefined,
    p.subCategory as string | undefined,
  ].filter((t): t is string => Boolean(t));

  const desc = String(p.desc || p.description || '');

  return {
    productId,
    name: String(p.name || ''),
    category: cat,
    price: Number(p.price || 0),
    salePrice: p.clearanceSalePrice
      ? Number(p.clearanceSalePrice)
      : p.was
      ? Number(p.was)
      : null,
    description: desc,
    shortDescription: desc.slice(0, 150),
    useCases: CAT_USE_CASES[cat] ?? [],
    targetAudience: CAT_AUDIENCE[cat] ?? [],
    tags,
    customizationOptions: null,
    stockStatus,
    productUrl: `https://yoursofer.com/product/${productId}`,
    imageUrl: String(p.imgUrl || p.image_url || ''),
    updatedAt: new Date(),
  };
}

export interface SearchOptions {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

export async function searchAiKnowledge(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const limit = options.limit ?? 3;
  const db = getAdminDb();

  try {
    const snap = await db.collection('aiProductKnowledge').limit(300).get();

    if (snap.empty) {
      return fallbackToProducts(query, options);
    }

    let docs = snap.docs.map((d) => d.data() as AiProductKnowledge);

    // Filter out-of-stock and hidden
    docs = docs.filter((d) => d.stockStatus !== 'out_of_stock');

    // Category filter
    if (options.category) {
      docs = docs.filter((d) => d.category === options.category);
    }

    // Price filter
    if (options.minPrice != null) {
      docs = docs.filter((d) => d.price >= options.minPrice!);
    }
    if (options.maxPrice != null) {
      docs = docs.filter((d) => d.price <= options.maxPrice!);
    }

    if (docs.length === 0) {
      return fallbackToProducts(query, options);
    }

    const terms = extractTerms(query);
    const scored = docs
      .map((d) => ({ doc: d, score: scoreDoc(d, terms) }))
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(({ doc: d }) => toSearchResult(d));
  } catch (err) {
    console.error('[aiProductSearch] searchAiKnowledge error:', err);
    return fallbackToProducts(query, options);
  }
}

async function fallbackToProducts(
  query: string,
  options: SearchOptions,
): Promise<SearchResult[]> {
  const limit = options.limit ?? 3;
  const db = getAdminDb();

  try {
    let q = db.collection('products').where('status', '==', 'active');
    if (options.category) q = (q as ReturnType<typeof db.collection>).where('cat', '==', options.category);
    const snap = await q.limit(50).get();

    type RawDoc = { id: string } & Record<string, unknown>;
    let docs: RawDoc[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Record<string, unknown>),
    }));

    if (options.minPrice != null) {
      docs = docs.filter((d) => Number(d.price ?? 0) >= options.minPrice!);
    }
    if (options.maxPrice != null) {
      docs = docs.filter((d) => Number(d.price ?? 0) <= options.maxPrice!);
    }

    const terms = extractTerms(query);
    return docs
      .map((d) => ({ doc: d, score: scoreRaw(d, terms) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ doc: d }) => ({
        productId: String(d.id),
        name: String(d.name ?? ''),
        price: Number(d.price ?? 0),
        salePrice: d.clearanceSalePrice
          ? Number(d.clearanceSalePrice)
          : d.was
          ? Number(d.was)
          : null,
        category: String(d.cat ?? ''),
        productUrl: `https://yoursofer.com/product/${d.id}`,
        imageUrl: String(d.imgUrl ?? d.image_url ?? ''),
        description: String(d.desc ?? d.description ?? '').slice(0, 150),
      }));
  } catch {
    return [];
  }
}

function toSearchResult(d: AiProductKnowledge): SearchResult {
  return {
    productId: d.productId,
    name: d.name,
    price: d.price,
    salePrice: d.salePrice,
    category: d.category,
    productUrl: d.productUrl,
    imageUrl: d.imageUrl,
    description: d.shortDescription,
  };
}

function extractTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s,.\-!?'"()\[\]\/]+/)
    .filter((w) => w.length >= 2);
}

function scoreDoc(doc: AiProductKnowledge, terms: string[]): number {
  let score = 0;
  const name = doc.name.toLowerCase();
  const cat = doc.category.toLowerCase();
  const desc = doc.description.toLowerCase();

  for (const term of terms) {
    if (name.includes(term)) score += 5;
    if (cat.includes(term)) score += 4;
    if (doc.useCases.some((u) => u.toLowerCase().includes(term))) score += 3;
    if (doc.targetAudience.some((a) => a.toLowerCase().includes(term))) score += 2;
    if (doc.tags.some((t) => t.toLowerCase().includes(term))) score += 2;
    if (desc.includes(term)) score += 1;
  }
  return score;
}

function scoreRaw(doc: Record<string, unknown>, terms: string[]): number {
  let score = 0;
  const name = String(doc.name ?? '').toLowerCase();
  const cat = String(doc.cat ?? '').toLowerCase();
  const desc = String(doc.desc ?? doc.description ?? '').toLowerCase();
  const tags = ((doc.styleTag as string[] | undefined) ?? [])
    .join(' ')
    .toLowerCase();

  for (const term of terms) {
    if (name.includes(term)) score += 5;
    if (cat.includes(term)) score += 4;
    if (tags.includes(term)) score += 2;
    if (desc.includes(term)) score += 1;
  }
  return score;
}
