/**
 * checkSupplierStock.mjs
 *
 * Read-only inventory sync: compares our Firestore products against live
 * supplier sites and produces a JSON + CSV report.
 *
 * Suppliers handled:
 *   israel-judaica  — keyed by `sku` field (numeric string)
 *   paldinox        — keyed by `sourceUrl` field (WooCommerce product URL)
 *
 * Usage:
 *   node app/scripts/checkSupplierStock.mjs
 *
 * Output (app/scripts/stock-reports/):
 *   our-products.json             — Firestore snapshot
 *   report-YYYY-MM-DD.json        — full cross-reference report
 *   report-YYYY-MM-DD-out-of-stock.csv
 *   report-YYYY-MM-DD-in-stock.csv
 *   report-YYYY-MM-DD-new-at-supplier.csv
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Firebase (client SDK — read-only, no service account needed) ───────────
const app = initializeApp({
  apiKey:            'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I',
  authDomain:        'your-sofer.firebaseapp.com',
  projectId:         'your-sofer',
  storageBucket:     'your-sofer.firebasestorage.app',
  messagingSenderId: '7710397068',
  appId:             '1:7710397068:web:3c9880f24871efd4d661a9',
});
const db = getFirestore(app);

// ── Paths & constants ───────────────────────────────────────────────────────
const REPORT_DIR = join(__dirname, 'stock-reports');
const TODAY      = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const sleep      = ms => new Promise(r => setTimeout(r, ms));
const UA         = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';

// ── Israel Judaica — all known category codes (from importAllIsraelJudaica) ─
const IJ_BASE       = 'https://www.israel-judaica.com';
const IJ_CATEGORIES = [
  '1118','1119','1121','1122','1123','1124','1125','1127','1129',
  '1130','1131','1132','1133','1138','1147','1160','1161','1163',
  '1164','1165','1166','1167','1168','1169','1171','1172','1173',
  '1174','1175','1176','1177','1178','1180','1185','1187','1193',
];

// ── Paldinox — category slugs (from scrapePaldinox) ─────────────────────────
const PALDINOX_BASE       = 'https://paldinox.co.il/product-category';
const PALDINOX_CATEGORIES = [
  'יודאיקה', 'הגשה-ואירוח', 'עיצוב-הבית', 'חנוכה', 'פסח', 'ראש-השנה',
];

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1 — Our Firestore products
// ═══════════════════════════════════════════════════════════════════════════
async function fetchOurProducts() {
  console.log('\n📦 Step 1: Loading products from Firestore...');
  const snap = await getDocs(collection(db, 'products'));
  const products = [];
  snap.forEach(d => {
    const p = d.data();
    products.push({
      docId:     d.id,
      sku:       p.sku       || null,
      name:      p.name      || '',
      price:     p.price     ?? null,
      cat:       p.cat       || null,
      source:    p.source    || null,
      sourceUrl: p.sourceUrl || null,
    });
  });
  console.log(`   ✓ ${products.length} products loaded`);
  return products;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2a — Israel Judaica SKU scan
// ═══════════════════════════════════════════════════════════════════════════
async function fetchIJCategorySkus(code) {
  const BATCH = 100;
  const skus  = new Set();
  let offset  = 0;

  while (true) {
    const body = new URLSearchParams({
      category:      code,
      filterChoices: '[]',
      limit:         String(BATCH),
      offset:        String(offset),
      sortValue:     '',
      sortDirection: '',
      note:          '',
      search_term:   '',
    });
    const res = await fetch(
      `${IJ_BASE}/index.php?option=com_art&task=category.getProducts`,
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() }
    );
    if (!res.ok) break;
    const json = await res.json();
    if (!json.status) break;
    const products = json.products || {};
    const keys = Object.keys(products);
    if (keys.length === 0) break;
    for (const sku of keys) skus.add(sku);
    if (keys.length < BATCH) break;
    offset += BATCH;
    await sleep(180);
  }
  return skus;
}

async function scanIsraelJudaica() {
  console.log('\n🔍 Step 2a: Scanning Israel Judaica...');
  const allSkus   = new Set();
  let catFailed   = 0;

  for (const code of IJ_CATEGORIES) {
    try {
      const skus = await fetchIJCategorySkus(code);
      for (const sku of skus) allSkus.add(sku);
      process.stdout.write(`   [${code}] ${skus.size} SKUs\n`);
      await sleep(180);
    } catch (e) {
      process.stdout.write(`   [${code}] ⚠️  failed: ${e.message}\n`);
      catFailed++;
    }
  }

  const ok = catFailed < IJ_CATEGORIES.length;
  console.log(`   ✓ ${allSkus.size} unique SKUs (${catFailed}/${IJ_CATEGORIES.length} categories failed)`);
  return { skus: allSkus, catFailed, status: ok ? 'ok' : 'failed' };
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2b — Paldinox product-URL scan
// ═══════════════════════════════════════════════════════════════════════════
function normalizeUrl(u) {
  if (!u) return '';
  try { u = decodeURIComponent(u); } catch { /* leave as-is */ }
  return u.split('?')[0].replace(/\/$/, '').toLowerCase();
}

