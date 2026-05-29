/**
 * scrapeIsraelJudaicaTest.mjs
 * Test-scrape: pulls the first 5 products from a given category code.
 * No Firestore writes. Prints each product and saves to israel-judaica-test.json.
 *
 * Usage:
 *   node scripts/scrapeIsraelJudaicaTest.mjs              # defaults to category 1126
 *   node scripts/scrapeIsraelJudaicaTest.mjs --code=1138  # specify a category
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = 'https://www.israel-judaica.com';
const LANG     = 'he';
const OUTPUT   = join(__dirname, 'israel-judaica-test.json');

const args = process.argv.slice(2);
const codeArg = args.find(a => a.startsWith('--code='));
const CATEGORY_CODE = codeArg ? codeArg.split('=')[1] : '1126';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** POST category.getProducts — same as existing scraper, limit=5, offset=0 */
async function fetchFirst5(categoryCode) {
  const body = new URLSearchParams({
    category:      categoryCode,
    filterChoices: '[]',
    limit:         '5',
    offset:        '0',
    sortValue:     '',
    sortDirection: '',
    note:          '',
    search_term:   '',
  });

  const res = await fetch(`${BASE_URL}/index.php?option=com_art&task=category.getProducts`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.status) throw new Error(json.error || json.msg || 'API returned status=false');
  return json.products || {};
}

/** GET search.searchTerm — same as existing scraper */
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

/** Build full image URL — same logic as existing scraper */
function buildImgUrl(filename) {
  if (!filename) return null;
  const ext = filename.split('.').pop().toLowerCase();
  const dir  = ext === 'webp' ? 'webp' : 'big';
  return `${BASE_URL}/${dir}/${filename}`;
}

/** Build product page URL */
function buildProductUrl(sku) {
  return `${BASE_URL}/index.php?option=com_art&view=product&sku=${encodeURIComponent(sku)}&lang=${LANG}`;
}

async function main() {
  console.log(`\n🧪 TEST SCRAPE — category code ${CATEGORY_CODE}, first 5 products only`);
  console.log(`   Site: ${BASE_URL}\n`);

  // Fetch first 5 from the listing API
  console.log('Fetching product listing...');
  const raw  = await fetchFirst5(CATEGORY_CODE);
  const skus = Object.keys(raw).slice(0, 5); // guard: take at most 5
  console.log(`  API returned ${Object.keys(raw).length} product(s) in this batch (taking ${skus.length})\n`);

  if (skus.length === 0) {
    console.error('❌ No products returned. Check the category code or the API endpoint.');
    process.exit(1);
  }

  const results = [];

  for (let i = 0; i < skus.length; i++) {
    const sku     = skus[i];
    const product = raw[sku];

    process.stdout.write(`[${i + 1}/5] Fetching Hebrew name for SKU: ${sku} … `);
    const heb = await fetchHebName(sku);
    process.stdout.write(heb?.name ? `"${heb.name}"\n` : '(not found)\n');

    const entry = {
      category_code: CATEGORY_CODE,
      sku:           product.sku || sku,
      product_code:  product.product_code || null,
      name_he:       heb?.name      || null,
      name_en:       product.name_en || null,
      price:         heb?.price     || null,   // null without login — expected
      currency:      heb?.currency  || null,
      image_url:     buildImgUrl(product.image),
      product_url:   buildProductUrl(product.sku || sku),
    };

    results.push(entry);
    await sleep(150);
  }

  // Save JSON
  writeFileSync(OUTPUT, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n✅ Saved → ${OUTPUT}\n`);

  // Print summary table
  console.log('─────────────────────────────────────────────────────────');
  results.forEach((p, i) => {
    console.log(`\n[${i + 1}] SKU: ${p.sku}`);
    console.log(`    שם עברי  : ${p.name_he   || '⚠️  not found'}`);
    console.log(`    English  : ${p.name_en   || '(none)'}`);
    console.log(`    Price    : ${p.price != null ? `${p.currency ?? ''}${p.price}` : '(null — login required, expected)'}`);
    console.log(`    Image URL: ${p.image_url  || '⚠️  none'}`);
    console.log(`    Page URL : ${p.product_url}`);
  });
  console.log('\n─────────────────────────────────────────────────────────');
  console.log(`\nFields present: category_code, sku, product_code, name_he, name_en, price, currency, image_url, product_url`);
  console.log('price=null is expected — will be filled later by SKU matching after login.');
}

main().catch(err => { console.error('\n❌ Fatal:', err.message); process.exit(1); });
