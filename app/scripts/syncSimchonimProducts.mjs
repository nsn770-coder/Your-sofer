/**
 * syncSimchonimProducts.mjs
 *
 * Web scraper + Firestore importer לספק סימחוני
 * בלי צורך ב-Firebase Admin SDK
 * משתמש ב-Firestore REST API עם API key
 *
 * node app/scripts/syncSimchonimProducts.mjs --dry-run
 * node app/scripts/syncSimchonimProducts.mjs --yes
 */

import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../../.env.local'), 'utf8');
    const vars = {};
    let key = null, val = [];
    for (const line of raw.split('\n')) {
      const m = line.trimEnd().match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) {
        if (key) vars[key] = val.join('\n');
        key = m[1]; val = [m[2]];
      } else if (key) {
        val.push(line.trimEnd());
      }
    }
    if (key) vars[key] = val.join('\n');
    return vars;
  } catch {
    return {};
  }
}

const env = loadEnv();
const projectId = env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'] || 'your-sofer';
const apiKey = env['NEXT_PUBLIC_FIREBASE_API_KEY'] || 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I';

console.log(`\n📡 Firebase: ${projectId}\n`);

// ── Constants ──────────────────────────────────────────────────────────────────

const PRICE_MARKUP = 1.15; // +15%
const FIRESTORE_API = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

const CATEGORY_MAP = {
  sidurim: 'ספרי קודש וסידורים',
  bruchonot: 'ברכונים',
  gifts: 'מתנות',
};

