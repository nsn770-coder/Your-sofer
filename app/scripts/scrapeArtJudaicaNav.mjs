/**
 * scrapeArtJudaicaNav.mjs — READ-ONLY: חילוץ מבנה ניווט מ-Art Judaica
 * Usage: node app/scripts/scrapeArtJudaicaNav.mjs
 * No Firestore writes.
 */

import { load } from 'cheerio';

const BASE = 'https://www.art-judaica.co.il';
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const DELAY = 800;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
    },
  });
  return { status: res.status, ok: res.ok, html: res.ok ? await res.text() : '', url };
}

function absUrl(href) {
  if (!href) return null;
  if (href.startsWith('http')) return href;
  if (href.startsWith('/')) return BASE + href;
  return BASE + '/' + href;
}

// ─── 1. Homepage nav ────────────────────────────────────────────────────────

console.log('🔍 שולף ניווט ראשי מ-Art Judaica...\n');
const home = await fetchHtml(BASE);
const $home = load(home.html);

const navLinks = new Map(); // label -> href

// Try various nav selectors
const navSelectors = [
  'nav a',
  'header a',
  '.menu a',
  '.navigation a',
  '#nav a',
  '#menu a',
  '.main-menu a',
  '.top-menu a',
  '.site-nav a',
  '.header-nav a',
  '[class*="nav"] a',
  '[class*="menu"] a',
  '[id*="nav"] a',
  '[id*="menu"] a',
];

for (const sel of navSelectors) {
  $home(sel).each((_, el) => {
    const text = $home(el).text().trim().replace(/\s+/g, ' ');
    const href = $home(el).attr('href') || '';
    const abs  = absUrl(href);
    if (text && text.length > 1 && text.length < 40 && abs && !abs.includes('javascript')) {
      navLinks.set(text, abs);
    }
  });
}

console.log(`נמצאו ${navLinks.size} קישורי ניווט:`);
for (const [label, href] of navLinks) {
  console.log(`  ${label.padEnd(25)} => ${href}`);
}

// ─── 2. All internal links with Hebrew text ──────────────────────────────────

console.log('\n=== כל הקישורים הפנימיים עם טקסט עברי ===');
const hebrewLinks = new Map();
$home('a').each((_, el) => {
  const text = $home(el).text().trim().replace(/\s+/g, ' ');
  const href = $home(el).attr('href') || '';
  const abs  = absUrl(href);
  if (/[א-ת]/.test(text) && text.length < 40 && abs && abs.includes('art-judaica')) {
    hebrewLinks.set(text, abs);
  }
});

for (const [label, href] of hebrewLinks) {
  console.log(`  ${label.padEnd(25)} => ${href}`);
}

// ─── 3. Sniff category pages ────────────────────────────────────────────────

// Find URLs that look like category pages
const catUrls = new Set();
$home('a[href]').each((_, el) => {
  const href = $home(el).attr('href') || '';
  const abs  = absUrl(href);
  if (!abs) return;
  // Common category URL patterns in WooCommerce / Magento / custom
  if (
    abs.includes('/product-category/') ||
    abs.includes('/category/') ||
    abs.includes('/catalog/') ||
    abs.includes('cat=') ||
    abs.includes('category_id=') ||
    abs.includes('/collection') ||
    (abs.includes(BASE) && /\/[א-ת-]+\/?$/.test(abs))
  ) {
    catUrls.add(abs);
  }
});

console.log('\n=== URLs שנראים כקטגוריות ===');
for (const u of catUrls) console.log(' ', u);

// ─── 4. Probe a category page to understand product structure ─────────────

// Pick first non-home category URL
const firstCat = [...catUrls].find(u => u !== BASE && u !== BASE + '/') || null;
if (firstCat) {
  console.log(`\n=== בדיקת עמוד קטגוריה: ${firstCat} ===`);
  await sleep(DELAY);
  const { html: catHtml } = await fetchHtml(firstCat);
  const $cat = load(catHtml);

  // Products
  const products = [];
  $cat('a[href]').each((_, el) => {
    const href = $cat(el).attr('href') || '';
    const abs  = absUrl(href);
    if (abs && (abs.includes('/product/') || abs.includes('product_id=') || abs.includes('/?p='))) {
      const name = $cat(el).text().trim().replace(/\s+/g, ' ');
      if (name) products.push({ name, href: abs });
    }
  });
  console.log(`מוצרים בעמוד: ${products.length}`);
  products.slice(0, 5).forEach(p => console.log(`  ${p.name} => ${p.href}`));
}

// ─── 5. Print raw page structure ────────────────────────────────────────────

console.log('\n=== מבנה עמוד הבית (title / h1-h3) ===');
console.log($home('title').text().trim());
$home('h1,h2,h3').each((_, el) => {
  const t = $home(el).text().trim().replace(/\s+/g, ' ');
  if (t.length > 1 && t.length < 80) console.log(' ', $home(el).prop('tagName'), ':', t);
});

// Print full body text snippet for investigation
console.log('\n=== HTML גולמי (500 תווים ראשונים של body) ===');
const bodyText = $home('body').text().replace(/\s+/g, ' ').trim();
console.log(bodyText.slice(0, 500));

console.log('\n✅ סיום — לא נכתב שום דבר ל-Firestore');
process.exit(0);
