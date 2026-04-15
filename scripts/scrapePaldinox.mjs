/**
 * Scrapes the יודאיקה category from paldinox.co.il
 * Credentials: username 20552, password from PALDINOX_PASSWORD env var
 *
 * Run:
 *   PALDINOX_PASSWORD=xxx node scripts/scrapePaldinox.mjs
 *   (or set in .env.local and the script will load it automatically)
 *
 * Output: scripts/paldinox_judaica.json
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

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function scrapeProducts(page) {
  return page.evaluate(() => {
    const cards = document.querySelectorAll('.product, li.product, .wc-block-grid__product, article.product');
    const results = [];
    cards.forEach(card => {
      const name     = card.querySelector('.woocommerce-loop-product__title, h2, h3, .product-title')?.innerText?.trim() ?? '';
      const priceEl  = card.querySelector('.price ins .amount, .price .amount, .price');
      const price    = priceEl?.innerText?.replace(/[^\d.]/g, '') ?? '';
      const imgEl    = card.querySelector('img');
      const imgUrl   = imgEl?.src ?? imgEl?.dataset?.src ?? '';
      const linkEl   = card.querySelector('a.woocommerce-loop-product__link, a');
      const url      = linkEl?.href ?? '';
      const skuEl    = card.querySelector('.sku');
      const sku      = skuEl?.innerText?.trim() ?? '';
      if (name) results.push({ name, price: parseFloat(price) || 0, imgUrl, url, sku });
    });
    return results;
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
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36');

  try {
    // ── Step 1: Login ────────────────────────────────────────────────────────
    console.log('1️⃣  נכנס לדף הכניסה...');
    await page.goto(`${BASE_URL}/my-account/`, { waitUntil: 'networkidle2', timeout: 30000 });

    // Fill login form
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await page.focus('input[name="username"]');
    await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
    await page.type('input[name="username"]', USERNAME, { delay: 50 });

    // Try all possible password selectors
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
    // Submit with Enter key — most reliable
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }),
      page.keyboard.press('Enter'),
    ]);

    const url = page.url();
    if (url.includes('my-account') && !url.includes('login')) {
      console.log('✅ התחברות הצליחה\n');
    } else {
      console.log(`⚠️  URL לאחר login: ${url}`);
    }

    // ── Step 2: Find יודאיקה category ───────────────────────────────────────
    console.log('2️⃣  מחפש קטגוריית יודאיקה...');
    await page.goto(`${BASE_URL}/shop/`, { waitUntil: 'networkidle2', timeout: 30000 });

    // Try to find a link containing יודאיקה / judaica
    const catUrl = await page.evaluate((base) => {
      const links = Array.from(document.querySelectorAll('a'));
      const match = links.find(a =>
        /יודאיקה|judaica|judiaca/i.test(a.innerText) ||
        /judaica|judiaca/i.test(a.href)
      );
      return match?.href ?? null;
    }, BASE_URL);

    let judaicaUrl = catUrl;
    if (!judaicaUrl) {
      // Fallback — common WooCommerce pattern
      judaicaUrl = `${BASE_URL}/product-category/judaica/`;
      console.log(`⚠️  לא נמצא קישור ישיר, מנסה: ${judaicaUrl}`);
    } else {
      console.log(`✅ נמצא: ${judaicaUrl}\n`);
    }

    // ── Step 3: Scrape all pages ─────────────────────────────────────────────
    let allProducts = [];
    let pageNum = 1;

    while (true) {
      const pageUrl = pageNum === 1 ? judaicaUrl : `${judaicaUrl.replace(/\/$/, '')}/page/${pageNum}/`;
      console.log(`3️⃣  עמוד ${pageNum}: ${pageUrl}`);
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await delay(1000);

      // Check if page has products
      const hasProducts = await page.$('.product, li.product, .wc-block-grid__product') !== null;
      if (!hasProducts) {
        console.log(`   אין מוצרים בעמוד ${pageNum} — מסיים`);
        break;
      }

      const products = await scrapeProducts(page);
      console.log(`   נמצאו ${products.length} מוצרים`);

      if (products.length === 0) break;
      allProducts = allProducts.concat(products);

      // Check if next page exists
      const hasNext = await page.$('a.next.page-numbers, .woocommerce-pagination a.next') !== null;
      if (!hasNext) {
        console.log('   אין עמוד הבא — סיום');
        break;
      }
      pageNum++;
    }

    // ── Step 4: Deduplicate by url ───────────────────────────────────────────
    const seen = new Set();
    const unique = allProducts.filter(p => {
      if (seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    });

    // ── Step 5: Save to JSON ─────────────────────────────────────────────────
    const outPath = resolve(__dirname, 'paldinox_judaica.json');
    writeFileSync(outPath, JSON.stringify(unique, null, 2), 'utf8');

    console.log(`\n✅ סיום!`);
    console.log(`   סה"כ מוצרים: ${allProducts.length}`);
    console.log(`   ייחודיים:    ${unique.length}`);
    console.log(`   נשמר ב:      ${outPath}\n`);

  } catch (err) {
    console.error('\n❌ שגיאה:', err.message);
    // Save a screenshot for debugging
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
