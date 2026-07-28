/**
 * importMissingKippot.mjs
 * Imports kippot from israel-judaica.com (codes 1143–1151 + 1181)
 * that don't yet exist in Firestore. Creates missing subCategories
 * under "כיפות" and uploads product images to Cloudinary.
 *
 * DRY_RUN = true by default (no writes). Pass --live to run live import.
 *
 * Usage:
 *   node scripts/importMissingKippot.mjs          ← dry-run (prints report only)
 *   node scripts/importMissingKippot.mjs --live   ← live import
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── DRY_RUN = true — change this constant OR pass --live to write ─────────────
const DRY_RUN = !process.argv.includes('--live');

// ── Kippot category map (codes from israel-judaica-categories.json) ────────────
const KIPPOT_CATEGORY_MAP = [
  { code: '1143', label: 'כיפות סרוגות' },
  { code: '1144', label: 'כיפות סאטן וטרילין' },
  { code: '1145', label: 'כיפות קטיפה' },
  { code: '1146', label: 'כיפות סרוגות עם רקמה' },
  { code: '1147', label: 'כיפות מיוחדות' },
  { code: '1148', label: 'כיפות עור' },
  { code: '1149', label: 'כיפות פריק' },
  { code: '1150', label: 'סיכות לכיפה' },
  { code: '1151', label: 'כיפות סרוגות DMC' },
  { code: '1181', label: 'כיפות פריק עבודת יד' },
];

// ── Constants ─────────────────────────────────────────────────────────────────
const BASE_URL       = 'https://www.israel-judaica.com';
const LANG           = 'he';
const BATCH          = 100;
const PRICE_FACTOR   = 3;
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';
const UPLOAD_PRESET  = 'yoursofer_upload';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Firebase Admin ────────────────────────────────────────────────────────────
const SA_PATH        = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── Pricing: supplier × factor, rounded UP to nearest whole X9 (A6) ──────────
// roundUp90 RETIRED: X9.90 fractional prices are forbidden — whole shekels only.
function roundUpWhole9(n) {
  const base = Math.floor(n / 10) * 10;
  const candidate = base + 9;
  return candidate < n ? candidate + 10 : candidate;
}

function calcKippotPrice(supplierPrice) {
  if (!supplierPrice || isNaN(supplierPrice) || supplierPrice <= 0) return 0;
  return roundUpWhole9(supplierPrice * PRICE_FACTOR);
}

// ── Supplier fetch helpers (identical pattern to importAllIsraelJudaica.mjs) ──

async function fetchBatch(categoryCode, offset) {
  const body = new URLSearchParams({
    category:      categoryCode,
    filterChoices: '[]',
    limit:         String(BATCH),
    offset:        String(offset),
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
  if (!res.ok) throw new Error(`HTTP ${res.status} at offset ${offset}`);
  const json = await res.json();
  if (!json.status) throw new Error(json.error || json.msg || 'API status=false');
  return json.products || {};
}

async function fetchAllProducts(categoryCode) {
  const collected = {};
  let offset = 0;
  while (true) {
    const batch = await fetchBatch(categoryCode, offset);
    const keys  = Object.keys(batch);
    if (keys.length === 0) break;
    for (const [sku, p] of Object.entries(batch)) collected[sku] = p;
    if (keys.length < BATCH) break;
    offset += BATCH;
    await sleep(250);
  }
  return collected;
}

async function fetchHebName(sku) {
  try {
    const res = await fetch(
      `${BASE_URL}/index.php?option=com_art&task=search.searchTerm&lang=${LANG}&term=${encodeURIComponent(sku)}`
    );
    if (!res.ok) return null;
    const arr = await res.json();
    const hit = Array.isArray(arr) ? arr.find(p => p.sku === sku) : null;
    return hit ? { name: hit.name || null, price: hit.price || null } : null;
  } catch { return null; }
}

function buildImgUrl(filename) {
  if (!filename) return null;
  const ext = filename.split('.').pop().toLowerCase();
  return `${BASE_URL}/${ext === 'webp' ? 'webp' : 'big'}/${filename}`;
}

function buildProductUrl(sku) {
  return `${BASE_URL}/index.php?option=com_art&view=product&sku=${encodeURIComponent(sku)}&lang=${LANG}`;
}

// ── Cloudinary upload ─────────────────────────────────────────────────────────
async function uploadToCloudinary(imageUrl) {
  const form = new FormData();
  form.append('file', imageUrl);
  form.append('upload_preset', UPLOAD_PRESET);
  const res  = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message ?? 'Cloudinary upload failed');
  return data.secure_url;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'═'.repeat(62)}`);
  console.log(`🚀 importMissingKippot — ${DRY_RUN ? '🧪 DRY RUN (no writes)' : '🔴 LIVE IMPORT'}`);
  console.log(`${'═'.repeat(62)}\n`);

  // ── 1. Load existing SKUs from Firestore ───────────────────────────────────
  console.log('🔍 Loading existing SKUs from Firestore...');
  const productsSnap = await db.collection('products').select('sku').get();
  const existingSkus = new Set();
  productsSnap.forEach(d => { if (d.data().sku) existingSkus.add(d.data().sku); });
  console.log(`   ${existingSkus.size} SKUs in Firestore\n`);

  // ── 2. Load existing categories to detect missing subCategories ────────────
  console.log('🗂️  Loading existing categories from Firestore...');
  const catsSnap = await db.collection('categories').get();
  const existingCatSlugs = new Set();
  catsSnap.forEach(d => {
    const data = d.data();
    const slug = data.slug || data.name;
    if (slug) existingCatSlugs.add(slug);
  });
  console.log(`   ${existingCatSlugs.size} categories found\n`);

  const missingSubCats = KIPPOT_CATEGORY_MAP
    .map(e => e.label)
    .filter(label => !existingCatSlugs.has(label));

  // ── 3. Fetch & dedup products per category ─────────────────────────────────
  const allNewProducts  = [];
  let totalFound        = 0;
  let totalAlreadyExist = 0;
  let totalNoName       = 0;

  for (let i = 0; i < KIPPOT_CATEGORY_MAP.length; i++) {
    const { code, label } = KIPPOT_CATEGORY_MAP[i];

    console.log(`${'─'.repeat(62)}`);
    console.log(`[${i + 1}/${KIPPOT_CATEGORY_MAP.length}] ${label} (code: ${code})`);

    const raw  = await fetchAllProducts(code);
    const skus = Object.keys(raw);
    totalFound += skus.length;
    console.log(`  📡 נמצאו ${skus.length} מוצרים בספק`);

    let catNew = 0, catExist = 0, catNoName = 0;

    for (const sku of skus) {
      const product     = raw[sku];
      const supplierSku = (product.sku || sku).toString().trim();

      // Dedup: skip if already in Firestore
      if (existingSkus.has(supplierSku)) {
        catExist++;
        totalAlreadyExist++;
        continue;
      }

      // Fetch Hebrew name + supplier price from search endpoint
      const heb = await fetchHebName(supplierSku);
      await sleep(150);

      if (!heb?.name) {
        catNoName++;
        totalNoName++;
        continue;
      }

      const supplierPrice = parseFloat(heb.price) || 0;

      allNewProducts.push({
        sku:           supplierSku,
        name_he:       heb.name,
        supplierPrice,
        sellingPrice:  calcKippotPrice(supplierPrice),
        image_src:     buildImgUrl(product.image),
        product_url:   buildProductUrl(supplierSku),
        subCategory:   label,
      });

      existingSkus.add(supplierSku); // prevent cross-category duplicates
      catNew++;
    }

    console.log(`  📋 חדשים: ${catNew}  |  קיימים/דולגו: ${catExist}  |  חסרי שם: ${catNoName}`);

    if (i < KIPPOT_CATEGORY_MAP.length - 1) await sleep(400);
  }

  // ── 4. Report ──────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(62)}`);
  console.log(`📊 סיכום${DRY_RUN ? ' DRY RUN' : ''}`);
  console.log(`${'═'.repeat(62)}`);
  console.log(`  מוצרי כיפות שנמצאו בספק:         ${totalFound}`);
  console.log(`  כבר קיימים ב-Firestore (דולגו):   ${totalAlreadyExist}`);
  console.log(`  חסרי שם עברי (דולגו):             ${totalNoName}`);
  console.log(`  חדשים שייתווספו:                   ${allNewProducts.length}`);
  console.log();

  if (missingSubCats.length === 0) {
    console.log('  תת-קטגוריות חדשות:  (אין — כולן כבר קיימות ב-Firestore)');
  } else {
    console.log(`  תת-קטגוריות חדשות שייווצרו (${missingSubCats.length}):`);
    missingSubCats.forEach(sc => console.log(`    • ${sc}`));
  }

  console.log('\n  ─── טבלת מוצרים לדוגמה (10 ראשונים) ───\n');
  const col1 = 40, col2 = 12, col3 = 12, col4 = 14;
  console.log(
    '  ' + 'שם מוצר'.padEnd(col1) +
    'SKU'.padEnd(col2) +
    'מחיר ספק'.padEnd(col3) +
    'מחיר מכירה'.padEnd(col4) +
    'תת-קטגוריה'
  );
  console.log('  ' + '─'.repeat(col1 + col2 + col3 + col4 + 20));

  allNewProducts.slice(0, 10).forEach(p => {
    const name = (p.name_he || '').slice(0, col1 - 2).padEnd(col1);
    const sku  = p.sku.padEnd(col2);
    const sp   = (p.supplierPrice > 0 ? `₪${p.supplierPrice}` : 'N/A').padEnd(col3);
    const vp   = (p.sellingPrice  > 0 ? `₪${p.sellingPrice}`  : '₪0').padEnd(col4);
    console.log(`  ${name}${sku}${sp}${vp}${p.subCategory}`);
  });

  console.log('  ' + '─'.repeat(col1 + col2 + col3 + col4 + 20));

  if (DRY_RUN) {
    console.log('\n🧪 DRY RUN — לא בוצעו כתיבות ל-Firestore ולא הועלו תמונות ל-Cloudinary.');
    console.log('   להפעלת ייבוא אמיתי, הרץ:\n');
    console.log('   node scripts/importMissingKippot.mjs --live\n');
    process.exit(0);
  }

  // ── 5. LIVE: create missing subCategories ──────────────────────────────────
  if (missingSubCats.length > 0) {
    console.log('\n📂 יוצר תת-קטגוריות חסרות...');
    for (let i = 0; i < missingSubCats.length; i++) {
      const label = missingSubCats[i];
      await db.collection('categories').add({
        slug:           label,
        displayName:    label,
        parentCategory: 'כיפות',
        cat:            'כיפות',
        priority:       i + 1,
        createdAt:      FieldValue.serverTimestamp(),
      });
      console.log(`  ✅ נוצרה: ${label}`);
    }
  }

  // ── 6. LIVE: upload images to Cloudinary + write products to Firestore ──────
  console.log(`\n⬆️  מעלה תמונות ל-Cloudinary ומייבא ${allNewProducts.length} מוצרים...`);
  let created = 0, failed = 0, uploaded = 0, uploadFailed = 0;

  for (const p of allNewProducts) {
    let imgUrl = p.image_src || '';

    if (p.image_src) {
      try {
        imgUrl = await uploadToCloudinary(p.image_src);
        uploaded++;
      } catch (e) {
        console.warn(`  ⚠️  Cloudinary ${p.sku}: ${e.message}`);
        uploadFailed++;
      }
    }

    try {
      await db.collection('products').add({
        name:          p.name_he,
        sku:           p.sku,
        imgUrl,
        images:        [imgUrl].filter(Boolean),
        cat:           'כיפות',
        category:      'כיפות',
        subCategory:   p.subCategory,
        price:         p.sellingPrice,
        supplierPrice: p.supplierPrice || null,
        originalPrice: null,
        source:        'israel-judaica',
        sourceUrl:     p.product_url,
        status:        'active',
        hidden:        false,
        outOfStock:    true,
        priority:      50,
        isBestSeller:  false,
        badge:         null,
        available:     true,
        createdAt:     FieldValue.serverTimestamp(),
      });
      created++;
    } catch (e) {
      console.error(`  ❌ ${p.sku}: ${e.message}`);
      failed++;
    }

    await sleep(80);
  }

  console.log(`\n${'═'.repeat(62)}`);
  console.log('✅ ייבוא הושלם');
  console.log(`${'═'.repeat(62)}`);
  console.log(`  תת-קטגוריות חדשות שנוצרו: ${missingSubCats.length}`);
  console.log(`  מוצרים שנוצרו:             ${created}`);
  console.log(`  שגיאות Firestore:          ${failed}`);
  console.log(`  Cloudinary:                ${uploaded} הועלו, ${uploadFailed} fallback לURL ספק`);
  console.log();

  process.exit(0);
}

main().catch(err => { console.error('\n❌ Fatal:', err.message); process.exit(1); });
