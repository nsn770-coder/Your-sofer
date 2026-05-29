/**
 * importIsraelJudaicaCategory.mjs
 * Scrapes ONE category from israel-judaica.com and imports to Firestore.
 *
 * Usage:
 *   node scripts/importIsraelJudaicaCategory.mjs --code=1126 --label=הבדלה --dry-run
 *   node scripts/importIsraelJudaicaCategory.mjs --code=1126 --label=הבדלה
 *
 * --dry-run  : scrape + upload images to Cloudinary, but write NOTHING to Firestore
 * --code=N   : israel-judaica category code
 * --label=X  : Hebrew label for the category (used as subCategory)
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Args ──────────────────────────────────────────────────────────────────────
const args      = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry-run');
const codeArg   = args.find(a => a.startsWith('--code='));
const labelArg  = args.find(a => a.startsWith('--label='));

if (!codeArg) {
  console.error('❌ חסר --code=N  (לדוגמה: --code=1126)');
  process.exit(1);
}

const CATEGORY_CODE  = codeArg.split('=')[1];
const CATEGORY_LABEL = labelArg ? labelArg.split('=').slice(1).join('=') : `קטגוריה ${CATEGORY_CODE}`;

// ── Constants ──────────────────────────────────────────────────────────────────
const BASE_URL       = 'https://www.israel-judaica.com';
const LANG           = 'he';
const BATCH          = 100;
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';
const UPLOAD_PRESET  = 'yoursofer_upload';
const PRICE_FACTOR   = 2.18; // reserved for when real prices are added

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Firebase Admin (SA file — same location as other app/scripts) ─────────────
const SA_PATH = resolve(__dirname, '../app/scripts/your-sofer-firebase-adminsdk-fbsvc-dd43a60da9.json');
const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── Scrape helpers (identical pattern to scrapeIsraelJudaica.mjs) ──────────────

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

async function fetchHebName(sku) {
  try {
    const res = await fetch(
      `${BASE_URL}/index.php?option=com_art&task=search.searchTerm&lang=${LANG}&term=${encodeURIComponent(sku)}`
    );
    if (!res.ok) return null;
    const arr = await res.json();
    const hit = Array.isArray(arr) ? arr.find(p => p.sku === sku) : null;
    return hit ? { name: hit.name || null, price: hit.price || null, currency: hit.currency || null } : null;
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

async function fetchAllProducts() {
  const collected = {};
  let offset = 0;
  while (true) {
    const batch = await fetchBatch(CATEGORY_CODE, offset);
    const keys = Object.keys(batch);
    if (keys.length === 0) break;
    for (const [sku, p] of Object.entries(batch)) collected[sku] = p;
    if (keys.length < BATCH) break;
    offset += BATCH;
    await sleep(250);
  }
  return collected;
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
  console.log(`\n${DRY_RUN ? '🧪 DRY RUN' : '🚀 LIVE IMPORT'} — category ${CATEGORY_CODE} (${CATEGORY_LABEL})`);
  console.log(`   source: ${BASE_URL}\n`);

  // ── 1. Pre-fetch existing SKUs ────────────────────────────────────────────
  console.log('🔍 Loading existing SKUs from Firestore...');
  const existingSnap = await db.collection('products').select('sku').get();
  const existingSkus = new Set();
  existingSnap.forEach(d => { if (d.data().sku) existingSkus.add(d.data().sku); });
  console.log(`   ${existingSkus.size} existing products in Firestore\n`);

  // ── 2. Scrape full category ───────────────────────────────────────────────
  console.log(`📡 Scraping category ${CATEGORY_CODE}...`);
  const raw  = await fetchAllProducts();
  const skus = Object.keys(raw);
  console.log(`   Found ${skus.length} products in category\n`);

  // ── 3. Fetch Hebrew names for each SKU ────────────────────────────────────
  console.log('📝 Fetching Hebrew names...');
  const scraped = [];
  for (let i = 0; i < skus.length; i++) {
    const sku     = skus[i];
    const product = raw[sku];
    const heb     = await fetchHebName(sku);
    scraped.push({
      sku:          product.sku || sku,
      product_code: product.product_code || null,
      name_he:      heb?.name    || null,
      name_en:      product.name_en || null,
      price_raw:    heb?.price   || null,
      currency:     heb?.currency || null,
      image_src:    buildImgUrl(product.image),
      product_url:  buildProductUrl(product.sku || sku),
    });
    process.stdout.write(`  [${i + 1}/${skus.length}] ${scraped[scraped.length - 1].name_he || sku}\n`);
    await sleep(150);
  }

  // ── 4. Filter: skip if no Hebrew name, or already in Firestore ────────────
  const toProcess = scraped.filter(p => {
    if (!p.name_he) { console.log(`  ⚠️  SKIP no Hebrew name: ${p.sku}`); return false; }
    if (existingSkus.has(p.sku)) { console.log(`  ⏭  SKIP already exists: ${p.sku}`); return false; }
    return true;
  });
  console.log(`\n📋 To import: ${toProcess.length}  |  Skipped: ${scraped.length - toProcess.length}\n`);

  // ── 5. Build Firestore documents (+ Cloudinary upload) ────────────────────
  console.log('☁️  Uploading images to Cloudinary and building documents...\n');
  const docs   = [];
  let uploaded = 0, uploadFailed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];

    // Cloudinary upload
    let imgUrl = p.image_src || '';
    if (p.image_src) {
      try {
        imgUrl = await uploadToCloudinary(p.image_src);
        uploaded++;
        process.stdout.write(`  [${i + 1}/${toProcess.length}] ☁  ${p.sku} — uploaded\n`);
      } catch (e) {
        uploadFailed++;
        process.stdout.write(`  [${i + 1}/${toProcess.length}] ⚠️  ${p.sku} — Cloudinary failed, using source URL: ${e.message.slice(0, 60)}\n`);
      }
    }

    // Build the document that WOULD be written
    docs.push({
      name:         p.name_he,
      sku:          p.sku,
      imgUrl,
      images:       [imgUrl].filter(Boolean),
      cat:          'יודאיקה',
      category:     'יודאיקה',
      subCategory:  CATEGORY_LABEL,         // 'הבדלה'
      price:        0,                       // will be updated after login + price scrape
      originalPrice: null,
      source:       'israel-judaica',
      sourceUrl:    p.product_url,
      status:       'active',               // for pipeline scripts (aiMedia, etc.)
      hidden:       true,                   // ← hides from storefront until real price set
      priority:     50,
      isBestSeller: false,
      badge:        null,
      available:    true,
      createdAt:    DRY_RUN ? '[FieldValue.serverTimestamp()]' : FieldValue.serverTimestamp(),
    });

    await sleep(80); // small gap between Cloudinary uploads
  }

  // ── 6. Print first 5 documents ────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('SAMPLE — first 5 documents that would be written:\n');
  docs.slice(0, 5).forEach((d, i) => {
    console.log(`[${i + 1}] ${JSON.stringify(d, null, 4)}\n`);
  });

  // ── 7. Summary ────────────────────────────────────────────────────────────
  console.log('══════════════════════════════════════════════════════════');
  console.log(`\n📊 SUMMARY`);
  console.log(`   Category  : ${CATEGORY_CODE} — ${CATEGORY_LABEL}`);
  console.log(`   Scraped   : ${scraped.length} products`);
  console.log(`   To import : ${toProcess.length} (new, have Hebrew name)`);
  console.log(`   Cloudinary: ${uploaded} uploaded, ${uploadFailed} fallback to source URL`);
  console.log(`   hidden    : true  ← all products hidden until price is set`);
  console.log(`   price     : 0     ← to be filled by SKU match after login`);

  if (DRY_RUN) {
    console.log('\n🧪 DRY RUN complete — nothing written to Firestore.');
    console.log('   Re-run WITHOUT --dry-run to import.\n');

    // Save dry-run preview to JSON for inspection
    const outPath = resolve(__dirname, `israel-judaica-${CATEGORY_CODE}-dry-run.json`);
    writeFileSync(outPath, JSON.stringify(docs, null, 2), 'utf8');
    console.log(`   Preview saved → ${outPath}\n`);
    process.exit(0);
  }

  // ── 8. Real write ─────────────────────────────────────────────────────────
  console.log('\n🚀 Writing to Firestore...\n');
  let created = 0, failed = 0;

  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    try {
      const ref = await db.collection('products').add(d);
      console.log(`  [${i + 1}/${docs.length}] ✅ ${d.sku} — ${String(d.name).slice(0, 50)} (id: ${ref.id})`);
      created++;
    } catch (e) {
      console.error(`  [${i + 1}/${docs.length}] ❌ ${d.sku}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n🎉 Done!`);
  console.log(`   ✅ Created : ${created}`);
  console.log(`   ❌ Failed  : ${failed}`);
  console.log(`   ⏭  Skipped : ${scraped.length - toProcess.length}`);
  console.log(`\n   All products are hidden: true — run your price-update script`);
  console.log(`   (or Admin panel) to set prices and flip hidden: false.\n`);
  process.exit(0);
}

main().catch(err => { console.error('\n❌ Fatal:', err.message); process.exit(1); });
