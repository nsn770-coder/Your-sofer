/**
 * scrapePaldinox.mjs
 *
 * Scrapes product listings from paldinox.co.il category pages,
 * handles pagination, and saves results to paldinox_products.json.
 *
 * Usage:  node app/scripts/scrapePaldinox.mjs
 */

import { load } from 'cheerio';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { slug: 'יודאיקה',        label: 'יודאיקה' },
  { slug: 'הגשה-ואירוח',   label: 'הגשה ואירוח' },
  { slug: 'עיצוב-הבית',    label: 'עיצוב הבית' },
  { slug: 'חנוכה',          label: 'חנוכה' },
  { slug: 'פסח',            label: 'פסח' },
  { slug: 'ראש-השנה',       label: 'ראש השנה' },
];

const BASE = 'https://paldinox.co.il/product-category';
const DELAY_MS = 800; // polite delay between requests
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const OUT_PATH = join(__dirname, 'paldinox_products.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/**
 * Given a thumbnail URL like:
 *   https://.../product-images/X5923C-300x300.jpg
 * Returns the full-size URL:
 *   https://.../product-images/X5923C.jpg
 *
 * Also handles .JPG / .PNG uppercase extensions.
 */
function toFullSize(url) {
  if (!url) return url;
  // Remove WooCommerce dimension suffix: -WIDTHxHEIGHT before the extension
  return url.replace(/-\d+x\d+(\.[a-zA-Z]+)$/, '$1');
}

/**
 * Decode HTML entities (&quot; &#8221; etc.) in product names.
 */
function decodeEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'");
}

/**
 * Parse all products from one page's HTML.
 * Returns array of { name, imgUrl, productUrl, category }.
 */
function parsePage(html, categoryLabel) {
  const $ = load(html);
  const products = [];

  $('article.product').each((_, el) => {
    const article = $(el);

    // Name: h2.woocommerce-loop-product__title or any h2 inside the article
    const nameEl = article.find('h2.woocommerce-loop-product__title, h2').first();
    const name = decodeEntities(nameEl.text().trim());
    if (!name) return; // skip if no name

    // Product URL: first <a> inside the article pointing to /product/
    const linkEl = article.find('a[href*="/product/"]').first();
    const productUrl = linkEl.attr('href') || '';

    // Image: img.img-responsive uses lazy-loading — real URL is in data-src.
    // We also check data-srcset for the largest (original) image.
    const imgEl = article.find('img.img-responsive').first();

    let imgUrl = '';

    // Prefer data-srcset: last entry is the original full-size file
    const srcset = imgEl.attr('data-srcset') || imgEl.attr('srcset') || '';
    if (srcset) {
      // srcset format: "url1 300w, url2 768w, url3.JPG 800w"
      const entries = srcset.split(',').map(s => s.trim());
      // Last entry (highest width) is the original
      const lastEntry = entries[entries.length - 1];
      const srcsetUrl = lastEntry.split(/\s+/)[0];
      if (srcsetUrl && srcsetUrl.includes('wp-content')) {
        imgUrl = srcsetUrl;
      }
    }

    // Fallback: data-src stripped of dimensions
    if (!imgUrl) {
      const dataSrc = imgEl.attr('data-src') || imgEl.attr('src') || '';
      if (dataSrc && dataSrc.includes('wp-content/uploads')) {
        imgUrl = toFullSize(dataSrc);
      }
    }

    // Skip placeholder/base64 images
    if (!imgUrl || imgUrl.startsWith('data:')) return;

    let decodedUrl = productUrl;
    try { decodedUrl = productUrl ? decodeURIComponent(productUrl) : ''; } catch { decodedUrl = productUrl; }

    products.push({
      name,
      imgUrl,
      productUrl: decodedUrl,
      category: categoryLabel,
      source: 'paldinox',
    });
  });

  return products;
}

/**
 * Extract the last page number from pagination HTML.
 * Returns 1 if only one page.
 */
function getLastPage($) {
  let max = 1;
  $('nav.woocommerce-pagination a.page-numbers, ul.page-numbers a.page-numbers').each((_, el) => {
    const n = parseInt($(el).text().trim(), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return max;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function scrapeCategory(slug, label) {
  const url1 = `${BASE}/${encodeURIComponent(slug)}/`;
  console.log(`\n📂 Category: ${label}`);
  console.log(`   Fetching page 1: ${url1}`);

  let html;
  try {
    html = await fetchHtml(url1);
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
    return [];
  }

  const $ = load(html);
  const lastPage = getLastPage($);
  console.log(`   Pages found: ${lastPage}`);

  let allProducts = [];
  try {
    allProducts = parsePage(html, label);
  } catch (err) {
    console.error(`   ❌ Page 1 parse failed: ${err.message}`);
  }
  console.log(`   Page 1: ${allProducts.length} products`);

  for (let page = 2; page <= lastPage; page++) {
    await sleep(DELAY_MS);
    const pageUrl = `${BASE}/${encodeURIComponent(slug)}/page/${page}/`;
    console.log(`   Fetching page ${page}: ${pageUrl}`);
    try {
      const pageHtml = await fetchHtml(pageUrl);
      const pageProducts = parsePage(pageHtml, label);
      console.log(`   Page ${page}: ${pageProducts.length} products`);
      allProducts.push(...pageProducts);
    } catch (err) {
      console.error(`   ❌ Page ${page} failed: ${err.message}`);
    }
  }

  return allProducts;
}

async function main() {
  console.log('🕷️  Paldinox scraper starting...\n');
  const startTime = Date.now();
  const all = [];
  const stats = {};

  for (const { slug, label } of CATEGORIES) {
    const products = await scrapeCategory(slug, label);
    stats[label] = products.length;
    all.push(...products);
    await sleep(DELAY_MS);
  }

  // Deduplicate by productUrl (same product can appear in multiple categories)
  const seen = new Set();
  const deduped = all.filter(p => {
    if (!p.productUrl) return true; // keep if no URL
    if (seen.has(p.productUrl)) return false;
    seen.add(p.productUrl);
    return true;
  });

  // Summary
  console.log('\n────────────────────────────────');
  console.log('📊 Results per category:');
  Object.entries(stats).forEach(([cat, n]) => console.log(`   ${cat}: ${n}`));
  console.log(`\n   Raw total:   ${all.length}`);
  console.log(`   Deduped:     ${deduped.length}`);
  console.log(`   Duplicates:  ${all.length - deduped.length}`);
  console.log(`   Time:        ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  writeFileSync(OUT_PATH, JSON.stringify(deduped, null, 2), 'utf-8');
  console.log(`\n✅ Saved to ${OUT_PATH}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
