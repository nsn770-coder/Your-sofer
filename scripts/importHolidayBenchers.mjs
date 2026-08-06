/**
 * importHolidayBenchers.mjs
 *
 * ייבוא ברכונים ומארזים לפי חגים משני ספקים: סידורניים (mysiddurname.co.il)
 * ושמחונים (simchonim.co.il).
 *
 * איך זה עובד:
 *   1. שולף את רשימת הקטגוריות של כל ספק מה-WooCommerce Store API
 *   2. בוחר אוטומטית קטגוריות של ברכונים/מארזים/זמירות לחגים:
 *        ראש השנה / חנוכה / פורים / פסח / סוכות / שבועות
 *      (הגדות פסח מדולגות — קיימת כבר תת-קטגוריה ייעודית באתר)
 *   3. שולף את כל המוצרים בכל קטגוריה, מדלג על מוצרים שאזלו
 *   4. מייבא ל-Firestore: cat "ספרי קודש וברכונים", subCategory לפי החג,
 *      מחיר כמו אצל הספק (מינימום ₪5), תמונות ל-Cloudinary
 *   5. מוצרי שמחונים מקבלים את התוספות הקבועות (הטבעות/אריזה) + נוסח/צבע
 *   6. דילוג אוטומטי על SKU שכבר קיים (כולל מוצרים שיובאו בעבר לעמוד האירועים)
 *
 * Usage:
 *   node scripts/importHolidayBenchers.mjs                       ← DRY-RUN מלא
 *   node scripts/importHolidayBenchers.mjs --supplier=mysiddurname
 *   node scripts/importHolidayBenchers.mjs --holiday=ראש השנה
 *   node scripts/importHolidayBenchers.mjs --execute             ← ייבוא בפועל
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const EXECUTE       = process.argv.includes('--execute');
const supplierArg   = process.argv.find((a) => a.startsWith('--supplier='))?.split('=')[1] ?? null;
const holidayArg    = process.argv.find((a) => a.startsWith('--holiday='))?.split('=')[1] ?? null;

const CATEGORY_NAME = 'ספרי קודש וברכונים';
const HOLIDAYS      = ['ראש השנה', 'חנוכה', 'פורים', 'פסח', 'סוכות', 'שבועות'];
// קטגוריות ספק רלוונטיות: ברכונים / מארזים / זמירות של חג. הגדות — מדולג.
// 'ברכ' ולא 'ברכון' — ב"ברכונים" יש נ' רגילה ולא ן' סופית, ו-'ברכון' לא היה נתפס
const TYPE_RE       = /(ברכ|מארז|זמיר)/;
const EXCLUDE_RE    = /(הגד|מגיל|בית מגילה|בעיצוב אישי)/;

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';
const UPLOAD_PRESET  = 'yoursofer_upload';
const DELAY_MS       = 500;
const MAX_IMAGES     = 3;
const MIN_PRICE      = 5;
const UA             = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const SIMCHONIM_ADDONS = [
  { id: 'dedication',   label: 'הטבעת הקדשה',              price: 140, pricing: 'flat',    minQty: 30, requiresText: true },
  { id: 'name-imprint', label: 'הטבעת שם',                 price: 14,  pricing: 'perUnit', requiresText: true },
  { id: 'giftwrap',     label: 'אריזת מתנה (צלופן + סרט)', price: 4.4, pricing: 'perUnit' },
];

const SUPPLIERS = [
  { key: 'mysiddurname', base: 'https://mysiddurname.co.il', source: 'mysiddurname', skuPrefix: 'MSN', addons: null,             scrapeVariations: false },
  { key: 'simchonim',    base: 'https://simchonim.co.il',    source: 'simchonim',    skuPrefix: 'SIM', addons: SIMCHONIM_ADDONS, scrapeVariations: true },
];

// ── Firebase Admin ────────────────────────────────────────────────────────────
const sa = JSON.parse(
  readFileSync(resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8')
);
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep  = (ms) => new Promise((r) => setTimeout(r, ms));
const round2 = (n) => Math.round(n * 100) / 100;

function stripHtml(html) {
  return (html || '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&quot;|&#8220;|&#8221;/g, '"').replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8211;|&ndash;/g, '–').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function decodeHtmlAttr(s) {
  return s.replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.json();
}

/** קטגוריות הספק → קטגוריות חג רלוונטיות עם מיפוי ל-subCategory */
async function discoverHolidayCategories(sup) {
  const cats = [];
  for (let page = 1; page <= 3; page++) {
    const batch = await getJson(`${sup.base}/wp-json/wc/store/v1/products/categories?per_page=100&page=${page}`);
    cats.push(...batch);
    if (batch.length < 100) break;
    await sleep(300);
  }
  const matched = [];
  for (const c of cats) {
    const name = (c.name || '').replace(/&amp;/g, '&');
    if (EXCLUDE_RE.test(name)) continue;
    if (!TYPE_RE.test(name)) continue;
    const holiday = HOLIDAYS.find((h) => name.includes(h));
    if (!holiday) continue;
    if (holidayArg && holiday !== holidayArg) continue;
    matched.push({ id: c.id, name, holiday, count: c.count });
  }
  return matched;
}

