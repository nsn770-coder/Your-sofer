/**
 * enrichSimchonimProducts.mjs
 *
 * שלב 2 של ייבוא סימחונים: נכנס לכל עמוד מוצר ומשלים
 *   • שם נקי + מק"ט אמיתי של הספק
 *   • מחיר ליחידה (+15%)
 *   • תיאור קצר ומלא
 *   • מידות (אורך/רוחב)
 *   • מלאי
 *   • כל תמונות הגלריה
 *   • קטגוריה + תת-קטגוריה (מתוך נתיב ה-URL של הספק)
 *   • מערך האופציות (הטבעת שם / הטבעת הקדשה / אריזת מתנה) כ-JSON
 *
 * האופציות נשמרות ב-supplier_options בלבד — הן לא מחוברות ל-UI של האתר.
 * זו החלטה מכוונת: מימוש בורר ההטבעות הוא פיצ'ר בפני עצמו.
 *
 * node app/scripts/enrichSimchonimProducts.mjs --limit 3      # בדיקה
 * node app/scripts/enrichSimchonimProducts.mjs --dry-run
 * node app/scripts/enrichSimchonimProducts.mjs --yes          # הכל
 */

import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── env ───────────────────────────────────────────────────────────────────────

function loadEnv() {
  const raw = readFileSync(resolve(__dirname, '../../.env.local'), 'utf8');
  const vars = {};
  let key = null, val = [];
  for (const l of raw.split('\n')) {
    const m = l.trimEnd().match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    if (m) { if (key) vars[key] = val.join('\n'); key = m[1]; val = [m[2]]; }
    else if (key) val.push(l.trimEnd());
  }
  if (key) vars[key] = val.join('\n');
  return vars;
}

const env = loadEnv();
let pk = env['FIREBASE_PRIVATE_KEY']?.trim();
if (pk?.startsWith('"')) pk = pk.slice(1, -1);
pk = pk?.replace(/\\n/g, '\n');

initializeApp({
  credential: cert({
    projectId: env['FIREBASE_PROJECT_ID'],
    clientEmail: env['FIREBASE_CLIENT_EMAIL'],
    privateKey: pk,
  }),
});
const db = getFirestore();

// ── קונפיג ────────────────────────────────────────────────────────────────────

const PRICE_MARKUP = 1.15;

const argVal = (flag, dflt) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? parseInt(process.argv[i + 1], 10) : dflt;
};

/** --concurrency 2 --timeout 60 מוריד עומס ומאפשר השלמה של עמודים איטיים */
const CONCURRENCY = argVal('--concurrency', 4);
const NAV_TIMEOUT = argVal('--timeout', 25) * 1000;
/** מספר ניסיונות לכל עמוד לפני שהוא נרשם כשלון */
const RETRIES = argVal('--retries', 2);

/**
 * מיפוי הקטגוריה הראשית של סימחונים → קטגוריה קיימת ב-YourSofer.
 * מה שלא במפה נופל ל-'ספרי קודש וברכונים' (ברירת מחדל בטוחה לרוב הקטלוג).
 * תת-הקטגוריה תמיד נשמרת כשמה אצל הספק — כך שום מידע לא נאבד.
 */
const CATEGORY_MAP = {
  'סדורים': 'ספרי קודש וברכונים',
  'תהילים': 'ספרי קודש וברכונים',
  'מחזורים': 'ספרי קודש וברכונים',
  'ברכונים': 'ספרי קודש וברכונים',
  'תפילות-ותחינות': 'ספרי קודש וברכונים',
  'שבת': 'ספרי קודש וברכונים',
  'חגים': 'שבתות וחגים',
  // מזכרות לאירועים אצל הספק הן ברכונים/אגרות/זמירות — ספרים, לא מתנות.
  // המיקום כאן גם מפעיל את בורר ההטבעה (EMBOSSING_CATEGORIES).
  'מזכרות-לאירועים': 'ספרי קודש וברכונים',
  'מתנות': 'מתנות',
  'מארזי-מתנה': 'מארזים',
  'יודאיקה-ומתנות': 'יודאיקה',
  'יודאיקה-לבית': 'יודאיקה',
};

const DEFAULT_CATEGORY = 'ספרי קודש וברכונים';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── עזר ───────────────────────────────────────────────────────────────────────

/** מנקה שם מוצר משאריות מחיר, טווחי מחיר, דירוג ותגית "חדש!" */
function cleanName(raw) {
  if (!raw) return '';
  return raw
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/חדש!\s*/g, '')
    .replace(/דורג\s*[\d.]+\s*מתוך\s*\d+/gi, '')
    .replace(/המחיר\s*(המקורי|הנוכחי)[\s\S]*$/i, '')
    .replace(/טווח מחירים[\s\S]*$/i, '')
    // טווח מחירים: "48.00 ₪ – 60.00 ₪"
    .replace(/\s*[\d.,]+\s*₪\s*[–-]\s*[\d.,]+\s*₪\s*$/, '')
    // מחיר בודד בסוף
    .replace(/\s*[\d.,]+\s*₪\s*$/, '')
    .trim();
}

