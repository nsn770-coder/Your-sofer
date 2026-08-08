/**
 * importNewProductsWithPrices.mjs
 *
 * Imports new products from israel-judaica with prices from supplier-prices.json
 *
 * Price multipliers:
 *   - כיפות (cat: 'כיפות'): ×3
 *   - All other categories: ×2.18
 *
 * Usage:
 *   node scripts/importNewProductsWithPrices.mjs --test      # dry run, 5 products
 *   node scripts/importNewProductsWithPrices.mjs             # full import
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

// ── Load supplier prices ──────────────────────────────────────
const pricesPath = resolve(__dirname, 'supplier-prices.json');
const supplierPrices = JSON.parse(readFileSync(pricesPath, 'utf8'));
console.log(`✓ Loaded ${Object.keys(supplierPrices).length} supplier prices\n`);

// ── Category mapping ──────────────────────────────────────────
function mapCategory(sourceCat) {
  const mapping = {
    'טליתות': { cat: 'טליתות וציציות', subCategory: 'טליתות חתן' },
    'כיפות מיוחדות': { cat: 'כיפות', subCategory: 'כיפות מיוחדות' },
  };

  return mapping[sourceCat] || { cat: sourceCat, subCategory: sourceCat };
}

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

  // Load israel-judaica products
  const allProducts = JSON.parse(readFileSync(resolve(__dirname, 'israel-judaica-products.json'), 'utf8'));
  const subset = testMode ? allProducts.slice(0, 5) : allProducts;

  console.log(`\n${testMode ? '🧪 TEST MODE — 5 products' : `🚀 FULL IMPORT — ${subset.length} products`}`);
  console.log('Checking for existing SKUs in Firestore...\n');

  // Pre-fetch all existing SKUs
  const existingSnap = await db.collection('products').select('sku').get();
  const existingSkus = new Set();
  existingSnap.forEach(d => { if (d.data().sku) existingSkus.add(d.data().sku); });
  console.log(`Found ${existingSkus.size} existing products in Firestore.\n`);

  let created = 0, skipped = 0, failed = 0, noPriceSkipped = 0;

  for (let i = 0; i < subset.length; i++) {
    const p = subset[i];

    // Validate Hebrew name
    if (!p.name_he) {
      console.log(`[${i + 1}/${subset.length}] ⚠️  SKIP — no Hebrew name: ${p.sku}`);
      skipped++;
      continue;
    }

    // Check if already exists
    if (existingSkus.has(p.sku)) {
      console.log(`[${i + 1}/${subset.length}] ⏭  SKIP — already exists: ${p.sku}`);
      skipped++;
      continue;
    }

    // Check if price exists
    const supplierPrice = supplierPrices[p.sku];
    if (!supplierPrice) {
      console.log(`[${i + 1}/${subset.length}] ⚠️  SKIP — no supplier price: ${p.sku}`);
      noPriceSkipped++;
      continue;
    }

    // Map category
    const { cat, subCategory } = mapCategory(p.category);
    const retailPrice = calculatePrice(supplierPrice, cat);

    const doc = {
      name:        p.name_he,
      sku:         p.sku,
      imgUrl:      p.image_url || '',
      images:      p.image_url ? [p.image_url] : [],
      cat,
      category:    cat,
      subCategory,
      price:       retailPrice,
      soferBasePrice: supplierPrice,
      source:      'israel-judaica',
      sourceUrl:   p.product_url,
      status:      'active',
      available:   true,
      hidden:      false,
      outOfStock:  false,
      priority:    50,
      isBestSeller: false,
      badge:       null,
      createdAt:   new Date().toISOString(),
    };

    if (testMode) {
      console.log(`[${i + 1}/5] ✅ WOULD CREATE:`);
      console.log(`     SKU: ${p.sku}`);
      console.log(`     Name: ${p.name_he.slice(0, 60)}`);
      console.log(`     Supplier: ₪${supplierPrice} → Retail: ₪${retailPrice} [${cat}]`);
      created++;
      continue;
    }

    try {
      const ref = await db.collection('products').add(doc);
      console.log(`[${i + 1}/${subset.length}] ✅ Created ${p.sku} — ₪${supplierPrice}→₪${retailPrice} [${cat}] (id: ${ref.id})`);
      created++;
    } catch (e) {
      console.error(`[${i + 1}/${subset.length}] ❌ FAILED ${p.sku}: ${e.message}`);
      failed++;
    }
  }

  console.log('\n─────────────────────────────────────────');
  if (testMode) {
    console.log(`🧪 Test complete. Would create: ${created} | Would skip: ${skipped + noPriceSkipped}`);
    console.log('\nRun WITHOUT --test to import all products.');
  } else {
    console.log(`✅ Created: ${created} | ⏭ Skipped: ${skipped} | 💰 No price: ${noPriceSkipped} | ❌ Failed: ${failed}`);
  }
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