/** כל המוצרים בקטגוריית ספק (עם עימוד) */
async function fetchCategoryProducts(sup, catId) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await getJson(`${sup.base}/wp-json/wc/store/v1/products?category=${catId}&per_page=50&page=${page}`);
    out.push(...batch);
    if (batch.length < 50) break;
    await sleep(400);
  }
  return out;
}

/** שמחונים: וריאציות מדף המוצר (נוסח/צבע + תוספות מחיר) */
async function scrapeVariations(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'he' } });
    if (!res.ok) return null;
    const html = await res.text();
    const vm = html.match(/data-product_variations="([^"]*)"/);
    if (!vm || !vm[1] || vm[1] === 'false') return null;
    return JSON.parse(decodeHtmlAttr(vm[1]));
  } catch { return null; }
}

function buildVariantOptions(p, variations) {
  const attrs = (p.attributes || []).filter((a) => a.has_variations && (a.terms || []).length > 0);
  if (attrs.length === 0) return { variantOptions: [], basePrice: null };
  if (!Array.isArray(variations) || variations.length === 0) {
    return { variantOptions: attrs.map((a) => ({ name: a.name, values: a.terms.map((t) => t.name) })), basePrice: null };
  }
  const usable = variations.filter((v) => v.is_in_stock !== false);
  const pool = usable.length > 0 ? usable : variations;
  const prices = pool.map((v) => Number(v.display_price)).filter((n) => !isNaN(n));
  const basePrice = prices.length ? Math.min(...prices) : null;
  const variantOptions = [];
  for (const a of attrs) {
    const attrKey = `attribute_${a.taxonomy || `pa_${a.name}`}`;
    const values = []; const surcharges = {};
    for (const term of a.terms) {
      const matching = pool.filter((v) => {
        const val = v.attributes?.[attrKey];
        if (val === undefined) return true;
        const dec = decodeURIComponent(String(val));
        return dec === term.slug || dec === decodeURIComponent(term.slug) || dec === '';
      });
      if (matching.length === 0) continue;
      values.push(term.name);
      const termMin = Math.min(...matching.map((v) => Number(v.display_price)).filter((n) => !isNaN(n)));
      const extra = round2(termMin - basePrice);
      if (extra > 0) surcharges[term.name] = extra;
    }
    if (values.length > 0) variantOptions.push({ name: a.name, values, ...(Object.keys(surcharges).length ? { surcharges } : {}) });
  }
  return { variantOptions, basePrice };
}