/** מחלץ קטגוריה + תת-קטגוריה מנתיב ה-URL של הספק */
function categoryFromUrl(url) {
  const segs = decodeURIComponent(url)
    .replace(/^https?:\/\/[^/]+/, '')
    .split('/')
    .filter(Boolean);

  // /products-catalog/<ראשית>/<תת>/<slug>/
  if (segs[0] !== 'products-catalog' || segs.length < 3) {
    return { cat: DEFAULT_CATEGORY, subCategory: 'ייבוא סימחונים', path: segs.join(' / ') };
  }

  const mainRaw = segs[1];
  const subRaw = segs.length >= 4 ? segs[2] : null;

  // "חדש-בשמחונים" הוא תגית שיווקית, לא קטגוריה — קח את הרמה הבאה
  const effectiveMain = mainRaw === 'חדש-בשמחונים' && subRaw ? subRaw : mainRaw;

  return {
    cat: CATEGORY_MAP[effectiveMain] ?? DEFAULT_CATEGORY,
    subCategory: (subRaw ?? mainRaw).replace(/-/g, ' '),
    path: segs.slice(1, -1).map(s => s.replace(/-/g, ' ')).join(' / '),
  };
}

const hasHebrew = s => /[֐-׿]/.test(s || '');

/**
 * האתר של הספק מציג כל סקציית אופציות פעמיים — עברית ואנגלית.
 * הכותרת זהה בשתי הגרסאות (למשל "הטבעת הקדשה") ורק המחיר מתורגם,
 * לכן הסינון בודק גם את הכותרת וגם את שורת המחיר, ואז מסיר כפילות.
 */
function hebrewOptionsOnly(options) {
  const seen = new Set();
  return (options || [])
    .filter(o => hasHebrew(o.label) && hasHebrew(o.priceNote ?? o.label))
    .filter(o => {
      if (seen.has(o.label)) return false;
      seen.add(o.label);
      return true;
    });
}

/**
 * מקודד נתיב URL עם תווים עבריים.
 * ב-Firestore נשמרו URLים מפוענחים, ו-Page.navigate דורש URL תקני.
 */
function encodeUrl(raw) {
  try {
    const u = new URL(raw);
    u.pathname = u.pathname
      .split('/')
      .map(seg => encodeURIComponent(decodeURIComponent(seg)))
      .join('/');
    return u.toString();
  } catch {
    return raw;
  }
}

async function confirm(msg) {
  if (process.argv.includes('--yes')) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question(msg + ' (y/n) ', a => { rl.close(); res(a.toLowerCase() === 'y'); }));
}

// ── חילוץ מעמוד מוצר ──────────────────────────────────────────────────────────

