/**
 * assignSubcategories.mjs
 *
 * Operation A: assign correct subCategory to all UK-sku products
 * based on their supplier subcategory code.
 *
 * Reads:  scripts/supplier_subcategory_skus.json  (code → skus[])
 * Writes: products/{id}.subCategory  (only with --confirm)
 *
 * Usage:
 *   node app/scripts/assignSubcategories.mjs           ← dry-run
 *   node app/scripts/assignSubcategories.mjs --confirm ← write
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname }    from 'path';
import { fileURLToPath }       from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIRM   = process.argv.includes('--confirm');

const sa = JSON.parse(readFileSync(resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// ── Mapping: supplier code → subCategory value to write ─────────────────────
// Keys: string codes from supplier_subcategory_skus.json
// Values: the Hebrew subCategory string to store in Firestore
const CODE_TO_SUBCAT = {
  // גביעי קידוש (all types → כוסות קידוש)
  '1123': 'כוסות קידוש',
  '1124': 'כוסות קידוש',
  '1125': 'כוסות קידוש',
  '1193': 'כוסות קידוש',
  // חגים
  '1129': 'חנוכה',
  '1130': 'סוכות',
  '1131': 'פורים',
  '1132': 'פסח',
  '1133': 'ראש השנה',
  // טלית / תפילין אביזרים
  '1135': 'בתי תפילין',
  '1136': 'תיקי טלית',
  '1137': 'מחזיקי טלית',
  '1138': 'טליתות',
  '1139': 'סטים טלית ותפילין',
  '1184': 'תיק תפ',
  // כיפות — granular per supplier type
  '1143': 'כיפות סרוגות',
  '1144': 'כיפות סאטן',
  '1145': 'כיפות קטיפה',
  '1146': 'כיפות סרוגות עם רקמה',
  '1147': 'כיפות מיוחדות',
  '1148': 'כיפות עור',
  '1149': 'כיפות פריק',
  '1150': 'סיכות לכיפה',
  '1151': 'כיפות סרוגות DMC',
  // מזוזות (granular per material)
  '1153': 'מזוזות זכוכית',
  '1154': 'מזוזות אלומיניום',
  '1156': 'מזוזות לרכב',
  '1157': 'מזוזות מתכת',
  '1158': 'מזוזות עץ',
  '1159': 'מזוזות פלסטיק',
  // תכשיטים
  '1177': 'תכשיטים',
  '1178': 'תכשיטים',
  '1180': 'תכשיטים',
};

// ── Build SKU → code lookup from saved JSON ───────────────────────────────────
const skuFile = JSON.parse(readFileSync(resolve(__dirname, '../../scripts/supplier_subcategory_skus.json'), 'utf8'));
const skuToCode = {};   // "UK12345" → "1143"
for (const [code, entry] of Object.entries(skuFile)) {
  for (const sku of entry.skus) {
    skuToCode[sku] = code;
  }
}
console.log(`SKU→code index: ${Object.keys(skuToCode).length} entries`);

// ── Load all UK products ──────────────────────────────────────────────────────
console.log('Loading Firestore UK products…');
const snap    = await db.collection('products').get();
const ukDocs  = snap.docs
  .map(d => ({ _id: d.id, ...d.data() }))
  .filter(d => /^UK\d+$/.test(d.sku || ''));
console.log(`  ${ukDocs.length} UK products`);

// ── Match & plan ──────────────────────────────────────────────────────────────
const toUpdate   = [];   // { docId, sku, oldSubCat, newSubCat, code }
const orphans    = [];   // products not found in any supplier code
const noChange   = [];   // already correct
const noMapping  = [];   // code found but no mapping rule

for (const d of ukDocs) {
  const sku  = d.sku;
  const code = skuToCode[sku];

  if (!code) {
    orphans.push({ docId: d._id, sku, name: d.name || '', subCategory: d.subCategory || '' });
    continue;
  }

  const newSubCat = CODE_TO_SUBCAT[code];
  if (!newSubCat) {
    noMapping.push({ docId: d._id, sku, code, name: d.name || '' });
    continue;
  }

  const oldSubCat = d.subCategory || '';
  if (oldSubCat === newSubCat) {
    noChange.push(sku);
  } else {
    toUpdate.push({ docId: d._id, sku, name: d.name || '', oldSubCat, newSubCat, code });
  }
}

// Save orphans
const orphanPath = resolve(__dirname, '../../scripts/orphan_uk.json');
writeFileSync(orphanPath, JSON.stringify(orphans, null, 2), 'utf8');

// ── DRY-RUN report ────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(70));
console.log('DRY-RUN — פעולה א\' — שיוך תת-קטגוריות');
console.log('═'.repeat(70));
console.log(`  ✅ ישתנו                      : ${toUpdate.length}`);
console.log(`  — כבר נכונים (ללא שינוי)      : ${noChange.length}`);
console.log(`  ⚠️  orphans (לא אצל הספק)      : ${orphans.length}  → orphan_uk.json`);
console.log(`  ❓ code נמצא אך ללא mapping   : ${noMapping.length}`);

// Breakdown by new subCategory
console.log('\n─── פילוח לפי תת-קטגוריה חדשה ───');
const byCat = {};
for (const u of toUpdate) {
  byCat[u.newSubCat] = (byCat[u.newSubCat] || 0) + 1;
}
Object.entries(byCat).sort((a,b) => b[1]-a[1]).forEach(([k,v]) =>
  console.log(`  ${String(v).padStart(5)}  ${k}`)
);

// 10 examples
console.log('\n─── 10 דוגמאות לשינויים ───');
toUpdate.slice(0, 10).forEach(u =>
  console.log(`  ${u.sku.padEnd(10)} "${(u.name).substring(0,32).padEnd(32)}"  ${(u.oldSubCat||'(ריק)').padEnd(22)} → "${u.newSubCat}"`)
);

if (noMapping.length > 0) {
  console.log(`\n─── קודים ללא mapping rule (${noMapping.length}) ───`);
  noMapping.slice(0, 5).forEach(u => console.log(`  sku=${u.sku}  code=${u.code}  "${u.name}"`));
}

if (!CONFIRM) {
  console.log('\n⚠️  DRY-RUN בלבד — לא נכתב לFirestore.');
  console.log('   הרץ עם --confirm כדי לעדכן שדה subCategory בלבד.');
} else {
  console.log('\nWriting subCategory to Firestore…');
  const BATCH_SIZE = 400;
  let written = 0;
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const u of toUpdate.slice(i, i + BATCH_SIZE)) {
      batch.update(db.collection('products').doc(u.docId), { subCategory: u.newSubCat });
    }
    await batch.commit();
    written += Math.min(BATCH_SIZE, toUpdate.length - i);
    process.stdout.write(`  ${written}/${toUpdate.length}\n`);
  }
  console.log(`\n✅ Done — ${written} products updated.`);
}

process.exit(0);
