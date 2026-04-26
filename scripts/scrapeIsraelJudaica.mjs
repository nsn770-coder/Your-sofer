/**
 * scrapeIsraelJudaica.mjs
 * Scrapes products from israel-judaica.com — two categories:
 *   1138 — טליתות
 *   1147 — כיפות מיוחדות
 *
 * Uses the site's own AJAX endpoints (no Puppeteer).
 * Prices require login — will be null.
 * Saves to scripts/israel-judaica-products.json
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL  = 'https://www.israel-judaica.com';
const LANG      = 'he';
const BATCH     = 100;
const OUTPUT    = join(__dirname, 'israel-judaica-products.json');

const CATEGORIES = [
  { code: '1138', label: 'טליתות' },
  { code: '1147', label: 'כיפות מיוחדות' },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** POST to category.getProducts — returns raw products map */
async function fetchBatch(categoryCode, offset) {
  const body = new URLSearchParams({
    category:     categoryCode,
    filterChoices:'[]',
    limit:        String(BATCH),
    offset:       String(offset),
    sortValue:    '',
    sortDirection:'',
    note:         '',
    search_term:  '',
  });

  const res = await fetch(`${BASE_URL}/index.php?option=com_art&task=category.getProducts`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} at offset ${offset}`);
  const json = await res.json();
  if (!json.status) throw new Error(json.error || json.msg);
  return json.products || {};
}

/** GET search.searchTerm — returns Hebrew name (and null price) */
async function fetchHebName(sku) {
  try {
    const res = await fetch(
      `${BASE_URL}/index.php?option=com_art&task=search.searchTerm&lang=${LANG}&term=${encodeURIComponent(sku)}`
    );
    if (!res.ok) return null;
    const arr = await res.json();
    const hit = Array.isArray(arr) ? arr.find(p => p.sku === sku) : null;
    return hit ? { name: hit.name || null, price: hit.price || null, currency: hit.currency || null } : null;
  } catch {
    return null;
  }
}

/** Build full image URL from the filename the API returns */
function imgUrl(filename) {
  if (!filename) return null;
  const ext = filename.split('.').pop().toLowerCase();
  const dir = ext === 'webp' ? 'webp' : 'big';
  return `${BASE_URL}/${dir}/${filename}`;
}

/** Build product page URL */
function productUrl(sku) {
  return `${BASE_URL}/index.php?option=com_art&view=product&sku=${encodeURIComponent(sku)}&lang=${LANG}`;
}

/** Collect all products for one category (handles pagination) */
async function fetchAllForCategory(cat) {
  const collected = {};
  let offset = 0;

  while (true) {
    const batch = await fetchBatch(cat.code, offset);
    const keys  = Object.keys(batch);
    if (keys.length === 0) break;
    for (const [sku, p] of Object.entries(batch)) collected[sku] = p;
    if (keys.length < BATCH) break;
    offset += BATCH;
    await sleep(250);
  }

  return collected;
}

async function main() {
  const allResults = [];

  for (const cat of CATEGORIES) {
    console.log(`\n=== קטגוריה: ${cat.label} (code ${cat.code}) ===`);

    const raw   = await fetchAllForCategory(cat);
    const skus  = Object.keys(raw);
    console.log(`Found ${skus.length} products. Fetching Hebrew names...\n`);

    for (let i = 0; i < skus.length; i++) {
      const sku     = skus[i];
      const product = raw[sku];

      const heb = await fetchHebName(sku);

      const entry = {
        category:     cat.label,
        sku:          product.sku || sku,
        product_code: product.product_code || null,
        name_he:      heb?.name   || null,
        name_en:      product.name_en || null,
        description:  null,          // requires login — not available publicly
        price:        heb?.price   || null,
        currency:     heb?.currency || null,
        image_url:    imgUrl(product.image),
        product_url:  productUrl(product.sku || sku),
      };

      allResults.push(entry);

      const displayName = entry.name_he || entry.name_en || sku;
      process.stdout.write(
        `קטגוריה: ${cat.label} | מוצר ${i + 1}/${skus.length}: ${displayName}\n`
      );

      await sleep(150);
    }
  }

  writeFileSync(OUTPUT, JSON.stringify(allResults, null, 2), 'utf8');
  console.log(`\n✓ Saved ${allResults.length} products → ${OUTPUT}`);

  // Print first 5 from each category
  for (const cat of CATEGORIES) {
    const subset = allResults.filter(p => p.category === cat.label).slice(0, 5);
    console.log(`\n--- First 5: ${cat.label} ---`);
    subset.forEach((p, i) => {
      console.log(`\n[${i + 1}] ${p.sku}`);
      console.log(`  עברית  : ${p.name_he  || '(not found)'}`);
      console.log(`  English: ${p.name_en  || '(none)'}`);
      console.log(`  Price  : ${p.price != null ? `${p.currency}${p.price}` : '(login required)'}`);
      console.log(`  Image  : ${p.image_url}`);
      console.log(`  URL    : ${p.product_url}`);
    });
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
