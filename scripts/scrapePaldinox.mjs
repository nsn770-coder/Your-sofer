/**
 * Scrapes the יודאיקה category from paldinox.co.il
 * Credentials: username 20552, password from PALDINOX_PASSWORD env var
 *
 * Phase 1: scrapes all product URLs from the category listing pages
 * Phase 2: visits each product page and collects full details
 *           (name, sku, price, description, images)
 *
 * Run:
 *   PALDINOX_PASSWORD=xxx node scripts/scrapePaldinox.mjs
 *   (or set in .env.local and the script will load it automatically)
 *
 * Output:
 *   scripts/paldinox_judaica.json       — basic listing (phase 1)
 *   scripts/paldinox_judaica_full.json  — full product details (phase 2)
 */

import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env.local if PALDINOX_PASSWORD not already in env ────────────────
if (!process.env.PALDINOX_PASSWORD) {
  try {
    const envContent = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    for (const line of envContent.split('\n')) {
      const m = line.match(/^PALDINOX_PASSWORD=(.+)/);
      if (m) { process.env.PALDINOX_PASSWORD = m[1].trim(); break; }
    }
  } catch { /* .env.local not found */ }
}

const USERNAME = '20552';
const PASSWORD = process.env.PALDINOX_PASSWORD;
const BASE_URL = 'https://paldinox.co.il';

if (!PASSWORD) {
  console.error('❌ חסרה סיסמה — הגדר PALDINOX_PASSWORD=... או הוסף ל-.env.local');
  process.exit(1);
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** Collect basic product data + correct product URL from a category listing page */
async function scrapeListingPage(page) {
  return page.evaluate(() => {
    const cards = document.querySelectorAll(
      '.product, li.product, .wc-block-grid__product, article.product'
    );
    const results = [];
    cards.forEach(card => {
      const name = card.querySelector(
        '.woocommerce-loop-product__title, h2, h3, .product-title'
      )?.innerText?.trim() ?? '';

      // Price — prefer sale price (ins), fall back to regular
      const priceEl = card.querySelector('.price ins .amount, .price .amount, .price');
      const price = parseFloat(priceEl?.innerText?.replace(/[^\d.]/g, '') ?? '') || 0;

      // Thumbnail
      const imgEl = card.querySelector('img');
      const imgUrl = imgEl?.src ?? imgEl?.dataset?.src ?? '';

      // Product URL — must be a /product/ link, not wishlist/cart
      const links = Array.from(card.querySelectorAll('a'));
      const productLink = links.find(a => /\/product\//.test(a.href));
      const url = productLink?.href ?? '';

      const sku = card.querySelector('.sku')?.innerText?.trim() ?? '';

      if (name && url) results.push({ name, price, imgUrl, url, sku });
    });
    return results;
  });
}

/** Visit a product page and return full details */
async function scrapeProductPage(page, productUrl) {
  await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 40000 });
  await delay(600);

  return page.evaluate(() => {
    // ── Name ────────────────────────────────────────────────────────────────
    const name =
      document.querySelector('.product_title, h1.entry-title')?.innerText?.trim() ?? '';

    // ── SKU ─────────────────────────────────────────────────────────────────
    const sku =
      document.querySelector('.sku, [itemprop="sku"]')?.innerText?.trim() ?? '';

    // ── Price ───────────────────────────────────────────────────────────────
    const priceEl = document.querySelector(
      '.summary .price ins .amount, .summary .price .amount, .summary .price'
    );
    const price = parseFloat(priceEl?.innerText?.replace(/[^\d.]/g, '') ?? '') || 0;

    // ── Description ─────────────────────────────────────────────────────────
    const descEl = document.querySelector(
      '#tab-description .woocommerce-Tabs-panel--description,' +
      '.woocommerce-product-details__short-description,' +
      '[itemprop="description"],' +
      '.product-short-description,' +
      '.woocommerce-tabs .entry-content'
    );
    const description = descEl?.innerText?.trim() ?? '';

    // ── Images ──────────────────────────────────────────────────────────────
    const imageEls = document.querySelectorAll(
      '.woocommerce-product-gallery__image img,' +
      '.flex-viewport img,' +
      '.product-images img'
    );
    const images = Array.from(imageEls)
      .map(img => img.dataset?.large_image ?? img.dataset?.src ?? img.src)
      .filter(src => src && !src.includes('placeholder'))
      .filter((src, i, arr) => arr.indexOf(src) === i); // deduplicate

    // ── Categories ──────────────────────────────────────────────────────────
    const catEls = document.querySelectorAll('.posted_in a, .product_meta .posted_in a');
    const categories = Array.from(catEls).map(a => a.innerText.trim());

    return { name, sku, price, description, images, categories };
  });
}

