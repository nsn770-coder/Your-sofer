/**
 * scrapeAndSyncIsraelJudaica.mjs
 *
 * Logs in to israel-judaica.com dealer portal (Joomla / com_art),
 * scrapes product catalog with dealer prices, and syncs to Firestore:
 *   - purchasePrice  (מחיר ספק)
 *   - stockStatus    (in_stock / out_of_stock)
 *   - supplierCode   (SKU)
 *   - source         = 'israel-judaica'
 *
 * Usage:
 *   node app/scripts/scrapeAndSyncIsraelJudaica.mjs [--dry-run] [--cat CODE] [--add-new] [--headless false]
 *
 * Reads credentials from: <project-root>/.env.israel-judaica
 */

import puppeteer       from 'puppeteer';
import { load }        from 'cheerio';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..', '..');

// ── CLI flags ─────────────────────────────────────────────────────────────────
const argv      = process.argv.slice(2);
const DRY_RUN   = argv.includes('--dry-run');
const ADD_NEW   = argv.includes('--add-new');
const HEADLESS  = !argv.includes('--headless=false') && !argv.includes('--headless false');
const CAT_FILTER = (() => { const i = argv.indexOf('--cat'); return i >= 0 ? argv[i + 1] : null; })();

if (DRY_RUN) console.log('🧪 DRY-RUN — Firestore לא יעודכן\n');
if (!HEADLESS) console.log('👀 headful mode\n');

// ── Credentials ───────────────────────────────────────────────────────────────
const ENV_PATH = join(ROOT, '.env.israel-judaica');
if (!existsSync(ENV_PATH)) {
  console.error('❌ לא נמצא קובץ', ENV_PATH);
  process.exit(1);
}
const env = Object.fromEntries(
  readFileSync(ENV_PATH, 'utf8').split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);
const BASE     = (env.ISRAEL_JUDAICA_URL || 'https://www.israel-judaica.com').replace(/\/index\.php.*/, '');
const EMAIL    = env.ISRAEL_JUDAICA_EMAIL;
const PASSWORD = env.ISRAEL_JUDAICA_PASSWORD;
if (!EMAIL || !PASSWORD) { console.error('❌ חסרים פרטי כניסה בקובץ .env'); process.exit(1); }

