/**
 * scanMissingCodes.mjs
 *
 * 1. Fetches SKUs + name for all 26 unscanned sidebar codes
 * 2. Identifies parent vs leaf codes (parents = their SKU set = union of children)
 * 3. Updates scripts/supplier_subcategory_skus.json with new codes
 * 4. Re-runs Operation A dry-run with the full catalog
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname }    from 'path';
import { fileURLToPath }       from 'url';
import https                   from 'https';
import querystring             from 'querystring';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// ── The 26 extra codes found in sidebar ──────────────────────────────────────
const EXTRA_CODES = [
  '1116','1118','1119','1121','1126','1127',
  '1140','1141','1155',
  '1160','1161','1163','1164','1165','1166','1167','1168','1169',
  '1171','1172','1173','1174','1175',
  '1183','1185','1187',
];

// ── HTTP helpers ──────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function httpGet(path) {
  return new Promise((resolve, reject) => {
    https.request({
      hostname: 'www.israel-judaica.com', path, method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,*/*', 'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
      },
    }, res => {
      const cookie = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
      let body = ''; res.on('data', d => body += d);
      res.on('end', () => resolve({ cookie, body, status: res.statusCode }));
    }).on('error', reject).end();
  });
}

function postProducts(code, cookie) {
  return new Promise((resolve, reject) => {
    const data = querystring.stringify({
      category: code,
      filterChoices: JSON.stringify({ price:[], size:[], product_status:[], color:[], lang_product:[], material:[] }),
      limit: '1000', offset: '0', sortValue: '', sortDirection: '', note: '', search_term: '',
    });
    https.request({
      hostname: 'www.israel-judaica.com',
      path: '/index.php?option=com_art&task=category.getProducts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, */*',
        'Cookie': cookie,
        'Referer': `https://www.israel-judaica.com/index.php?option=com_art&view=category&code=${code}&lang=he`,
        'Origin': 'https://www.israel-judaica.com',
      },
    }, res => {
      let body = ''; res.on('data', d => body += d);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({ status: false }); } });
    }).on('error', reject).end(data);
  });
}

function extractPageTitle(html) {
  // Try page_title div first, then <title> tag
  const m1 = html.match(/class="page_title[^"]*"[^>]*>([^<]{2,60})/);
  if (m1) return m1[1].trim();
  const m2 = html.match(/<title>([^<]{2,80})<\/title>/i);
  if (m2) return m2[1].trim().split('|')[0].trim();
  return '';
}

function extractSidebarChildren(html, selfCode) {
  // Extract child category codes from sidebar (li.child.active > siblings li.child)
  const re = /option=com_art&(?:amp;)?view=category&(?:amp;)?code=(\d+)/g;
  const seen = new Set(); const codes = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[1] !== selfCode && !seen.has(m[1])) { seen.add(m[1]); codes.push(m[1]); }
  }
  return codes;
}

// ── Step 1: fetch all extra codes ────────────────────────────────────────────
console.log('Fetching extra codes from supplier…\n');

let sessionCookie = (await httpGet(`/index.php?option=com_art&view=category&code=1116&Itemid=956&lang=he`)).cookie;
await sleep(1500);

const newCodeData = {}; // code → { name, skus, sidebarCodes }

for (let i = 0; i < EXTRA_CODES.length; i++) {
  const code = EXTRA_CODES[i];

  if (i > 0 && i % 8 === 0) {
    const r = await httpGet(`/index.php?option=com_art&view=category&code=${code}&Itemid=956&lang=he`);
    sessionCookie = r.cookie;
    const nameFromPage = extractPageTitle(r.body);
    const sidebarCodes = extractSidebarChildren(r.body, code);
    await sleep(2000);

    const res = await postProducts(code, sessionCookie);
    const prods = (res.status && res.products) ? res.products : {};
    const skus = Object.keys(prods);
    newCodeData[code] = { name: nameFromPage, skus, count: skus.length, sidebarCodes };
    process.stdout.write(`  [${i+1}/${EXTRA_CODES.length}] code=${code} "${nameFromPage}": ${skus.length} SKUs\n`);
    await sleep(800);
    continue;
  }

  // Fetch page to get name + sidebar, reuse existing cookie for POST
  const pageR = await httpGet(`/index.php?option=com_art&view=category&code=${code}&Itemid=956&lang=he`);
  const nameFromPage = extractPageTitle(pageR.body);
  const sidebarCodes = extractSidebarChildren(pageR.body, code);
  if (pageR.cookie) sessionCookie = pageR.cookie;
  await sleep(600);

  const res = await postProducts(code, sessionCookie);
  const prods = (res.status && res.products) ? res.products : {};
  const skus = Object.keys(prods);
  newCodeData[code] = { name: nameFromPage, skus, count: skus.length, sidebarCodes };
  process.stdout.write(`  [${i+1}/${EXTRA_CODES.length}] code=${code} "${nameFromPage}": ${skus.length} SKUs\n`);
  await sleep(800);
}

