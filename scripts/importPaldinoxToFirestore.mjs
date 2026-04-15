/**
 * Imports paldinox judaica products to Firestore.
 *
 * For each product in scripts/paldinox_judaica_full.json:
 *   1. Login to paldinox with Puppeteer → scrape real (logged-in) price
 *   2. Upload main image to Cloudinary (unsigned preset)
 *   3. Save document to Firestore "products" collection
 *
 * Skips products whose SKU already exists in Firestore.
 * Runs 3 products in parallel using a page pool.
 *
 * Run:
 *   PALDINOX_PASSWORD=xxx node scripts/importPaldinoxToFirestore.mjs
 *   (or set PALDINOX_PASSWORD in .env.local)
 */

import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env.local ──────────────────────────────────────────────────────────
function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    const lines = raw.split('\n');
    let key = null;
    let val = '';
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) {
        if (key && !process.env[key]) process.env[key] = val.trim();
        key = m[1];
        val = m[2];
      } else if (key) {
        val += '\n' + line;
      }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch { /* .env.local not found */ }
}
loadEnvLocal();

const PALDINOX_PASSWORD = process.env.PALDINOX_PASSWORD;
if (!PALDINOX_PASSWORD) {
  console.error('❌ חסרה סיסמה — הגדר PALDINOX_PASSWORD=...');
  process.exit(1);
}

// ─── Firebase Admin SDK ───────────────────────────────────────────────────────
// Strip accidental "Value: " prefix that may appear in .env.local
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

if (!clientEmail || !privateKey) {
  console.error('❌ חסרות הרשאות Firebase Admin (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)');
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// ─── Constants ────────────────────────────────────────────────────────────────
const USERNAME        = '20552';
const BASE_URL        = 'https://paldinox.co.il';
const CLOUDINARY_URL  = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';
const UPLOAD_PRESET   = 'yoursofer_upload';
const PRICE_FACTOR    = 2.18;
const CONCURRENCY     = 3;

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Cloudinary: upload by URL ────────────────────────────────────────────────
async function uploadToCloudinary(imageUrl) {
  const form = new FormData();
  form.append('file', imageUrl);
  form.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.secure_url) {
    throw new Error(data.error?.message ?? 'Cloudinary upload failed');
  }
  return data.secure_url;
}

// ─── Scrape real price from a product page ────────────────────────────────────
async function scrapePrice(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });
  return page.evaluate(() => {
    const el = document.querySelector(
      '.summary .price ins .amount, .summary .price .amount, .summary .price'
    );
    return parseFloat(el?.innerText?.replace(/[^\d.]/g, '') || '0') || 0;
  });
}

// ─── Login ────────────────────────────────────────────────────────────────────
async function login(page) {
  console.log('🔐 מתחבר לpaldinox...');
  await page.goto(`${BASE_URL}/my-account/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input[name="username"]', { timeout: 15000 });

  await page.focus('input[name="username"]');
  await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
  await page.type('input[name="username"]', USERNAME, { delay: 50 });

  for (const sel of ['input[name="password"]', '#password', 'input[type="password"]']) {
    const el = await page.$(sel);
    if (el) { await page.type(sel, PALDINOX_PASSWORD, { delay: 50 }); break; }
  }

  await delay(400);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }),
    page.keyboard.press('Enter'),
  ]);

  const url = page.url();
  if (url.includes('my-account') && !url.includes('login')) {
    console.log('✅ התחברות הצליחה\n');
  } else {
    console.warn(`⚠️  URL לאחר login: ${url}`);
  }
}

// ─── Process one product ──────────────────────────────────────────────────────
async function processProduct(page, product, idx, total) {
  const label = `[${idx}/${total}] ${product.name}`;

  // 1. Real price
  let originalPrice = product.price;
  try {
    const scraped = await scrapePrice(page, product.url);
    if (scraped > 0) originalPrice = scraped;
  } catch (e) {
    process.stdout.write(`  ⚠️  מחיר — fallback: ${e.message.slice(0, 60)}\n`);
  }
  const finalPrice = Math.round(originalPrice * PRICE_FACTOR * 100) / 100;

  // 2. Cloudinary
  const mainImgSrc = product.images?.[0] ?? '';
  let cloudinaryUrl = mainImgSrc;
  if (mainImgSrc) {
    try {
      cloudinaryUrl = await uploadToCloudinary(mainImgSrc);
    } catch (e) {
      process.stdout.write(`  ⚠️  Cloudinary — שומר URL מקורי: ${e.message.slice(0, 60)}\n`);
    }
  }

  // 3. Firestore
  await db.collection('products').add({
    name:          product.name,
    desc:          product.description || '',
    price:         finalPrice,
    originalPrice: originalPrice,
    imgUrl:        cloudinaryUrl,
    images:        [cloudinaryUrl].filter(Boolean),
    sku:           product.sku || '',
    cat:           'יודאיקה',
    category:      'יודאיקה',
    priority:      50,
    isBestSeller:  false,
    badge:         null,
    status:        'active',
    source:        'paldinox',
    sourceUrl:     product.url,
    createdAt:     FieldValue.serverTimestamp(),
  });

  console.log(`  ✅ ${label} — ₪${finalPrice}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 importPaldinoxToFirestore\n');

  // Load products
  const products = JSON.parse(
    readFileSync(resolve(__dirname, 'paldinox_judaica_full.json'), 'utf8')
  );
  console.log(`📦 נטענו ${products.length} מוצרים מ-paldinox_judaica_full.json\n`);

  // Load existing SKUs from Firestore
  console.log('🔍 טוען SKU-ים קיימים מ-Firestore...');
  const existingSnap = await db.collection('products').get();
  const existingSkus = new Set();
  existingSnap.forEach(doc => {
    const sku = doc.data().sku;
    if (sku) existingSkus.add(sku);
  });
  console.log(`   ${existingSkus.size} SKU-ים קיימים\n`);

  // Filter out already-imported products
  const toImport = products.filter(p => !p.sku || !existingSkus.has(p.sku));
  const skipped  = products.length - toImport.length;
  console.log(`📋 לייבוא: ${toImport.length}  |  כבר קיימים: ${skipped}\n`);

  if (toImport.length === 0) {
    console.log('✅ אין מוצרים חדשים לייבוא.');
    process.exit(0);
  }

  // Launch browser and login
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const pages = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    const p = await browser.newPage();
    await p.setViewport({ width: 1280, height: 900 });
    await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36');
    pages.push(p);
  }

  // Login on page 0 — cookies shared across all pages in same browser
  await login(pages[0]);

  // Worker pool: distribute work across CONCURRENCY pages
  const queue = toImport.map((p, i) => ({ product: p, idx: i + 1 }));
  const total  = toImport.length;
  let done     = 0;
  let failed   = 0;

  async function runWorker(page) {
    while (true) {
      const item = queue.shift();
      if (!item) break;
      const { product, idx } = item;

      try {
        await processProduct(page, product, idx, total);
        done++;
      } catch (err) {
        console.error(`  ❌ [${idx}/${total}] ${product.name}: ${err.message}`);
        failed++;
      }

      if ((done + failed) % 10 === 0) {
        console.log(`\n📊 Progress: ${done + failed}/${total} (✅ ${done} | ❌ ${failed})\n`);
      }
    }
  }

  try {
    await Promise.all(pages.map(p => runWorker(p)));
  } finally {
    await browser.close();
  }

  console.log(`\n🎉 סיום!`);
  console.log(`   יובאו:    ${done}`);
  console.log(`   נכשלו:   ${failed}`);
  console.log(`   דולגו:   ${skipped}`);
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
