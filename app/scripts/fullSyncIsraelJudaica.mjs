/**
 * fullSyncIsraelJudaica.mjs
 *
 * sync מלא מול israel-judaica.com:
 *   1. גלה קטגוריות חדשות אצל הספק (probe codes)
 *   2. שלוף כל SKUs מהספק
 *   3. מוצרים שהיו אצלנו ועכשיו אין → מחק Firestore + Cloudinary
 *   4. מוצרים חדשים שיש אצל הספק ואין אצלנו → ייבא
 *
 * Usage:
 *   node app/scripts/fullSyncIsraelJudaica.mjs --dry-run      ← תצוגה בלבד
 *   node app/scripts/fullSyncIsraelJudaica.mjs --execute      ← ביצוע
 *   node app/scripts/fullSyncIsraelJudaica.mjs --execute --skip-delete  ← ייבוא בלי מחיקה
 *   node app/scripts/fullSyncIsraelJudaica.mjs --execute --skip-import  ← מחיקה בלי ייבוא
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue }      from 'firebase-admin/firestore';
import { readFileSync, writeFileSync }   from 'fs';
import { resolve, dirname }              from 'path';
import { fileURLToPath }                 from 'url';
import crypto                            from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '../..');

// ── CLI ───────────────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const EXECUTE     = args.includes('--execute');
const SKIP_DELETE = args.includes('--skip-delete');
const SKIP_IMPORT = args.includes('--skip-import');
const DRY_RUN     = !EXECUTE;

if (DRY_RUN) console.log('🧪  DRY-RUN — Firestore/Cloudinary לא יעודכנו. הוסף --execute להרצה.\n');

// ── Env vars ──────────────────────────────────────────────────────────────────
function loadEnv(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      const key = t.slice(0, i).trim();
      const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}
loadEnv(resolve(ROOT, '.env.local'));
loadEnv(resolve(ROOT, '.env.israel-judaica'));

const CLOUDINARY_CLOUD    = 'dyxzq3ucy';
const CLOUDINARY_API_KEY  = process.env.CLOUDINARY_API_KEY  || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const UPLOAD_PRESET       = 'yoursofer_upload';
const BASE_URL            = 'https://www.israel-judaica.com';
const LANG                = 'he';
const BATCH               = 100;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Firebase ──────────────────────────────────────────────────────────────────
const SA_PATH = resolve(ROOT, 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

// ── Known category map ────────────────────────────────────────────────────────
const CATEGORY_MAP = [
  { code: '1116', label: 'הפרשת חלה',          cat: 'שבת',                subCategory: 'הפרשת חלה' },
  { code: '1118', label: 'ברכות',               cat: 'יודאיקה',            subCategory: 'ברכונים' },
  { code: '1119', label: 'חמסות וסגולות',        cat: 'יודאיקה',            subCategory: 'חמסות וסגולות' },
  { code: '1121', label: 'גופיות ציצית',          cat: 'טליתות',             subCategory: 'גופיות ציצית' },
  { code: '1122', label: 'גביעי קידוש פלסטיק',   cat: 'שבת',                subCategory: 'כוסות קידוש' },
  { code: '1123', label: 'גביעי קידוש קריסטל',   cat: 'שבת',                subCategory: 'כוסות קידוש' },
  { code: '1124', label: 'גביעי קידוש מתכת',     cat: 'שבת',                subCategory: 'כוסות קידוש' },
  { code: '1125', label: 'מחלקי יין ואביזרים',   cat: 'שבת',                subCategory: 'מחלקי יין' },
  { code: '1127', label: 'דמויות חסידים',         cat: 'יודאיקה',            subCategory: 'דמויות חסידים' },
  { code: '1129', label: 'חנוכה',               cat: 'חגים',               subCategory: 'חנוכה' },
  { code: '1130', label: 'סוכות',               cat: 'חגים',               subCategory: 'סוכות' },
  { code: '1131', label: 'פורים',               cat: 'חגים',               subCategory: 'פורים' },
  { code: '1132', label: 'פסח',                 cat: 'חגים',               subCategory: 'פסח' },
  { code: '1133', label: 'ראש השנה',             cat: 'חגים',               subCategory: 'ראש השנה' },
  { code: '1135', label: 'בתי תפילין',           cat: 'יודאיקה',            subCategory: 'בתי תפילין' },
  { code: '1136', label: 'תיקי טלית',            cat: 'טליתות',             subCategory: 'תיקי טלית' },
  { code: '1137', label: 'מחזיקי טלית',          cat: 'טליתות',             subCategory: 'מחזיקי טלית' },
  { code: '1138', label: 'טליתות',               cat: 'טליתות',             subCategory: 'טלית גדול' },
  { code: '1139', label: 'סטים טלית תפילין',     cat: 'טליתות',             subCategory: 'סט טלית תפילין' },
  { code: '1143', label: 'כיפות סרוגות',         cat: 'כיפות',              subCategory: 'סרוגות' },
  { code: '1144', label: 'כיפות סאטן וטרילין',   cat: 'כיפות',              subCategory: 'סאטן וטריקלין' },
  { code: '1145', label: 'כיפות קטיפה',          cat: 'כיפות',              subCategory: 'קטיפה' },
  { code: '1146', label: 'כיפות סרוגות עם רקמה', cat: 'כיפות',              subCategory: 'סרוגות עם רקמה' },
  { code: '1147', label: 'כיפות מיוחדות',        cat: 'כיפות',              subCategory: 'כיפות מיוחדות' },
  { code: '1148', label: 'כיפות עור',            cat: 'כיפות',              subCategory: 'עור' },
  { code: '1149', label: 'כיפות פריק',           cat: 'כיפות',              subCategory: 'פריק' },
  { code: '1150', label: 'סיכות לכיפה',          cat: 'כיפות',              subCategory: 'סיכות כיפה' },
  { code: '1151', label: 'כיפות סרוגות DMC',     cat: 'כיפות',              subCategory: 'סרוגות ד.מ.צ.' },
  { code: '1153', label: 'מזוזות זכוכית',         cat: 'בתי מזוזה',          subCategory: 'מזוזות זכוכית' },
  { code: '1154', label: 'מזוזות אלומיניום',      cat: 'בתי מזוזה',          subCategory: 'מזוזות אלומיניום' },
  { code: '1156', label: 'מזוזות לרכב',           cat: 'בתי מזוזה',          subCategory: 'מזוזות לרכב' },
  { code: '1157', label: 'מזוזות מתכת',           cat: 'בתי מזוזה',          subCategory: 'מזוזות מתכת' },
  { code: '1158', label: 'מזוזות עץ',             cat: 'בתי מזוזה',          subCategory: 'מזוזות עץ' },
  { code: '1159', label: 'מזוזות פלסטיק',         cat: 'בתי מזוזה',          subCategory: 'מזוזות פלסטיק' },
  { code: '1160', label: 'מוצרי בית כנסת',        cat: 'יודאיקה',            subCategory: 'מוצרי בית כנסת' },
  { code: '1161', label: 'מנורות',               cat: 'יודאיקה',            subCategory: 'מנורות' },
  { code: '1163', label: 'מגנטים',               cat: 'יודאיקה',            subCategory: 'מגנטים' },
  { code: '1164', label: 'מחזיקי מפתחות',         cat: 'יודאיקה',            subCategory: 'מחזיקי מפתחות' },
  { code: '1165', label: 'נטילת ידיים',           cat: 'יודאיקה',            subCategory: 'נטילת ידיים' },
  { code: '1166', label: 'סידורים ותהילים',       cat: 'יודאיקה',            subCategory: 'סידורים ותהילים' },
  { code: '1167', label: 'עטים',                 cat: 'יודאיקה',            subCategory: 'עטים' },
  { code: '1168', label: 'פמוטים',               cat: 'שבת',                subCategory: 'פמוטים' },
  { code: '1169', label: 'קופות צדקה',            cat: 'יודאיקה',            subCategory: 'קופות צדקה' },
  { code: '1171', label: 'כיסויי חלה',            cat: 'שבת',                subCategory: 'כיסויי חלה' },
  { code: '1172', label: 'כיסויי פלטה',           cat: 'שבת',                subCategory: 'כיסויי פלטה' },
  { code: '1173', label: 'מפות שולחן',            cat: 'שבת',                subCategory: 'מפות שולחן' },
  { code: '1174', label: 'קרשי חלה וסכינים',      cat: 'שבת',                subCategory: 'קרשי חלה' },
  { code: '1175', label: 'מלחיות',               cat: 'שבת',                subCategory: 'מלחיות' },
  { code: '1177', label: 'צמידים וטבעות',         cat: 'יודאיקה',            subCategory: 'תכשיטים' },
  { code: '1178', label: 'תכשיטי כסף טהור',       cat: 'יודאיקה',            subCategory: 'תכשיטים' },
  { code: '1180', label: 'נירוסטה ורודיום',       cat: 'יודאיקה',            subCategory: 'תכשיטים' },
  { code: '1181', label: 'כיפות פריק עבודת יד',   cat: 'כיפות',              subCategory: 'פריק עבודת יד' },
  { code: '1184', label: 'תיקי תפילין',           cat: 'טליתות',             subCategory: 'תיקי תפילין' },
  { code: '1185', label: 'קיטלים',               cat: 'יודאיקה',            subCategory: 'קיטלים' },
  { code: '1187', label: 'ברכונים',              cat: 'יודאיקה',            subCategory: 'ברכונים' },
  { code: '1193', label: 'גביעי קידוש פולימר',   cat: 'שבת',                subCategory: 'כוסות קידוש' },
];

// ── Supplier API ──────────────────────────────────────────────────────────────
async function fetchBatch(categoryCode, offset) {
  const body = new URLSearchParams({
    category: categoryCode, filterChoices: '[]',
    limit: String(BATCH), offset: String(offset),
    sortValue: '', sortDirection: '', note: '', search_term: '',
  });
  const res = await fetch(`${BASE_URL}/index.php?option=com_art&task=category.getProducts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.status) return {};
  return json.products || {};
}

async function fetchAllSkusForCode(code) {
  const collected = {};
  let offset = 0;
  while (true) {
    const batch = await fetchBatch(code, offset);
    const keys = Object.keys(batch);
    if (!keys.length) break;
    for (const [sku, p] of Object.entries(batch)) collected[sku] = p;
    if (keys.length < BATCH) break;
    offset += BATCH;
    await sleep(300);
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
    return hit ? { name: hit.name || null } : null;
  } catch { return null; }
}

function buildImgUrl(filename) {
  if (!filename) return null;
  const ext = filename.split('.').pop().toLowerCase();
  return `${BASE_URL}/${ext === 'webp' ? 'webp' : 'big'}/${filename}`;
}

// ── Cloudinary helpers ────────────────────────────────────────────────────────
function extractPublicId(cloudinaryUrl) {
  if (!cloudinaryUrl || !cloudinaryUrl.includes('cloudinary.com')) return null;
  // Strip transforms: /upload/v123/  or  /upload/f_auto,.../
  const match = cloudinaryUrl.match(/\/upload\/(?:[^/]+\/)?(.+?)(?:\.[a-z]+)?$/i);
  return match ? match[1] : null;
}

async function uploadToCloudinary(imageUrl) {
  const form = new FormData();
  form.append('file', imageUrl);
  form.append('upload_preset', UPLOAD_PRESET);
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message ?? 'Cloudinary upload failed');
  return data.secure_url;
}

async function deleteFromCloudinary(publicId) {
  if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.log(`    ⚠️  אין CLOUDINARY_API_KEY/SECRET — דלג מחיקה: ${publicId}`);
    return false;
  }
  const timestamp = Math.round(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
    .digest('hex');
  const form = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), api_key: CLOUDINARY_API_KEY, signature });
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/destroy`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString(),
  });
  const json = await res.json();
  return json.result === 'ok';
}

// ── Phase 1: Discover new categories ─────────────────────────────────────────
async function discoverNewCategories() {
  console.log('\n══ שלב 1: חיפוש קטגוריות חדשות (קודים 1194–1250) ══\n');
  const knownCodes = new Set(CATEGORY_MAP.map(c => c.code));
  const newCats = [];

  for (let code = 1194; code <= 1250; code++) {
    try {
      const batch = await fetchBatch(String(code), 0);
      if (Object.keys(batch).length > 0) {
        console.log(`  ✅ קוד ${code}: ${Object.keys(batch).length} מוצרים (חדש!)`);
        newCats.push({ code: String(code), count: Object.keys(batch).length });
      }
    } catch {}
    await sleep(200);
  }

  if (newCats.length === 0) {
    console.log('  ✅ לא נמצאו קטגוריות חדשות מעבר לידועות.');
  } else {
    console.log(`\n⚠️  נמצאו ${newCats.length} קטגוריות חדשות — יש להוסיף ל-CATEGORY_MAP:`);
    newCats.forEach(c => console.log(`     code: '${c.code}', label: '???', cat: '???', subCategory: '???'  (${c.count} מוצרים)`));
    writeFileSync(resolve(__dirname, '../../scripts/new-categories-found.json'), JSON.stringify(newCats, null, 2));
    console.log('  📄 נשמר: scripts/new-categories-found.json');
  }
  return newCats;
}

// ── Phase 2: Fetch all supplier SKUs ─────────────────────────────────────────
async function fetchAllSupplierSkus() {
  console.log('\n══ שלב 2: שליפת כל SKUs מהספק ══\n');
  const supplierSkus = new Map(); // sku → { catEntry, rawProduct }
  let totalCats = CATEGORY_MAP.length;

  for (let i = 0; i < CATEGORY_MAP.length; i++) {
    const entry = CATEGORY_MAP[i];
    process.stdout.write(`  [${i+1}/${totalCats}] code=${entry.code} (${entry.label})... `);
    try {
      const products = await fetchAllSkusForCode(entry.code);
      const skuList = Object.keys(products);
      process.stdout.write(`${skuList.length} מוצרים\n`);
      for (const [sku, rawProduct] of Object.entries(products)) {
        if (!supplierSkus.has(sku)) supplierSkus.set(sku, { catEntry: entry, rawProduct });
      }
    } catch (e) {
      process.stdout.write(`❌ שגיאה: ${e.message}\n`);
    }
    await sleep(400);
  }

  console.log(`\n  📦 סה"כ ${supplierSkus.size} SKUs ייחודיים אצל הספק`);
  return supplierSkus;
}

// ── Phase 3: Load Firestore products ──────────────────────────────────────────
async function loadFirestoreProducts() {
  console.log('\n══ שלב 3: טעינת מוצרי israel-judaica מ-Firestore ══\n');
  const snap = await db.collection('products').where('source', '==', 'israel-judaica').get();
  const products = [];
  snap.forEach(d => {
    const data = d.data();
    products.push({ id: d.id, sku: data.supplierCode || data.sku || null, ...data });
  });
  console.log(`  📥 נטענו ${products.length} מוצרים`);
  return products;
}

// ── Phase 4: Delete discontinued products ────────────────────────────────────
async function deleteDiscontinued(firestoreProducts, supplierSkus) {
  if (SKIP_DELETE) { console.log('\n══ שלב 4: דילוג מחיקה (--skip-delete) ══'); return; }
  console.log('\n══ שלב 4: מחיקת מוצרים שפסקו אצל הספק ══\n');

  const discontinued = firestoreProducts.filter(p => p.sku && !supplierSkus.has(p.sku));
  console.log(`  🗑️  ${discontinued.length} מוצרים שפסקו (SKU לא מופיע אצל הספק)`);

  if (discontinued.length === 0) {
    console.log('  ✅ אין מוצרים למחיקה.');
    return;
  }

  // Show preview
  discontinued.slice(0, 20).forEach(p => console.log(`    • ${p.name || p.sku} [${p.sku}]`));
  if (discontinued.length > 20) console.log(`    ... ועוד ${discontinued.length - 20}`);

  if (DRY_RUN) { console.log('\n  🧪 DRY-RUN — לא נמחק כלום'); return; }

  // Save backup
  const backup = discontinued.map(p => ({ id: p.id, sku: p.sku, name: p.name, imgUrl: p.imgUrl }));
  const backupPath = resolve(__dirname, `../../scripts/discontinued-backup-${Date.now()}.json`);
  writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`\n  💾 גיבוי: ${backupPath}`);

  let deleted = 0, cloudDeleted = 0, cloudFailed = 0;

  for (const product of discontinued) {
    process.stdout.write(`  מוחק: ${product.name || product.sku}... `);

    // Delete Cloudinary image
    if (product.imgUrl && product.imgUrl.includes('cloudinary.com')) {
      const publicId = extractPublicId(product.imgUrl);
      if (publicId) {
        const ok = await deleteFromCloudinary(publicId);
        if (ok) { cloudDeleted++; process.stdout.write('☁️✓ '); }
        else    { cloudFailed++;  process.stdout.write('☁️✗ '); }
      }
    }

    // Delete from Firestore
    await db.collection('products').doc(product.id).delete();
    deleted++;
    process.stdout.write('🗑️✓\n');

    await sleep(100);
  }

  console.log(`\n  ✅ נמחקו ${deleted} מוצרים | Cloudinary: ${cloudDeleted} מחיקות, ${cloudFailed} כישלונות`);
}

// ── Phase 5: Import new products ─────────────────────────────────────────────
async function importNewProducts(firestoreProducts, supplierSkus) {
  if (SKIP_IMPORT) { console.log('\n══ שלב 5: דילוג ייבוא (--skip-import) ══'); return; }
  console.log('\n══ שלב 5: ייבוא מוצרים חדשים ══\n');

  const existingSkus = new Set(firestoreProducts.map(p => p.sku).filter(Boolean));
  const newSkus = [...supplierSkus.entries()].filter(([sku]) => !existingSkus.has(sku));
  console.log(`  🆕 ${newSkus.length} מוצרים חדשים שאין אצלנו`);

  if (newSkus.length === 0) { console.log('  ✅ אין מוצרים חדשים לייבא.'); return; }

  if (DRY_RUN) {
    console.log('  🧪 DRY-RUN — לא ייובא כלום. דגום ראשון:');
    newSkus.slice(0, 10).forEach(([sku, { catEntry }]) =>
      console.log(`    • ${sku} → ${catEntry.cat} / ${catEntry.subCategory}`)
    );
    return;
  }

  let imported = 0, failed = 0;
  for (let i = 0; i < newSkus.length; i++) {
    const [sku, { catEntry, rawProduct }] = newSkus[i];
    process.stdout.write(`  [${i+1}/${newSkus.length}] ${sku}... `);

    // Fetch Hebrew name
    const heb = await fetchHebName(sku);
    await sleep(300);

    if (!heb?.name) {
      process.stdout.write('⚠️  ללא שם עברי — דולג\n');
      failed++;
      continue;
    }

    // Upload image to Cloudinary
    const supplierImgUrl = rawProduct.image ? `${BASE_URL}/${rawProduct.image.split('.').pop() === 'webp' ? 'webp' : 'big'}/${rawProduct.image}` : null;
    let cloudinaryUrl = null;
    if (supplierImgUrl) {
      try {
        cloudinaryUrl = await uploadToCloudinary(supplierImgUrl);
        process.stdout.write('☁️✓ ');
      } catch { process.stdout.write('☁️✗ '); }
      await sleep(400);
    }

    const purchasePrice = rawProduct.price ? parseFloat(rawProduct.price) : null;
    const salePrice     = purchasePrice ? Math.round(purchasePrice * 1.4 * 10) / 10 : null;

    const newDoc = {
      name:          heb.name,
      sku:           sku,
      supplierCode:  sku,
      source:        'israel-judaica',
      category:      catEntry.cat,
      subCategory:   catEntry.subCategory,
      imgUrl:        cloudinaryUrl || supplierImgUrl || null,
      purchasePrice: purchasePrice,
      price:         salePrice,
      stockStatus:   'in_stock',
      status:        'inactive', // צריך בדיקה לפני פרסום
      supplierCatCode: catEntry.code,
      createdAt:     FieldValue.serverTimestamp(),
    };

    await db.collection('products').add(newDoc);
    imported++;
    process.stdout.write(`✓ ${heb.name.slice(0, 30)}\n`);
    await sleep(200);
  }

  console.log(`\n  ✅ יובאו ${imported} מוצרים חדשים | נכשלו: ${failed}`);
  console.log('  ℹ️  כל המוצרים החדשים מוגדרים status=inactive — בדוק וכנן לפרסום.');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═'.repeat(60));
  console.log(' YourSofer — Full Israel-Judaica Sync');
  console.log(`═`.repeat(60));
  console.log(`מצב: ${DRY_RUN ? '🧪 DRY-RUN' : '🚀 EXECUTE'}`);
  if (!DRY_RUN) {
    console.log(`מחיקת מוצרים שפסקו: ${SKIP_DELETE ? '⏭ דילוג' : '✅ פעיל'}`);
    console.log(`ייבוא מוצרים חדשים: ${SKIP_IMPORT ? '⏭ דילוג' : '✅ פעיל'}`);
  }
  if (!CLOUDINARY_API_KEY) {
    console.log('⚠️  CLOUDINARY_API_KEY חסר — מחיקת תמונות מ-Cloudinary לא תפעל.');
    console.log('   הוסף CLOUDINARY_API_KEY ו-CLOUDINARY_API_SECRET ל-.env.local');
  }
  console.log('═'.repeat(60));

  const newCats = await discoverNewCategories();
  const supplierSkus = await fetchAllSupplierSkus();
  const firestoreProducts = await loadFirestoreProducts();

  // Summary before acting
  const existingSkus = new Set(firestoreProducts.map(p => p.sku).filter(Boolean));
  const toDelete = firestoreProducts.filter(p => p.sku && !supplierSkus.has(p.sku));
  const toImport = [...supplierSkus.keys()].filter(sku => !existingSkus.has(sku));

  console.log('\n══ סיכום ══\n');
  console.log(`  📦 אצל הספק:     ${supplierSkus.size} SKUs`);
  console.log(`  🏪 אצלנו:        ${firestoreProducts.length} מוצרים`);
  console.log(`  🗑️  למחיקה:       ${toDelete.length} (פסקו אצל הספק)`);
  console.log(`  🆕 לייבוא:       ${toImport.length} (חדשים אצל הספק)`);
  console.log(`  🆕 קטגוריות חדשות: ${newCats.length}`);

  // Save report
  const report = {
    date: new Date().toISOString(),
    supplierSkuCount: supplierSkus.size,
    firestoreCount: firestoreProducts.length,
    toDeleteCount: toDelete.length,
    toImportCount: toImport.length,
    newCategories: newCats,
    toDelete: toDelete.map(p => ({ id: p.id, sku: p.sku, name: p.name })),
    toImport: toImport.slice(0, 100), // first 100 for preview
  };
  const reportPath = resolve(__dirname, `../../scripts/sync-report-${new Date().toISOString().slice(0,10)}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n  📄 דו"ח: ${reportPath}`);

  await deleteDiscontinued(firestoreProducts, supplierSkus);
  await importNewProducts(firestoreProducts, supplierSkus);

  console.log('\n═'.repeat(60));
  console.log('✅ Sync הסתיים');
  console.log('═'.repeat(60));
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
