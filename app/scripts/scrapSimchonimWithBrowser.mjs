/**
 * scrapeSimchonimWithBrowser.mjs
 *
 * Web scraper עם Puppeteer (browser אמיתי)
 * צריך: npm install puppeteer
 *
 * node app/scripts/scrapeSimchonimWithBrowser.mjs --dry-run
 * node app/scripts/scrapeSimchonimWithBrowser.mjs --yes
 */

import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { initializeApp, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env ──────────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../../.env.local'), 'utf8');
    const vars = {};
    let key = null, val = [];
    for (const line of raw.split('\n')) {
      const m = line.trimEnd().match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) {
        if (key) vars[key] = val.join('\n');
        key = m[1]; val = [m[2]];
      } else if (key) {
        val.push(line.trimEnd());
      }
    }
    if (key) vars[key] = val.join('\n');
    return vars;
  } catch {
    return {};
  }
}

const env = loadEnv();
const projectId = env['FIREBASE_PROJECT_ID'] || 'your-sofer';
const clientEmail = env['FIREBASE_CLIENT_EMAIL'];
let privateKey = env['FIREBASE_PRIVATE_KEY'];

// Normalize private key - remove quotes and fix newlines
if (privateKey) {
  privateKey = privateKey.trim();
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');
}

// Initialize Firebase Admin SDK
let db = null;
try {
  const app = getApp();
  db = getFirestore(app);
} catch {
  if (projectId && clientEmail && privateKey) {
    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      db = getFirestore();
      console.log('✅ Firebase Admin SDK initialized');
    } catch (err) {
      console.error('❌ Firebase init error:', err.message);
      process.exit(1);
    }
  } else {
    console.error('❌ Firebase credentials missing from .env.local');
    console.error(`   projectId: ${projectId ? '✓' : '✗'}`);
    console.error(`   clientEmail: ${clientEmail ? '✓' : '✗'}`);
    console.error(`   privateKey: ${privateKey ? '✓' : '✗'}`);
    process.exit(1);
  }
}

const PRICE_MARKUP = 1.15;

const CATEGORY_MAP = {
  sidurim: 'ספרי קודש וסידורים',
  bruchonot: 'ברכונים',
  gifts: 'מתנות',
};

const URLS = [
  { url: 'https://simchonim.co.il/product-catalog/%d7%9b%d7%9c-%d7%94%d7%a1%d7%99%d7%93%d7%95%d7%a8%d7%99%d7%9d/', cat: 'sidurim' },
  { url: 'https://simchonim.co.il/product-catalog/%D7%91%D7%A8%D7%9B%D7%95%D7%A0%D7%99%D7%9D/', cat: 'bruchonot' },
  { url: 'https://simchonim.co.il/product-tag/%d7%9e%d7%96%d7%9b%d7%a8%d7%95%d7%aa-%d7%9c%d7%90%d7%a8%d7%95%d7%a2%d7%99%d7%9d/', cat: 'gifts' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Firestore ──────────────────────────────────────────────────────────────────

async function firestoreSet(collection, docId, data) {
  const url = `${FIRESTORE_API}/${collection}/${docId}?key=${apiKey}`;
  const fields = {};
  const fieldPaths = [];

  for (const [key, val] of Object.entries(data)) {
    if (val === null || val === undefined || val === '') continue;

    if (typeof val === 'string') {
      fields[key] = { stringValue: val };
      fieldPaths.push(key);
    } else if (typeof val === 'number') {
      fields[key] = val % 1 === 0 ? { integerValue: String(val) } : { doubleValue: val };
      fieldPaths.push(key);
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
      fieldPaths.push(key);
    } else if (val instanceof Date) {
      fields[key] = { timestampValue: val.toISOString() };
      fieldPaths.push(key);
    }
  }

  if (fieldPaths.length === 0) throw new Error('No fields');

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields, updateMask: { fieldPaths } }),
  });

  if (!res.ok) throw new Error(`${res.status}`);
}

// ── Scraper with Browser ───────────────────────────────────────────────────────

