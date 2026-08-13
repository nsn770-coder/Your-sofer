/**
 * Single source of truth for the admin sidebar.
 *
 * The admin dashboard navigates by local React state (`activeTab`), not by
 * routes — this config only describes the menu, it does not change how tabs are
 * switched. Three entries are real pages and carry an `href` instead of a `tab`.
 */

export interface AdminNavItem {
  /** Matches a TabType value in app/admin/page.tsx. Omitted for link items. */
  tab?: string;
  /** Set instead of `tab` for entries that navigate to a separate admin page. */
  href?: string;
  label: string;
  icon: string;
  /** Key into the badge counts map supplied by the dashboard. */
  badgeKey?: string;
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

/** Counts are computed in page.tsx and passed in — the logic is untouched. */
export type AdminBadgeCounts = Partial<Record<string, number>>;

export const ADMIN_NAVIGATION: AdminNavGroup[] = [
  {
    title: 'מכירות והזמנות',
    items: [
      { tab: 'orders', label: 'הזמנות', icon: '📦' },
      { tab: 'edit_requests', label: 'בקשות עריכה', icon: '✏️', badgeKey: 'edit_requests' },
      { tab: 'prints', label: 'הדפסות', icon: '🖨️' },
      { tab: 'abandoned_carts', label: 'נטישות עגלה', icon: '🛒', badgeKey: 'abandoned_carts' },
    ],
  },
  {
    title: 'מוצרים וקטלוג',
    items: [
      { tab: 'products', label: 'מוצרים', icon: '📜', badgeKey: 'products' },
      { tab: 'categories', label: 'קטגוריות', icon: '🖼️' },
      { tab: 'inventory', label: 'מלאי', icon: '📦' },
      { tab: 'out_of_stock', label: 'אזל מלאי', icon: '🔴', badgeKey: 'out_of_stock' },
      { tab: 'hidden_products', label: 'מוסתרים', icon: '👁️', badgeKey: 'hidden_products' },
      { tab: 'curations', label: 'סלקציות', icon: '✨' },
    ],
  },
  {
    title: 'לקוחות ו-CRM',
    items: [
      { href: '/admin/crm', label: 'CRM לקוחות', icon: '📇', badgeKey: 'crm' },
      { tab: 'customers', label: 'לקוחות', icon: '👤' },
      { tab: 'leads', label: 'לידים', icon: '📋', badgeKey: 'leads' },
      { href: '/admin/whatsapp', label: 'שיחות WhatsApp', icon: '💬' },
      { tab: 'emails', label: 'מיילים', icon: '📧' },
      { tab: 'reviews', label: 'ביקורות', icon: '⭐', badgeKey: 'reviews' },
      { tab: 'testimonials', label: 'עדויות לקוחות', icon: '💬' },
    ],
  },
  {
    title: 'שותפים וסופרים',
    items: [
      { tab: 'soferim_list', label: 'סופרים', icon: '✍️' },
      { tab: 'rabbi_requests', label: 'חנויות סופרים', icon: '🏪', badgeKey: 'rabbi_requests' },
      { tab: 'soferim', label: 'בקשות סופרים', icon: '📋', badgeKey: 'soferim' },
      { tab: 'shluchim', label: 'בקשות שלוחים', icon: '🟦', badgeKey: 'shluchim' },
      { tab: 'partner_requests', label: 'בקשות שותפים', icon: '🤝', badgeKey: 'partner_requests' },
    ],
  },
  {
    title: 'שיווק ומבצעים',
    items: [
      { tab: 'promotions', label: 'מבצעים', icon: '🏷️' },
      { tab: 'coupons', label: 'קופונים', icon: '🎟️' },
      { tab: 'best_sellers', label: 'נמכרים ביותר', icon: '🏆' },
      { tab: 'seasonal', label: 'עכשיו בעונה', icon: '🍂' },
      { tab: 'gifts', label: 'מתנות VIP', icon: '🎁' },
      { tab: 'stickers', label: 'מדבקות QR', icon: '🔖' },
    ],
  },
  {
    title: 'עיצוב ותוכן',
    items: [
      { tab: 'theme_editor', label: 'עורך עיצוב', icon: '🎨' },
      { tab: 'homepage', label: 'דף הבית', icon: '🏠' },
      { tab: 'hero', label: 'באנר ראשי', icon: '🖼️' },
      { tab: 'content', label: 'תוכן', icon: '✏️' },
      { href: '/admin/klafim', label: 'ניהול קלפים', icon: '📜' },
    ],
  },
  {
    title: 'כספים ונתונים',
    items: [
      { tab: 'profitability', label: 'רווחיות', icon: '📊' },
      { tab: 'commissions', label: 'עמלות', icon: '🤝' },
      { href: '/admin/analytics', label: 'אנליטיקה', icon: '📈' },
    ],
  },
  {
    title: 'מערכת',
    items: [
      { tab: 'users', label: 'משתמשים', icon: '👥' },
      { tab: 'site_settings', label: 'הגדרות אתר', icon: '⚙️' },
    ],
  },
];