// ── Firebase Admin SDK (bypasses Firestore security rules) ───────────────────
const KEY_PATH = join(ROOT, 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (!existsSync(KEY_PATH)) {
  console.error('❌ לא נמצא service account key:', KEY_PATH);
  process.exit(1);
}
const fbApp = initializeApp({ credential: cert(KEY_PATH) });
const db    = getFirestore(fbApp);

// ── Categories to scrape ──────────────────────────────────────────────────────
const ALL_CATS = [
  // כיפות
  { cat: 'כיפות', subCategory: 'כיפות מיוחדות',   code: '1147', Itemid: 440 },
  { cat: 'כיפות', subCategory: 'סאטן וטריקלין',   code: '1144', Itemid: 441 },
  { cat: 'כיפות', subCategory: 'סרוגות',            code: '1143', Itemid: 442 },
  { cat: 'כיפות', subCategory: 'סרוגות ד.מ.צ.',    code: '1151', Itemid: 443 },
  { cat: 'כיפות', subCategory: 'סרוגות עם רקמה',   code: '1146', Itemid: 445 },
  { cat: 'כיפות', subCategory: 'עור',               code: '1148', Itemid: 446 },
  { cat: 'כיפות', subCategory: 'פריק',              code: '1149', Itemid: 458 },
  { cat: 'כיפות', subCategory: 'פריק עבודת יד',    code: '1181', Itemid: 448 },
  { cat: 'כיפות', subCategory: 'קטיפה',             code: '1145', Itemid: 449 },
  { cat: 'כיפות', subCategory: 'סיכות כיפה',       code: '1150', Itemid: 439 },
  // שבת
  { cat: 'שבת', subCategory: 'הפרשת חלה',           code: '1116', Itemid: 0 },
];
const CATS = CAT_FILTER
  ? ALL_CATS.filter(c => c.code === CAT_FILTER)
  : ALL_CATS;

if (CAT_FILTER && CATS.length === 0) {
  console.error(`❌ לא נמצאה קטגוריה עם קוד ${CAT_FILTER}`);
  process.exit(1);
}

const DELAY_MS   = 700;
const ITEMS_PER_PAGE = 24; // com_art default
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Puppeteer helpers ─────────────────────────────────────────────────────────
async function fetchHtmlWithPage(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  // extra wait for JS-rendered product grids
  await sleep(800);
  return page.content();
}

async function login(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8' });

  console.log('🔐 מתחבר לאתר...');

  // Navigate to login page
  const loginUrl = `${BASE}/index.php?option=com_users&view=login&lang=he`;
  await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });

  // Try to find username/password fields
  const html = await page.content();
  const $ = load(html);

  // Look for login form
  const hasForm = $('input[name="username"], input[type="email"], input[id*="login"], input[name="jform[username]"]').length > 0;

  if (!hasForm) {
    // Maybe already logged in, or different login structure
    console.log('  ⚠️  לא נמצא טופס התחברות — אולי כבר מחובר?');
    // Try the main page
    await page.goto(`${BASE}/index.php?lang=he`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const mainHtml = await page.content();
    if (mainHtml.includes(EMAIL) || mainHtml.toLowerCase().includes('logout') || mainHtml.includes('התנתק')) {
      console.log('  ✅ כבר מחובר');
      return page;
    }
  }

  // Fill in credentials — use evaluate to avoid clickability issues
  try {
    const usernameSelectors = [
      'input[name="username"]',
      'input[name="jform[username]"]',
      'input[id="username"]',
      'input[type="email"]',
      'input[id*="username"]',
      'input[name*="user"]',
    ];
    const passwordSelectors = [
      'input[name="password"]',
      'input[name="jform[password]"]',
      'input[id="password"]',
      'input[type="password"]',
    ];

    const filled = await page.evaluate((email, password, uSels, pSels) => {
      const result = { user: null, pass: null };
      for (const sel of uSels) {
        const el = document.querySelector(sel);
        if (el) {
          el.value = email;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          result.user = sel;
          break;
        }
      }
      for (const sel of pSels) {
        const el = document.querySelector(sel);
        if (el) {
          el.value = password;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          result.pass = sel;
          break;
        }
      }
      return result;
    }, EMAIL, PASSWORD, usernameSelectors, passwordSelectors);

    if (filled.user) console.log(`  ✏️  הזנתי מייל (${filled.user})`);
    else console.log('  ⚠️  לא נמצא שדה שם משתמש');

    if (filled.pass) console.log(`  ✏️  הזנתי סיסמא (${filled.pass})`);
    else console.log('  ⚠️  לא נמצא שדה סיסמא');

    // Submit — use evaluate to click to avoid clickable-element errors
    const submitted = await page.evaluate(() => {
      const selectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button[class*="login"]',
        'input[class*="login"]',
        'button[class*="submit"]',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) { el.click(); return sel; }
      }
      // fallback: submit the first form
      const form = document.querySelector('form');
      if (form) { form.submit(); return 'form.submit()'; }
      return null;
    });
    if (submitted) {
      console.log(`  🖱️  לחצתי שלח (${submitted})`);
    } else {
      await page.keyboard.press('Enter');
      console.log('  ⌨️  Enter fallback');
    }
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});

    await sleep(1500);

    // Verify login
    const afterHtml = await page.content();
    const isLoggedIn = afterHtml.toLowerCase().includes('logout') ||
      afterHtml.includes('התנתק') ||
      afterHtml.includes(EMAIL.split('@')[0]) ||
      afterHtml.toLowerCase().includes('my account') ||
      afterHtml.includes('החשבון שלי');

    if (isLoggedIn) {
      console.log('  ✅ התחברות הצליחה\n');
    } else {
      console.log('  ⚠️  לא הצלחנו לאמת התחברות — ממשיך בכל זאת\n');
    }
  } catch (err) {
    console.log('  ⚠️  שגיאה בטופס התחברות:', err.message, '— ממשיך בכל זאת');
  }

  return page;
}

// ── Product scraper ───────────────────────────────────────────────────────────
function catUrl(code, Itemid, start = 0) {
  const base = `${BASE}/index.php?option=com_art&view=category&code=${code}&lang=he`;
  const itemPart = Itemid ? `&Itemid=${Itemid}` : '';
  const startPart = start > 0 ? `&limitstart=${start}` : '';
  return base + itemPart + startPart;
}

