/**
 * matchSupplierSkus.mjs
 *
 * DRY-RUN: matches our sku-less products to supplier SKUs by normalized name.
 * Does NOT write to Firestore.
 *
 * Usage:
 *   node app/scripts/matchSupplierSkus.mjs           ← dry-run (default)
 *   node app/scripts/matchSupplierSkus.mjs --confirm ← write sku field to matched docs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname }    from 'path';
import { fileURLToPath }       from 'url';
import https                   from 'https';
import querystring             from 'querystring';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIRM   = process.argv.includes('--confirm');

const sa = JSON.parse(readFileSync(resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// ── All supplier subcategory codes ───────────────────────────────────────────
const SUPPLIER_CODES = [
  '1124','1193','1123','1125',
  '1129','1130','1131','1132','1133',
  '1135','1138','1137','1139','1184','1136',
  '1147','1144','1143','1151','1146','1148','1149','1181','1145','1150',
  '1154','1153','1156','1157','1158','1159',
  '1180','1177','1178',
];

// ── Name normalisation ────────────────────────────────────────────────────────
function normalize(str) {
  if (!str) return '';
  return str
    // strip Hebrew nikud (U+05B0–U+05C7)
    .replace(/[ְ-ׇ]/g, '')
    // unify all quote/apostrophe variants → standard double-quote for ״/"/״, single for '/׳
    .replace(/[״""“”״]/g, '"')
    .replace(/[׳''‘’׳]/g, "'")
    // collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function httpGet(path) {
  return new Promise((resolve, reject) => {
    https.get({ hostname: 'www.israel-judaica.com', path,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,*/*', 'Accept-Encoding': 'identity',
      }
    }, res => {
      const cookie = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
      let body = ''; res.on('data', d => body += d); res.on('end', () => resolve({ cookie, status: res.statusCode }));
    }).on('error', reject);
  });
}

function postProducts(code, cookie) {
  return new Promise((resolve, reject) => {
    const data = querystring.stringify({
      category: code,
      filterChoices: JSON.stringify({ price:[], size:[], product_status:[], color:[], lang_product:[], material:[] }),
      limit: '1000', offset: '0', sortValue: '', sortDirection: '', note: '', search_term: '',
    });
    const req = https.request({
      hostname: 'www.israel-judaica.com',
      path: '/index.php?option=com_art&task=category.getProducts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, */*; q=0.01',
        'Cookie': cookie,
        'Referer': `https://www.israel-judaica.com/index.php?option=com_art&view=category&code=${code}&lang=he`,
        'Origin': 'https://www.israel-judaica.com',
      },
    }, res => {
      let body = ''; res.on('data', d => body += d);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({ status: false }); } });
    });
    req.on('error', reject); req.write(data); req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Step 1: fetch our sku-less products ───────────────────────────────────────
console.log('Loading Firestore products without sku…');
const snap   = await db.collection('products').get();
const noSku  = snap.docs.map(d => ({ _id: d.id, ...d.data() })).filter(d => !d.sku);
console.log(`  ${noSku.length} products without sku`);

// ── Step 2: fetch all supplier products with names ────────────────────────────
console.log('\nFetching supplier products (names + SKUs)…');
// supplierMap: normalizedName → [ { sku, name_he, code } ]
const supplierMap = new Map();
const allSupplierProducts = []; // for saving enriched JSON

let sessionCookie = (await httpGet(`/index.php?option=com_art&view=category&code=1123&Itemid=956&lang=he`)).cookie;
await sleep(1500);

for (let i = 0; i < SUPPLIER_CODES.length; i++) {
  const code = SUPPLIER_CODES[i];

  if (i > 0 && i % 8 === 0) {
    sessionCookie = (await httpGet(`/index.php?option=com_art&view=category&code=${code}&Itemid=956&lang=he`)).cookie;
    await sleep(2000);
  }

  const res = await postProducts(code, sessionCookie);
  const products = (res.status && res.products) ? Object.values(res.products) : [];

  for (const p of products) {
    const nameHe = p.name_he || p.name_en || '';
    const norm   = normalize(nameHe);
    if (!norm) continue;
    if (!supplierMap.has(norm)) supplierMap.set(norm, []);
    supplierMap.get(norm).push({ sku: p.sku, name_he: nameHe, code });
    allSupplierProducts.push({ sku: p.sku, name_he: nameHe, code, norm });
  }

  process.stdout.write(`  [${i+1}/${SUPPLIER_CODES.length}] code=${code}: ${products.length} products\n`);
  await sleep(700);
}

