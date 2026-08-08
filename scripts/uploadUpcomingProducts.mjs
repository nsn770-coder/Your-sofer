/**
 * uploadUpcomingProducts.mjs
 *
 * Uploads upcoming products (מגיע בקרוב 09/08/2026) to Firestore
 * Price multipliers:
 *   - כיפות: ×3
 *   - Others: ×2.18
 *
 * Usage:
 *   node scripts/uploadUpcomingProducts.mjs --test      # dry run, 5 products
 *   node scripts/uploadUpcomingProducts.mjs             # full import
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── env + Firebase ────────────────────────────────────────────
const envPath = resolve(__dirname, '../.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
}

const SA_PATH = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA_PATH) });
const db = getFirestore();

// ── Load upcoming prices ────────────────────────────────────────
const pricesPath = resolve(__dirname, 'upcoming-products-09-08-2026.json');
const upcomingPrices = JSON.parse(readFileSync(pricesPath, 'utf8'));
console.log(`✓ Loaded ${Object.keys(upcomingPrices).length} upcoming products\n`);

// ── Calculate retail price ────────────────────────────────────
function calculatePrice(supplierPrice, category) {
  // כיפות: multiply by 3
  if (category === 'כיפות') {
    return Math.round(supplierPrice * 3);
  }

  // All other categories: multiply by 2.18
  return Math.round(supplierPrice * 2.18);
}

// ── main ──────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');

  // Load israel-judaica products for category mapping
  const allProducts = JSON.parse(readFileSync(resolve(__dirname, 'israel-judaica-products.json'), 'utf8'));
  const skuToProduct = {};
  allProducts.forEach(p => { skuToProduct[p.sku] = p; });

  const skus = Object.keys(upcomingPrices);
  const subset = testMode ? skus.slice(0, 5) : skus;

  console.log(`\n${testMode ? '🧪 TEST MODE — 5 products' : `🚀 FULL IMPORT — ${subset.length} upcoming products`}`);
  console.log('Checking for existing SKUs in Firestore...\n');

  // Pre-fetch all existing SKUs
  const existingSnap = await db.collection('products').select('sku').get();
  const existingSkus = new Set();
  existingSnap.forEach(d => { if (d.data().sku) existingSkus.add(d.data().sku); });
  console.log(`Found ${existingSkus.size} existing products in Firestore.\n`);

  let created = 0, skipped = 0, failed = 0, notFound = 0;

  for (let i = 0; i < subset.length; i++) {
    const sku = subset[i];
    const supplierPrice = upcomingPrices[sku];
    const product = skuToProduct[sku];

    // Check if already exists
    if (existingSkus.has(sku)) {
      console.log(`[${i + 1}/${subset.length}] ⏭  SKIP — already exists: ${sku}`);
      skipped++;
      continue;
    }

    // Check if product data exists
    if (!product) {
      console.log(`[${i + 1}/${subset.length}] ⚠️  SKIP — not found in scraped data: ${sku}`);
      notFound++;
      continue;
    }

    // Get category and name
    const { category, name_he, image_url } = product;
    const { cat, subCategory } = mapCategory(category);
    const retailPrice = calculatePrice(supplierPrice, cat);

    const doc = {
      name:        name_he,
      sku:         sku,
      imgUrl:      image_url || '',
      images:      image_url ? [image_url] : [],
      cat,
      category:    cat,
      subCategory,
      price:       retailPrice,
      soferBasePrice: supplierPrice,
      source:      'israel-judaica',
      sourceUrl:   product.product_url,
      status:      'active',
      available:   false,  // Will become available on 09/08/2026
      hidden:      false,
      outOfStock:  false,
      priority:    50,
      isBestSeller: false,
      badge:       'מגיע בקרוב',
      createdAt:   new Date().toISOString(),
    };

    if (testMode) {
      console.log(`[${i + 1}/5] ✅ WOULD CREATE:`);
      console.log(`     SKU: ${sku}`);
      console.log(`     Name: ${name_he.slice(0, 60)}`);
      console.log(`     Supplier: ₪${supplierPrice} → Retail: ₪${retailPrice} [${cat}]`);
      created++;
      continue;
    }

    try {
      const ref = await db.collection('products').add(doc);
      console.log(`[${i + 1}/${subset.length}] ✅ Created ${sku} — ₪${supplierPrice}→₪${retailPrice} [${cat}] (id: ${ref.id})`);
      created++;
    } catch (e) {
      console.error(`[${i + 1}/${subset.length}] ❌ FAILED ${sku}: ${e.message}`);
      failed++;
    }
  }

  console.log('\n─────────────────────────────────────────');
  if (testMode) {
    console.log(`🧪 Test complete. Would create: ${created} | Would skip: ${skipped} | Not found: ${notFound}`);
    console.log('\nRun WITHOUT --test to import all products.');
  } else {
    console.log(`✅ Created: ${created} | ⏭ Skipped: ${skipped} | 🔍 Not found: ${notFound} | ❌ Failed: ${failed}`);
  }
  process.exit(0);
}

// ── Category mapping ──────────────────────────────────────
function mapCategory(sourceCat) {
  const mapping = {
    'טליתות': { cat: 'טליתות וציציות', subCategory: 'טליתות חתן' },
    'כיפות מיוחדות': { cat: 'כיפות', subCategory: 'כיפות מיוחדות' },
  };

  return mapping[sourceCat] || { cat: sourceCat, subCategory: sourceCat };
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