function parseProductList($) {
  const products = [];

  // Strategy: find product links/rows in com_art category view
  // Products typically in table rows or div.product-item
  // Try multiple selectors

  // 1. Table-based layout (common in com_art)
  $('tr').each((_, row) => {
    const $row = $(row);
    const link = $row.find('a[href*="view=product"]').first();
    if (!link.length) return;

    const href  = link.attr('href') || '';
    const name  = link.text().trim() || $row.find('td').first().text().trim();

    // Extract code/sku from href
    const codeMatch = href.match(/[?&](?:code|sku|id)=([A-Z0-9]+)/i);
    const sku = codeMatch ? codeMatch[1] : null;
    const fullUrl = href.startsWith('http') ? href : `${BASE}/${href.replace(/^\//, '')}`;

    // Price: look for ₪ or numeric in cells — cap at 5000 to avoid codes/IDs
    let price = null;
    $row.find('td').each((_, td) => {
      const text = $(td).text().replace(/[^\d.]/g, '').trim();
      const n = parseFloat(text);
      if (!isNaN(n) && n > 0 && n < 5000 && price === null) price = n;
    });

    // Image
    const imgSrc = $row.find('img').first().attr('src') || '';
    const imgUrl = imgSrc ? (imgSrc.startsWith('http') ? imgSrc : `${BASE}/${imgSrc.replace(/^\//, '')}`) : null;

    // Stock: look for "אזל" / "out of stock" / "במלאי"
    const rowText = $row.text();
    const isOut = /אזל|out.of.stock|אין במלאי/i.test(rowText);

    if (sku || name.length > 2) {
      products.push({ sku, name: name.slice(0, 120), price, imgUrl, href: fullUrl, stockStatus: isOut ? 'out_of_stock' : 'in_stock' });
    }
  });

  // 2. Div/article-based layout
  if (products.length === 0) {
    $('[class*="product"], article, .item, .art-item').each((_, el) => {
      const $el = $(el);
      const link = $el.find('a[href*="view=product"]').first();
      if (!link.length) return;

      const href  = link.attr('href') || '';
      const name  = $el.find('[class*="name"], [class*="title"], h2, h3').first().text().trim()
                || link.text().trim();
      const codeMatch = href.match(/[?&](?:code|sku|id)=([A-Z0-9]+)/i);
      const sku = codeMatch ? codeMatch[1] : null;
      const fullUrl = href.startsWith('http') ? href : `${BASE}/${href.replace(/^\//, '')}`;

      // Price
      let price = null;
      const priceEl = $el.find('[class*="price"], .cost, .מחיר').first();
      const priceText = priceEl.text() || $el.text();
      const priceMatch = priceText.match(/[\d,.]+/);
      if (priceMatch) {
        const n = parseFloat(priceMatch[0].replace(',', ''));
        if (!isNaN(n) && n > 0 && n < 5000) price = n;
      }

      const imgSrc = $el.find('img').first().attr('src') || '';
      const imgUrl = imgSrc ? (imgSrc.startsWith('http') ? imgSrc : `${BASE}/${imgSrc.replace(/^\//, '')}`) : null;
      const isOut = /אזל|out.of.stock/i.test($el.text());

      if (sku || name.length > 2) {
        products.push({ sku, name: name.slice(0, 120), price, imgUrl, href: fullUrl, stockStatus: isOut ? 'out_of_stock' : 'in_stock' });
      }
    });
  }

  return products;
}

function countPages($) {
  // Only trust pagination links that are actually visible on page
  let maxStart = 0;
  $('a[href*="limitstart"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    // Only count pagination links that belong to current category (not site-wide counters)
    const m = href.match(/limitstart=(\d+)/);
    if (m) maxStart = Math.max(maxStart, parseInt(m[1]));
  });
  // Cap at 500 items (≈21 pages) — site-wide counters can inflate this wildly
  const safeCap = 500;
  if (maxStart > safeCap) {
    console.log(`   ⚠️  limitstart=${maxStart} נראה גבוה מדי — מחשב עמוד 1 בלבד`);
    return 1;
  }
  const pagesFromPagination = maxStart > 0 ? Math.ceil((maxStart + ITEMS_PER_PAGE) / ITEMS_PER_PAGE) : 1;
  return Math.max(pagesFromPagination, 1);
}

