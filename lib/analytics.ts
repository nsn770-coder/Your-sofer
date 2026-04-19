/* GA4 analytics helpers — gtag ID: G-PM7GW4MWEJ */

type GtagItem = {
  item_id: string;
  item_name: string;
  price?: number;
  item_category?: string;
  quantity?: number;
  index?: number;
};

function fire(event: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event, params);
  }
}

// ── Standard Ecommerce ────────────────────────────────────────────────────────

export function trackViewItemList(items: GtagItem[], listName?: string) {
  fire('view_item_list', { item_list_name: listName, items });
}

export function trackSelectItem(item: GtagItem) {
  fire('select_item', { items: [item] });
}

export function trackViewItem(item: GtagItem) {
  fire('view_item', { currency: 'ILS', value: item.price, items: [item] });
}

export function trackAddToCart(item: GtagItem, quantity = 1) {
  fire('add_to_cart', {
    currency: 'ILS',
    value: (item.price ?? 0) * quantity,
    items: [{ ...item, quantity }],
  });
}

export function trackViewCart(items: GtagItem[], value: number) {
  fire('view_cart', { currency: 'ILS', value, items });
}

export function trackBeginCheckout(items: GtagItem[], value: number) {
  fire('begin_checkout', { currency: 'ILS', value, items });
}

export function trackAddPaymentInfo(items: GtagItem[], value: number) {
  fire('add_payment_info', { currency: 'ILS', value, items });
}

export function trackPurchase(transactionId: string, items: GtagItem[], value: number) {
  fire('purchase', { transaction_id: transactionId, currency: 'ILS', value, items });
}

// ── Custom Events ─────────────────────────────────────────────────────────────

export function trackClickHeroMezuzot() {
  fire('click_hero_mezuzot');
}

export function trackClickHeroTefillin() {
  fire('click_hero_tefillin');
}

export function trackOpenSoferProfile(soferId?: string) {
  fire('open_sofer_profile', { sofer_id: soferId });
}

export function trackOpenKashrutCertificate(productId?: string) {
  fire('open_kashrut_certificate', { product_id: productId });
}

export function trackClickWhatsApp(source?: string) {
  fire('click_whatsapp', { source });
}

export function trackUseSearch(query: string) {
  fire('use_search', { search_term: query });
}

export function trackClickFaq() {
  fire('click_faq');
}

export function trackClickRefundPolicy() {
  fire('click_refund_policy');
}