async function uploadToCloudinary(imageUrl) {
  const form = new FormData();
  form.append('file', imageUrl);
  form.append('upload_preset', UPLOAD_PRESET);
  const res  = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message ?? 'Cloudinary upload failed');
  return data.secure_url;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 importHolidayBenchers ${EXECUTE ? '— EXECUTE' : '— DRY-RUN (ללא כתיבה)'}\n`);

  const suppliers = SUPPLIERS.filter((s) => !supplierArg || s.key === supplierArg);
  const rows = [];
  const errors = [];
  let skippedOOS = 0;

  for (const sup of suppliers) {
    console.log(`\n════ ${sup.key} ════`);

    // SKUs קיימים של הספק (מכל הייבואים הקודמים)
    const existingSnap = await db.collection('products').where('source', '==', sup.source).get();
    const existingSkus = new Set();
    existingSnap.forEach((d) => { const s = d.data().sku; if (s) existingSkus.add(s); });
    console.log(`🗃️  ${existingSkus.size} מוצרי ${sup.source} כבר קיימים ב-Firestore`);

    let cats;
    try {
      cats = await discoverHolidayCategories(sup);
    } catch (e) {
      console.log(`❌ שליפת קטגוריות נכשלה: ${e.message}`);
      errors.push({ supplier: sup.key, error: e.message });
      continue;
    }
    if (cats.length === 0) { console.log('— לא נמצאו קטגוריות חג רלוונטיות'); continue; }
    console.log('📂 קטגוריות שזוהו:');
    for (const c of cats) console.log(`   • ${c.name} (${c.count} מוצרים) → תת-קטגוריה "${c.holiday}"`);

    for (const c of cats) {
      let products;
      try { products = await fetchCategoryProducts(sup, c.id); }
      catch (e) { errors.push({ supplier: sup.key, cat: c.name, error: e.message }); continue; }

      for (const p of products) {
        if (p.is_in_stock === false) { skippedOOS++; continue; }
        const sku = `${sup.skuPrefix}-${p.sku || p.id}`;
        if (existingSkus.has(sku)) continue;
        existingSkus.add(sku); // מוצר יכול להופיע בכמה קטגוריות — פעם אחת בלבד

        const minor = p.prices?.currency_minor_unit ?? 2;
        const apiPrice = parseInt(p.prices?.price ?? '0', 10) / 10 ** minor;

        let variantOptions = [];
        let basePrice = null;
        if (sup.scrapeVariations && p.type === 'variable') {
          const variations = await scrapeVariations(p.permalink);
          ({ variantOptions, basePrice } = buildVariantOptions(p, variations));
          await sleep(DELAY_MS);
        }

        let price = basePrice ?? apiPrice;
        const priceRaised = price < MIN_PRICE;
        if (priceRaised) price = MIN_PRICE;

        rows.push({
          supplier: sup, sku, holiday: c.holiday, supplierCat: c.name,
          supplierId: p.id,
          name: stripHtml(p.name),
          desc: stripHtml(p.description || p.short_description || ''),
          price, priceRaised, supplierPrice: basePrice ?? apiPrice,
          images: (p.images || []).map((im) => im.src).filter(Boolean).slice(0, MAX_IMAGES),
          minOrderQty: p.add_to_cart?.minimum ?? 1,
          variantOptions,
          sourceUrl: (p.permalink || '').split('?')[0],
        });
      }
      await sleep(DELAY_MS);
    }
  }

  // ── סיכום ──────────────────────────────────────────────────────────────────
  console.log(`\n📋 סה"כ לייבוא: ${rows.length} | אזל מהמלאי: ${skippedOOS} | שגיאות: ${errors.length}\n`);
  const byHoliday = {};
  for (const r of rows) byHoliday[r.holiday] = (byHoliday[r.holiday] ?? 0) + 1;
  for (const [h, n] of Object.entries(byHoliday)) console.log(`   • ${h}: ${n} מוצרים`);

  const date = new Date().toISOString().slice(0, 10);

  if (!EXECUTE) {
    const csvPath = resolve(__dirname, `holiday-benchers-candidates-${date}.csv`);
    const csv = '﻿' + [
      'supplier,holiday,sku,name,price,supplierPrice,variants,images,url',
      ...rows.map((r) => [
        r.supplier.key, r.holiday, r.sku, `"${r.name.replace(/"/g, '""')}"`, r.price, r.supplierPrice,
        r.variantOptions.length, r.images.length, r.sourceUrl,
      ].join(',')),
    ].join('\n');
    writeFileSync(csvPath, csv, 'utf8');
    console.log(`\n📄 CSV מועמדים: ${csvPath}`);
    console.log('▶️  לביצוע: node scripts/importHolidayBenchers.mjs --execute\n');
    process.exit(0);
  }

  // ── EXECUTE ──────────────────────────────────────────────────────────────────
  const log = [];
  let ok = 0, failed = 0;
  for (const [i, r] of rows.entries()) {
    process.stdout.write(`${String(i + 1).padStart(3)}/${rows.length} [${r.holiday}] ${r.name.slice(0, 40)} ... `);
    try {
      const cloudUrls = [];
      for (const src of r.images) {
        try { cloudUrls.push(await uploadToCloudinary(src)); }
        catch { cloudUrls.push(src); }
      }
      const docData = {
        name:              r.name,
        desc:              r.desc,
        price:             r.price,
        was:               null,
        supplierCost:      r.supplierPrice,
        imgUrl:            cloudUrls[0] ?? '',
        images:            cloudUrls,
        sku:               r.sku,
        cat:               CATEGORY_NAME,
        category:          CATEGORY_NAME,
        subCategory:       r.holiday,
        priority:          50,
        isBestSeller:      false,
        badge:             null,
        status:            'active',
        ...(r.supplier.addons ? { addons: r.supplier.addons } : {}),
        ...(r.variantOptions.length ? { variantOptions: r.variantOptions } : {}),
        minOrderQty:       r.minOrderQty,
        source:            r.supplier.source,
        sourceUrl:         r.sourceUrl,
        supplierProductId: r.supplierId,
        createdAt:         FieldValue.serverTimestamp(),
      };
      if (cloudUrls[1]) docData.imgUrl2 = cloudUrls[1];
      if (cloudUrls[2]) docData.imgUrl3 = cloudUrls[2];

      const ref = await db.collection('products').add(docData);
      ok++;
      log.push({ id: ref.id, sku: r.sku, holiday: r.holiday, name: r.name, price: r.price });
      console.log(`✅`);
    } catch (e) {
      failed++;
      log.push({ sku: r.sku, name: r.name, error: e.message });
      console.log(`❌ ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  const logPath = resolve(__dirname, `holiday-benchers-import-log-${date}.json`);
  writeFileSync(logPath, JSON.stringify({ date, ok, failed, skippedOOS, errors, log }, null, 2), 'utf8');
  console.log(`\n✅ יובאו: ${ok} | ❌ נכשלו: ${failed}`);
  console.log(`🪵 לוג: ${logPath}`);
  console.log('\n▶️  סנכרון חיפוש: אדמין → הגדרות אתר → "🔄 סנכרן חיפוש (Algolia)"');
  console.log('▶️  בדיקה: קטגוריית ספרי קודש וברכונים → שבבי ראש השנה / חנוכה / פורים / פסח\n');
  process.exit(0);
}

main().catch((err) => { console.error('\n❌ Fatal:', err); process.exit(1); });