async function scrapeProductPage(page, url) {
  await page.goto(encodeUrl(url), { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  // TM EPO נבנה ב-JS; נחכה לו אם קיים
  await page.waitForSelector('.tm-extra-product-options, h1', { timeout: 8000 }).catch(() => null);

  return page.evaluate(() => {
    const txt = el => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    const out = {};

    out.title = txt(document.querySelector('h1.product_title, h1'));

    // מק"ט: "מק"ט: 2914"
    const skuTxt = txt(document.querySelector('.sku_wrapper, .sku, [class*="sku"]')) || '';
    out.sku = (skuTxt.match(/(\d{3,})/) || [])[1] || null;

    // מחיר ליחידה
    const priceTxt = txt(document.querySelector('.summary .price, .price, [class*="unit-price"]')) || '';
    const nums = [...priceTxt.matchAll(/([\d]+(?:[.,]\d+)?)\s*₪/g)].map(m => parseFloat(m[1].replace(',', '.')));
    out.priceRaw = priceTxt;
    out.price = nums.length ? Math.min(...nums) : null;      // המחיר הנמוך = מחיר ליחידה/מבצע
    out.priceMax = nums.length > 1 ? Math.max(...nums) : null;

    // תיאורים
    out.shortDesc = txt(document.querySelector('.woocommerce-product-details__short-description'));
    out.fullDesc = txt(document.querySelector('#tab-description, .woocommerce-Tabs-panel--description'));

    // מידות — מופיעות ליד התיאור, עם גרשיים עבריים (ס״מ)
    const bodyTxt = document.body.innerText || '';
    const len = bodyTxt.match(/אורך[:\s]*([\d.]+)/);
    const wid = bodyTxt.match(/רוחב[:\s]*([\d.]+)/);
    out.dimensions = {
      length: len ? parseFloat(len[1]) : null,
      width: wid ? parseFloat(wid[1]) : null,
    };

    // מלאי — בדיקה ממוקדת, לא סריקת כל העמוד
    const stockEl = document.querySelector('p.stock, .summary .stock');
    out.stockText = txt(stockEl);
    out.inStock = out.stockText ? /במלאי|in stock/i.test(out.stockText) : null;

    // גלריית תמונות
    const imgs = new Set();
    document.querySelectorAll('.woocommerce-product-gallery img').forEach(img => {
      const src = img.getAttribute('data-large_image') || img.getAttribute('data-src') || img.src;
      if (src && !src.startsWith('data:') && /simchonim\.co\.il\/wp-content/.test(src)) {
        imgs.add(src.replace(/-\d+x\d+(\.\w+)$/, '$1')); // גרסה מלאה במקום thumbnail
      }
    });
    out.images = [...imgs];

    // ── אופציות TM EPO ──
    out.options = [];
    document.querySelectorAll('.tm-extra-product-options .cpf-section').forEach(sec => {
      const label = txt(sec.querySelector('.tc-section-label-text'));
      const priceNote = txt(sec.querySelector('.tm-section-description p'));

      const fields = [];
      sec.querySelectorAll('.cpf-element').forEach(elm => {
        const fLabel = txt(elm.querySelector('.tc-epo-element-label-text'));
        const desc = txt(elm.querySelector('.tm-element-description p'));

        const ul = elm.querySelector('ul.tmcp-elements');
        if (!ul) {
          // בלוק טקסט הסברי בלבד
          if (fLabel) fields.push({ label: fLabel, type: 'note' });
          return;
        }

        const type =
          [...ul.classList].find(c => c.startsWith('tm-extra-product-options-'))
            ?.replace('tm-extra-product-options-', '') || 'unknown';

        const choices = [...ul.querySelectorAll('.tmcp-field-wrap')]
          .map(w => txt(w.querySelector('.tc-label, label')) || w.querySelector('input')?.value)
          .filter(Boolean);

        fields.push({
          label: fLabel,
          description: desc,
          type,
          required: /\*|required/i.test(fLabel || ''),
          choices: choices.length ? choices : undefined,
        });
      });

      // סקציה בלי כותרת = צ'קבוקס עצמאי (אריזת מתנה) — קח את תווית הבחירה
      const fallbackLabel = fields.find(f => f.choices?.length)?.choices?.[0] ?? null;

      out.options.push({ label: label || fallbackLabel, priceNote, fields });
    });

    return out;
  });
}

// ── ריצה מקבילה ───────────────────────────────────────────────────────────────

async function runPool(browser, items, worker) {
  const results = [];
  let idx = 0;
  let done = 0;

  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    // חסימת משאבים כבדים — מקצר את זמן הטעינה משמעותית
    await page.setRequestInterception(true);
    page.on('request', r => {
      const t = r.resourceType();
      if (t === 'image' || t === 'font' || t === 'media') r.abort();
      else r.continue();
    });

    while (idx < items.length) {
      const i = idx++;
      const item = items[i];
      // ניסיון חוזר: השרת של הספק נוטה ל-timeout בעומס
      let lastErr = null;
      for (let attempt = 1; attempt <= RETRIES; attempt++) {
        try {
          results[i] = { ok: true, item, data: await worker(page, item.url) };
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          if (attempt < RETRIES) await sleep(1500 * attempt);
        }
      }
      if (lastErr) results[i] = { ok: false, item, error: lastErr.message };
      done++;
      if (done % 10 === 0 || done === items.length) {
        console.log(`   ${done}/${items.length}`);
      }
    }
    await page.close();
  });

  await Promise.all(runners);
  return results;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const isDry = process.argv.includes('--dry-run');
  const limArg = process.argv.indexOf('--limit');
  const limit = limArg > -1 ? parseInt(process.argv[limArg + 1], 10) : null;

  console.log('\n📥 שולף מוצרי simchonim מ-Firestore...');
  const snap = await db.collection('products').where('supplier', '==', 'simchonim').get();

  const onlyMissing = process.argv.includes('--only-missing');

  let items = snap.docs
    .map(d => ({
      id: d.id,
      url: d.data().supplier_url,
      oldName: d.data().name,
      enriched: !!d.data().supplier_enriched_at,
    }))
    .filter(x => x.url);

  if (onlyMissing) items = items.filter(x => !x.enriched);
  if (limit) items = items.slice(0, limit);

  console.log(`   ${items.length} מוצרים לעיבוד (מתוך ${snap.size})`);
  console.log(`   מקביליות ${CONCURRENCY} · timeout ${NAV_TIMEOUT / 1000}s · ${RETRIES} ניסיונות\n`);

  if (items.length === 0) return;

  const browser = await puppeteer.launch({ headless: 'new' });
  console.log('🌐 גורד עמודי מוצר...');
  const results = await runPool(browser, items, scrapeProductPage);
  await browser.close();

  const ok = results.filter(r => r?.ok);
  const failed = results.filter(r => r && !r.ok);

  console.log(`\n✓ ${ok.length} הצליחו | ✗ ${failed.length} נכשלו\n`);

  // ── דוגמה ──
  const sample = ok[0]?.data;
  if (sample) {
    const c = categoryFromUrl(ok[0].item.url);
    console.log('─'.repeat(64));
    console.log('דוגמה:', cleanName(sample.title));
    console.log(`  מק"ט ספק: ${sample.sku}`);
    console.log(`  מחיר ספק: ₪${sample.price} → אצלנו: ₪${sample.price ? (Math.round(sample.price * PRICE_MARKUP * 100) / 100) : '-'}`);
    console.log(`  קטגוריה: ${c.cat} / ${c.subCategory}   (${c.path})`);
    console.log(`  מלאי: ${sample.stockText || '-'}`);
    console.log(`  מידות: ${sample.dimensions.length}×${sample.dimensions.width} ס"מ`);
    console.log(`  תמונות: ${sample.images.length}`);
    sample.images.forEach(i => console.log(`     ${i}`));
    console.log(`  תיאור: ${(sample.shortDesc || '').slice(0, 120)}`);
    const previewOptions = hebrewOptionsOnly(sample.options);
    console.log(`  אופציות שיישמרו (${previewOptions.length} מתוך ${sample.options.length} בעמוד):`);
    previewOptions.forEach(o => {
      console.log(`     ▸ ${o.label} — ${o.priceNote || ''}`);
      o.fields.filter(f => f.type !== 'note').forEach(f =>
        console.log(`         · ${f.label} [${f.type}]${f.choices ? ` (${f.choices.length} אפשרויות)` : ''}`)
      );
    });
    console.log('─'.repeat(64));
  }

  if (failed.length) {
    console.log('\n⚠️  כשלונות:');
    failed.slice(0, 10).forEach(f => console.log(`   ${f.item.oldName}: ${f.error}`));
  }

  // שמירת לוג
  const logPath = resolve(__dirname, `../../scripts/simchonim-enrich-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(logPath, JSON.stringify(results.map(r => r && ({
    id: r.item.id, url: r.item.url, ok: r.ok, error: r.error, data: r.data,
  })), null, 2), 'utf8');
  console.log(`\n📄 לוג: ${logPath}`);

  if (isDry) { console.log('\n✅ dry-run — לא נכתב ל-Firestore'); return; }
  if (!(await confirm(`\n💾 לכתוב ${ok.length} מוצרים ל-Firestore?`))) {
    console.log('❌ בוטל'); return;
  }

  // ── כתיבה ──
  let written = 0;
  for (let i = 0; i < ok.length; i += 400) {
    const batch = db.batch();
    for (const r of ok.slice(i, i + 400)) {
      const d = r.data;
      const c = categoryFromUrl(r.item.url);

      const heOptions = hebrewOptionsOnly(d.options);

      const update = {
        name: cleanName(d.title) || r.item.oldName,
        cat: c.cat,
        subCategory: c.subCategory,
        supplier_category_path: c.path,
        supplier_sku: d.sku || null,
        description: d.shortDesc || null,
        descriptionLong: d.fullDesc || null,
        supplier_options: JSON.stringify(heOptions),
        supplier_enriched_at: new Date(),
      };

      if (d.price) {
        update.price = Math.round(d.price * PRICE_MARKUP * 100) / 100;
        update.original_price = d.price;
      }
      if (d.dimensions?.length) update.lengthCm = d.dimensions.length;
      if (d.dimensions?.width) update.widthCm = d.dimensions.width;
      if (d.inStock !== null) update.outOfStock = d.inStock === false;
      if (d.images?.length) {
        update.imgUrl = d.images[0];
        if (d.images[1]) update.imgUrl2 = d.images[1];
        if (d.images[2]) update.imgUrl3 = d.images[2];
      }

      // אל תשלח undefined ל-Firestore
      Object.keys(update).forEach(k => update[k] === undefined && delete update[k]);

      batch.set(db.collection('products').doc(r.item.id), update, { merge: true });
      written++;
    }
    await batch.commit();
    console.log(`   נכתבו ${written}/${ok.length}`);
  }

  console.log(`\n✅ הושלם — ${written} מוצרים עודכנו`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
