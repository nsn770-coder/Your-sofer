/**
 * importAllIsraelJudaica.mjs
 * Master importer — loops all israel-judaica categories sequentially.
 *
 * Usage:
 *   node scripts/importAllIsraelJudaica.mjs
 *   node scripts/importAllIsraelJudaica.mjs --dry-run
 *   node scripts/importAllIsraelJudaica.mjs --only=1129
 *   node scripts/importAllIsraelJudaica.mjs --start=1160
 *   node scripts/importAllIsraelJudaica.mjs --only=1129 --dry-run
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
const onlyArg   = args.find(a => a.startsWith('--only='));
const startArg  = args.find(a => a.startsWith('--start='));
const ONLY_CODE = onlyArg  ? onlyArg.split('=')[1]  : null;
const START_CODE = startArg ? startArg.split('=')[1] : null;

// ── Category map ──────────────────────────────────────────────────────────────
const CATEGORY_MAP = [
  { code: '1118', label: 'ברכות',                  cat: 'יודאיקה',                    subCategory: 'ברכונים' },
  { code: '1119', label: 'חמסות וסגולות',           cat: 'יודאיקה',                    subCategory: 'חמסות וסגולות' },
  { code: '1121', label: 'גופיות ציצית',             cat: 'טליתות וציציות',             subCategory: 'גופיות ציצית' },
  { code: '1122', label: 'גביעי קידוש פלסטיק',       cat: 'שבת',                        subCategory: 'כוסות קידוש' },
  { code: '1123', label: 'גביעי קידוש קריסטל',       cat: 'שבת',                        subCategory: 'כוסות קידוש' },
  { code: '1124', label: 'גביעי קידוש מתכת',         cat: 'שבת',                        subCategory: 'כוסות קידוש' },
  { code: '1125', label: 'מחלקי יין ואביזרים',       cat: 'כלי שולחן והגשה',            subCategory: 'מחלקי יין' },
  { code: '1127', label: 'דמויות חסידים',            cat: 'יודאיקה',                    subCategory: 'דמויות חסידים' },
  { code: '1129', label: 'חנוכה',                   cat: 'יודאיקה',                    subCategory: 'חנוכה' },
  { code: '1130', label: 'סוכות',                   cat: 'יודאיקה',                    subCategory: 'סוכות' },
  { code: '1131', label: 'פורים',                   cat: 'יודאיקה',                    subCategory: 'פורים' },
  { code: '1132', label: 'פסח',                     cat: 'יודאיקה',                    subCategory: 'פסח' },
  { code: '1133', label: 'ראש השנה',                cat: 'יודאיקה',                    subCategory: 'ראש השנה' },
  { code: '1160', label: 'מוצרי בית כנסת',          cat: 'מוצרי בית כנסת',             subCategory: 'מוצרי בית כנסת' },
  { code: '1161', label: 'מנורות',                  cat: 'עיצוב הבית',                 subCategory: 'מנורות' },
  { code: '1163', label: 'מגנטים',                  cat: 'יודאיקה',                    subCategory: 'מגנטים' },
  { code: '1164', label: 'מחזיקי מפתחות',           cat: 'יודאיקה',                    subCategory: 'מחזיקי מפתחות' },
  { code: '1165', label: 'נטילת ידיים',             cat: 'יודאיקה',                    subCategory: 'נטילת ידיים' },
  { code: '1166', label: 'סידורים ותהילים',         cat: 'ספרי קודש וסידורים',         subCategory: 'סידורים ותהילים' },
  { code: '1167', label: 'עטים',                    cat: 'יודאיקה',                    subCategory: 'עטים' },
  { code: '1168', label: 'פמוטים',                  cat: 'שבת',                        subCategory: 'פמוטים' },
  { code: '1169', label: 'קופות צדקה',              cat: 'יודאיקה',                    subCategory: 'קופות צדקה' },
  { code: '1171', label: 'כיסויי חלה',              cat: 'שבת',                        subCategory: 'כיסויי חלה' },
  { code: '1172', label: 'כיסויי פלטה',             cat: 'שבת',                        subCategory: 'כיסויי פלטה' },
  { code: '1173', label: 'מפות שולחן',              cat: 'כלי שולחן והגשה',            subCategory: 'מפות שולחן' },
  { code: '1174', label: 'קרשי חלה וסכינים',        cat: 'שבת',                        subCategory: 'קרשי חלה' },
  { code: '1175', label: 'מלחיות',                  cat: 'שבת',                        subCategory: 'מלחיות' },
  { code: '1176', label: 'תכשיטים',                 cat: 'תכשיטים',                    subCategory: 'תכשיטים' },
  { code: '1177', label: 'צמידים וטבעות',           cat: 'תכשיטים',                    subCategory: 'צמידים וטבעות' },
  { code: '1178', label: 'תכשיטי כסף טהור',         cat: 'תכשיטים',                    subCategory: 'תכשיטי כסף' },
  { code: '1180', label: 'נירוסטה ורודיום',         cat: 'תכשיטים',                    subCategory: 'נירוסטה ורודיום' },
  { code: '1185', label: 'קיטלים',                  cat: 'יודאיקה',                    subCategory: 'קיטלים' },
  { code: '1187', label: 'ברכונים',                 cat: 'יודאיקה',                    subCategory: 'ברכונים' },
  { code: '1193', label: 'גביעי קידוש פולימר',      cat: 'שבת',                        subCategory: 'כוסות קידוש' },
  { code: '1116', label: 'הפרשת חלה',               cat: 'שבת',                        subCategory: 'הפרשת חלה' },
];

// ── Constants ─────────────────────────────────────────────────────────────────
const BASE_URL       = 'https://www.israel-judaica.com';
const LANG           = 'he';
const BATCH          = 100;
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';
const UPLOAD_PRESET  = 'yoursofer_upload';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Firebase Admin ────────────────────────────────────────────────────────────
const SA_PATH = process.env.SERVICE_ACCOUNT_PATH || resolve(__dirname, '../app/scripts/your-sofer-firebase-adminsdk-fbsvc-dd43a60da9.json');
const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── Scrape helpers ────────────────────────────────────────────────────────────

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
    const keys = Object.keys(batch);
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

// ── Import one category ───────────────────────────────────────────────────────
async function importCategory(entry, index, total, existingSkus) {
  const { code, label, cat, subCategory } = entry;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`קטגוריה ${index + 1}/${total}: ${label} (${code})  →  ${cat} / ${subCategory}`);
  console.log(`${'─'.repeat(60)}`);

  // Scrape
  const raw  = await fetchAllProducts(code);
  const skus = Object.keys(raw);
  console.log(`  📡 נמצאו ${skus.length} מוצרים ב-israel-judaica`);

  // Fetch Hebrew names
  const scraped = [];
  for (let i = 0; i < skus.length; i++) {
    const sku     = skus[i];
    const product = raw[sku];
    const heb     = await fetchHebName(sku);
    scraped.push({
      sku:         product.sku || sku,
      name_he:     heb?.name    || null,
      name_en:     product.name_en || null,
      image_src:   buildImgUrl(product.image),
      product_url: buildProductUrl(product.sku || sku),
    });
    await sleep(150);
  }

  // Filter: need Hebrew name + not already in Firestore
  const toProcess = scraped.filter(p => {
    if (!p.name_he) return false;
    if (existingSkus.has(p.sku)) return false;
    return true;
  });

  const skipped = scraped.length - toProcess.length;
  console.log(`  📋 חדשים לייבוא: ${toProcess.length}  |  דילוג: ${skipped}`);

  if (toProcess.length === 0) {
    return { code, label, cat, subCategory, found: scraped.length, added: 0, skipped };
  }

  // Build docs + Cloudinary upload
  const docs = [];
  let uploaded = 0, uploadFailed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    let imgUrl = p.image_src || '';

    if (p.image_src && !DRY_RUN) {
      try {
        imgUrl = await uploadToCloudinary(p.image_src);
        uploaded++;
      } catch (e) {
        uploadFailed++;
        // fall back to source URL
      }
    } else if (p.image_src && DRY_RUN) {
      imgUrl = p.image_src; // use source URL in dry-run (no actual upload)
    }

    docs.push({
      name:          p.name_he,
      sku:           p.sku,
      imgUrl,
      images:        [imgUrl].filter(Boolean),
      cat,
      category:      cat,
      subCategory,
      price:         0,
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
      createdAt:     DRY_RUN ? '[FieldValue.serverTimestamp()]' : FieldValue.serverTimestamp(),
    });

    await sleep(80);
  }

  if (DRY_RUN) {
    console.log(`  🧪 DRY RUN — first 3 products:`);
    docs.slice(0, 3).forEach((d, i) => {
      console.log(`    [${i + 1}] ${d.name}  (sku: ${d.sku})`);
      console.log(`         cat: "${d.cat}"  subCategory: "${d.subCategory}"`);
    });
    // Mark these SKUs as "seen" so later categories don't double-count
    toProcess.forEach(p => existingSkus.add(p.sku));
    return { code, label, cat, subCategory, found: scraped.length, added: toProcess.length, skipped, dryRun: true };
  }

  // Write to Firestore
  let created = 0, failed = 0;
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    try {
      await db.collection('products').add(d);
      existingSkus.add(d.sku); // prevent re-import in later categories
      created++;
    } catch (e) {
      console.error(`  ❌ ${d.sku}: ${e.message}`);
      failed++;
    }
  }

  console.log(`  ✅ נוספו: ${created}  |  ☁️  Cloudinary: ${uploaded} הועלו, ${uploadFailed} fallback`);
  return { code, label, cat, subCategory, found: scraped.length, added: created, skipped, failed };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🚀 importAllIsraelJudaica — ${DRY_RUN ? '🧪 DRY RUN' : 'LIVE IMPORT'}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Resolve which categories to run
  let queue = [...CATEGORY_MAP];
  if (ONLY_CODE) {
    queue = queue.filter(e => e.code === ONLY_CODE);
    if (queue.length === 0) {
      console.error(`❌ לא נמצא קוד ${ONLY_CODE} ב-CATEGORY_MAP`);
      process.exit(1);
    }
  } else if (START_CODE) {
    const idx = queue.findIndex(e => e.code === START_CODE);
    if (idx === -1) {
      console.error(`❌ לא נמצא קוד ${START_CODE} ב-CATEGORY_MAP`);
      process.exit(1);
    }
    queue = queue.slice(idx);
    console.log(`⏩ מתחיל מקטגוריה ${START_CODE} (${queue.length}/${CATEGORY_MAP.length} קטגוריות)`);
  }

  // Load existing SKUs once (shared across all categories to dedup)
  console.log('🔍 Loading existing SKUs from Firestore...');
  const existingSnap = await db.collection('products').select('sku').get();
  const existingSkus = new Set();
  existingSnap.forEach(d => { if (d.data().sku) existingSkus.add(d.data().sku); });
  console.log(`   ${existingSkus.size} existing products in Firestore\n`);

  const summary = [];
  let totalFound = 0, totalAdded = 0;

  for (let i = 0; i < queue.length; i++) {
    const entry = queue[i];
    try {
      const result = await importCategory(entry, i, queue.length, existingSkus);
      summary.push(result);
      totalFound += result.found;
      totalAdded += result.added;
      const label = entry.label.padEnd(20);
      console.log(`\n  → קטגוריה ${i + 1}/${queue.length}: ${label} — ${result.found} מוצרים נמצאו, ${result.added} חדשים נוספו`);
    } catch (err) {
      console.error(`\n  ❌ שגיאה בקטגוריה ${entry.code} (${entry.label}): ${err.message}`);
      summary.push({ code: entry.code, label: entry.label, error: err.message, found: 0, added: 0 });
    }

    // Polite gap between categories
    if (i < queue.length - 1) await sleep(500);
  }

  // ── Final summary ─────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 סיכום כולל — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  קטגוריות: ${queue.length}`);
  console.log(`  מוצרים נמצאו סה"כ: ${totalFound}`);
  console.log(`  מוצרים חדשים נוספו: ${totalAdded}`);
  console.log();
  summary.forEach(r => {
    const status = r.error ? `❌ ${r.error}` : `${r.added} נוספו / ${r.found} נמצאו`;
    console.log(`  ${r.code}  ${(r.label || '').padEnd(22)}  ${status}`);
  });

  // Save summary JSON
  const summaryPath = resolve(__dirname, 'israel-judaica-import-summary.json');
  writeFileSync(summaryPath, JSON.stringify({
    date: new Date().toISOString(),
    dryRun: DRY_RUN,
    totalCategories: queue.length,
    totalFound,
    totalAdded,
    categories: summary,
  }, null, 2), 'utf8');
  console.log(`\n  💾 Summary saved → ${summaryPath}\n`);

  process.exit(0);
}

main().catch(err => { console.error('\n❌ Fatal:', err.message); process.exit(1); });