async function fetchPaldinoxCategoryUrls(slug) {
  const urls = new Set();
  let page   = 1;

  while (true) {
    const pageUrl = page === 1
      ? `${PALDINOX_BASE}/${encodeURIComponent(slug)}/`
      : `${PALDINOX_BASE}/${encodeURIComponent(slug)}/page/${page}/`;

    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8' },
    });
    if (!res.ok) break;
    const html = await res.text();

    // WooCommerce product links
    let found = 0;
    for (const m of html.matchAll(/href="(https:\/\/paldinox\.co\.il\/product\/[^"#?]+)"/g)) {
      const u = normalizeUrl(m[1]);
      if (u) { urls.add(u); found++; }
    }

    const hasNext = html.includes(`class="next page-numbers"`) ||
                    html.includes(`/page/${page + 1}/`);
    if (!hasNext || found === 0) break;
    page++;
    await sleep(700);
  }
  return urls;
}

async function scanPaldinox() {
  console.log('\n🔍 Step 2b: Scanning Paldinox...');
  const allUrls = new Set();
  let catFailed = 0;

  for (const slug of PALDINOX_CATEGORIES) {
    try {
      const urls = await fetchPaldinoxCategoryUrls(slug);
      for (const u of urls) allUrls.add(u);
      process.stdout.write(`   [${slug}] ${urls.size} products\n`);
      await sleep(700);
    } catch (e) {
      process.stdout.write(`   [${slug}] ⚠️  failed: ${e.message}\n`);
      catFailed++;
    }
  }

  const ok = catFailed < PALDINOX_CATEGORIES.length;
  console.log(`   ✓ ${allUrls.size} unique product URLs (${catFailed}/${PALDINOX_CATEGORIES.length} categories failed)`);
  return { urls: allUrls, catFailed, status: ok ? 'ok' : 'failed' };
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3 — Cross-reference
// ═══════════════════════════════════════════════════════════════════════════
function crossReference(ourProducts, supplierData) {
  const OUT_OF_STOCK   = [];
  const IN_STOCK       = [];
  const NEW_AT_SUPPLIER = [];

  // ── Israel Judaica ──────────────────────────────────────────────────────
  const { skus: ijSkus, status: ijStatus } = supplierData['israel-judaica'];
  const ijOurs = ourProducts.filter(p => p.source === 'israel-judaica' && p.sku);

  if (ijStatus !== 'failed') {
    const ourSkuSet = new Set(ijOurs.map(p => p.sku));

    for (const p of ijOurs) {
      const entry = { ...p, supplier: 'israel-judaica' };
      if (ijSkus.has(p.sku)) IN_STOCK.push(entry);
      else OUT_OF_STOCK.push(entry);
    }
    for (const sku of ijSkus) {
      if (!ourSkuSet.has(sku))
        NEW_AT_SUPPLIER.push({ sku, name: '', supplier: 'israel-judaica', sourceUrl: `${IJ_BASE}/index.php?option=com_art&view=product&sku=${encodeURIComponent(sku)}&lang=he` });
    }
  } else {
    console.log('   ⚠️  Israel Judaica scan failed — skipping cross-reference for this supplier');
  }

  // ── Paldinox ────────────────────────────────────────────────────────────
  const { urls: palUrls, status: palStatus } = supplierData['paldinox'];
  const palOurs = ourProducts.filter(p => p.source === 'paldinox');

  if (palStatus !== 'failed') {
    const ourUrlSet = new Set(palOurs.map(p => normalizeUrl(p.sourceUrl)).filter(Boolean));

    for (const p of palOurs) {
      if (!p.sourceUrl) continue; // can't verify without URL
      const entry = { ...p, supplier: 'paldinox' };
      if (palUrls.has(normalizeUrl(p.sourceUrl))) IN_STOCK.push(entry);
      else OUT_OF_STOCK.push(entry);
    }
    for (const url of palUrls) {
      if (!ourUrlSet.has(url))
        NEW_AT_SUPPLIER.push({ sku: null, name: '', supplier: 'paldinox', sourceUrl: url });
    }
  } else {
    console.log('   ⚠️  Paldinox scan failed — skipping cross-reference for this supplier');
  }

  return { OUT_OF_STOCK, IN_STOCK, NEW_AT_SUPPLIER };
}

// ═══════════════════════════════════════════════════════════════════════════
// CSV helper
// ═══════════════════════════════════════════════════════════════════════════
function toCSV(rows, fields) {
  const esc  = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = fields.join(',');
  const lines  = rows.map(r => fields.map(f => esc(r[f])).join(','));
  return [header, ...lines].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });

  console.log('═'.repeat(55));
  console.log('🏪 YOURSOFER — SUPPLIER STOCK CHECK');
  console.log(`📅 ${TODAY}`);
  console.log('═'.repeat(55));

  // Step 1
  const ourProducts = await fetchOurProducts();
  writeFileSync(
    join(REPORT_DIR, 'our-products.json'),
    JSON.stringify(ourProducts, null, 2),
    'utf-8'
  );

  // Step 2
  const supplierData  = {};
  const supplierMeta  = {};
  let   totalScanned  = 0;
  let   totalFailedSup = 0;

  try {
    const result = await scanIsraelJudaica();
    supplierData['israel-judaica'] = result;
    supplierMeta['israel-judaica'] = {
      skuCount:   result.skus.size,
      catFailed:  result.catFailed,
      status:     result.status,
    };
    if (result.status === 'ok') totalScanned++; else totalFailedSup++;
  } catch (e) {
    console.log(`❌ Israel Judaica scan crashed: ${e.message}`);
    supplierData['israel-judaica'] = { skus: new Set(), status: 'failed' };
    supplierMeta['israel-judaica'] = { status: 'לא נסרק', error: e.message };
    totalFailedSup++;
  }

  try {
    const result = await scanPaldinox();
    supplierData['paldinox'] = result;
    supplierMeta['paldinox'] = {
      urlCount:  result.urls.size,
      catFailed: result.catFailed,
      status:    result.status,
    };
    if (result.status === 'ok') totalScanned++; else totalFailedSup++;
  } catch (e) {
    console.log(`❌ Paldinox scan crashed: ${e.message}`);
    supplierData['paldinox'] = { urls: new Set(), status: 'failed' };
    supplierMeta['paldinox'] = { status: 'לא נסרק', error: e.message };
    totalFailedSup++;
  }

  // Step 3
  console.log('\n📊 Step 3: Cross-referencing inventory...');
  const { OUT_OF_STOCK, IN_STOCK, NEW_AT_SUPPLIER } = crossReference(ourProducts, supplierData);

  // Serialize Sets before writing JSON
  const jsonReport = {
    generatedAt: new Date().toISOString(),
    summary: {
      ourProductsTotal: ourProducts.length,
      suppliersScanned: totalScanned,
      suppliersFailed:  totalFailedSup,
      suppliers:        supplierMeta,
      OUT_OF_STOCK:     OUT_OF_STOCK.length,
      IN_STOCK:         IN_STOCK.length,
      NEW_AT_SUPPLIER:  NEW_AT_SUPPLIER.length,
    },
    OUT_OF_STOCK,
    IN_STOCK,
    NEW_AT_SUPPLIER,
  };

  const CSV_FIELDS_PRODUCT = ['docId','sku','name','price','cat','supplier','sourceUrl'];
  const CSV_FIELDS_NEW     = ['supplier','sku','sourceUrl','name'];

  const jsonPath   = join(REPORT_DIR, `report-${TODAY}.json`);
  const csvOutPath = join(REPORT_DIR, `report-${TODAY}-out-of-stock.csv`);
  const csvInPath  = join(REPORT_DIR, `report-${TODAY}-in-stock.csv`);
  const csvNewPath = join(REPORT_DIR, `report-${TODAY}-new-at-supplier.csv`);

  writeFileSync(jsonPath,   JSON.stringify(jsonReport, null, 2),        'utf-8');
  writeFileSync(csvOutPath, toCSV(OUT_OF_STOCK,   CSV_FIELDS_PRODUCT),  'utf-8');
  writeFileSync(csvInPath,  toCSV(IN_STOCK,        CSV_FIELDS_PRODUCT),  'utf-8');
  writeFileSync(csvNewPath, toCSV(NEW_AT_SUPPLIER, CSV_FIELDS_NEW),      'utf-8');

  // Print summary
  console.log('\n' + '═'.repeat(55));
  console.log('📋 SUMMARY');
  console.log('═'.repeat(55));
  console.log(`מוצרים שלנו (Firestore)       : ${ourProducts.length}`);
  console.log(`ספקים שנסרקו בהצלחה           : ${totalScanned} / ${totalScanned + totalFailedSup}`);
  console.log('');
  for (const [sup, meta] of Object.entries(supplierMeta)) {
    if (meta.status === 'ok') {
      const count = meta.skuCount ?? meta.urlCount ?? '?';
      console.log(`  ✓ ${sup}: ${count} מוצרים`);
    } else {
      console.log(`  ❌ ${sup}: ${meta.status}${meta.error ? ` — ${meta.error}` : ''}`);
    }
  }
  console.log('─'.repeat(55));
  console.log(`🔴 OUT_OF_STOCK  (אצלנו, לא בספק)  : ${OUT_OF_STOCK.length}`);
  console.log(`🟢 IN_STOCK      (אצלנו וגם בספק)  : ${IN_STOCK.length}`);
  console.log(`🆕 NEW_AT_SUPPLIER (בספק, לא אצלנו): ${NEW_AT_SUPPLIER.length}`);
  console.log('═'.repeat(55));
  console.log('\n📁 קבצי דוח:');
  console.log(`   Snapshot   : ${join(REPORT_DIR, 'our-products.json')}`);
  console.log(`   JSON דוח   : ${jsonPath}`);
  console.log(`   CSV אזל    : ${csvOutPath}`);
  console.log(`   CSV קיים   : ${csvInPath}`);
  console.log(`   CSV חדש    : ${csvNewPath}`);

  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
