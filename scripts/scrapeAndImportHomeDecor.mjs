/**
 * Scrapes paldinox.co.il for "הגשה ואירוח" and "עיצוב הבית" categories,
 * then imports all products to Firestore with Cloudinary image upload.
 *
 * Phase 1 — Scrape:   finds matching categories on paldinox, collects all products
 * Phase 2 — Classify: assigns cat based on source category
 * Phase 3 — Import:   Cloudinary upload + Firestore write (dedup by sourceUrl)
 * Phase 4 — Ensure:   verifies/creates the two category docs in Firestore
 *
 * Run: PALDINOX_PASSWORD=xxx node scripts/scrapeAndImportHomeDecor.mjs
 *      (or set in .env.local)
 */

import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Env ──────────────────────────────────────────────────────────────────────
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
if (!PALDINOX_PASSWORD) {
  console.error('❌ חסרה סיסמה — הגדר PALDINOX_PASSWORD=...');
  process.exit(1);
}

// ─── Firebase ─────────────────────────────────────────────────────────────────
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

if (!clientEmail || !privateKey) {
  console.error('❌ חסרות הרשאות Firebase Admin');
  process.exit(1);
}
initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// ─── Constants ────────────────────────────────────────────────────────────────
const USERNAME         = '20552';
const BASE_URL         = 'https://paldinox.co.il';
const CLOUDINARY_URL   = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';
const UPLOAD_PRESET    = 'yoursofer_upload';
const PRICE_FACTOR     = 2.18;
const CONCURRENCY      = 3;
const OUTPUT_PATH      = resolve(__dirname, 'paldinox_home_decor.json');

// Keywords to identify "הגשה ואירוח" categories on paldinox
const HOSTING_KEYWORDS  = ['הגש', 'אירוח', 'מטבח', 'שולחן', 'כוסות', 'בקבוק', 'קנקן', 'קינוחים', 'serving', 'kitchen', 'table', 'dining'];
// Keywords to identify "עיצוב הבית" categories on paldinox
const DECOR_KEYWORDS    = ['עיצוב', 'דקור', 'בית', 'נוי', 'גלרי', 'אמנות', 'decor', 'home', 'art', 'design'];

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Classify paldinox category → our cat ─────────────────────────────────────
function classifyCat(paldinoxCategoryName) {
  const n = paldinoxCategoryName.toLowerCase();
  if (HOSTING_KEYWORDS.some(kw => n.includes(kw.toLowerCase()))) return 'הגשה ואירוח';
  if (DECOR_KEYWORDS.some(kw => n.includes(kw.toLowerCase())))   return 'עיצוב הבית';
  return null;
}

// ─── Puppeteer helpers ────────────────────────────────────────────────────────
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

/** Collect all category links from shop page that match our keywords */
async function findTargetCategories(page) {
  console.log('🔍 מחפש קטגוריות מתאימות...');
  await page.goto(`${BASE_URL}/shop/`, { waitUntil: 'networkidle2', timeout: 30000 });

  const catLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links
      .filter(a => /\/product-category\//i.test(a.href))
      .map(a => ({ label: a.innerText.trim(), href: a.href }))
      .filter(l => l.label && l.href);
  });

  // Also try the top navigation for category links
  const navLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('nav a, .menu a, #menu-primary-menu a, .main-navigation a'));
    return links
      .filter(a => /\/product-category\//i.test(a.href))
      .map(a => ({ label: a.innerText.trim(), href: a.href }))
      .filter(l => l.label && l.href);
  });

  const allLinks = [...catLinks, ...navLinks];
  // Deduplicate by href
  const seen = new Set();
  const unique = allLinks.filter(l => { if (seen.has(l.href)) return false; seen.add(l.href); return true; });

  console.log(`   נמצאו ${unique.length} קישורי קטגוריה`);

  // Filter to target categories
  const targets = [];
  for (const link of unique) {
    const cat = classifyCat(link.label);
    if (cat) {
      targets.push({ ...link, ourCat: cat });
      console.log(`   ✅ ${link.label} → ${cat}  (${link.href})`);
    }
  }

  // If nothing found by label, try known URL patterns
  if (targets.length === 0) {
    console.log('   לא נמצאו לפי תווית — מנסה URL-ים ידועים...');
    const fallbackUrls = [
      { href: `${BASE_URL}/product-category/הגשה-ואירוח/`,  label: 'הגשה ואירוח', ourCat: 'הגשה ואירוח' },
      { href: `${BASE_URL}/product-category/גשה-ואירוח/`,   label: 'הגשה ואירוח', ourCat: 'הגשה ואירוח' },
      { href: `${BASE_URL}/product-category/serving/`,       label: 'הגשה ואירוח', ourCat: 'הגשה ואירוח' },
      { href: `${BASE_URL}/product-category/kitchen/`,       label: 'הגשה ואירוח', ourCat: 'הגשה ואירוח' },
      { href: `${BASE_URL}/product-category/table/`,         label: 'הגשה ואירוח', ourCat: 'הגשה ואירוח' },
      { href: `${BASE_URL}/product-category/עיצוב-הבית/`,   label: 'עיצוב הבית',  ourCat: 'עיצוב הבית'  },
      { href: `${BASE_URL}/product-category/home-decor/`,    label: 'עיצוב הבית',  ourCat: 'עיצוב הבית'  },
      { href: `${BASE_URL}/product-category/decor/`,         label: 'עיצוב הבית',  ourCat: 'עיצוב הבית'  },
      { href: `${BASE_URL}/product-category/art/`,           label: 'עיצוב הבית',  ourCat: 'עיצוב הבית'  },
    ];
    for (const u of fallbackUrls) {
      await page.goto(u.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const hasProducts = await page.$('.product, li.product') !== null;
      const is404 = await page.$('.error-404, .page-not-found') !== null;
      if (hasProducts && !is404) {
        targets.push(u);
        console.log(`   ✅ נמצא fallback: ${u.href} → ${u.ourCat}`);
      }
    }
  }

  return targets;
}

