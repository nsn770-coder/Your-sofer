/**
 * importMissingProducts.mjs
 *
 * DRY-RUN: find all israel-judaica SKUs absent from Firestore and plan import.
 * --confirm: write docs to Firestore + upload images to Cloudinary.
 *
 * Pricing:
 *   כיפות codes (1143–1151, 1181) → price = supplierPrice × 3
 *   Everything else                → price = supplierPrice × 2.08
 *
 * Usage:
 *   node app/scripts/importMissingProducts.mjs           ← dry-run
 *   node app/scripts/importMissingProducts.mjs --confirm ← write
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath }       from 'url';
import https                   from 'https';
import querystring             from 'querystring';
import puppeteer               from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..', '..');
const CONFIRM   = process.argv.includes('--confirm');

// ── Firebase ──────────────────────────────────────────────────────────────────
const sa = JSON.parse(readFileSync(
  resolve(ROOT, 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'
));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// ── Supplier credentials ──────────────────────────────────────────────────────
const envPath = join(ROOT, '.env.israel-judaica');
if (!existsSync(envPath)) { console.error('Missing .env.israel-judaica'); process.exit(1); }
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => { const [k,...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);
const BASE     = (env.ISRAEL_JUDAICA_URL || 'https://www.israel-judaica.com').replace(/\/index\.php.*/, '');
const EMAIL    = env.ISRAEL_JUDAICA_EMAIL;
const PASSWORD = env.ISRAEL_JUDAICA_PASSWORD;
if (!EMAIL || !PASSWORD) { console.error('Missing EMAIL/PASSWORD in .env.israel-judaica'); process.exit(1); }

// ── Code → subCategory mapping ─────────────────────────────────────────────────
const CODE_TO_SUBCAT = {
  '1123': 'כוסות קידוש', '1124': 'כוסות קידוש', '1125': 'כוסות קידוש', '1193': 'כוסות קידוש',
  '1129': 'חנוכה', '1130': 'סוכות', '1131': 'פורים', '1132': 'פסח', '1133': 'ראש השנה',
  '1168': 'פמוטים', '1171': 'כיסויי חלה', '1172': 'כיסויי פלטה', '1174': 'קרשי חלה',
  '1175': 'מצתים ומלחיות', '1126': 'הבדלה', '1187': 'ברכונים',
  '1164': 'מחזיקי מפתחות', '1165': 'נטילת ידיים', '1169': 'קופות צדקה',
  '1119': 'חמסות וסגולות', '1127': 'דמויות חסידים', '1163': 'מגנטים',
  '1166': 'סידורים ותהילים', '1167': 'עטים', '1160': 'מוצרי בית כנסת',
  '1143': 'כיפות סרוגות', '1144': 'כיפות סאטן', '1145': 'כיפות קטיפה',
  '1146': 'כיפות סרוגות עם רקמה', '1147': 'כיפות מיוחדות', '1148': 'כיפות עור',
  '1149': 'כיפות פריק', '1150': 'סיכות לכיפה', '1151': 'כיפות סרוגות DMC',
  '1153': 'מזוזות זכוכית', '1154': 'מזוזות אלומיניום', '1155': 'מזוזות פולירזין',
  '1156': 'מזוזות לרכב',  '1157': 'מזוזות מתכת',   '1158': 'מזוזות עץ', '1159': 'מזוזות פלסטיק',
  '1135': 'בתי תפילין',  '1136': 'תיקי טלית',     '1137': 'מחזיקי טלית',
  '1138': 'טליתות',      '1139': 'סטים טלית ותפילין', '1184': 'תיק תפ',
  '1177': 'תכשיטים', '1178': 'תכשיטים', '1180': 'תכשיטים',
  '1161': 'פמוטים', '1173': 'כיסויי פלטה', '1118': 'ברכונים',
  '1116': 'חתן וכלה', '1140': 'ילדים', '1141': 'כריות לברית', '1185': 'קיטלים',
  // 1183 (אביזרי תצוגה) intentionally omitted — display accessories, not for retail
};

