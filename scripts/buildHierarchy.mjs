import { readFileSync, writeFileSync } from 'fs';
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
    clientEmail: (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i,'').trim(),
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g,'\n'),
  })});
}
const db = getFirestore();

const flatCats    = JSON.parse(readFileSync(resolve(__dirname, 'israel-judaica-categories.json'), 'utf8'));
const supplierMap = JSON.parse(readFileSync(resolve(__dirname, 'supplier_subcategory_skus.json'), 'utf8'));

function cleanLabel(raw) {
  return raw.replace(/\n[\s\S]*/, '').replace(/\s+SHOP NOW\s*/i, '').trim();
}

const codeToLabel = {};
for (const item of flatCats) codeToLabel[item.code] = cleanLabel(item.label);
for (const [code, entry] of Object.entries(supplierMap)) {
  if (!codeToLabel[code]) codeToLabel[code] = entry.name;
}

const codesWithSkus = new Set(Object.keys(supplierMap));
console.log('קודים עם SKUs: ' + codesWithSkus.size);

// Explicit hierarchy — derived from category file sequential grouping + name prefixes
const HIERARCHY = [
  { code: '1122', name: 'גביעי קידוש',        children: ['1123','1124','1125','1193'] },
  { code: '1126', name: 'הבדלה',               children: [] },
  { code: '1128', name: 'חגים',                children: ['1129','1130','1131','1132','1133'] },
  { code: '1134', name: 'טלית ותפילין',        children: ['1135','1136','1137','1138','1139','1184'] },
  { code: '1142', name: 'כיפות',               children: ['1143','1144','1145','1146','1147','1148','1149','1150','1151','1181'] },
  { code: '1152', name: 'מזוזות',              children: ['1153','1154','1156','1157','1158','1159'] },
  { code: '1176', name: 'תכשיטים',             children: ['1177','1178','1180'] },
  { code: '1116', name: 'חתן וכלה',            children: [] },
  { code: '1118', name: 'ברכות',               children: [] },
  { code: '1119', name: 'חמסות וסגולות',       children: [] },
  { code: '1121', name: 'גופיות ציצית',        children: [] },
  { code: '1127', name: 'דמויות חסידים',       children: [] },
  { code: '1140', name: 'ילדים',               children: [] },
  { code: '1141', name: 'כריות לברית',         children: [] },
  { code: '1160', name: 'מוצרי בית כנסת',      children: ['1161'] },
  { code: '1163', name: 'מגנטים',              children: [] },
  { code: '1164', name: 'מחזיקי מפתחות',       children: [] },
  { code: '1165', name: 'נטילת ידיים',         children: [] },
  { code: '1166', name: 'סידורים ותהילים',     children: [] },
  { code: '1167', name: 'עטים',                children: [] },
  { code: '1168', name: 'פמוטים',              children: [] },
  { code: '1169', name: 'קופות צדקה',          children: [] },
  { code: '1171', name: 'כיסויי חלה',          children: [] },
  { code: '1172', name: 'כיסויי פלטה',         children: [] },
  { code: '1173', name: 'מפות שולחן',          children: [] },
  { code: '1174', name: 'קרשי חלה',            children: [] },
  { code: '1175', name: 'מצתים ומלחיות',       children: [] },
  { code: '1185', name: 'קיטלים',              children: [] },
  { code: '1187', name: 'ברכונים',             children: [] },
];

// Check unplaced codes
const placedCodes = new Set();
for (const p of HIERARCHY) {
  placedCodes.add(p.code);
  for (const c of p.children) placedCodes.add(c);
}
const unplaced = [...codesWithSkus].filter(c => !placedCodes.has(c));
console.log('\nקודים עם SKUs שלא שובצו: ' + unplaced.length);
for (const code of unplaced) {
  console.log('  code ' + code + ': "' + (codeToLabel[code] ?? '?') + '" (' + (supplierMap[code]?.count ?? 0) + ' SKUs)');
}

// Firestore subCategory counts
const snap = await db.collection('products').get();
const subCatCounts = {};
let totalActive = 0;
for (const doc of snap.docs) {
  const d = doc.data();
  if (d.hidden === true || d.status !== 'active') continue;
  totalActive++;
  const sc = d.subCategory ?? '__missing__';
  subCatCounts[sc] = (subCatCounts[sc] ?? 0) + 1;
}
console.log('\nמוצרים active ב-Firestore: ' + totalActive);

// Build output + print report
const output = {};
const sep = '='.repeat(72);
console.log('\n' + sep);
console.log('  היררכיית israel-judaica — קטגוריה ראשית / תת-קטגוריות');
console.log(sep);

let grandTotalSkus = 0;

for (const parent of HIERARCHY) {
  const parentLabel   = codeToLabel[parent.code] ?? parent.name;
  const parentSkus    = supplierMap[parent.code]?.count ?? 0;
  const hasSubs       = parent.children.length > 0;

  const subcategories = parent.children.map(childCode => {
    const childLabel = codeToLabel[childCode] ?? ('קטגוריה ' + childCode);
    const skuCount   = supplierMap[childCode]?.count ?? 0;
    const fsCount    = subCatCounts[childLabel] ?? 0;
    grandTotalSkus  += skuCount;
    return { code: childCode, name: childLabel, skusAtSupplier: skuCount, productsInFirestore: fsCount };
  });

  if (!hasSubs) grandTotalSkus += parentSkus;

  const parentFsCount = hasSubs ? null : (subCatCounts[parentLabel] ?? 0);

  output[parentLabel] = {
    code: parent.code,
    skusAtSupplier: parentSkus,
    productsInFirestore: parentFsCount,
    subcategories,
  };

  const tag = hasSubs ? '▼' : '•';
  const skuTag = parentSkus > 0 ? ' (' + parentSkus + ' SKUs)' : '';
  console.log('\n' + tag + ' [' + parent.code + '] ' + parentLabel + skuTag);

  if (hasSubs) {
    for (const sub of subcategories) {
      const fs  = sub.productsInFirestore;
      const bar = fs > 0 ? 'V' : '_';
      const line =
        '   [' + bar + '] [' + sub.code + '] ' +
        sub.name.padEnd(34) +
        ' ספק:' + String(sub.skusAtSupplier).padStart(4) + ' SKUs' +
        '  |  Firestore:' + String(fs).padStart(4) + ' מוצרים';
      console.log(line);
    }
  } else {
    const fs  = parentFsCount ?? 0;
    const bar = fs > 0 ? 'V' : '_';
    console.log('   [' + bar + '] Firestore: ' + fs + ' מוצרים');
  }
}

console.log('\n' + sep);
console.log('סה"כ SKUs ספק בהיררכיה: ' + grandTotalSkus + ' (מתוך ' + Object.values(supplierMap).reduce((s,v) => s + v.count, 0) + ' כולל parents)');
console.log(sep);

writeFileSync(
  resolve(__dirname, 'supplier_hierarchy.json'),
  JSON.stringify(output, null, 2),
  'utf8'
);
console.log('\nנשמר: scripts/supplier_hierarchy.json');
process.exit(0);