/** Scrape all listing pages of a category URL, return array of {name, price, imgUrl, url, sku} */
async function scrapeCategoryListings(page, categoryUrl, label) {
  const products = [];
  let pageNum = 1;

  while (true) {
    const pageUrl = pageNum === 1
      ? categoryUrl
      : `${categoryUrl.replace(/\/$/, '')}/page/${pageNum}/`;

    console.log(`   עמוד ${pageNum}: ${pageUrl}`);
    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(600);

    const hasProducts = await page.$('.product, li.product, .wc-block-grid__product') !== null;
    const is404       = (await page.title()).toLowerCase().includes('404') ||
                        await page.$('.error-404') !== null;
    if (!hasProducts || is404) { console.log(`   אין מוצרים בעמוד ${pageNum} — עוצר`); break; }

    const found = await page.evaluate(() => {
      const cards = document.querySelectorAll('.product, li.product, .wc-block-grid__product, article.product');
      const results = [];
      cards.forEach(card => {
        const name = card.querySelector('.woocommerce-loop-product__title, h2, h3, .product-title')?.innerText?.trim() ?? '';
        const priceEl = card.querySelector('.price ins .amount, .price .amount, .price');
        const price = parseFloat(priceEl?.innerText?.replace(/[^\d.]/g, '') ?? '') || 0;
        const imgEl = card.querySelector('img');
        const imgUrl = imgEl?.getAttribute('data-src') ?? imgEl?.src ?? '';
        const links = Array.from(card.querySelectorAll('a'));
        const url = links.find(a => /\/product\//.test(a.href))?.href ?? '';
        const sku = card.querySelector('.sku')?.innerText?.trim() ?? '';
        if (name && url) results.push({ name, price, imgUrl, url, sku });
      });
      return results;
    });

    console.log(`   נמצאו ${found.length} מוצרים`);
    if (found.length === 0) break;
    products.push(...found);

    const hasNext = await page.$('a.next.page-numbers, .woocommerce-pagination a.next') !== null;
    if (!hasNext) { console.log('   אין עמוד הבא'); break; }
    pageNum++;
    await delay(500);
  }

  return products;
}

/** Scrape full product details (real price + all images + desc + weight/dimensions) */
async function scrapeProductPage(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 40000 });
  await delay(500);

  return page.evaluate(() => {
    const name = document.querySelector('.product_title, h1.entry-title')?.innerText?.trim() ?? '';
    const sku  = document.querySelector('.sku, [itemprop="sku"]')?.innerText?.trim() ?? '';

    const priceEl = document.querySelector(
      '.summary .price ins .amount, .summary .price .amount, .summary .price'
    );
    const price = parseFloat(priceEl?.innerText?.replace(/[^\d.]/g, '') ?? '') || 0;

    const descEl = document.querySelector(
      '.woocommerce-product-details__short-description, [itemprop="description"], #tab-description .entry-content, .woocommerce-tabs .entry-content'
    );
    const description = descEl?.innerText?.trim() ?? '';

    // All gallery images — prefer data-large_image
    const imageEls = document.querySelectorAll(
      '.woocommerce-product-gallery__image img, .flex-viewport img, .product-images img'
    );
    const images = Array.from(imageEls)
      .map(img => img.getAttribute('data-large_image') || img.getAttribute('data-src') || img.src)
      .filter(s => s && !s.includes('placeholder'))
      .filter((s, i, a) => a.indexOf(s) === i);

    // Weight / dimensions from product meta or additional info tab
    const weightEl = document.querySelector('.woocommerce-product-attributes-item--weight .woocommerce-product-attributes-item__value, [data-attribute="weight"] .value');
    const weight = weightEl?.innerText?.trim() ?? '';

    const dimEl = document.querySelector('.woocommerce-product-attributes-item--dimensions .woocommerce-product-attributes-item__value, [data-attribute="dimensions"] .value');
    const dimensions = dimEl?.innerText?.trim() ?? '';

    const catEls = document.querySelectorAll('.posted_in a, .product_meta .posted_in a');
    const categories = Array.from(catEls).map(a => a.innerText.trim());

    return { name, sku, price, description, images, weight, dimensions, categories };
  });
}

