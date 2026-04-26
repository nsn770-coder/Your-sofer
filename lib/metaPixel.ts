/* Meta Pixel (Facebook Pixel) — browser-only helpers
   Pixel ID is read from NEXT_PUBLIC_META_PIXEL_ID at build time. */

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq: (...args: any[]) => void;
    _fbq?: unknown;
  }
}

function fbq(command: string, event: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq(command, event, params);
  }
}

// ── Core ──────────────────────────────────────────────────────────────────────

export function pageview() {
  fbq('track', 'PageView');
}

export function event(name: string, options?: Record<string, unknown>) {
  fbq('track', name, options);
}

// ── Ecommerce ─────────────────────────────────────────────────────────────────

export interface PixelProduct {
  id: string;
  name: string;
  price: number;
  category?: string;
  quantity?: number;
}

export function viewContent(product: PixelProduct) {
  fbq('track', 'ViewContent', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    contents: [{ id: product.id, quantity: product.quantity ?? 1 }],
    value: product.price,
    currency: 'ILS',
  });
}

export function addToCart(product: PixelProduct) {
  fbq('track', 'AddToCart', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    contents: [{ id: product.id, quantity: product.quantity ?? 1 }],
    value: product.price * (product.quantity ?? 1),
    currency: 'ILS',
  });
}

export interface PixelCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export function initiateCheckout(items: PixelCartItem[], total: number) {
  fbq('track', 'InitiateCheckout', {
    content_ids: items.map(i => i.id),
    contents: items.map(i => ({ id: i.id, quantity: i.quantity })),
    num_items: items.reduce((s, i) => s + i.quantity, 0),
    value: total,
    currency: 'ILS',
  });
}

export function purchase(orderId: string, items: PixelCartItem[], total: number) {
  fbq('track', 'Purchase', {
    content_ids: items.map(i => i.id),
    contents: items.map(i => ({ id: i.id, quantity: i.quantity })),
    content_type: 'product',
    value: total,
    currency: 'ILS',
    order_id: orderId,
  });
}

// ── Lead & Search ─────────────────────────────────────────────────────────────

export function lead(data?: { content_name?: string; value?: number }) {
  fbq('track', 'Lead', { currency: 'ILS', ...data });
}

export function search(query: string) {
  fbq('track', 'Search', { search_string: query });
}
