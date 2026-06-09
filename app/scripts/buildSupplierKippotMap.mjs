/**
 * buildSupplierKippotMap.mjs — READ-ONLY
 *
 * 1. Fetches all kippot products from israel-judaica.com API (all 10 subcategories)
 * 2. Builds a SKU → subcategory map and saves to supplier-kippot-map.json
 * 3. Compares against our 789 products (from backup-kippot-tag-2026-06-04.json)
 * 4. Prints reclassification preview
 *
 * NO Firestore writes, NO imports.
 * Usage:  node app/scripts/buildSupplierKippotMap.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────

const SUBCATS = [
  { name: 'כיפות מיוחדות',   code: 1147 },
  { name: 'סאטן וטריקלין',   code: 1144 },
  { name: 'סרוגות',          code: 1143 },
  { name: 'סרוגות ד.מ.צ.',  code: 1151 },
  { name: 'סרוגות עם רקמה', code: 1146 },
  { name: 'עור',             code: 1148 },
  { name: 'פריק',            code: 1149 },
  { name: 'פריק עבודת יד',  code: 1181 },
  { name: 'קטיפה',           code: 1145 },
  { name: 'סיכות כיפה',     code: 1150 },
];

const API_URL = 'https://www.israel-judaica.com/index.php?option=com_art&task=category.getProducts';
const HEADERS  = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Content-Type':    'application/x-www-form-urlencoded',
  'X-Requested-With':'XMLHttpRequest',
  'Referer':         'https://www.israel-judaica.com/index.php?option=com_art&view=category&code=1142&lang=he',
};
const LIMIT    = 200;
const DELAY_MS = 400;

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchPage(code, offset) {
  const body = new URLSearchParams({
    category: String(code), filterChoices: '[]',
    limit: String(LIMIT), offset: String(offset),
    sortValue: '', sortDirection: '', note: '', search_term: '',
  });
  const res = await fetch(API_URL, { method: 'POST', headers: HEADERS, body: body.toString() });
  if (!res.ok) throw new Error(`HTTP ${res.status} for code=${code} offset=${offset}`);
  const j = await res.json();
  if (!j.status) throw new Error(`API error for code=${code}: ${JSON.stringify(j)}`);
  return j.products ?? {};
}

async function fetchAllForSubcat({ name, code }) {
  const all = {};
  let offset = 0;
  while (true) {
    const page = await fetchPage(code, offset);
    const keys = Object.keys(page);
    for (const sku of keys) all[sku] = page[sku];
    if (keys.length < LIMIT) break;
    offset += LIMIT;
    await sleep(DELAY_MS);
  }
  return { name, code, products: all };
}

// ── Step 1: Fetch all subcategories from supplier ─────────────────────────────

console.log('📡 שולח בקשות ל-API של israel-judaica.com…\n');

const supplierMap = {};   // SKU → { subCategory, name_en, image, product_code }
const subcatCounts = {};  // subCatName → count

for (const subcat of SUBCATS) {
  process.stdout.write(`  ${subcat.name.padEnd(22)} (code=${subcat.code}) … `);
  const { name, products } = await fetchAllForSubcat(subcat);
  const keys = Object.keys(products);
  subcatCounts[name] = keys.length;
  process.stdout.write(`${keys.length} מוצרים\n`);

  for (const sku of keys) {
    if (supplierMap[sku]) {
      // SKU appears in multiple subcategories — keep first (primary)
      supplierMap[sku].alsoIn = supplierMap[sku].alsoIn ?? [];
      supplierMap[sku].alsoIn.push(name);
    } else {
      supplierMap[sku] = {
        subCategory:   name,
        supplierCode:  subcat.code,
        name_en:       products[sku].name_en ?? '',
        image:         products[sku].image   ?? '',
        product_code:  products[sku].product_code ?? null,
        arrive_date:   products[sku].arrive_date  ?? '',
        product_status:products[sku].product_status ?? '',
      };
    }
  }

  await sleep(DELAY_MS);
}

const totalSupplierSkus = Object.keys(supplierMap).length;
console.log(`\n✅ סה"כ SKU ייחודיים מהספק: ${totalSupplierSkus}\n`);

// ── Save supplier map ─────────────────────────────────────────────────────────

const mapPath = resolve(__dir, 'supplier-kippot-map.json');
writeFileSync(mapPath, JSON.stringify(supplierMap, null, 2), 'utf-8');
console.log(`💾 המיפוי נשמר → ${mapPath}\n`);

// ── Step 2: Load our 789 products from backup ─────────────────────────────────

const backupPath = resolve(__dir, 'backup-kippot-tag-2026-06-04.json');
const ourProducts = JSON.parse(readFileSync(backupPath, 'utf-8'));
const ourSkus = new Set(ourProducts.map(p => p.sku).filter(Boolean));

console.log(`📦 המוצרים שלנו: ${ourProducts.length} (עם SKU: ${ourSkus.size})\n`);

// ── Comparison ────────────────────────────────────────────────────────────────

const supplierSkus   = new Set(Object.keys(supplierMap));

const inBoth         = [...ourSkus].filter(s => supplierSkus.has(s));   // יסווגו מחדש
const onlyOurs       = [...ourSkus].filter(s => !supplierSkus.has(s));  // יצאו ממלאי הספק
const onlySupplier   = [...supplierSkus].filter(s => !ourSkus.has(s)); // חדשים לייבוא

console.log('═'.repeat(55));
console.log('📊 השוואה: שלנו ↔ ספק\n');
console.log(`  נמצאים אצל הספק (יסווגו מחדש) : ${inBoth.length}`);
console.log(`  אצלנו בלבד (יצאו ממלאי הספק)  : ${onlyOurs.length}`);
console.log(`  אצל הספק בלבד (חדשים לייבוא)  : ${onlySupplier.length}`);
console.log('═'.repeat(55));

if (onlyOurs.length > 0) {
  console.log('\n⚠️  SKU שלנו שלא נמצאו אצל הספק:');
  // Group by current subCategory
  const byOurSub = {};
  for (const sku of onlyOurs) {
    const p = ourProducts.find(x => x.sku === sku);
    const sub = p?.subCategory ?? '(ללא)';
    byOurSub[sub] = (byOurSub[sub] ?? []);
    byOurSub[sub].push(sku);
  }
  for (const [sub, skus] of Object.entries(byOurSub).sort((a,b) => b[1].length - a[1].length)) {
    console.log(`    ${sub.padEnd(22)} ${skus.length} מוצרים`);
    if (skus.length <= 5) console.log(`      ${skus.join(', ')}`);
    else console.log(`      ${skus.slice(0,5).join(', ')}  ... ועוד ${skus.length-5}`);
  }
}

if (onlySupplier.length > 0) {
  console.log('\n🆕  SKU אצל הספק שחסרים אצלנו (דגום 10):');
  // Group by supplier subCategory
  const bySupSub = {};
  for (const sku of onlySupplier) {
    const sub = supplierMap[sku].subCategory;
    bySupSub[sub] = (bySupSub[sub] ?? []);
    bySupSub[sub].push(sku);
  }
  for (const [sub, skus] of Object.entries(bySupSub).sort((a,b) => b[1].length - a[1].length)) {
    console.log(`    ${sub.padEnd(22)} ${skus.length} חסרים  |  דגום: ${skus.slice(0,3).join(', ')}`);
  }
}

// ── Step 3: Reclassification preview ─────────────────────────────────────────

console.log('\n\n' + '═'.repeat(65));
console.log('🔄  תצוגה מקדימה: כמה מ-789 שלנו ייסווגו לכל תת-קטגוריה\n');

const newSubCounts  = {};  // newSubCategory → count of OUR products going there
const unchangedCount = { same: 0, different: 0, unknown: 0 };

for (const p of ourProducts) {
  const sku = p.sku;
  if (!sku || !supplierMap[sku]) {
    // Not found at supplier
    const sub = '(לא נמצא אצל ספק)';
    newSubCounts[sub] = (newSubCounts[sub] ?? 0) + 1;
    unchangedCount.unknown++;
    continue;
  }
  const newSub = supplierMap[sku].subCategory;
  const oldSub = p.subCategory ?? '(ללא)';
  newSubCounts[newSub] = (newSubCounts[newSub] ?? 0) + 1;
  if (newSub === oldSub) unchangedCount.same++;
  else unchangedCount.different++;
}

// Print sorted by count
const rows = Object.entries(newSubCounts).sort((a, b) => b[1] - a[1]);
console.log('  תת-קטגוריה חדשה             | מוצרים שלנו | קוד ספק');
console.log('  ' + '─'.repeat(55));
for (const [sub, count] of rows) {
  const code = SUBCATS.find(s => s.name === sub)?.code ?? '—';
  console.log(`  ${sub.padEnd(28)} | ${String(count).padEnd(11)} | ${code}`);
}
console.log('  ' + '─'.repeat(55));
console.log(`  ${'סה"כ'.padEnd(28)} | ${ourProducts.length}`);

console.log(`\n  ✅ ללא שינוי (כבר בתת-קטגוריה הנכונה): ${unchangedCount.same}`);
console.log(`  🔄 ישתנו תת-קטגוריה                     : ${unchangedCount.different}`);
console.log(`  ❓ לא נמצאו אצל ספק (לא יסווגו)        : ${unchangedCount.unknown}`);

console.log('\n\n✅ סיום — לא נכתב שום דבר ל-Firestore');