const URLS = [
  { url: 'https://simchonim.co.il/product-catalog/%d7%9b%d7%9c-%d7%94%d7%a1%d7%99%d7%93%d7%95%d7%a8%d7%99%d7%9d/', cat: 'sidurim' },
  { url: 'https://simchonim.co.il/product-catalog/%D7%91%D7%A8%D7%9B%D7%95%D7%A0%D7%99%D7%9D/', cat: 'bruchonot' },
  { url: 'https://simchonim.co.il/product-tag/%d7%9e%d7%96%d7%9b%d7%a8%d7%95%d7%aa-%d7%9c%d7%90%d7%a8%d7%95%d7%a2%d7%99%d7%9d/', cat: 'gifts' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Firestore REST API ─────────────────────────────────────────────────────────

async function firestoreSet(collection, docId, data) {
  const url = `${FIRESTORE_API}/${collection}/${docId}?key=${apiKey}`;
  const fields = {};
  const fieldPaths = [];

  for (const [key, val] of Object.entries(data)) {
    // Skip null/empty values
    if (val === null || val === undefined || val === '') continue;

    if (typeof val === 'string') {
      fields[key] = { stringValue: val };
      fieldPaths.push(key);
    } else if (typeof val === 'number') {
      fields[key] = val % 1 === 0 ? { integerValue: String(val) } : { doubleValue: val };
      fieldPaths.push(key);
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
      fieldPaths.push(key);
    } else if (val instanceof Date) {
      fields[key] = { timestampValue: val.toISOString() };
      fieldPaths.push(key);
    } else if (Array.isArray(val) && val.length > 0) {
      fields[key] = { arrayValue: { values: val.map(v => ({ stringValue: String(v) })) } };
      fieldPaths.push(key);
    }
  }

  if (fieldPaths.length === 0) {
    throw new Error('No valid fields to save');
  }

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields,
      updateMask: { fieldPaths }
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status}: ${err}`);
  }
}

// ── Web Scraper ────────────────────────────────────────────────────────────────

async function fetchPage(url, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 8000,
      });
      if (res.ok) return await res.text();
    } catch (err) {
      if (i < retries - 1) await sleep(500);
    }
  }
  return null;
}

async function scrapeProducts(url, category) {
  console.log(`📄 Scraping: ${url.substring(0, 60)}...`);
  const html = await fetchPage(url);
  if (!html) {
    console.log('   ❌ Failed to fetch');
    return [];
  }

  // חפש אחר product containers שקרובים לדפוס של WooCommerce/Shopify
  // חלץ product links וחלץ מהם שמות ומחירים
  const products = [];

  // דוגמה: <li class="product woocommerce-product">...</li>
  const productPattern = /<li[^>]*class="[^"]*product[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let match;

  while ((match = productPattern.exec(html)) && products.length < 50) {
    const blockHtml = match[1];

    // חלץ link and name
    const linkMatch = blockHtml.match(/<a[^>]*href="([^"]*)"[^>]*(?:title="([^"]*)")?[^>]*>([^<]*)<\/a>/i);
    if (!linkMatch) continue;

    const url = linkMatch[1];
    const name = (linkMatch[2] || linkMatch[3] || '').trim();

    // Skip אם השם אינו valid
    if (!name || name.includes('{{{') || name.includes('סנן') || name.includes('צרו') ||
        name.toLowerCase().includes('filter') || name.length < 3) {
      continue;
    }

    // חלץ מחיר
    const priceMatch = blockHtml.match(/(?:₪|price[^>]*>)\s*([0-9]+(?:[.,][0-9]+)?)/i);
    const priceStr = priceMatch ? priceMatch[1] : '0';
    const price = parseFloat(priceStr.replace(/,/g, '.'));

    if (name && price > 0 && name.length > 2) {
      products.push({
        supplier: 'simchonim',
        supplier_sku: url.split('/').filter(x => x && x.length > 2).pop() || `sku-${Math.random()}`,
        supplier_url: url.startsWith('http') ? url : 'https://simchonim.co.il' + url,
        name: name.substring(0, 150),
        price: Math.round(price * PRICE_MARKUP * 100) / 100,
        original_price: price,
        category: CATEGORY_MAP[category] || 'מתנות',
        active: true,
      });
    }
  }

  console.log(`   ✓ Found ${products.length} products`);
  return products;
}

// ── Prompt ─────────────────────────────────────────────────────────────────────

async function confirm(msg) {
  if (process.argv.includes('--yes')) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(msg + ' (y/n) ', ans => {
      rl.close();
      resolve(ans.toLowerCase() === 'y');
    });
  });
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('🔍 Scraping Simchonim...\n');

  let allProducts = [];
  for (const { url, cat } of URLS) {
    const products = await scrapeProducts(url, cat);
    allProducts = allProducts.concat(products);
    await sleep(1000);
  }

  if (allProducts.length === 0) {
    console.log('\n⚠️  No products found');
    process.exit(0);
  }

  console.log(`\n📊 Total: ${allProducts.length} products`);
  console.log(`   Price markup: +15%`);
  console.log(`   Dry run: ${isDryRun ? 'YES' : 'NO'}\n`);

  // Show sample
  console.log('📋 Sample (first 3):');
  allProducts.slice(0, 3).forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name}`);
    console.log(`      ${p.category} | ₪${p.price} (was ₪${p.original_price})`);
  });
  console.log('');

  if (isDryRun) {
    console.log('✅ Dry run complete');
    process.exit(0);
  }

  const shouldContinue = await confirm('✅ Import to Firestore?');
  if (!shouldContinue) {
    console.log('❌ Cancelled');
    process.exit(0);
  }

  console.log(`\n💾 Importing to Firestore...\n`);

  let imported = 0;
  for (const product of allProducts) {
    try {
      const docId = `simchonim_${product.supplier_sku}`;
      await firestoreSet('products', docId, {
        ...product,
        cat: product.category,
        subCategory: 'imported',
        supplier_imported_at: new Date(),
      });
      imported++;
      if (imported % 10 === 0) console.log(`   ✓ ${imported}/${allProducts.length}`);
    } catch (err) {
      console.error(`   ❌ ${product.name}: ${err.message}`);
    }
    await sleep(100);
  }

  console.log(`\n✅ Done! Imported ${imported}/${allProducts.length} products`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
