/**
 * assignSubcategoriesFull.mjs
 *
 * Full Operation A: assign subCategory to all UK products using the
 * complete 59-code supplier catalog.
 *
 * Usage:
 *   node app/scripts/assignSubcategoriesFull.mjs           ← dry-run
 *   node app/scripts/assignSubcategoriesFull.mjs --confirm ← write
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname }    from 'path';
import { fileURLToPath }       from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIRM   = process.argv.includes('--confirm');

const sa = JSON.parse(readFileSync(
  resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'
));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// ── Complete mapping: supplier code → subCategory in our DB ─────────────────
// ✅ = confirmed obvious match    ⚠️  = proposed, needs user confirmation
const CODE_TO_SUBCAT = {
  // ── גביעי קידוש ──────────────────────────────────────────────────── ✅
  '1123': 'כוסות קידוש',        // גביעי קידוש קריסטל וקרמיקה
  '1124': 'כוסות קידוש',        // גביעי קידוש מתכת
  '1125': 'כוסות קידוש',        // מחלקי יין ואביזרים
  '1193': 'כוסות קידוש',        // גביעי קידוש פולימר

  // ── חגים ─────────────────────────────────────────────────────────── ✅
  '1129': 'חנוכה',
  '1130': 'סוכות',
  '1131': 'פורים',
  '1132': 'פסח',
  '1133': 'ראש השנה',

  // ── שבת ─────────────────────────────────────────────────────────── ✅
  '1168': 'פמוטים',             // פמוטים
  '1171': 'כיסויי חלה',         // כיסויי חלה
  '1172': 'כיסויי פלטה',        // כיסויי פלטה
  '1174': 'קרשי חלה',           // קרשי חלה, סכינים ומפיונים
  '1175': 'מצתים ומלחיות',      // מצתים, מלחיות ומתקנים לגפרורים
  '1126': 'הבדלה',              // הבדלה
  '1187': 'ברכונים',            // ברכונים  ✅

  // ── יודאיקה ─────────────────────────────────────────────────────── ✅
  '1164': 'מחזיקי מפתחות',      // מחזיקי מפתחות
  '1165': 'נטילת ידיים',        // נטילת ידיים ומים אחרונים
  '1169': 'קופות צדקה',         // קופות צדקה  ✅
  '1119': 'חמסות וסגולות',      // חמסות וסגולות
  '1127': 'דמויות חסידים',      // דמויות חסידים
  '1163': 'מגנטים',             // מגנטים
  '1166': 'סידורים ותהילים',    // סידורים ותהילים
  '1167': 'עטים',               // עטים
  '1160': 'מוצרי בית כנסת',     // מוצרי בית כנסת וסטנדרים

  // ── כיפות ───────────────────────────────────────────────────────── ✅
  '1143': 'כיפות סרוגות',
  '1144': 'כיפות סאטן',
  '1145': 'כיפות קטיפה',
  '1146': 'כיפות סרוגות עם רקמה',
  '1147': 'כיפות מיוחדות',
  '1148': 'כיפות עור',
  '1149': 'כיפות פריק',
  '1150': 'סיכות לכיפה',
  '1151': 'כיפות סרוגות DMC',

  // ── מזוזות ──────────────────────────────────────────────────────── ✅
  '1153': 'מזוזות זכוכית',
  '1154': 'מזוזות אלומיניום',
  '1155': 'מזוזות פולירזין',     // פולירזין = סוג פולימר
  '1156': 'מזוזות לרכב',
  '1157': 'מזוזות מתכת',
  '1158': 'מזוזות עץ',
  '1159': 'מזוזות פלסטיק',

  // ── טלית / תפילין ───────────────────────────────────────────────── ✅
  '1135': 'בתי תפילין',
  '1136': 'תיקי טלית',
  '1137': 'מחזיקי טלית',
  '1138': 'טליתות',
  '1139': 'סטים טלית ותפילין',
  '1184': 'תיק תפ',

  // ── תכשיטים ─────────────────────────────────────────────────────── ✅
  '1177': 'תכשיטים',
  '1178': 'תכשיטים',
  '1180': 'תכשיטים',

  // ── ⚠️ PROPOSED — awaiting user confirmation ─────────────────────
  '1161': 'פמוטים',             // מנורות → פמוטים (מנורות = candelabras)
  '1173': 'כיסויי פלטה',        // מפות שולחן ורנרים → כיסויי פלטה (closest)
  '1118': 'ברכונים',            // ברכות → ברכונים (blessing-related items)
  '1116': 'מארזי קדושה',        // חתן וכלה → מארזי קדושה (new subcat proposed)
  '1140': 'ילדים',              // ילדים → ילדים (new subcat proposed)
  '1141': 'כריות לברית',        // כריות לברית → כריות לברית (new subcat proposed)
  '1185': 'קיטלים',             // קיטלים → קיטלים (new subcat proposed)
  // 1183 (אביזרי תצוגה, 15 SKUs) → SKIPPED — display accessories, not for retail
  // 1121 (גופיות ציצית) → PARENT code, skipped
};

// Codes with confirmed mapping vs proposed
const PROPOSED_CODES = new Set(['1161','1173','1118','1116','1140','1141','1185']);
const SKIPPED_CODES  = new Set(['1183','1121']);

// ── Build SKU→code index from JSON ───────────────────────────────────────────
const skuFile   = JSON.parse(readFileSync(resolve(__dirname, '../../scripts/supplier_subcategory_skus.json'), 'utf8'));
const skuToCode = {};
for (const [code, entry] of Object.entries(skuFile)) {
  for (const sku of (entry.skus || [])) {
    skuToCode[sku] = code;
  }
}

// ── Load UK products from Firestore ──────────────────────────────────────────
console.log('Loading Firestore products…');
const snap   = await db.collection('products').get();
const ukDocs = snap.docs
  .map(d => ({ _id: d.id, ...d.data() }))
  .filter(d => /^UK\d+$/.test(d.sku || ''));
console.log(`  ${ukDocs.length} UK products\n`);

// ── Classify each product ─────────────────────────────────────────────────────
const toUpdate    = [];
const noChange    = [];
const orphans     = [];
const skippedCode = [];

for (const d of ukDocs) {
  const code   = skuToCode[d.sku];
  if (!code || SKIPPED_CODES.has(code)) {
    if (SKIPPED_CODES.has(code)) skippedCode.push({ sku: d.sku, code, name: d.name || '' });
    else orphans.push({ sku: d.sku, name: d.name || '', subCategory: d.subCategory || '' });
    continue;
  }
  const newSub = CODE_TO_SUBCAT[code];
  if (!newSub) {
    orphans.push({ sku: d.sku, name: d.name || '', code, subCategory: d.subCategory || '' });
    continue;
  }
  if ((d.subCategory || '') === newSub) {
    noChange.push(d.sku);
  } else {
    toUpdate.push({
      docId:  d._id,
      sku:    d.sku,
      name:   d.name || '',
      oldSub: d.subCategory || '(ריק)',
      newSub,
      code,
      isProposed: PROPOSED_CODES.has(code),
    });
  }
}

// ── DRY-RUN output ───────────────────────────────────────────────────────────
console.log('═'.repeat(72));
console.log('DRY-RUN — שיוך subCategory מלא (59 קודים)');
console.log('═'.repeat(72));

const confirmed = toUpdate.filter(u => !u.isProposed);
const proposed  = toUpdate.filter(u => u.isProposed);

console.log(`  ✅ ישתנו (mapping מאושר)         : ${confirmed.length}`);
console.log(`  ⚠️  ישתנו (mapping לאישורך)       : ${proposed.length}`);
console.log(`  ── סה"כ ישתנו                    : ${toUpdate.length}`);
console.log(`  — כבר נכונים (ללא שינוי)          : ${noChange.length}`);
console.log(`  ✂️  דולגו (אביזרי תצוגה / parent) : ${skippedCode.length}`);
console.log(`  ⚠️  orphans (לא אצל הספק כלל)     : ${orphans.length}`);

// Breakdown by new subCategory (confirmed only)
console.log('\n─── פילוח לפי subCategory חדשה (✅ מאושרות) ───');
const byCatConfirmed = {};
confirmed.forEach(u => { byCatConfirmed[u.newSub] = (byCatConfirmed[u.newSub] || 0) + 1; });
Object.entries(byCatConfirmed).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) =>
  console.log(`  ${String(v).padStart(5)}  ${k}`)
);

if (proposed.length > 0) {
  console.log('\n─── פילוח לפי subCategory חדשה (⚠️ לאישורך) ───');
  const byCatProposed = {};
  proposed.forEach(u => { byCatProposed[u.newSub] = (byCatProposed[u.newSub] || 0) + 1; });
  Object.entries(byCatProposed).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) =>
    console.log(`  ${String(v).padStart(5)}  ${k}`)
  );
}

// 10 examples
console.log('\n─── 10 דוגמאות לשינויים (מאושרים) ───');
confirmed.slice(0, 10).forEach(u =>
  console.log(
    `  ${u.sku.padEnd(10)} "${u.name.substring(0,28).padEnd(28)}"  ${u.oldSub.padEnd(22)} → "${u.newSub}"`
  )
);

if (proposed.length > 0) {
  console.log('\n─── דוגמאות לשינויים (⚠️ ממתינים לאישורך) ───');
  proposed.slice(0, 6).forEach(u =>
    console.log(
      `  ${u.sku.padEnd(10)} "${u.name.substring(0,28).padEnd(28)}"  ${u.oldSub.padEnd(22)} → "${u.newSub}"  (code=${u.code})`
    )
  );
}

// Proposed codes table
console.log('\n' + '═'.repeat(72));
console.log('⚠️  PROPOSED MAPPINGS — ממתינים לאישורך');
console.log('═'.repeat(72));
console.log(`${'Code'.padEnd(6)} ${'Supplier Name'.padEnd(36)} ${'#InDB'.padEnd(6)} Proposed subCategory`);
console.log('─'.repeat(72));
const proposedCodeStats = {};
proposed.forEach(u => { proposedCodeStats[u.code] = (proposedCodeStats[u.code] || 0) + 1; });
for (const code of [...PROPOSED_CODES]) {
  const entry = skuFile[code];
  const name  = entry?.name || '?';
  const inDb  = proposedCodeStats[code] || 0;
  const sub   = CODE_TO_SUBCAT[code] || '?';
  const isNew = !['פמוטים','כיסויי פלטה','ברכונים'].includes(sub);
  console.log(`${code.padEnd(6)} ${name.padEnd(36)} ${String(inDb).padEnd(6)} "${sub}"${isNew ? '  ← קטגוריה חדשה' : ''}`);
}

// Skipped codes
console.log('\n─── קודים שדולגו ───');
console.log(`  1121  גופיות ציצית  — PARENT (מכיל מוצרים זהים לילדיו, כנראה תת-קטגוריה בפני עצמה)`);
console.log(`  1183  אביזרי תצוגה (${skuFile['1183']?.count||0} SKUs) — לא מוצרי צרכן, דולג`);

// Orphans summary
console.log(`\n─── orphans (${orphans.length} מוצרי UK שלא נמצאו אצל הספק) ───`);
console.log('  אלו מוצרים שהספק הוריד מהמדף (discontinued) — subCategory לא ישתנה');
if (orphans.length <= 10) {
  orphans.forEach(o => console.log(`  ${o.sku}  "${o.name.substring(0,40)}"  (subCat="${o.subCategory}")`));
} else {
  console.log(`  (מוצגים 5 ראשונים מתוך ${orphans.length})`);
  orphans.slice(0, 5).forEach(o =>
    console.log(`  ${o.sku}  "${o.name.substring(0,40)}"  (subCat="${o.subCategory}")`));
  // breakdown of orphans by current subCategory
  const oByCat = {};
  orphans.forEach(o => { const k = o.subCategory||'(ריק)'; oByCat[k]=(oByCat[k]||0)+1; });
  console.log('\n  פילוח orphans לפי subCategory נוכחי:');
  Object.entries(oByCat).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([k,v]) =>
    console.log(`    ${String(v).padStart(4)}  ${k}`)
  );
}

if (!CONFIRM) {
  console.log('\n⚠️  DRY-RUN בלבד — לא נכתב לFirestore.');
  console.log('   הרץ עם --confirm לאחר אישורך.');
} else {
  console.log('\nWriting subCategory to Firestore…');
  const writes = CONFIRM === true
    ? toUpdate                    // all (confirmed + proposed)
    : confirmed;                  // only confirmed (when partial mode added)

  const BATCH_SIZE = 400;
  let written = 0;
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const u of writes.slice(i, i + BATCH_SIZE)) {
      batch.update(db.collection('products').doc(u.docId), { subCategory: u.newSub });
    }
    await batch.commit();
    written += Math.min(BATCH_SIZE, writes.length - i);
    process.stdout.write(`  ${written}/${writes.length}\n`);
  }
  console.log(`\n✅ Done — ${written} products updated.`);
}

process.exit(0);
