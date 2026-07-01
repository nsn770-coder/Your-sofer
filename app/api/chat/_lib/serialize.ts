// Shared mapping from our Firestore documents to the JSON shapes defined in the
// chat-assistant integration spec (CLIENT_INTEGRATION.md). Kept in one place so
// /products, /products/[id], /orders, /orders/[number], /orders/recent all agree
// on field names.

const SITE = 'https://your-sofer.com';
const CDN = 'https://res.cloudinary.com/dyxzq3ucy/image/upload/';

type Doc = Record<string, unknown>;

function normalizeImg(u: unknown): string | null {
  if (!u || typeof u !== 'string' || !u.trim()) return null;
  return u.startsWith('http') ? u : CDN + u;
}

// ── Products ─────────────────────────────────────────────────────────────────

// A product is eligible to be shown to the chat assistant at all — mirrors the
// same visibility rules used by /api/google-feed.
export function isVisibleProduct(d: Doc): boolean {
  if (!d) return false;
  if (d.hidden === true) return false;
  if (d.status === 'inactive' || d.status === 'draft') return false;
  if (!d.name) return false;
  if (d.price == null) return false;
  return true;
}

// Whether a visible product is currently purchasable. Mirrors the actual
// add-to-cart gate on the live product page (app/product/[id]/ProductClient.tsx),
// which only checks `outOfStock`. The numeric `inStock` field is a separate
// internal warehouse count (often 0 for products that aren't unit-tracked) and is
// NOT used to gate purchases on the site, so it must not be used here either —
// otherwise most of the catalog would incorrectly show as unavailable.
export function isInStock(d: Doc): boolean {
  if (d.outOfStock === true) return false;
  if (d.available === false) return false;
  if (d.stockStatus === 'out_of_stock') return false;
  if (d.availability === 'out_of_stock') return false;
  return true;
}

export interface ChatProductDetail {
  label: string;
  value: string;
}

export interface ChatProduct {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url: string | null;
  product_type: string;
  tags: string[];
  in_stock: boolean;
  price: string;
  currency: string;
  details?: ChatProductDetail[];
}

export function serializeProduct(
  id: string,
  d: Doc,
  opts: { withDetails?: boolean } = {},
): ChatProduct {
  const name = String(d.name ?? '');
  const price = Number(d.price ?? 0);
  const cat = String(d.cat ?? d.category ?? '');
  const desc = String(d.desc ?? d.description ?? '');
  const badge = d.badge ? String(d.badge) : null;
  const styleTag = Array.isArray(d.styleTag) ? (d.styleTag as unknown[]).map(String) : [];

  const image =
    normalizeImg(d.imgUrl) ??
    normalizeImg(d.image_url) ??
    normalizeImg(d.img1) ??
    normalizeImg(d.imgUrl2) ??
    normalizeImg(d.img2) ??
    normalizeImg(d.imgUrl3) ??
    normalizeImg(d.img3) ??
    null;

  const tags = [badge, ...styleTag].filter((t): t is string => Boolean(t));

  const product: ChatProduct = {
    id,
    title: name,
    description: desc,
    url: `${SITE}/product/${id}`,
    image_url: image,
    product_type: cat,
    tags,
    in_stock: isInStock(d),
    price: price.toFixed(2),
    currency: 'ILS',
  };

  if (opts.withDetails) {
    const details: ChatProductDetail[] = [];
    if (d.level) details.push({ label: 'רמת הידור', value: String(d.level) });
    if (d.nusach) details.push({ label: 'נוסח', value: String(d.nusach) });
    if (d.subCategory) details.push({ label: 'תת-קטגוריה', value: String(d.subCategory) });
    if (d.sofer || d.soferName) details.push({ label: 'סופר', value: String(d.soferName ?? d.sofer) });
    if (details.length) product.details = details;
  }

  return product;
}

export function extractTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s,.\-!?'"()[\]/]+/)
    .filter((w) => w.length >= 2);
}

// Relevance score for search — matches on name / category / tags / description,
// weighted roughly the same way the existing Shira chatbot's search does.
export function scoreProduct(d: Doc, terms: string[]): number {
  if (terms.length === 0) return 0;
  const name = String(d.name ?? '').toLowerCase();
  const cat = String(d.cat ?? d.category ?? '').toLowerCase();
  const desc = String(d.desc ?? d.description ?? '').toLowerCase();
  const styleTag = Array.isArray(d.styleTag) ? (d.styleTag as unknown[]).map(String) : [];
  const tags = [d.badge, d.lookTag, d.collection, ...styleTag]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let score = 0;
  for (const term of terms) {
    if (name.includes(term)) score += 5;
    if (cat.includes(term)) score += 4;
    if (tags.includes(term)) score += 2;
    if (desc.includes(term)) score += 1;
  }
  return score;
}

// ── Orders ───────────────────────────────────────────────────────────────────

function tsToISODate(ts: unknown): string {
  if (!ts) return '';
  if (typeof ts === 'string') {
    const parsed = new Date(ts);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
  }
  const maybeToDate = (ts as { toDate?: () => Date }).toDate;
  if (typeof maybeToDate === 'function') return maybeToDate.call(ts).toISOString().slice(0, 10);
  const seconds = (ts as { seconds?: number }).seconds;
  if (typeof seconds === 'number') return new Date(seconds * 1000).toISOString().slice(0, 10);
  return '';
}

// Our internal lifecycle lives in a single `status` field (see app/lib/orderStatus.ts)
// rather than the separate financial/fulfillment split the assistant expects, so we
// translate here. Every status reachable only after a successful Sumit charge maps to
// financial_status "paid" — this mirrors isPaidOrder() in app/lib/orderStatus.ts.
const PAID_LIKE = new Set([
  'paid', 'magiah', 'sofer', 'packing', 'shipped', 'delivered', 'completed', 'needs_care', 'abandoned',
]);
const FULFILLED_LIKE = new Set(['shipped', 'delivered', 'completed']);

function mapFinancialStatus(status: string | undefined): string {
  if (!status) return 'pending';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'refunded') return 'refunded';
  if (status === 'pending_payment') return 'pending';
  if (PAID_LIKE.has(status)) return 'paid';
  return 'pending';
}

function mapFulfillmentStatus(status: string | undefined): string {
  if (status && FULFILLED_LIKE.has(status)) return 'fulfilled';
  return 'unfulfilled';
}

export interface ChatOrderLine {
  title: string;
  quantity: number;
  variant_title?: string;
}

export interface ChatOrder {
  number: string;
  created_at: string;
  financial_status: string;
  fulfillment_status: string;
  total: string;
  customer_phone: string;
  customer_email?: string;
  lines?: ChatOrderLine[];
}

export function serializeOrder(d: Doc): ChatOrder {
  const status = d.status as string | undefined;
  const total = Number(d.total ?? 0);
  const items = Array.isArray(d.items) ? (d.items as Doc[]) : [];

  const order: ChatOrder = {
    number: String(d.orderNumber ?? ''),
    created_at: tsToISODate(d.createdAt),
    financial_status: mapFinancialStatus(status),
    fulfillment_status: mapFulfillmentStatus(status),
    total: `${total.toFixed(2)} ILS`,
    customer_phone: String(d.phone ?? ''),
  };

  if (d.email) order.customer_email = String(d.email);

  if (items.length) {
    order.lines = items
      .filter((i) => !i.isGift)
      .map((i) => ({
        title: String(i.name ?? i.productName ?? ''),
        quantity: Number(i.quantity ?? 1),
        ...(i.selectedKlafName ? { variant_title: String(i.selectedKlafName) } : {}),
      }));
  }

  return order;
}