// Kippot codes → ×3 pricing; all others → ×2.08
const KIPPOT_CODES = new Set(['1143','1144','1145','1146','1147','1148','1149','1150','1151','1181']);

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function postProductsWithCookie(code, cookie) {
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, */*; q=0.01',
        'Cookie': cookie,
        'Referer': `https://www.israel-judaica.com/index.php?option=com_art&view=category&code=${code}&Itemid=956&lang=he`,
        'Origin': 'https://www.israel-judaica.com',
      },
    }, res => {
      let body = ''; res.on('data', d => body += d);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({ status: false, raw: body.substring(0, 200) }); } });
    });
    req.on('error', reject); req.write(data); req.end();
  });
}

// Cloudinary unsigned upload by URL
function cloudinaryUploadUrl(imageUrl) {
  return new Promise((resolve, reject) => {
    const data = querystring.stringify({ file: imageUrl, upload_preset: 'yoursofer_upload' });
    const req = https.request({
      hostname: 'api.cloudinary.com',
      path: '/v1_1/dyxzq3ucy/image/upload',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) },
    }, res => {
      let body = ''; res.on('data', d => body += d);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({ error: { message: body.substring(0,100) } }); } });
    });
    req.on('error', reject); req.write(data); req.end();
  });
}

// ── Step 1: load supplier SKU list ────────────────────────────────────────────
const skuFile = JSON.parse(readFileSync(resolve(ROOT, 'scripts/supplier_subcategory_skus.json'), 'utf8'));
const supplierSkuToCode = {};
for (const [code, entry] of Object.entries(skuFile)) {
  if (!CODE_TO_SUBCAT[code]) continue; // skip unmapped codes (e.g. 1183)
  for (const sku of (entry.skus || [])) supplierSkuToCode[sku] = code;
}
const allSupplierSkus = new Set(Object.keys(supplierSkuToCode));
console.log(`Supplier SKUs (mapped codes only): ${allSupplierSkus.size}`);

// ── Step 2: load Firestore UK SKUs ────────────────────────────────────────────
console.log('Loading Firestore products…');
const snap = await db.collection('products').get();
const firestoreSkus = new Set(
  snap.docs.map(d => d.data().sku).filter(s => s && /^UK\d+$/.test(s))
);
console.log(`Firestore UK SKUs: ${firestoreSkus.size}`);

// subCategory → cat lookup from existing products
const subCatToCat = {};
for (const doc of snap.docs) {
  const d = doc.data();
  if (d.subCategory && d.cat) subCatToCat[d.subCategory] = d.cat;
}

// ── Step 3: find missing SKUs ─────────────────────────────────────────────────
const missingSkus    = [...allSupplierSkus].filter(s => !firestoreSkus.has(s));
const missingSkuSet  = new Set(missingSkus);
console.log(`Missing SKUs to import: ${missingSkus.length}\n`);

const missingByCode = {};
for (const sku of missingSkus) {
  const code = supplierSkuToCode[sku];
  if (!missingByCode[code]) missingByCode[code] = [];
  missingByCode[code].push(sku);
}

// ── Step 4: Puppeteer login → get authenticated cookie ───────────────────────
console.log('Launching Puppeteer for supplier login…');
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=he-IL'],
});

let authCookie = '';
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const loginUrl = `${BASE}/index.php?option=com_users&view=login&lang=he`;
  await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });

  await page.evaluate((email, password) => {
    const uSel = ['input[name="username"]', 'input[name="jform[username]"]', 'input[type="email"]', 'input[id*="username"]'];
    const pSel = ['input[name="password"]', 'input[name="jform[password]"]', 'input[type="password"]'];
    for (const s of uSel) { const el = document.querySelector(s); if (el) { el.value = email; el.dispatchEvent(new Event('input', { bubbles: true })); break; } }
    for (const s of pSel) { const el = document.querySelector(s); if (el) { el.value = password; el.dispatchEvent(new Event('input', { bubbles: true })); break; } }
  }, EMAIL, PASSWORD);

  await page.evaluate(() => {
    const btn = document.querySelector('button[type="submit"], input[type="submit"]');
    if (btn) btn.click();
    else document.querySelector('form')?.submit();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await sleep(2000);

  // Extract cookies
  const cookies = await page.cookies();
  authCookie = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const afterHtml = await page.content();
  const isLoggedIn = afterHtml.toLowerCase().includes('logout') ||
    afterHtml.includes('התנתק') || afterHtml.includes(EMAIL.split('@')[0]);
  console.log(`Login status: ${isLoggedIn ? '✅ logged in' : '⚠️ uncertain'}`);
  console.log(`Cookie length: ${authCookie.length} chars`);
} catch(e) {
  console.error('Puppeteer login error:', e.message);
} finally {
  await browser.close();
}

if (!authCookie) {
  console.error('Failed to get auth cookie. Aborting.');
  process.exit(1);
}

// ── Step 5: fetch product details with authenticated cookie ───────────────────
console.log('\nFetching product details from supplier API (authenticated)…');
const codes = Object.keys(missingByCode);
const toImport = [];
let firstProductSample = null;
let requestCount = 0;

for (let i = 0; i < codes.length; i++) {
  const code = codes[i];
  requestCount++;

  let res;
  try {
    res = await postProductsWithCookie(code, authCookie);
  } catch(e) {
    console.error(`  code=${code}: fetch error — ${e.message}`);
    await sleep(1000);
    continue;
  }

  if (!res.status) {
    console.error(`  code=${code}: API error — ${res.raw || JSON.stringify(res).substring(0,100)}`);
    await sleep(1000);
    continue;
  }

  const products = res.products ? Object.values(res.products) : [];
  if (!firstProductSample && products.length > 0) firstProductSample = products[0];

  const isKippot   = KIPPOT_CODES.has(code);
  const multiplier = isKippot ? 3 : 2.08;
  const subCat     = CODE_TO_SUBCAT[code];
  const cat        = subCatToCat[subCat] || (isKippot ? 'כיפות' : 'יודאיקה');

  let found = 0;
  for (const p of products) {
    if (!missingSkuSet.has(p.sku)) continue;
    found++;

    // Try all known price fields
    const supplierPrice = parseFloat(
      p.price || p.price_he || p.base_price || p.sale_price ||
      p.dealer_price || p.wholesale_price || p.cost || 0
    );
    const price = Math.round(supplierPrice * multiplier * 100) / 100;

    const filename = p.image || p.filename || p.img || '';
    const imageUrl = filename
      ? `${BASE}/images/com_art/products/original/${filename}`
      : '';

    toImport.push({
      sku:          p.sku,
      code,
      name:         p.name_he || p.name || p.name_en || '',
      supplierPrice,
      filename,
      imageUrl,
      subCategory:  subCat,
      cat,
      multiplier,
      price,
      isKippot,
    });
  }

  process.stdout.write(
    `  [${String(i+1).padStart(2)}/${codes.length}] code=${code} (${(skuFile[code]?.name||'').substring(0,20).padEnd(20)}): ${String(found).padStart(3)} new\n`
  );
  await sleep(600);
}

// ── Step 6: DRY-RUN report ────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(72));
console.log('DRY-RUN — ייבוא מוצרים חסרים מ-israel-judaica');
console.log('═'.repeat(72));
console.log(`  סה"כ לייבוא              : ${toImport.length}`);
console.log(`  כיפות (×3)               : ${toImport.filter(p => p.isKippot).length}`);
console.log(`  יודאיקה (×2.08)          : ${toImport.filter(p => !p.isKippot).length}`);

const fetchedSkus = new Set(toImport.map(p => p.sku));
const notFetched  = missingSkus.filter(s => !fetchedSkus.has(s));
console.log(`  לא נמצאו בפועל (removed) : ${notFetched.length}`);

// Breakdown by subCategory
console.log('\n─── פילוח לפי subCategory ───');
const bySub = {};
toImport.forEach(p => { bySub[p.subCategory] = (bySub[p.subCategory]||0)+1; });
Object.entries(bySub).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) =>
  console.log(`  ${String(v).padStart(5)}  ${k}`)
);

// Pricing examples — 2 kippot + 3 judaica
console.log('\n─── דוגמאות תמחור (2 כיפות + 3 יודאיקה) ───');
console.log(`  ${'SKU'.padEnd(10)} ${'שם (30)'.padEnd(32)} ${'ספק'.padEnd(8)} ×    סופי`);
console.log('  ' + '─'.repeat(65));
const kSamp = toImport.filter(p => p.isKippot && p.supplierPrice > 0).slice(0, 2);
const jSamp = toImport.filter(p => !p.isKippot && p.supplierPrice > 0).slice(0, 3);
// If no priced kippot, show any
const kAll  = toImport.filter(p => p.isKippot).slice(0, 2);
const jAll  = toImport.filter(p => !p.isKippot).slice(0, 3);
[...(kSamp.length ? kSamp : kAll), ...(jSamp.length ? jSamp : jAll)].forEach(p =>
  console.log(
    `  ${p.sku.padEnd(10)} "${p.name.substring(0,30).padEnd(30)}"  ₪${String(p.supplierPrice).padStart(6)}  ×${p.multiplier}  = ₪${p.price}`
  )
);

// Problems
const noImage = toImport.filter(p => !p.filename);
const noPrice = toImport.filter(p => !p.supplierPrice || p.supplierPrice <= 0);
console.log('\n─── בעיות ───');
console.log(`  ללא תמונה (filename ריק) : ${noImage.length}`);
console.log(`  ללא מחיר ספק (0 / ריק)  : ${noPrice.length}`);
if (noPrice.length > 0 && noPrice.length <= 20) {
  noPrice.forEach(p => console.log(`    ${p.sku}  "${p.name.substring(0,40)}"  code=${p.code}`));
} else if (noPrice.length > 20) {
  noPrice.slice(0,5).forEach(p => console.log(`    ${p.sku}  "${p.name.substring(0,40)}"`));
  console.log(`    … (${noPrice.length-5} more)`);
}

// Raw product structure (first product — verify price field name)
if (firstProductSample) {
  console.log('\n─── ALL שדות מוצר ראשון (price field check) ───');
  Object.entries(firstProductSample).forEach(([k, v]) =>
    console.log(`  ${k.padEnd(26)} = ${JSON.stringify(v)?.substring(0, 80)}`)
  );
}

// Save plan
const planPath = resolve(ROOT, 'scripts/import_plan.json');
writeFileSync(planPath, JSON.stringify(toImport, null, 2), 'utf8');
console.log(`\nImport plan saved → scripts/import_plan.json  (${toImport.length} entries)`);

if (!CONFIRM) {
  console.log('\n⚠️  DRY-RUN בלבד — לא נכתב לFirestore.');
  console.log('   הרץ עם --confirm לייבוא בפועל.');
  process.exit(0);
}

// ── CONFIRM: upload images + write to Firestore ───────────────────────────────
console.log('\n' + '═'.repeat(72));
console.log('CONFIRM — מייבא מוצרים לFirestore…');
console.log('═'.repeat(72));

// Skip products with no price and no name
const importable = toImport.filter(p => p.name && p.supplierPrice > 0);
const skippedNoPrice = toImport.length - importable.length;
if (skippedNoPrice > 0) console.log(`⚠️  דולגו ${skippedNoPrice} מוצרים ללא מחיר/שם`);

let written = 0, imageOk = 0, imageErr = 0;
const BATCH_SIZE = 400;
const allDocs = [];

for (let i = 0; i < importable.length; i++) {
  const p = importable[i];
  let cloudinaryUrl = '';
  let cloudinaryPublicId = '';

  if (p.imageUrl) {
    try {
      const res = await cloudinaryUploadUrl(p.imageUrl);
      if (res.secure_url) {
        cloudinaryUrl = res.secure_url;
        cloudinaryPublicId = res.public_id || '';
        imageOk++;
      } else {
        imageErr++;
        process.stderr.write(`  IMG_ERR ${p.sku}: ${res.error?.message || 'unknown'}\n`);
      }
    } catch(e) {
      imageErr++;
      process.stderr.write(`  IMG_ERR ${p.sku}: ${e.message}\n`);
    }
    await sleep(150);
  }

  allDocs.push({
    sku:            p.sku,
    name:           p.name,
    price:          p.price,
    soferBasePrice: p.supplierPrice,
    subCategory:    p.subCategory,
    cat:            p.cat,
    hidden:         false,
    inStock:        true,
    image:          cloudinaryUrl,
    ...(cloudinaryPublicId ? { cloudinaryPublicId } : {}),
  });

  if ((i + 1) % 50 === 0) process.stdout.write(`  Cloudinary: ${i+1}/${importable.length}  (ok=${imageOk}, err=${imageErr})\n`);
}

for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
  const batch = db.batch();
  for (const doc of allDocs.slice(i, i + BATCH_SIZE)) {
    batch.set(db.collection('products').doc(), doc);
  }
  await batch.commit();
  written += Math.min(BATCH_SIZE, allDocs.length - i);
  process.stdout.write(`  Firestore: ${written}/${allDocs.length}\n`);
}

console.log(`\n✅ Done — ${written} products imported.`);
console.log(`   Images: ${imageOk} uploaded, ${imageErr} errors, ${toImport.length - importable.length} skipped (no price).`);
process.exit(0);