async function main() {
  console.log('\n🚀 מתחיל scraping של paldinox.co.il\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
  );

  try {
    // ── Step 1: Login ────────────────────────────────────────────────────────
    console.log('1️⃣  נכנס לדף הכניסה...');
    await page.goto(`${BASE_URL}/my-account/`, { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await page.focus('input[name="username"]');
    await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
    await page.type('input[name="username"]', USERNAME, { delay: 50 });

    const pwSelectors = ['input[name="password"]', '#password', 'input[type="password"]'];
    let pwFound = false;
    for (const sel of pwSelectors) {
      const el = await page.$(sel);
      if (el) {
        await page.focus(sel);
        await page.type(sel, PASSWORD, { delay: 50 });
        pwFound = true;
        console.log(`   סיסמה הוזנה בשדה: ${sel}`);
        break;
      }
    }
    if (!pwFound) { console.error('❌ לא נמצא שדה סיסמה'); }

    await delay(600);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }),
      page.keyboard.press('Enter'),
    ]);

    const loginUrl = page.url();
    if (loginUrl.includes('my-account') && !loginUrl.includes('login')) {
      console.log('✅ התחברות הצליחה\n');
    } else {
      console.log(`⚠️  URL לאחר login: ${loginUrl}`);
    }

    // ── Step 2: Find יודאיקה category URL ───────────────────────────────────
    console.log('2️⃣  מחפש קטגוריית יודאיקה...');
    await page.goto(`${BASE_URL}/shop/`, { waitUntil: 'networkidle2', timeout: 30000 });

    const catUrl = await page.evaluate((base) => {
      const links = Array.from(document.querySelectorAll('a'));
      const match = links.find(a =>
        /יודאיקה|judaica|judiaca/i.test(a.innerText) ||
        /judaica|judiaca/i.test(a.href)
      );
      return match?.href ?? null;
    }, BASE_URL);

    let judaicaUrl = catUrl ?? `${BASE_URL}/product-category/judaica/`;
    console.log(catUrl ? `✅ נמצא: ${judaicaUrl}\n` : `⚠️  לא נמצא קישור ישיר, מנסה: ${judaicaUrl}`);

    // ── Step 3: Scrape listing pages → collect product URLs ──────────────────
    console.log('3️⃣  סורק עמודי קטגוריה לאיסוף URL-ים...');
    let allProducts = [];
    let pageNum = 1;

    while (true) {
      const pageUrl = pageNum === 1
        ? judaicaUrl
        : `${judaicaUrl.replace(/\/$/, '')}/page/${pageNum}/`;
      console.log(`   עמוד ${pageNum}: ${pageUrl}`);
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await delay(800);

      const hasProducts = await page.$('.product, li.product, .wc-block-grid__product') !== null;
      if (!hasProducts) { console.log(`   אין מוצרים בעמוד ${pageNum} — מסיים`); break; }

      const products = await scrapeListingPage(page);
      console.log(`   נמצאו ${products.length} מוצרים עם URL תקין`);
      if (products.length === 0) break;
      allProducts = allProducts.concat(products);

      const hasNext = await page.$('a.next.page-numbers, .woocommerce-pagination a.next') !== null;
      if (!hasNext) { console.log('   אין עמוד הבא — סיום'); break; }
      pageNum++;
    }

    // Deduplicate by URL
    const seen = new Set();
    const unique = allProducts.filter(p => {
      if (seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    });

    // Save basic listing
    const listingPath = resolve(__dirname, 'paldinox_judaica.json');
    writeFileSync(listingPath, JSON.stringify(unique, null, 2), 'utf8');
    console.log(`\n✅ שמירת רשימה בסיסית: ${unique.length} מוצרים → ${listingPath}\n`);

    // ── Step 4: Visit each product page for full details ─────────────────────
    console.log('4️⃣  אוסף פרטים מלאים לכל מוצר...\n');
    const fullProducts = [];

    for (let i = 0; i < unique.length; i++) {
      const basic = unique[i];
      const progress = `[${i + 1}/${unique.length}]`;
      console.log(`${progress} ${basic.name}`);

      try {
        const details = await scrapeProductPage(page, basic.url);
        fullProducts.push({
          name: details.name || basic.name,
          sku: details.sku || basic.sku,
          price: details.price || basic.price,
          description: details.description,
          images: details.images.length ? details.images : [basic.imgUrl].filter(Boolean),
          categories: details.categories,
          url: basic.url,
        });
      } catch (err) {
        console.warn(`   ⚠️  שגיאה: ${err.message} — שומר פרטים בסיסיים`);
        fullProducts.push({
          name: basic.name,
          sku: basic.sku,
          price: basic.price,
          description: '',
          images: [basic.imgUrl].filter(Boolean),
          categories: [],
          url: basic.url,
        });
      }

      // Small pause every 10 products to avoid rate limiting
      if ((i + 1) % 10 === 0) await delay(1000);
    }

    // ── Step 5: Save full JSON ───────────────────────────────────────────────
    const fullPath = resolve(__dirname, 'paldinox_judaica_full.json');
    writeFileSync(fullPath, JSON.stringify(fullProducts, null, 2), 'utf8');

    console.log(`\n✅ סיום!`);
    console.log(`   סה"כ מוצרים:      ${fullProducts.length}`);
    console.log(`   רשימה בסיסית:     ${listingPath}`);
    console.log(`   פרטים מלאים:      ${fullPath}\n`);

  } catch (err) {
    console.error('\n❌ שגיאה:', err.message);
    try {
      await page.screenshot({ path: resolve(__dirname, 'paldinox_error.png') });
      console.log('📸 screenshot נשמר ב: scripts/paldinox_error.png');
    } catch {}
  } finally {
    await browser.close();
  }

  process.exit(0);
}

main();