// ── Step 2: detect parents (code whose SKU set ⊇ any child's SKU set) ────────
console.log('\n─── Parent vs Leaf detection ───');
const parentCodes = new Set();
for (const [code, data] of Object.entries(newCodeData)) {
  const mySkus = new Set(data.skus);
  if (mySkus.size === 0) continue;
  // Check each sidebar sibling/child code
  for (const childCode of data.sidebarCodes) {
    const childData = newCodeData[childCode];
    if (!childData || childData.skus.length === 0) continue;
    // If all child SKUs are in parent, this code is a parent
    const childSkus = childData.skus;
    const overlap = childSkus.filter(s => mySkus.has(s)).length;
    if (overlap === childSkus.length && childSkus.length > 0) {
      parentCodes.add(code);
      break;
    }
  }
}

const leafCodes = EXTRA_CODES.filter(c => !parentCodes.has(c) && newCodeData[c]?.count > 0);
const zeroCodes = EXTRA_CODES.filter(c => newCodeData[c]?.count === 0);

console.log(`  Parent codes (SKUs = union of children): ${[...parentCodes].join(', ') || 'none'}`);
console.log(`  Leaf codes with products (${leafCodes.length}): ${leafCodes.join(', ')}`);
console.log(`  Zero-product codes (${zeroCodes.length}): ${zeroCodes.join(', ')}`);

// ── Step 3: update supplier_subcategory_skus.json ────────────────────────────
const existingFile = JSON.parse(readFileSync(resolve(__dirname, '../../scripts/supplier_subcategory_skus.json'), 'utf8'));
for (const [code, data] of Object.entries(newCodeData)) {
  if (data.count > 0 && !parentCodes.has(code)) {
    existingFile[code] = { name: data.name, skus: data.skus, count: data.count };
  }
}
writeFileSync(resolve(__dirname, '../../scripts/supplier_subcategory_skus.json'),
  JSON.stringify(existingFile, null, 2), 'utf8');
const totalSkus = Object.values(existingFile).reduce((s, v) => s + (v.count || v.skus?.length || 0), 0);
console.log(`\n✅ Updated supplier_subcategory_skus.json — ${Object.keys(existingFile).length} codes, ${totalSkus} total SKUs`);

// ── Step 4: re-run Operation A dry-run with full catalog ──────────────────────
console.log('\n' + '═'.repeat(70));
console.log('RE-RUNNING OPERATION A DRY-RUN with full catalog');
console.log('═'.repeat(70));

// Build complete SKU→code map
const skuToCode = {};
for (const [code, entry] of Object.entries(existingFile)) {
  for (const sku of (entry.skus || [])) {
    skuToCode[sku] = code;
  }
}
console.log(`SKU→code index: ${Object.keys(skuToCode).length} entries`);

// Load Firestore UK products
const snap   = await db.collection('products').get();
const ukDocs = snap.docs.map(d => ({ _id: d.id, ...d.data() })).filter(d => /^UK\d+$/.test(d.sku || ''));

// ── Step 5: propose mapping for new codes ─────────────────────────────────────
// We need to display code → supplier name → our subCategory for all new leaf codes.
// For now, build a proposed map from known patterns; unknown ones go to needsDecision.

// First, collect all unique subCategories in our DB to know what exists
const ourSubcats = new Set(ukDocs.map(d => d.subCategory).filter(Boolean));

// Propose mapping based on name similarity to existing subCategories
// (This will be printed for user approval)
const needsDecision = [];

// Auto-mapping candidates based on name patterns
function proposeSubcat(code, supplierName) {
  const n = supplierName;
  if (!n) return null;
  if (/פמוט|מנורה/.test(n)) return 'פמוטים';
  if (/ברכון|בשמים/.test(n)) return 'ברכונים';
  if (/כיסוי.*חלה|מפה.*חלה|חלה.*כיסוי/.test(n)) return 'כיסויי חלה';
  if (/נטיל|נטל/.test(n)) return 'נטילת ידיים';
  if (/מפתח/.test(n)) return 'מחזיקי מפתחות';
  if (/מלחי|מלח.*|מצת|מלחיה/.test(n)) return 'מצתים ומלחיות';
  if (/קרש.*חלה|חלה.*קרש|ליין/.test(n)) return 'קרשי חלה';
  if (/קופת.*צדק|צדק.*קופ/.test(n)) return 'קופות צדקה';
  if (/הבדל/.test(n)) return 'הבדלה';
  if (/בית.*כנסת|כנסת|ספר.*תורה.*מינ/.test(n)) return 'מוצרי בית כנסת';
  if (/חסיד|דמות/.test(n)) return 'דמויות חסידים';
  if (/חמסה|סגול/.test(n)) return 'חמסות וסגולות';
  if (/סיד|סדו/.test(n)) return 'סידורים ותהילים';
  if (/כיסוי.*פלט|פלט/.test(n)) return 'כיסויי פלטה';
  if (/גופיי|ציצ/.test(n)) return 'גופיות ציצית';
  if (/חלה.*הפרש|הפרש.*חלה/.test(n)) return 'הפרשת חלה';
  if (/עט|עטים/.test(n)) return 'עטים';
  if (/מגנט/.test(n)) return 'מגנטים';
  if (/בית.*מזוז|מזוז.*בית/.test(n)) return 'בתי מזוזה';
  if (/מזוז/.test(n)) return 'בתי מזוזה';
  if (/כוס.*קידוש|גביע/.test(n)) return 'כוסות קידוש';
  return null;
}