console.log(`\n  Total supplier products fetched: ${allSupplierProducts.length}`);
console.log(`  Unique normalized names: ${supplierMap.size}`);

// Save enriched supplier data
const enrichedPath = resolve(__dirname, '../../scripts/supplier_subcategory_skus_named.json');
writeFileSync(enrichedPath, JSON.stringify(
  Object.fromEntries([...supplierMap.entries()].map(([k,v]) => [k, v])),
  null, 2
), 'utf8');
console.log(`  Saved → scripts/supplier_subcategory_skus_named.json`);

// ── Step 3: build our-side normalized-name index ──────────────────────────────
// ourNameMap: normalizedName → [ docId ]
const ourNameMap = new Map();
for (const d of noSku) {
  const norm = normalize(d.name || '');
  if (!norm) continue;
  if (!ourNameMap.has(norm)) ourNameMap.set(norm, []);
  ourNameMap.get(norm).push(d._id);
}

// ── Step 4: matching ──────────────────────────────────────────────────────────
const toWrite      = []; // { docId, sku, ourName, supplierName }
const manualReview = []; // { docId, ourName, reason, matches }

for (const d of noSku) {
  const norm     = normalize(d.name || '');
  const ourName  = d.name || '';

  if (!norm) {
    manualReview.push({ docId: d._id, ourName, reason: 'שם ריק', matches: [] });
    continue;
  }

  const supplierHits = supplierMap.get(norm) || [];
  const ourDupes     = ourNameMap.get(norm) || [];

  if (supplierHits.length === 0) {
    // No match on supplier side — skip silently (most will be STaM products)
    continue;
  }

  if (supplierHits.length > 1) {
    manualReview.push({
      docId: d._id, ourName: norm,
      reason: `${supplierHits.length} התאמות אצל הספק`,
      matches: supplierHits.map(h => `${h.sku} (code=${h.code})`),
    });
    continue;
  }

  if (ourDupes.length > 1) {
    manualReview.push({
      docId: d._id, ourName: norm,
      reason: `שם כפול אצלנו (${ourDupes.length} מוצרים)`,
      matches: supplierHits.map(h => `${h.sku} (code=${h.code})`),
    });
    continue;
  }

  // Exactly 1 supplier hit, 1 our hit — confirmed match
  const hit = supplierHits[0];
  toWrite.push({ docId: d._id, sku: hit.sku, ourName: ourName, supplierName: hit.name_he, supplierCode: hit.code });
}

// Save manual review list
const reviewPath = resolve(__dirname, '../../scripts/manual_review.json');
writeFileSync(reviewPath, JSON.stringify(manualReview, null, 2), 'utf8');

// ── Step 5: DRY-RUN report ────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(70));
console.log('DRY-RUN RESULTS');
console.log('═'.repeat(70));
console.log(`  ✅ ימופו (התאמה ודאית 1:1)  : ${toWrite.length}`);
console.log(`  ⚠️  manual_review             : ${manualReview.length}`);
console.log(`  — ללא התאמה בכלל             : ${noSku.length - toWrite.length - manualReview.length}`);

console.log('\n15 דוגמאות להתאמות ודאיות:');
console.log('─'.repeat(70));
const sample = toWrite.slice(0, 15);
for (const m of sample) {
  console.log(`  שלנו : "${m.ourName}"`);
  console.log(`  ספק  : "${m.supplierName}"  →  ${m.sku}  (code=${m.supplierCode})`);
  console.log();
}

if (manualReview.length > 0) {
  console.log('\n10 דוגמאות מ-manual_review:');
  console.log('─'.repeat(70));
  manualReview.slice(0, 10).forEach(r =>
    console.log(`  "${r.ourName}"  |  ${r.reason}  |  ${r.matches.join(', ')}`)
  );
}

if (!CONFIRM) {
  console.log('\n⚠️  DRY-RUN בלבד — לא נכתב לFirestore.');
  console.log('   הרץ עם --confirm כדי לכתוב את שדה sku.');
} else {
  // ── Step 6: Write (only with --confirm) ──────────────────────────────────
  console.log('\nWriting to Firestore…');
  let written = 0;
  for (const m of toWrite) {
    await db.collection('products').doc(m.docId).update({ sku: m.sku });
    written++;
    if (written % 50 === 0) process.stdout.write(`  ${written}/${toWrite.length}\n`);
  }
  console.log(`\n✅ Done — ${written} products updated with sku.`);
}

process.exit(0);
