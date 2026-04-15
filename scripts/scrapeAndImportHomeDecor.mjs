/**
 * scrapeAndImportHomeDecor.mjs
 *
 * Phase 1 — Scrape listings only (fast: category pages, no individual product visits)
 *            Saves to scripts/paldinox_home_decor.json immediately after listing scrape.
 * Phase 2 — Import to Firestore: upload image to Cloudinary, write product doc.
 *            Dedup by sourceUrl. Progress every 20 products. Concurrency: 5.
 * Phase 3 — Ensure category docs exist in Firestore.
 *
 * Flags:
 *   --skip-scrape   skip phase 1, load from existing paldinox_home_decor.json
 *
 * Run:
 *   PALDINOX_PASSWORD=xxx node scripts/scrapeAndImportHomeDecor.mjs
 *   node scripts/scrapeAndImportHomeDecor.mjs --skip-scrape
 */

import puppeteer      from 'puppeteer';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname }                        from 'path';
import { fileURLToPath }                           from 'url';
import { initializeApp, cert }                     from 'firebase-admin/app';
import { getFirestore, FieldValue }                from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Env ─────────────────────────────────────────────────────────────────────
function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    const lines = raw.split('\n');
    let key = null, val = '';
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) {
        if (key && !process.env[key]) process.env[key] = val.trim();
        key = m[1]; val = m[2];
      } else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch {}
}
loadEnvLocal();

const PALDINOX_PASSWORD = process.env.PALDINOX_PASSWORD;
if (!PALDINOX_PASSWORD) { console.error('❌ חסרה PALDINOX_PASSWORD'); process.exit(1); }

// ─── Firebase ────────────────────────────────────────────────────────────────
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

if (!clientEmail || !privateKey) { console.error('❌ חסרות הרשאות Firebase Admin'); process.exit(1); }
initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// ─── Constants ───────────────────────────────────────────────────────────────
const USERNAME       = '20552';
const BASE_URL       = 'https://paldinox.co.il';
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';
const UPLOAD_PRESET  = 'yoursofer_upload';
const PRICE_FACTOR   = 2.18;
const CONCURRENCY    = 5;
const OUTPUT_PATH    = resolve(__dirname, 'paldinox_home_decor.json');

const HOSTING_KW = ['הגש', 'אירוח', 'מטבח', 'שולחן', 'כוסות', 'בקבוק', 'קנקן', 'serving', 'kitchen', 'table', 'dining'];
const DECOR_KW   = ['עיצוב', 'דקור', 'בית', 'נוי', 'גלרי', 'אמנות', 'decor', 'home', 'art', 'design', 'living', 'sika'];

