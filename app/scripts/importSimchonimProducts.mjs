/**
 * importSimchonimProducts.mjs
 *
 * Web scraper + Firestore importer לספק סימחוני
 * קובע מוצרים עם וריאציות צבע, הטבעה, וכו'
 *
 * הוספה של 15% למחיר המקורי
 * שמירת קישור וקוד ספק לסינכרון עתידי
 *
 * node app/scripts/importSimchonimProducts.mjs
 * node app/scripts/importSimchonimProducts.mjs --yes (דלג על אישורים)
 * node app/scripts/importSimchonimProducts.mjs --dry-run (תצוגה בלבד)
 */

import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Env loader ─────────────────────────────────────────────────────────────────

function loadEnv() {
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
}

const env = loadEnv();
const projectId   = env['FIREBASE_PROJECT_ID'];
const clientEmail = (env['FIREBASE_CLIENT_EMAIL'] ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (env['FIREBASE_PRIVATE_KEY']  ?? '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Missing Firebase credentials in .env.local');
  process.exit(1);
}

// ── Firebase Admin ────────────────────────────────────────────────────────────

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// ── Constants ─────────────────────────────────────────────────────────────────

const SIMCHONIM_BASE = 'https://simchonim.co.il';
const PRICE_MARKUP = 1.15; // הוסף 15% למחיר

// Mapping מקטגוריות Simchonim לקטגוריות YourSofer
const CATEGORY_MAP = {
  'sidurim':      'ספרי קודש וסידורים',
  'bruchonot':    'ברכונים',
  'event-gifts':  'מתנות',
};

const URLS_TO_SCRAPE = [
  'https://simchonim.co.il/product-catalog/%d7%9b%d7%9c-%d7%94%d7%a1%d7%99%d7%93%d7%95%d7%a8%d7%99%d7%9d/', // סידורים
  'https://simchonim.co.il/product-catalog/%D7%91%D7%A8%D7%9B%D7%95%D7%A0%D7%99%D7%9D/', // ברכונים
  'https://simchonim.co.il/product-tag/%d7%9e%d7%96%d7%9b%d7%a8%d7%95%d7%aa-%d7%9c%d7%90%d7%a8%d7%95%d7%a2%d7%99%d7%9d/', // מזכרות לאירועים
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Prompt helper ─────────────────────────────────────────────────────────────

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

// ── Scraper ────────────────────────────────────────────────────────────────────

async function fetchPage(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });
      if (!res.ok) return null;
      return await res.text();
    } catch (err) {
      if (i < retries - 1) await sleep(1000);
    }
  }
  return null;
}

async function scrapeProductsFromPage(url, category) {
  console.log(`\n📄 Scraping: ${url}`);
  const html = await fetchPage(url);
  if (!html) {
    console.log('   ❌ Failed to fetch');
    return [];
  }

  const $ = cheerio.load(html);
  const products = [];

  // בחורים את כל פריטי המוצרים (זה דורש inspection של HTML האתר)
  // placeholder — צריך לעדכן לפי מבנה האתר בפועל
  $('[data-product-id], .product-item, .product').each((i, el) => {
    try {
      const $el = $(el);

      // חלץ פרטים בסיסיים
      const name = $el.find('[data-product-name], .product-name, h2').first().text().trim();
      const priceText = $el.find('[data-price], .price, .product-price').first().text().trim();
      const price = parseFloat(priceText.replace(/[^\d.]/g, ''));
      const productUrl = $el.find('a[href*="/product/"], a[href*="/p/"]').first().attr('href') || '';
      const images = [];

      $el.find('img[data-src], img.product-image').each((_, img) => {
        const src = $(img).attr('data-src') || $(img).attr('src');
        if (src && src.includes('simchonim')) images.push(src);
      });

      if (name && price > 0) {
        products.push({
          supplier: 'simchonim',
          supplier_sku: productUrl.split('/').filter(x => x).pop() || `sku-${Date.now()}`,
          supplier_url: productUrl.startsWith('http') ? productUrl : SIMCHONIM_BASE + productUrl,
          name,
          price: Math.round(price * PRICE_MARKUP * 100) / 100, // +15%
          original_price: price,
          description: $el.find('.product-description, [data-description]').text().trim(),
          images: [...new Set(images)], // dedupe
          category,
          active: true,
          createdAt: new Date(),
        });
      }
    } catch (err) {
      // skip על error בפריט יחיד
    }
  });

  console.log(`   ✓ Found ${products.length} products`);
  return products;
}

async function scrapeAllProducts() {
  console.log('🔍 Scraping Simchonim...\n');

  let allProducts = [];
  for (let i = 0; i < URLS_TO_SCRAPE.length; i++) {
    const url = URLS_TO_SCRAPE[i];
    const categoryKey = Object.keys(CATEGORY_MAP)[i] || 'event-gifts';
    const category = CATEGORY_MAP[categoryKey];

    const products = await scrapeProductsFromPage(url, category);
    allProducts = allProducts.concat(products);

    if (i < URLS_TO_SCRAPE.length - 1) await sleep(2000); // Rate limit
  }

  return allProducts;
}

// ── Firestore Import ───────────────────────────────────────────────────────────

async function importToFirestore(products, dryRun = false) {
  if (dryRun) {
    console.log(`\n📋 DRY RUN: Would import ${products.length} products\n`);
    products.slice(0, 5).forEach((p, i) => {
      console.log(`   ${i + 1}. [${p.supplier_sku}] ${p.name}`);
      console.log(`      Category: ${p.category}`);
      console.log(`      Price: ₪${p.price} (was ₪${p.original_price})`);
      console.log(`      URL: ${p.supplier_url}\n`);
    });
    return 0;
  }

  console.log(`\n💾 Importing ${products.length} products to Firestore...\n`);

  let imported = 0;
  const batch = db.batch();
  const collectionRef = db.collection('products');

  for (const product of products) {
    const docId = `simchonim_${product.supplier_sku}`;
    batch.set(
      collectionRef.doc(docId),
      {
        ...product,
        cat: product.category,
        subCategory: product.name.split('-')[0]?.trim() || 'כללי',
        supplier_imported_at: new Date(),
      },
      { merge: true }
    );
    imported++;
  }

  await batch.commit();
  console.log(`✅ Imported ${imported} products`);
  return imported;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  const products = await scrapeAllProducts();

  if (products.length === 0) {
    console.log('\n⚠️  No products found');
    process.exit(0);
  }

  if (isDryRun) {
    await importToFirestore(products, true);
    process.exit(0);
  }

  console.log(`\n📊 Total: ${products.length} products scraped`);
  console.log(`   Price markup: +15%\n`);

  const shouldContinue = await confirm('✅ Import to Firestore?');
  if (!shouldContinue) {
    console.log('❌ Cancelled');
    process.exit(0);
  }

  await importToFirestore(products, false);
  console.log('\n✅ Done!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