// ─── Cloudinary ───────────────────────────────────────────────────────────────
async function uploadToCloudinary(imageUrl) {
  const form = new FormData();
  form.append('file', imageUrl);
  form.append('upload_preset', UPLOAD_PRESET);
  const res  = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message ?? 'Cloudinary upload failed');
  return data.secure_url;
}

// ─── Phase 1+2: Scrape ────────────────────────────────────────────────────────
async function phaseScrapeSave() {
  console.log('\n══════════════════════════════════════');
  console.log('שלב 1 — סריקה');
  console.log('══════════════════════════════════════\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36');

    await login(page);

    const targets = await findTargetCategories(page);
    if (targets.length === 0) {
      console.error('❌ לא נמצאו קטגוריות מתאימות — מסיים');
      await browser.close();
      process.exit(1);
    }
    console.log(`\n✅ ${targets.length} קטגוריות לסריקה\n`);

    // Scrape listings
    const allListings = []; // { name, price, imgUrl, url, sku, ourCat }
    for (const target of targets) {
      console.log(`\n📂 סורק: "${target.label}" → ${target.ourCat}`);
      const products = await scrapeCategoryListings(page, target.href, target.label);
      products.forEach(p => allListings.push({ ...p, ourCat: target.ourCat }));
    }

    // Dedup by URL
    const seenUrls = new Set();
    const uniqueListings = allListings.filter(p => {
      if (seenUrls.has(p.url)) return false;
      seenUrls.add(p.url);
      return true;
    });
    console.log(`\n📦 ${uniqueListings.length} מוצרים ייחודיים (מתוך ${allListings.length})\n`);

    // Scrape full product pages
    console.log('4️⃣  אוסף פרטים מלאים לכל מוצר...\n');
    const fullProducts = [];
    for (let i = 0; i < uniqueListings.length; i++) {
      const basic = uniqueListings[i];
      process.stdout.write(`  [${i + 1}/${uniqueListings.length}] ${basic.name.slice(0, 60)}\n`);

      try {
        const details = await scrapeProductPage(page, basic.url);
        fullProducts.push({
          name:          details.name  || basic.name,
          sku:           details.sku   || basic.sku  || '',
          price:         details.price || basic.price,
          description:   details.description,
          images:        details.images.length ? details.images : [basic.imgUrl].filter(Boolean),
          imgUrl:        details.images[0] || basic.imgUrl || '',
          weight:        details.weight,
          dimensions:    details.dimensions,
          categories:    details.categories,
          url:           basic.url,
          ourCat:        basic.ourCat,
        });
      } catch (e) {
        console.warn(`  ⚠️  ${e.message.slice(0, 70)} — fallback`);
        fullProducts.push({
          name: basic.name, sku: basic.sku || '', price: basic.price,
          description: '', images: [basic.imgUrl].filter(Boolean), imgUrl: basic.imgUrl || '',
          weight: '', dimensions: '', categories: [], url: basic.url, ourCat: basic.ourCat,
        });
      }

      if ((i + 1) % 10 === 0) await delay(800);
    }

    writeFileSync(OUTPUT_PATH, JSON.stringify(fullProducts, null, 2), 'utf8');
    console.log(`\n✅ נשמר: scripts/paldinox_home_decor.json (${fullProducts.length} מוצרים)\n`);
    return fullProducts;

  } finally {
    await browser.close();
  }
}

