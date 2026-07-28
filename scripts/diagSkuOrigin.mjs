import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    const lines = raw.split('\n');
    let key = null, val = '';
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) { if (key && !process.env[key]) process.env[key] = val.trim(); key = m[1]; val = m[2]; }
      else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch {}
}
loadEnvLocal();

if (!getApps().length) {
  initializeApp({ credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID ?? 'your-sofer',
    clientEmail: (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim(),
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  })});
}
const db = getFirestore();

const supplierMap = JSON.parse(
  readFileSync(resolve(__dirname, 'supplier_subcategory_skus.json'), 'utf8')
);

// Build a flat set of all supplier SKUs per code
const skuToCode = {};
for (const [code, entry] of Object.entries(supplierMap)) {
  for (const sku of (entry.skus || [])) {
    skuToCode[sku] = code;
  }
}

function classifySku(sku) {
  if (!sku) return 'MISSING';
  if (/^UK\d+$/i.test(sku)) return 'UK';
  if (/^X\d+$/i.test(sku)) return 'X';
  return 'OTHER';
}

async function analyzeGroup(label, catFilter, subCatFilter) {
  const snap = await db.collection('products')
    .where('cat', '==', catFilter)
    .where('subCategory', '==', subCatFilter)
    .get();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`קבוצה: "${label}" (cat=${catFilter}, subCategory=${subCatFilter})`);
  console.log(`סה"כ מוצרים: ${snap.size}`);

  const ukSkus = [], xSkus = [], otherSkus = [], missingSkus = [];
  const createdAts = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    const sku = d.sku || d.SKU || '';
    const type = classifySku(sku);
    if (type === 'UK') ukSkus.push(sku);
    else if (type === 'X') xSkus.push(sku);
    else if (type === 'MISSING') missingSkus.push(doc.id);
    else otherSkus.push(sku);

    const ca = d.createdAt?.seconds ?? d.created_at?.seconds ?? null;
    if (ca) createdAts.push(ca);
  }

  console.log(`\nפילוח SKU:`);
  console.log(`  UK{number}  : ${ukSkus.length}`);
  console.log(`  X{number}   : ${xSkus.length}`);
  console.log(`  אחר         : ${otherSkus.length} ${otherSkus.slice(0,5).join(', ')}`);
  console.log(`  חסר SKU     : ${missingSkus.length}`);

  // Sample 5 from each type and check supplier map
  console.log(`\nדוגמאות UK (עד 5):`);
  for (const sku of ukSkus.slice(0, 5)) {
    const code = skuToCode[sku];
    const name = code ? `code ${code} (${supplierMap[code]?.name ?? '?'})` : 'לא נמצא';
    console.log(`  ${sku} → ${name}`);
  }

  console.log(`\nדוגמאות X (עד 5):`);
  for (const sku of xSkus.slice(0, 5)) {
    const code = skuToCode[sku];
    const name = code ? `code ${code} (${supplierMap[code]?.name ?? '?'})` : 'לא נמצא';
    console.log(`  ${sku} → ${name}`);
  }

  if (otherSkus.length) {
    console.log(`\nדוגמאות אחר (עד 5):`);
    for (const sku of otherSkus.slice(0, 5)) {
      const code = skuToCode[sku];
      const name = code ? `code ${code} (${supplierMap[code]?.name ?? '?'})` : 'לא נמצא';
      console.log(`  ${sku} → ${name}`);
    }
  }

  // How many UK SKUs are in supplier map
  const ukInSupplier = ukSkus.filter(s => skuToCode[s]).length;
  const xInSupplier  = xSkus.filter(s => skuToCode[s]).length;
  console.log(`\nהתאמה לספק הנוכחי:`);
  console.log(`  UK שנמצאו בספק: ${ukInSupplier}/${ukSkus.length}`);
  console.log(`  X שנמצאו בספק : ${xInSupplier}/${xSkus.length}`);

  // Which supplier codes do the UK SKUs belong to?
  const codeTally = {};
  for (const sku of ukSkus) {
    const code = skuToCode[sku];
    if (code) codeTally[code] = (codeTally[code] ?? 0) + 1;
  }
  if (Object.keys(codeTally).length) {
    console.log(`\nפילוח לפי code ספק (UK בלבד):`);
    for (const [code, count] of Object.entries(codeTally).sort((a,b) => b[1]-a[1])) {
      console.log(`  code ${code} (${supplierMap[code]?.name ?? '?'}): ${count} SKUs`);
    }
  }

  // Dates
  if (createdAts.length) {
    const sorted = [...createdAts].sort((a,b) => a-b);
    const toDate = s => new Date(s * 1000).toISOString().slice(0,10);
    console.log(`\nטווח createdAt:`);
    console.log(`  הישן ביותר: ${toDate(sorted[0])}`);
    console.log(`  החדש ביותר: ${toDate(sorted[sorted.length-1])}`);
    // Count by year
    const byYear = {};
    for (const s of sorted) {
      const y = new Date(s*1000).getFullYear();
      byYear[y] = (byYear[y]??0)+1;
    }
    console.log(`  לפי שנה: ${Object.entries(byYear).map(([y,c])=>`${y}:${c}`).join(', ')}`);
  } else {
    console.log(`\nאין נתוני createdAt`);
  }
}

async function main() {
  await analyzeGroup('כוסות קידוש', 'שבת', 'כוסות קידוש');
  await analyzeGroup('חנוכיות', 'יודאיקה', 'חנוכיות');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