const newCodeMapping = {}; // code → proposedSubcat
for (const code of leafCodes) {
  const name    = newCodeData[code]?.name || '';
  const proposed = proposeSubcat(code, name);
  if (proposed) {
    newCodeMapping[code] = proposed;
  } else {
    needsDecision.push({ code, name, count: newCodeData[code]?.count });
  }
}

// ── Now run dry-run with all codes including new mapping ──────────────────────
const CODE_TO_SUBCAT_BASE = {
  '1123':'כוסות קידוש','1124':'כוסות קידוש','1125':'כוסות קידוש','1193':'כוסות קידוש',
  '1129':'חנוכה','1130':'סוכות','1131':'פורים','1132':'פסח','1133':'ראש השנה',
  '1135':'בתי תפילין','1136':'תיקי טלית','1137':'מחזיקי טלית','1138':'טליתות',
  '1139':'סטים טלית ותפילין','1184':'תיק תפ',
  '1143':'כיפות סרוגות','1144':'כיפות סאטן','1145':'כיפות קטיפה',
  '1146':'כיפות סרוגות עם רקמה','1147':'כיפות מיוחדות','1148':'כיפות עור',
  '1149':'כיפות פריק','1150':'סיכות לכיפה','1151':'כיפות סרוגות DMC',
  '1153':'מזוזות זכוכית','1154':'מזוזות אלומיניום','1156':'מזוזות לרכב',
  '1157':'מזוזות מתכת','1158':'מזוזות עץ','1159':'מזוזות פלסטיק',
  '1177':'תכשיטים','1178':'תכשיטים','1180':'תכשיטים',
  ...newCodeMapping,
};

const toUpdate = [], orphans = [], noChange = [];
for (const d of ukDocs) {
  const code = skuToCode[d.sku];
  if (!code) { orphans.push(d); continue; }
  const newSub = CODE_TO_SUBCAT_BASE[code];
  if (!newSub) { orphans.push(d); continue; }
  if ((d.subCategory || '') === newSub) { noChange.push(d.sku); continue; }
  toUpdate.push({ sku: d.sku, name: d.name || '', oldSub: d.subCategory || '', newSub, code });
}

console.log(`\n  ✅ ישתנו        : ${toUpdate.length}`);
console.log(`  — כבר נכונים   : ${noChange.length}`);
console.log(`  ⚠️  orphans      : ${orphans.length}`);

const byCat = {};
toUpdate.forEach(u => { byCat[u.newSub] = (byCat[u.newSub] || 0) + 1; });
console.log('\n─── פילוח לפי תת-קטגוריה חדשה ───');
Object.entries(byCat).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>
  console.log(`  ${String(v).padStart(5)}  ${k}`)
);

console.log('\n─── 10 דוגמאות לשינויים ───');
toUpdate.slice(0, 10).forEach(u =>
  console.log(`  ${u.sku.padEnd(10)} "${u.name.substring(0,30).padEnd(30)}"  ${(u.oldSub||'(ריק)').padEnd(22)} → "${u.newSub}"`)
);

// ── Step 5: print full mapping table for new codes ────────────────────────────
console.log('\n' + '═'.repeat(70));
console.log('MAPPING TABLE — 26 codes חדשים');
console.log('═'.repeat(70));
console.log(`${'Code'.padEnd(6)} ${'Supplier Name'.padEnd(35)} ${'#SKUs'.padEnd(6)} ${'Type'.padEnd(8)} Proposed subCategory`);
console.log('─'.repeat(80));
for (const code of EXTRA_CODES) {
  const d      = newCodeData[code];
  const name   = (d?.name || '').substring(0, 34);
  const count  = d?.count ?? 0;
  const type   = parentCodes.has(code) ? 'PARENT' : count === 0 ? 'empty' : 'leaf';
  const subcat = CODE_TO_SUBCAT_BASE[code] || needsDecision.find(x=>x.code===code) ? (CODE_TO_SUBCAT_BASE[code]||'❓ NEEDS DECISION') : '—';
  console.log(`${code.padEnd(6)} ${name.padEnd(35)} ${String(count).padEnd(6)} ${type.padEnd(8)} ${subcat}`);
}

if (needsDecision.length > 0) {
  console.log('\n❓ Codes that need your decision:');
  needsDecision.forEach(x =>
    console.log(`  code=${x.code}  "${x.name}"  (${x.count} SKUs) — לאיזו תת-קטגוריה לשייך?`)
  );
}

console.log('\n⚠️  DRY-RUN בלבד — לא נכתב לFirestore.');
process.exit(0);