async function scrapeWithBrowser(url, category) {
  console.log(`📄 Scraping: ${url.substring(0, 50)}...`);

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
    await page.waitForSelector('[class*="product"]', { timeout: 5000 }).catch(() => null);

    // חלץ מוצרים - חפש ב-main content בלבד
    const products = await page.evaluate(() => {
      const items = [];

      // חפש את main products container (לא menu)
      const mainContent = document.querySelector('main, .main, .content, [role="main"]') || document.body;

      // חפש רק ב-main content
      mainContent.querySelectorAll('li.product').forEach(el => {
        // Skip menu items (יש להם class "menu-item")
        if (el.classList.contains('menu-item') || el.classList.contains('menu-item-type-taxonomy')) {
          return;
        }

        const link = el.querySelector('a[href*="/product"]');
        if (!link) return;

        const url = link.href;

        // חלץ שם - חפש באחרון link בelement (בדרך כלל זה תמונה + שם)
        const allLinks = el.querySelectorAll('a');
        let title = '';
        for (let i = allLinks.length - 1; i >= 0; i--) {
          const text = allLinks[i].textContent.trim();
          if (text && text.length > 3 && !text.includes('סנן')) {
            title = text;
            break;
          }
        }

        if (!title) {
          const h2 = el.querySelector('h2, h3');
          if (h2) title = h2.textContent.trim();
        }

        // נקה את השם מnewlines, מחירים, וטקסט מיותר
        title = title
          .replace(/\n/g, ' ') // החלף newlines בspaces
          .replace(/\s+/g, ' ') // החלף multiple spaces בsingle space
          .replace(/\s*\d+(?:[.,]\d+)?\s*(?:₪|שקל)?$/i, '') // הסר מחיר בסוף (מספרים + currency)
          .replace(/טווח מחירים[\s\S]*$/i, '') // הסר "טווח מחירים"
          .replace(/דורג\s*\d+.*$/i, '') // הסר דירוג
          .replace(/המחיר.*$/i, '') // הסר "המחיר"
          .trim();

        if (!title || title.includes('{{{') || title.length < 3) return;

        // חלץ מחיר - בדקק בכל classes שקשורות למחיר
        let price = 0;
        const priceSpans = el.querySelectorAll('span, div, p');
        for (const span of priceSpans) {
          const text = span.textContent;
          // חפש: numbers + optional comma + optional numbers + ₪ or שקל
          const match = text.match(/(\d+)(?:[.,](\d+))?\s*₪/);
          if (match) {
            const wholePart = parseInt(match[1], 10);
            const decimalPart = match[2] ? parseInt(match[2], 10) : 0;
            price = wholePart + (decimalPart / 100);
            break;
          }
        }

        if (price > 0 || title.length > 5) {
          items.push({ title, price: Math.max(0, price), url });
        }
      });

      return items.slice(0, 100);
    });

    // Debug print
    if (products.length === 0) {
      console.log('   📊 Debugging info:');
      const debug = await page.evaluate(() => {
        return {
          productLiCount: document.querySelectorAll('li.product, li[data-product-id]').length,
          productDivCount: document.querySelectorAll('div[class*="product"]').length,
          allLinksCount: document.querySelectorAll('a[href*="product"]').length,
          bodyHTML: document.body.innerHTML.substring(0, 500),
        };
      });
      console.log(`      .product li: ${debug.productLiCount}`);
      console.log(`      div.product: ${debug.productDivCount}`);
      console.log(`      links: ${debug.allLinksCount}`);
    }

    console.log(`   ✓ Found ${products.length} products`);

    await browser.close();
    return products.map(p => ({
      supplier: 'simchonim',
      supplier_sku: p.url.split('/').filter(x => x && x.length > 2).pop() || `sku-${Math.random()}`,
      supplier_url: p.url,
      name: p.title.substring(0, 150),
      price: Math.round(p.price * PRICE_MARKUP * 100) / 100,
      original_price: p.price,
      category: CATEGORY_MAP[category] || 'מתנות',
      active: true,
    }));

  } catch (err) {
    await browser.close();
    console.log(`   ❌ ${err.message}`);
    return [];
  }
}

// ── Prompt ─────────────────────────────────────────────────────────────────────

async function confirm(msg) {
  if (process.argv.includes('--yes')) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(msg + ' (y/n) ', ans => {
      rl.close();
      resolve(ans.toLowerCase() === 'y');
    });
  });
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('🔍 Scraping Simchonim with browser...\n');

  let allProducts = [];
  for (const { url, cat } of URLS) {
    const products = await scrapeWithBrowser(url, cat);
    allProducts = allProducts.concat(products);
    await sleep(1000);
  }

  if (allProducts.length === 0) {
    console.log('\n⚠️  No products found');
    process.exit(0);
  }

  console.log(`\n📊 Total: ${allProducts.length} products`);
  console.log(`   Dry run: ${isDryRun ? 'YES' : 'NO'}\n`);

  console.log('📋 Sample:');
  allProducts.slice(0, 3).forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name}`);
    console.log(`      ${p.category} | ₪${p.price}`);
  });
  console.log('');

  if (isDryRun) {
    console.log('✅ Dry run complete');
    process.exit(0);
  }

  const shouldContinue = await confirm('✅ Import to Firestore?');
  if (!shouldContinue) {
    console.log('❌ Cancelled');
    process.exit(0);
  }

  console.log(`\n💾 Importing to Firestore (via Admin SDK)...\n`);

  if (!db) {
    console.error('   ❌ Firebase not initialized - missing credentials in .env.local');
    process.exit(1);
  }

  let imported = 0;
  const batch = db.batch();

  for (const product of allProducts) {
    try {
      const docId = `simchonim_${product.supplier_sku}`;
      const docRef = db.collection('products').doc(docId);

      batch.set(
        docRef,
        {
          name: product.name,
          price: product.price,
          original_price: product.original_price,
          cat: product.category,
          subCategory: 'imported',
          supplier: 'simchonim',
          supplier_sku: product.supplier_sku,
          supplier_url: product.supplier_url,
          active: product.active,
          createdAt: new Date(),
          supplier_imported_at: new Date(),
        },
        { merge: true }
      );

      imported++;
      if (imported % 25 === 0) console.log(`   ✓ ${imported}/${allProducts.length}`);
    } catch (err) {
      console.error(`   ❌ ${product.name}: ${err.message}`);
    }
  }

  try {
    await batch.commit();
    console.log(`\n✅ Done! Imported ${imported}/${allProducts.length} products`);
  } catch (err) {
    console.error(`\n❌ Batch commit failed: ${err.message}`);
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
