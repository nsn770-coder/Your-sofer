/**
 * buildSupplierSubcatMap.mjs
 *
 * 1. Fetches SKUs for every supplier subcategory code via POST category.getProducts
 * 2. Reads all distinct subcategory values from our Firestore products
 * 3. Saves  scripts/supplier_subcategory_skus.json  (code → SKUs + name)
 * 4. Prints a mapping table: supplier code → our subcategory name (with gaps)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import querystring from 'querystring';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// ── Supplier subcategory codes (from user-provided list) ────────────────────
const SUPPLIER_CODES = [
  { code: '1124', name: 'גביעי קידוש מתכת' },
  { code: '1193', name: 'גביעי קידוש פולימר' },
  { code: '1123', name: 'גביעי קידוש קריסטל וקרמיקה' },
  { code: '1125', name: 'מחלקי יין ואביזרים' },
  { code: '1129', name: 'חנוכה' },
  { code: '1130', name: 'סוכות' },
  { code: '1131', name: 'פורים' },
  { code: '1132', name: 'פסח' },
  { code: '1133', name: 'ראש השנה' },
  { code: '1135', name: 'בתי תפילין ומראות' },
  { code: '1138', name: 'טליתות' },
  { code: '1137', name: 'מחזיקי טלית עטרות וניילונים' },
  { code: '1139', name: 'סטים טלית ותפילין' },
  { code: '1184', name: 'תיק-תפ' },
  { code: '1136', name: 'תיקי טלית' },
  { code: '1147', name: 'כיפות מיוחדות' },
  { code: '1144', name: 'כיפות סאטן וטרילין' },
  { code: '1143', name: 'כיפות סרוגות' },
  { code: '1151', name: 'כיפות סרוגות DMC' },
  { code: '1146', name: 'כיפות סרוגות עם רקמה' },
  { code: '1148', name: 'כיפות עור' },
  { code: '1149', name: 'כיפות פריק' },
  { code: '1181', name: 'כיפות פריק עבודת יד' },
  { code: '1145', name: 'כיפות קטיפה' },
  { code: '1150', name: 'סיכות לכיפה' },
  { code: '1154', name: 'מזוזות אלומיניום' },
  { code: '1153', name: 'מזוזות זכוכית' },
  { code: '1156', name: 'מזוזות לרכב' },
  { code: '1157', name: 'מזוזות מתכת' },
  { code: '1158', name: 'מזוזות עץ' },
  { code: '1159', name: 'מזוזות פלסטיק' },
  { code: '1180', name: 'נירוסטה ורודיום' },
  { code: '1177', name: 'צמידים טבעות ועגילים' },
  { code: '1178', name: 'תכשיטי כסף טהור' },
];

// ── Also verify sidebar of these parent pages for any missed subcategories ──
const PARENT_PAGES = [
  { code: '1122', name: 'גביעי קידוש' },
  { code: '1128', name: 'חגים' },
  { code: '1134', name: 'תפילין וטלית' },
  { code: '1142', name: 'כיפות' },
  { code: '1152', name: 'מזוזות ובתי מזוזה' },
  { code: '1176', name: 'תכשיטים' },
];

// ── HTTP helper ─────────────────────────────────────────────────────────────
function get(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.israel-judaica.com',
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.7',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
      },
    }, (res) => {
      const cookie = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ cookie, body, status: res.statusCode }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function getSessionCookie(code) {
  const r = await get(`/index.php?option=com_art&view=category&code=${code}&Itemid=956&lang=he`);
  return r.cookie;
}

function post(code, cookie) {
  return new Promise((resolve, reject) => {
    const data = querystring.stringify({
      category: code,
      filterChoices: JSON.stringify({ price: [], size: [], product_status: [], color: [], lang_product: [], material: [] }),
      limit: '500',
      offset: '0',
      sortValue: '',
      sortDirection: '',
      note: '',
      search_term: '',
    });
    const req = https.request({
      hostname: 'www.israel-judaica.com',
      path: '/index.php?option=com_art&task=category.getProducts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Cookie': cookie,
        'Referer': `https://www.israel-judaica.com/index.php?option=com_art&view=category&code=${code}&lang=he`,
        'Origin': 'https://www.israel-judaica.com',
      },
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve({ status: false, error: 'parse error', raw: body.substring(0, 100) }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function extractSidebarCodes(html) {
  const results = [];
  const regex = /option=com_art&(?:amp;)?view=category&(?:amp;)?code=(\d+)/g;
  const seen = new Set();
  let m;
  while ((m = regex.exec(html)) !== null) {
    if (!seen.has(m[1])) { seen.add(m[1]); results.push(m[1]); }
  }
  return results;
}

// ── Step 1: Verify sidebar for missing codes ────────────────────────────────
console.log('Verifying sidebar for extra subcategories...');
const knownCodes = new Set(SUPPLIER_CODES.map(s => s.code));
const foundExtra = [];

for (const parent of PARENT_PAGES) {
  const r = await get(`/index.php?option=com_art&view=category&code=${parent.code}&Itemid=956&lang=he`);
  const codes = extractSidebarCodes(r.body);
  for (const c of codes) {
    if (!knownCodes.has(c) && c !== parent.code && !PARENT_PAGES.find(p => p.code === c)) {
      foundExtra.push({ code: c, foundInParent: parent.name });
      knownCodes.add(c);
    }
  }
  await new Promise(r => setTimeout(r, 1000));
}

if (foundExtra.length > 0) {
  console.log('\n⚠️  Extra codes found in sidebar (not in user list):');
  foundExtra.forEach(e => console.log(`  ${e.code} (parent: ${e.foundInParent})`));
} else {
  console.log('✅ No extra subcategory codes found in sidebars.');
}

// ── Step 2: Fetch SKUs for every code — one by one with fresh cookie ────────
console.log('\nFetching SKUs from supplier API (one by one, fresh cookie each time)...');
const skuMap = {}; // code → { name, skus: [], count }

// Get one shared session cookie first (reuse across requests)
let sessionCookie = await getSessionCookie(SUPPLIER_CODES[0].code);
await new Promise(r => setTimeout(r, 1500));

for (let i = 0; i < SUPPLIER_CODES.length; i++) {
  const { code, name } = SUPPLIER_CODES[i];

  // Refresh cookie every 8 requests to avoid session expiry
  if (i > 0 && i % 8 === 0) {
    sessionCookie = await getSessionCookie(code);
    await new Promise(r => setTimeout(r, 2000));
  }

  const res = await post(code, sessionCookie);
  const skus = res.status && res.products ? Object.keys(res.products) : [];
  skuMap[code] = { name, skus, count: skus.length };
  process.stdout.write(`  [${i+1}/${SUPPLIER_CODES.length}] code=${code} (${name}): ${skus.length} SKUs\n`);

  // Polite delay between requests
  await new Promise(r => setTimeout(r, 800));
}

// Save to file
const outPath = resolve(__dirname, '../../scripts/supplier_subcategory_skus.json');
writeFileSync(outPath, JSON.stringify(skuMap, null, 2), 'utf8');
console.log(`\n✅ Saved → scripts/supplier_subcategory_skus.json (${Object.values(skuMap).reduce((s,v) => s + v.count, 0)} total SKUs)`);

// ── Step 3: Read our Firestore subcategories ────────────────────────────────
console.log('\nReading Firestore product subcategories...');
const prodSnap = await db.collection('products').where('source', '==', 'israel-judaica').get();

const ourSubcats = new Map(); // subcatName → count
const ourSkuToSubcat = new Map(); // sku → { category, subcategory }

for (const d of prodSnap.docs) {
  const data = d.data();
  const sku = data.sku || '';
  const cat = data.category || data.cat || '';
  const subcat = data.subcategory || data.subCategory || '';
  if (sku) ourSkuToSubcat.set(sku, { category: cat, subcategory: subcat });
  const key = subcat || cat || '(no subcat)';
  ourSubcats.set(key, (ourSubcats.get(key) || 0) + 1);
}

console.log('\nOur Firestore subcategories (israel-judaica source):');
const sortedSubcats = [...ourSubcats.entries()].sort((a, b) => b[1] - a[1]);
sortedSubcats.forEach(([k, v]) => console.log(`  "${k}": ${v} products`));

// ── Step 4: Print mapping table ─────────────────────────────────────────────
console.log('\n' + '═'.repeat(80));
console.log('MAPPING TABLE: Supplier code → Our subcategory');
console.log('═'.repeat(80));

// For each supplier code, check how many of its SKUs already exist in our DB
// and what subcategory they're currently in
const supplierToOurs = [];
for (const [code, { name, skus }] of Object.entries(skuMap)) {
  const matched = skus.filter(s => ourSkuToSubcat.has(s));
  const subcatCounts = {};
  for (const s of matched) {
    const sc = ourSkuToSubcat.get(s)?.subcategory || ourSkuToSubcat.get(s)?.category || '(none)';
    subcatCounts[sc] = (subcatCounts[sc] || 0) + 1;
  }
  // Most common current subcategory for this group
  const currentSubcat = Object.entries(subcatCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';
  supplierToOurs.push({ code, supplierName: name, totalSkus: skus.length, matchedInDb: matched.length, currentSubcat, subcatCounts });
}

// Print
console.log(`\n${'Code'.padEnd(6)} ${'Supplier Name'.padEnd(35)} ${'#SKUs'.padEnd(6)} ${'#InDB'.padEnd(6)} Current Subcategory in DB`);
console.log('-'.repeat(80));
for (const row of supplierToOurs) {
  const flag = row.matchedInDb === 0 ? ' ⚠️ none in DB' : '';
  const multipleSubcats = Object.keys(row.subcatCounts).length > 1 ? ' ⚠️ mixed' : '';
  console.log(
    `${row.code.padEnd(6)} ${row.supplierName.padEnd(35)} ${String(row.totalSkus).padEnd(6)} ${String(row.matchedInDb).padEnd(6)} "${row.currentSubcat}"${flag}${multipleSubcats}`
  );
  if (Object.keys(row.subcatCounts).length > 1) {
    for (const [k, v] of Object.entries(row.subcatCounts)) {
      console.log(`       └ "${k}": ${v}`);
    }
  }
}

// SKUs not in DB at all
const allSupplierSkus = new Set(Object.values(skuMap).flatMap(v => v.skus));
const notInDb = [...allSupplierSkus].filter(s => !ourSkuToSubcat.has(s));
console.log(`\n${notInDb.length} supplier SKUs not in our DB at all (out of ${allSupplierSkus.size} total)`);

process.exit(0);
