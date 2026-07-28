/**
 * scrapePackSizes.mjs
 * Samples 20% of SKUs from every sub-category (min 3, seeded random, seed=42)
 * and scrapes the pack size ("נמכר באריזה של X יחידות") from israel-judaica.com.
 *
 * Source of sub-categories: scripts/supplier_subcategory_skus.json
 *   shape: { [code]: { name, skus: string[], count } }
 *
 * Credentials: SUPPLIER_EMAIL / SUPPLIER_PASSWORD in .env.local
 *
 * Run:
 *   node scripts/scrapePackSizes.mjs
 *
 * Output: scripts/supplier_pack_sizes_sample.json (resumable, flushed every 25 products)
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── env (.env.local) — split on first '=' so emails with '@' parse correctly ──
const envPath = resolve(__dirname, '../.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
}

const EMAIL    = process.env.SUPPLIER_EMAIL;
const PASSWORD = process.env.SUPPLIER_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error('❌ חסרים SUPPLIER_EMAIL / SUPPLIER_PASSWORD ב-.env.local');
  process.exit(1);
}

const BASE_URL     = 'https://www.israel-judaica.com';
const SUBCATS_PATH = resolve(__dirname, 'supplier_subcategory_skus.json');
const OUTPUT_PATH  = resolve(__dirname, 'supplier_pack_sizes_sample.json');
const BATCH        = 100;
const FLUSH_EVERY  = 25;
const DELAY_MS     = 800;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── seeded RNG (mulberry32, seed=42) — deterministic sampling ────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sampleSkus(skus, rng) {
  const n = Math.max(3, Math.ceil(skus.length * 0.2));
  return seededShuffle(skus, rng).slice(0, Math.min(n, skus.length));
}

// ── resolve sku -> product_code via the public category AJAX endpoint ────────
async function fetchSubCategoryMap(categoryCode) {
  const map = {};
  let offset = 0;
  while (true) {
    const body = new URLSearchParams({
      category: categoryCode, filterChoices: '[]', limit: String(BATCH),
      offset: String(offset), sortValue: '', sortDirection: '', note: '', search_term: '',
    });
    const res = await fetch(`${BASE_URL}/index.php?option=com_art&task=category.getProducts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const json = await res.json();
    if (!json.status) throw new Error(json.error || json.msg || 'category.getProducts failed');
    const products = json.products || {};
    const keys = Object.keys(products);
    if (keys.length === 0) break;
    for (const [sku, p] of Object.entries(products)) map[sku] = p;
    if (keys.length < BATCH) break;
    offset += BATCH;
    await sleep(250);
  }
  return map;
}

// ── login ──────────────────────────────────────────────────────────────────
async function gotoRetry(page, url, opts, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try { await page.goto(url, opts); return; }
    catch (e) { if (i === tries - 1) throw e; await sleep(1500); }
  }
}

async function login(page) {
  await gotoRetry(page, `${BASE_URL}/index.php?lang=he`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#btl-input-username', EMAIL);
  await page.fill('#btl-input-password', PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
    page.$eval('.btl-formlogin input[type=submit]', (el) => el.click()),
  ]);
  const loggedIn = await page.$eval('body', (b) => /שלום|התנתק|חשבון שלי|יציאה/i.test(b.innerText));
  if (!loggedIn) throw new Error('Login verification failed — לא נמצא סימן התחברות מוצלח');
  console.log('✅ התחברות הצליחה\n');
}

// ── scrape one product ───────────────────────────────────────────────────────
async function scrapeProduct(page, productCode) {
  await gotoRetry(
    page,
    `${BASE_URL}/index.php?option=com_art&view=product&code=${productCode}&lang=he`,
    { waitUntil: 'domcontentloaded', timeout: 45000 },
  );
  await page.waitForTimeout(1200);
  const { name, bodyText } = await page.evaluate(() => ({
    name: document.querySelector('.product-name')?.textContent.trim() ?? '',
    bodyText: document.body.innerText,
  }));
  const m = bodyText.match(/נמכר באריזה של\s*(\d+)\s*יחידות/);
  const packSize = m ? Number(m[1]) : 1;
  return { name, packSize };
}

// ── main ──────────────────────────────────────────────────────────────────
async function main() {
  const subCategories = JSON.parse(readFileSync(SUBCATS_PATH, 'utf8'));
  const rng = mulberry32(42);

  // Build the deterministic sample plan up-front (resume-safe: same plan every run)
  const plan = [];
  for (const [code, sub] of Object.entries(subCategories)) {
    const sampled = sampleSkus(sub.skus, rng);
    for (const sku of sampled) plan.push({ subCategoryCode: code, subCategory: sub.name, sku });
  }
  console.log(`📋 תוכנית סריקה: ${plan.length} מוצרים מתוך ${Object.keys(subCategories).length} תתי-קטגוריות\n`);

  // Resume: skip what's already in the output file
  let results = [];
  if (existsSync(OUTPUT_PATH)) {
    results = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'));
    console.log(`⏯  resume: ${results.length} מוצרים נמצאים כבר ב-${OUTPUT_PATH}\n`);
  }
  const done = new Set(results.map((r) => `${r.subCategoryCode}|${r.sku}`));
  const remaining = plan.filter((p) => !done.has(`${p.subCategoryCode}|${p.sku}`));
  console.log(`🚀 נותרו לסריקה: ${remaining.length} מוצרים\n`);

  if (remaining.length === 0) {
    printSummary(results);
    return;
  }

  // Resolve sku -> product_code per sub-category (only for sub-categories we still need)
  const neededCodes = [...new Set(remaining.map((p) => p.subCategoryCode))];
  const codeMaps = {};
  console.log('🔎 פותר sku -> product_code לכל תת-קטגוריה...');
  for (const code of neededCodes) {
    codeMaps[code] = await fetchSubCategoryMap(code);
  }
  console.log('✅ סיום פתרון קודים\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await login(page);

    let sinceFlush = 0;
    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      const progress = `[${i + 1}/${remaining.length}]`;
      const product = codeMaps[item.subCategoryCode]?.[item.sku];

      if (!product?.product_code) {
        console.warn(`${progress} ⚠️  ${item.sku} (${item.subCategory}) — לא נמצא product_code, מדלג`);
        continue;
      }

      try {
        const { name, packSize } = await scrapeProduct(page, product.product_code);
        results.push({
          subCategoryCode: item.subCategoryCode,
          subCategory: item.subCategory,
          sku: item.sku,
          productCode: product.product_code,
          name: name || product.name_en || '',
          packSize,
        });
        console.log(`${progress} ✅ ${item.sku} (${item.subCategory}) — אריזה של ${packSize}`);
      } catch (err) {
        console.warn(`${progress} ⚠️  ${item.sku} — שגיאה: ${err.message}`);
      }

      sinceFlush++;
      if (sinceFlush >= FLUSH_EVERY) {
        writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf8');
        sinceFlush = 0;
        console.log(`   💾 נשמר (${results.length} רשומות)`);
      }

      await sleep(DELAY_MS);
    }

    writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\n✅ סיום! סה"כ נשמרו ${results.length} רשומות → ${OUTPUT_PATH}\n`);
  } finally {
    await browser.close();
  }

  printSummary(results);
}

function printSummary(results) {
  const bySubCat = {};
  for (const r of results) {
    (bySubCat[r.subCategory] ??= []).push(r.packSize);
  }

  console.log('\n📊 סיכום גודלי אריזה לפי תת-קטגוריה:\n');
  const rows = [];
  for (const [subCat, sizes] of Object.entries(bySubCat)) {
    const counts = {};
    for (const s of sizes) counts[s] = (counts[s] || 0) + 1;
    const distribution = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([size, count]) => `${size}×${count}`)
      .join(', ');
    const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    rows.push({ 'תת-קטגוריה': subCat, "מס' מוצרים": sizes.length, 'התפלגות': distribution, 'גודל נפוץ': mostCommon });
  }
  console.table(rows);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