// ─── Phase 3: Import to Firestore ────────────────────────────────────────────
async function phaseImport(products) {
  console.log('\n══════════════════════════════════════');
  console.log('שלב 3 — ייבוא ל-Firestore');
  console.log('══════════════════════════════════════\n');

  // Load existing sourceUrls
  console.log('🔍 טוען sourceUrl-ים קיימים...');
  const snap = await db.collection('products').where('source', '==', 'paldinox').get();
  const existingUrls = new Set(snap.docs.map(d => d.data().sourceUrl).filter(Boolean));
  console.log(`   ${existingUrls.size} מוצרי paldinox קיימים\n`);

  const toImport = products.filter(p => !existingUrls.has(p.url));
  const skipped  = products.length - toImport.length;
  console.log(`📋 לייבוא: ${toImport.length}  |  כבר קיימים: ${skipped}\n`);

  if (toImport.length === 0) {
    console.log('✅ אין מוצרים חדשים לייבוא.');
    return { done: 0, failed: 0, skipped };
  }

  // Worker pool
  const queue  = toImport.map((p, i) => ({ product: p, idx: i + 1 }));
  const total  = toImport.length;
  let done = 0, failed = 0;

  async function processOne(product, idx) {
    const originalPrice = product.price;
    const finalPrice    = Math.round(originalPrice * PRICE_FACTOR * 100) / 100;

    // Cloudinary — upload first image
    const imageSrc = product.images[0] || product.imgUrl || '';
    let cloudinaryUrl = imageSrc;
    if (imageSrc) {
      try { cloudinaryUrl = await uploadToCloudinary(imageSrc); }
      catch (e) { process.stdout.write(`  ⚠️  Cloudinary: ${e.message.slice(0, 60)}\n`); }
    }

    // Upload additional images (up to 3 total)
    const extraImages = [];
    for (const src of (product.images || []).slice(1, 3)) {
      try { extraImages.push(await uploadToCloudinary(src)); }
      catch { extraImages.push(src); }
    }
    const allImages = [cloudinaryUrl, ...extraImages].filter(Boolean);

    await db.collection('products').add({
      name:           product.name,
      desc:           product.description || '',
      price:          finalPrice,
      originalPrice:  originalPrice,
      imgUrl:         cloudinaryUrl,
      images:         allImages,
      sku:            product.sku || '',
      cat:            product.ourCat,
      category:       product.ourCat,
      subCategory:    product.ourCat,
      parentCategory: 'מתנות',
      weight:         product.weight || '',
      dimensions:     product.dimensions || '',
      priority:       50,
      isBestSeller:   false,
      badge:          null,
      status:         'active',
      source:         'paldinox',
      sourceUrl:      product.url,
      createdAt:      FieldValue.serverTimestamp(),
    });

    console.log(`  ✅ [${idx}/${total}] ${product.name.slice(0, 50)} — ₪${finalPrice} [${product.ourCat}]`);
  }

  async function runWorker(workerIdx) {
    while (true) {
      const item = queue.shift();
      if (!item) break;
      try {
        await processOne(item.product, item.idx);
        done++;
      } catch (e) {
        console.error(`  ❌ [${item.idx}/${total}] ${item.product.name.slice(0, 40)}: ${e.message}`);
        failed++;
      }
      if ((done + failed) % 20 === 0 && (done + failed) > 0) {
        console.log(`\n📊 Progress: ${done + failed}/${total} (✅ ${done} | ❌ ${failed})\n`);
      }
    }
  }

  // Launch N concurrent workers (no puppeteer needed here — just fetch/firestore)
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => runWorker(i)));

  return { done, failed, skipped };
}

// ─── Phase 4: Ensure categories exist ────────────────────────────────────────
async function phaseEnsureCategories() {
  console.log('\n══════════════════════════════════════');
  console.log('שלב 4 — וידוא קטגוריות');
  console.log('══════════════════════════════════════\n');

  const REQUIRED = [
    { slug: 'הגשה ואירוח', displayName: 'הגשה ואירוח 🍽️', priority: 11, parentCategory: 'מתנות' },
    { slug: 'עיצוב הבית',  displayName: 'עיצוב הבית 🏠',   priority: 12, parentCategory: 'מתנות' },
  ];

  const snap = await db.collection('categories').get();
  const existing = new Set(snap.docs.map(d => d.data().slug || d.data().name).filter(Boolean));

  for (const cat of REQUIRED) {
    if (existing.has(cat.slug)) {
      console.log(`   ✅ כבר קיים: ${cat.displayName}`);
    } else {
      await db.collection('categories').add({ ...cat, createdAt: FieldValue.serverTimestamp() });
      console.log(`   ➕ נוסף: ${cat.displayName}`);
    }
  }
  console.log('');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 scrapeAndImportHomeDecor\n');

  // Phase 1+2: scrape (or load cached)
  let products;
  if (existsSync(OUTPUT_PATH) && process.argv.includes('--skip-scrape')) {
    products = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'));
    console.log(`📂 נטען מקובץ קיים: ${products.length} מוצרים (--skip-scrape)\n`);
  } else {
    products = await phaseScrapeSave();
  }

  if (!products || products.length === 0) {
    console.error('❌ לא נמצאו מוצרים לייבוא');
    process.exit(1);
  }

  // Phase 3: import
  const { done, failed, skipped } = await phaseImport(products);

  // Phase 4: ensure categories
  await phaseEnsureCategories();

  console.log('\n🎉 סיום!');
  console.log(`   יובאו:  ${done}`);
  console.log(`   נכשלו: ${failed}`);
  console.log(`   דולגו: ${skipped}`);
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