async function scrapeCategory(page, cat) {
  const { subCategory, code, Itemid, cat: catName } = cat;
  console.log(`\n📂 ${catName} › ${subCategory}  (code=${code})`);

  const url1 = catUrl(code, Itemid, 0);
  console.log(`   ${url1}`);

  let html;
  try {
    html = await fetchHtmlWithPage(page, url1);
    await sleep(DELAY_MS);
  } catch (err) {
    console.log(`   ❌ שגיאה: ${err.message}`);
    return [];
  }

  const $ = load(html);
  const bodyLen = $('body').text().replace(/\s+/g, ' ').trim().length;
  if (bodyLen < 200) {
    console.log(`   ⚠️  גוף קצר מדי (${bodyLen} תווים) — דף ריק?`);
    return [];
  }

  const pages = countPages($);
  const p1 = parseProductList($);
  console.log(`   דף 1/${pages}: ${p1.length} מוצרים`);

  const allProducts = [...p1];

  // Fetch additional pages — exit early on 2 consecutive empty pages
  let consecutiveEmpty = p1.length === 0 ? 1 : 0;
  for (let pg = 2; pg <= Math.min(pages, 30); pg++) {
    if (consecutiveEmpty >= 2) {
      console.log(`\n   🛑 2 דפים ריקים ברצף — מפסיק ב-${pg - 1}`);
      break;
    }
    const urlN = catUrl(code, Itemid, (pg - 1) * ITEMS_PER_PAGE);
    try {
      const htmlN = await fetchHtmlWithPage(page, urlN);
      const $N = load(htmlN);
      const prods = parseProductList($N);
      allProducts.push(...prods);
      process.stdout.write(`   דף ${pg}/${pages}: ${prods.length} מוצרים\r`);
      consecutiveEmpty = prods.length === 0 ? consecutiveEmpty + 1 : 0;
      await sleep(DELAY_MS);
    } catch (err) {
      console.log(`\n   ⚠️  שגיאה בדף ${pg}: ${err.message}`);
      consecutiveEmpty++;
    }
  }

  // Dedupe by sku (keep first occurrence)
  const seen = new Set();
  const unique = allProducts.filter(p => {
    const key = p.sku || p.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n   ✅ סה"כ ${unique.length} מוצרים ייחודיים`);
  if (unique.filter(p => p.price !== null).length > 0) {
    const sample = unique.filter(p => p.price).slice(0, 3).map(p => `${p.name.slice(0,25)} ₪${p.price}`);
    console.log(`   דגום: ${sample.join(' | ')}`);
  } else {
    console.log('   ⚠️  לא נמצאו מחירים בדף זה (ייתכן שנדרשת כניסה)');
  }

  return unique.map(p => ({ ...p, cat: catName, subCategory, supplierCatCode: code }));
}

// ── Firestore sync ────────────────────────────────────────────────────────────
async function loadExistingProducts() {
  console.log('\n📥 טוען מוצרים קיימים מ-Firestore...');
  const snap = await db.collection('products').get();
  const map = new Map(); // sku → { id, ...data }
  const byName = new Map(); // normalizedName → { id, ...data }
  snap.forEach(d => {
    const data = { id: d.id, ...d.data() };
    if (data.sku || data.supplierCode) {
      map.set((data.sku || data.supplierCode).toUpperCase(), data);
    }
    if (data.name) byName.set(data.name.trim().toLowerCase(), data);
  });
  console.log(`   ${snap.size} מוצרים נטענו`);
  return { map, byName };
}

function findMatch(product, { map, byName }) {
  // 1. By SKU
  if (product.sku) {
    const m = map.get(product.sku.toUpperCase());
    if (m) return m;
  }
  // 2. By exact name
  const normName = product.name.trim().toLowerCase();
  const m2 = byName.get(normName);
  if (m2) return m2;
  // 3. By partial name (≥ 80% match length)
  for (const [k, v] of byName) {
    if (k.includes(normName) || normName.includes(k)) {
      if (Math.min(k.length, normName.length) / Math.max(k.length, normName.length) >= 0.8) {
        return v;
      }
    }
  }
  return null;
}

async function syncToFirestore(allProducts, existingMaps) {
  let updated = 0, added = 0, skipped = 0, noPrice = 0;

  for (const p of allProducts) {
    if (!p.price && !p.sku) { noPrice++; continue; }

    const existing = findMatch(p, existingMaps);

    if (existing) {
      const updates = { source: 'israel-judaica', stockStatus: p.stockStatus, outOfStock: p.stockStatus === 'out_of_stock' };
      if (p.sku)   updates.supplierCode = p.sku;
      if (p.price) updates.purchasePrice = p.price;
      if (p.imgUrl && !existing.imgUrl) updates.imgUrl = p.imgUrl;

      if (!DRY_RUN) {
        await db.collection('products').doc(existing.id).update(updates);
      }
      updated++;
    } else if (ADD_NEW && p.price && p.name) {
      const newProduct = {
        name: p.name,
        price: Math.round(p.price * 1.4 * 10) / 10, // 40% markup default
        purchasePrice: p.price,
        supplierCode: p.sku || null,
        imgUrl: p.imgUrl || null,
        cat: p.cat || 'כללי',
        subCategory: p.subCategory || null,
        source: 'israel-judaica',
        sourceUrl: p.href || null,
        stockStatus: p.stockStatus,
        status: 'inactive', // requires manual review before going live
        createdAt: FieldValue.serverTimestamp(),
      };
      if (!DRY_RUN) {
        await db.collection('products').add(newProduct);
      }
      added++;
    } else {
      skipped++;
    }

    if ((updated + added) % 20 === 0 && (updated + added) > 0) {
      process.stdout.write(`\r   עודכנו: ${updated}, נוספו: ${added}, דולגו: ${skipped}`);
    }
  }

  return { updated, added, skipped, noPrice };
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('═'.repeat(60));
console.log(' Israel-Judaica → Firestore Sync');
console.log(`═`.repeat(60));
console.log(`אתר: ${BASE}`);
console.log(`כניסה: ${EMAIL}`);
console.log(`קטגוריות: ${CATS.length}  |  dry-run: ${DRY_RUN}  |  add-new: ${ADD_NEW}`);
console.log('═'.repeat(60) + '\n');

const browser = await puppeteer.launch({
  headless: HEADLESS,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=he-IL'],
});

let page;
try {
  page = await login(browser);
} catch (err) {
  console.error('❌ שגיאה בהתחברות:', err.message);
  await browser.close();
  process.exit(1);
}

// Scrape all categories
const allScraped = [];
for (const cat of CATS) {
  const products = await scrapeCategory(page, cat);
  allScraped.push(...products);
  await sleep(800);
}

await browser.close();

console.log(`\n\n${'═'.repeat(60)}`);
console.log(`📊 סיכום סריקה: ${allScraped.length} מוצרים ב-${CATS.length} קטגוריות`);
const withPrice = allScraped.filter(p => p.price !== null);
console.log(`   עם מחיר: ${withPrice.length}  |  ללא מחיר: ${allScraped.length - withPrice.length}`);

if (allScraped.length === 0) {
  console.log('\n⚠️  לא נסרקו מוצרים — בדוק פרטי כניסה ומבנה האתר');
  process.exit(0);
}

// Sync to Firestore
const existingMaps = await loadExistingProducts();
console.log('\n🔄 מעדכן Firestore...');
const { updated, added, skipped, noPrice } = await syncToFirestore(allScraped, existingMaps);

console.log(`\n✅ עודכנו: ${updated}  |  נוספו: ${added}  |  דולגו: ${skipped}  |  ללא מחיר: ${noPrice}`);
if (DRY_RUN) console.log('🧪 DRY-RUN — לא נכתב כלום ל-Firestore');

// Write summary
const summary = {
  date: new Date().toISOString(),
  dryRun: DRY_RUN,
  totalScraped: allScraped.length,
  withPrice: withPrice.length,
  updated,
  added,
  skipped,
  categories: CATS.map(c => ({
    code: c.code,
    label: c.subCategory,
    cat: c.cat,
    scraped: allScraped.filter(p => p.supplierCatCode === c.code).length,
  })),
};
const summaryPath = join(__dirname, '..', '..', 'scripts', 'israel-judaica-sync-summary.json');
writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(`\n📄 סיכום נשמר: ${summaryPath}`);