function classifyCat(label) {
  const n = label.toLowerCase();
  if (HOSTING_KW.some(kw => n.includes(kw))) return 'הגשה ואירוח';
  if (DECOR_KW.some(kw => n.includes(kw)))   return 'עיצוב הבית';
  return null;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Phase 1: Scrape listings ─────────────────────────────────────────────────
async function phaseScrapeListing() {
  console.log('\n══════════════════════════════════════');
  console.log('שלב 1 — סריקת רשימות קטגוריות');
  console.log('══════════════════════════════════════\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36');

    // Login
    console.log('🔐 מתחבר...');
    await page.goto(`${BASE_URL}/my-account/`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await page.focus('input[name="username"]');
    await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
    await page.type('input[name="username"]', USERNAME, { delay: 40 });
    for (const sel of ['input[name="password"]', '#password', 'input[type="password"]']) {
      if (await page.$(sel)) { await page.type(sel, PALDINOX_PASSWORD, { delay: 40 }); break; }
    }
    await delay(300);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }),
      page.keyboard.press('Enter'),
    ]);
    console.log('✅ מחובר\n');

    // Find target categories (same shop-page scan + nav links)
    console.log('🔍 מחפש קטגוריות...');
    await page.goto(`${BASE_URL}/shop/`, { waitUntil: 'networkidle2', timeout: 30000 });

    const rawLinks = await page.evaluate(() => {
      const all = [
        ...Array.from(document.querySelectorAll('a')),
        ...Array.from(document.querySelectorAll('nav a, .menu a, #menu-primary-menu a')),
      ];
      return all
        .filter(a => /\/product-category\//i.test(a.href))
        .map(a => ({ label: (a.innerText || a.textContent || '').trim(), href: a.href }))
        .filter(l => l.label && l.href);
    });

    const seen = new Set();
    const targets = [];
    for (const l of rawLinks) {
      if (seen.has(l.href)) continue;
      seen.add(l.href);
      const cat = classifyCat(l.label);
      if (cat) { targets.push({ ...l, ourCat: cat }); console.log(`   ✅ ${l.label} → ${cat}`); }
    }

    if (targets.length === 0) {
      // Fallback: try known slugs
      const fallbacks = [
        { href: `${BASE_URL}/product-category/%d7%94%d7%92%d7%a9%d7%94-%d7%95%d7%90%d7%99%d7%a8%d7%95%d7%97/`, label: 'הגשה ואירוח', ourCat: 'הגשה ואירוח' },
        { href: `${BASE_URL}/product-category/%d7%a2%d7%99%d7%a6%d7%95%d7%91-%d7%94%d7%91%d7%99%d7%aa/`,          label: 'עיצוב הבית',  ourCat: 'עיצוב הבית'  },
      ];
      for (const fb of fallbacks) {
        await page.goto(fb.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
        if (await page.$('.product, li.product')) { targets.push(fb); console.log(`   ✅ fallback: ${fb.label}`); }
      }
    }

    console.log(`\n📂 ${targets.length} קטגוריות נבחרו\n`);

    // Scrape all listing pages — collect {name, price, imgUrl, url, sku, ourCat}
    const all = [];

    for (const target of targets) {
      console.log(`\nסורק: "${target.label}" → ${target.ourCat}`);
      let pageNum = 1;

      while (true) {
        const pageUrl = pageNum === 1
          ? target.href
          : `${target.href.replace(/\/$/, '')}/page/${pageNum}/`;

        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await delay(400);

        const is404 = (await page.title()).includes('404') || !!(await page.$('.error-404'));
        const hasProducts = !!(await page.$('.product, li.product, .wc-block-grid__product'));
        if (is404 || !hasProducts) { console.log(`  עמוד ${pageNum}: אין מוצרים — עוצר`); break; }

        const found = await page.evaluate(() => {
          const cards = document.querySelectorAll('.product, li.product, .wc-block-grid__product, article.product');
          return Array.from(cards).map(card => {
            const name = card.querySelector('.woocommerce-loop-product__title, h2, h3')?.innerText?.trim() ?? '';
            const priceEl = card.querySelector('.price ins .amount, .price .amount, .price');
            const price = parseFloat(priceEl?.innerText?.replace(/[^\d.]/g, '') ?? '') || 0;
            const imgEl = card.querySelector('img');
            const imgUrl = imgEl?.getAttribute('data-src') || imgEl?.src || '';
            const url = Array.from(card.querySelectorAll('a')).find(a => /\/product\//.test(a.href))?.href ?? '';
            const sku = card.querySelector('.sku')?.innerText?.trim() ?? '';
            return name && url ? { name, price, imgUrl, url, sku } : null;
          }).filter(Boolean);
        });

        process.stdout.write(`  עמוד ${pageNum}: ${found.length} מוצרים\n`);
        if (found.length === 0) break;
        found.forEach(p => all.push({ ...p, ourCat: target.ourCat }));

        const hasNext = !!(await page.$('a.next.page-numbers, .woocommerce-pagination a.next'));
        if (!hasNext) break;
        pageNum++;
        await delay(300);
      }
    }

    // Dedup by URL
    const urlSeen = new Set();
    const unique = all.filter(p => { if (urlSeen.has(p.url)) return false; urlSeen.add(p.url); return true; });

    // ✅ Save IMMEDIATELY after listing scrape
    writeFileSync(OUTPUT_PATH, JSON.stringify(unique, null, 2), 'utf8');
    console.log(`\n✅ נשמר: paldinox_home_decor.json — ${unique.length} מוצרים\n`);
    return unique;

  } finally {
    await browser.close();
  }
}

// ─── Phase 2: Import ──────────────────────────────────────────────────────────
async function phaseImport(products) {
  console.log('\n══════════════════════════════════════');
  console.log('שלב 2 — ייבוא ל-Firestore');
  console.log('══════════════════════════════════════\n');

  const snap = await db.collection('products').where('source', '==', 'paldinox').get();
  const existingUrls = new Set(snap.docs.map(d => d.data().sourceUrl).filter(Boolean));
  console.log(`   ${existingUrls.size} מוצרי paldinox קיימים ב-Firestore`);

  const toImport = products.filter(p => !existingUrls.has(p.url));
  const skipped  = products.length - toImport.length;
  console.log(`   לייבוא: ${toImport.length}  |  דולגו (כפולים): ${skipped}\n`);

  if (toImport.length === 0) { console.log('✅ אין מוצרים חדשים.'); return { done: 0, failed: 0, skipped }; }

  async function uploadToCloudinary(imageUrl) {
    if (!imageUrl) throw new Error('no image URL');
    const form = new FormData();
    form.append('file', imageUrl);
    form.append('upload_preset', UPLOAD_PRESET);
    const res  = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
    const data = await res.json();
    if (!data.secure_url) throw new Error(data.error?.message ?? 'Cloudinary failed');
    return data.secure_url;
  }

  const queue = [...toImport.map((p, i) => ({ p, idx: i + 1 }))];
  const total  = toImport.length;
  let done = 0, failed = 0;

  async function worker() {
    while (queue.length > 0) {
      const { p: product, idx } = queue.shift();
      const originalPrice = product.price;
      const finalPrice    = Math.round(originalPrice * PRICE_FACTOR * 100) / 100;

      let imgUrl = product.imgUrl || '';
      try {
        if (imgUrl) imgUrl = await uploadToCloudinary(imgUrl);
      } catch (e) {
        process.stdout.write(`  ⚠️  Cloudinary [${idx}]: ${e.message.slice(0, 50)}\n`);
      }

      try {
        await db.collection('products').add({
          name:           product.name,
          desc:           '',
          price:          finalPrice,
          originalPrice:  originalPrice,
          imgUrl:         imgUrl,
          images:         imgUrl ? [imgUrl] : [],
          sku:            product.sku || '',
          cat:            product.ourCat,
          category:       product.ourCat,
          subCategory:    product.ourCat,
          parentCategory: 'מתנות',
          priority:       50,
          isBestSeller:   false,
          badge:          null,
          status:         'active',
          source:         'paldinox',
          sourceUrl:      product.url,
          createdAt:      FieldValue.serverTimestamp(),
        });
        done++;
        if (done % 20 === 0) console.log(`  📊 ${done}/${total} יובאו (❌ ${failed})`);
      } catch (e) {
        console.error(`  ❌ [${idx}] ${product.name.slice(0, 40)}: ${e.message}`);
        failed++;
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return { done, failed, skipped };
}

// ─── Phase 3: Ensure categories ──────────────────────────────────────────────
async function phaseEnsureCategories() {
  console.log('\n══════════════════════════════════════');
  console.log('שלב 3 — וידוא קטגוריות');
  console.log('══════════════════════════════════════\n');

  const REQUIRED = [
    { slug: 'הגשה ואירוח', displayName: 'הגשה ואירוח 🍽️', priority: 11, parentCategory: 'מתנות' },
    { slug: 'עיצוב הבית',  displayName: 'עיצוב הבית 🏠',   priority: 12, parentCategory: 'מתנות' },
  ];

  const snap = await db.collection('categories').get();
  const existing = new Set(snap.docs.map(d => d.data().slug || d.data().name).filter(Boolean));

  for (const cat of REQUIRED) {
    if (existing.has(cat.slug)) { console.log(`   ✅ קיים: ${cat.displayName}`); }
    else {
      await db.collection('categories').add({ ...cat, createdAt: FieldValue.serverTimestamp() });
      console.log(`   ➕ נוסף: ${cat.displayName}`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 scrapeAndImportHomeDecor\n');

  let products;
  const skipScrape = process.argv.includes('--skip-scrape');

  if (skipScrape && existsSync(OUTPUT_PATH)) {
    products = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'));
    console.log(`📂 נטען מקובץ קיים: ${products.length} מוצרים\n`);
  } else if (skipScrape) {
    console.error(`❌ --skip-scrape נבחר אבל ${OUTPUT_PATH} לא קיים — מריץ סריקה רגילה`);
    products = await phaseScrapeListing();
  } else {
    products = await phaseScrapeListing();
  }

  const catCount = {};
  products.forEach(p => { catCount[p.ourCat] = (catCount[p.ourCat] ?? 0) + 1; });
  console.log('סיכום לפי קטגוריה:');
  Object.entries(catCount).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  const { done, failed, skipped } = await phaseImport(products);
  await phaseEnsureCategories();

  console.log('\n🎉 סיום!');
  console.log(`   יובאו:  ${done}`);
  console.log(`   נכשלו: ${failed}`);
  console.log(`   דולגו: ${skipped}`);
  process.exit(0);
}

main().catch(err => { console.error('\n❌ Fatal:', err.message); process.exit(1); });
