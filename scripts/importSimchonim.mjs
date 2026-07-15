/**
 * importSimchonim.mjs
 *
 * ייבוא מוצרים מ-simchonim.co.il (שמחונים) לפי רשימת קישורים.
 * מקור הקישורים: scripts/simchonim-urls.txt (שורה לכל מוצר, # = הערה)
 *
 * לכל קישור:
 *   1. שולף את דף המוצר, מחלץ product ID + נתוני וריאציות (data-product_variations)
 *   2. שולף נתונים מה-WooCommerce Store API (שם, תיאור, מחיר, תמונות, מלאי)
 *   3. מדלג על מוצרים שאינם במלאי ("המלאי אזל")
 *   4. בונה variantOptions (נוסח / צבע) כולל תוספות מחיר לערכים יקרים יותר
 *   5. מוסיף לכל מוצר את תוספות שמחונים הקבועות:
 *        הטבעת הקדשה ₪140 חד־פעמי (מ-30 יח'), הטבעת שם ₪14 ליחידה,
 *        אריזת מתנה ₪4.40 ליחידה
 *   6. מחיר מינימום ₪5 (מוצר זול יותר מועלה ל-5)
 *   7. מעלה עד 3 תמונות ל-Cloudinary ויוצר מוצר ב-Firestore:
 *        cat/category: "מזכרות לאירועים", isEventProduct: true, sku: SIM-<מק"ט>
 *
 * Usage:
 *   node scripts/importSimchonim.mjs             ← DRY-RUN (ברירת מחדל, כותב CSV)
 *   node scripts/importSimchonim.mjs --execute   ← ייבוא בפועל
 *
 * אחרי --execute: סנכרון אלגוליה מהאדמין (הגדרות אתר → סנכרן חיפוש).
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const EXECUTE        = process.argv.includes('--execute');
const CATEGORY_NAME  = 'מזכרות לאירועים';
const PARENT_CAT     = 'מתנות';
const SOURCE         = 'simchonim';
const BASE           = 'https://simchonim.co.il';
const URLS_FILE      = resolve(__dirname, 'simchonim-urls.txt');
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';
const UPLOAD_PRESET  = 'yoursofer_upload';
const DELAY_MS       = 600;
const MAX_IMAGES     = 3;
const MIN_PRICE      = 5;    // מוצר זול מזה מועלה ל-₪5
const UA             = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// תוספות קבועות לכל מוצרי שמחונים — כמו באתר הספק
const SIMCHONIM_ADDONS = [
  { id: 'dedication',   label: 'הטבעת הקדשה',                price: 140,  pricing: 'flat',    minQty: 30, requiresText: true },
  { id: 'name-imprint', label: 'הטבעת שם',                   price: 14,   pricing: 'perUnit', requiresText: true },
  { id: 'giftwrap',     label: 'אריזת מתנה (צלופן + סרט)',   price: 4.4,  pricing: 'perUnit' },
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
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;|&#8220;|&#8221;/g, '"')
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeHtmlAttr(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'he' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.text();
}

/** דף מוצר → { productId, variationsJson } */
async function scrapeProductPage(url) {
  const html = await fetchText(url);
  // סדר עדיפות: טופס ההוספה לסל של המוצר עצמו (data-product_id / add-to-cart),
  // ורק כמוצא אחרון postid (עלול לתפוס אלמנט גלובלי בעמוד)
  let m = html.match(/class="[^"]*variations_form[^"]*"[^>]*data-product_id=["'](\d+)["']/)
       || html.match(/data-product_id=["'](\d+)["'][^>]*data-product_variations/)
       || html.match(/name=["']add-to-cart["'][^>]*value=["'](\d+)["']/)
       || html.match(/value=["'](\d+)["'][^>]*name=["']add-to-cart["']/)
       || html.match(/data-product_id=["'](\d+)["']/)
       || html.match(/postid-(\d+)/);
  if (!m) throw new Error('לא נמצא product ID בדף');
  const productId = m[1];

  // וריאציות (מחיר/מלאי לכל שילוב) — מוטמע ב-attribute של טופס ההוספה לסל
  let variations = null;
  const vm = html.match(/data-product_variations="([^"]*)"/);
  if (vm && vm[1] && vm[1] !== 'false') {
    try { variations = JSON.parse(decodeHtmlAttr(vm[1])); } catch { variations = null; }
  }
  return { productId, variations };
}

/** Store API → נתוני מוצר */
async function getProduct(id) {
  const res = await fetch(`${BASE}/wp-json/wc/store/v1/products/${id}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Store API HTTP ${res.status} (id=${id})`);
  return res.json();
}

/**
 * בניית variantOptions מתוך attributes + וריאציות:
 *   - רק ערכים שקיימת להם וריאציה במלאי
 *   - surcharge לערך = (המחיר המינימלי עם הערך) - (המחיר הבסיסי של המוצר)
 */
function buildVariantOptions(p, variations) {
  const attrs = (p.attributes || []).filter((a) => a.has_variations && (a.terms || []).length > 0);
  if (attrs.length === 0) return { variantOptions: [], basePrice: null };

  // אין נתוני וריאציות — כל הערכים ללא תוספת מחיר
  if (!Array.isArray(variations) || variations.length === 0) {
    return {
      variantOptions: attrs.map((a) => ({ name: a.name, values: a.terms.map((t) => t.name) })),
      basePrice: null,
    };
  }

  const inStockVars = variations.filter((v) => v.is_in_stock !== false);
  const usable = inStockVars.length > 0 ? inStockVars : variations;
  const prices = usable.map((v) => Number(v.display_price)).filter((n) => !isNaN(n));
  const basePrice = prices.length ? Math.min(...prices) : null;

  const variantOptions = [];
  for (const a of attrs) {
    const attrKey = `attribute_${a.taxonomy || `pa_${a.name}`}`;
    const values = [];
    const surcharges = {};
    for (const term of a.terms) {
      // וריאציות התואמות לערך זה (או וריאציות "any" — ערך ריק)
      const matching = usable.filter((v) => {
        const val = v.attributes?.[attrKey];
        if (val === undefined) return true;
        const dec = decodeURIComponent(String(val));
        return dec === term.slug || dec === decodeURIComponent(term.slug) || dec === '';
      });
      if (matching.length === 0) continue; // אין וריאציה במלאי לערך זה — לא מציגים
      values.push(term.name);
      const termMin = Math.min(...matching.map((v) => Number(v.display_price)).filter((n) => !isNaN(n)));
      const extra = round2(termMin - basePrice);
      if (extra > 0) surcharges[term.name] = extra;
    }
    if (values.length > 0) {
      variantOptions.push({ name: a.name, values, ...(Object.keys(surcharges).length ? { surcharges } : {}) });
    }
  }
  return { variantOptions, basePrice };
}

/** העלאת תמונה ל-Cloudinary לפי URL (unsigned) */
async function uploadToCloudinary(imageUrl) {
  const form = new FormData();
  form.append('file', imageUrl);
  form.append('upload_preset', UPLOAD_PRESET);
  const res  = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message ?? 'Cloudinary upload failed');
  return data.secure_url;
}

/** קטגוריה — יצירה אם חסרה */
async function ensureCategory() {
  const snap = await db.collection('categories').get();
  let maxPriority = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if ((data.slug ?? '') === CATEGORY_NAME) {
      console.log(`📁 קטגוריה "${CATEGORY_NAME}" כבר קיימת (id=${d.id})`);
      return;
    }
    if (typeof data.priority === 'number' && data.priority > maxPriority) maxPriority = data.priority;
  }
  if (!EXECUTE) {
    console.log(`📁 קטגוריה "${CATEGORY_NAME}" לא קיימת — תיווצר ב---execute`);
    return;
  }
  await db.collection('categories').add({
    slug: CATEGORY_NAME, displayName: CATEGORY_NAME,
    priority: maxPriority + 1, parentCategory: PARENT_CAT,
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log(`📁 ✅ נוצרה קטגוריה "${CATEGORY_NAME}"`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 importSimchonim ${EXECUTE ? '— EXECUTE' : '— DRY-RUN (ללא כתיבה)'}\n`);

  const urls = [...new Set(
    readFileSync(URLS_FILE, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  )];
  console.log(`🔗 ${urls.length} קישורים ייחודיים\n`);

  const existingSnap = await db.collection('products').where('source', '==', SOURCE).get();
  const existingSkus = new Set();
  existingSnap.forEach((d) => { const s = d.data().sku; if (s) existingSkus.add(s); });
  console.log(`🗃️  ${existingSkus.size} מוצרי ${SOURCE} כבר קיימים ב-Firestore\n`);

  await ensureCategory();
  console.log('');

  const rows = [];
  const skippedOOS = [];
  const errors = [];

  for (const [i, url] of urls.entries()) {
    const label = decodeURIComponent(url).split('/').filter(Boolean).pop()?.replace(/-/g, ' ') ?? url;
    try {
      const { productId, variations } = await scrapeProductPage(url);
      const p = await getProduct(productId);

      // ── אימות: ה-slug של המוצר מה-API חייב להתאים לקישור המבוקש ─────────────
      const urlSlug = decodeURIComponent(url).split('/').filter(Boolean).pop();
      const apiSlug = decodeURIComponent(p.slug ?? '');
      if (urlSlug && apiSlug && urlSlug !== apiSlug) {
        throw new Error(`זוהה מוצר שגוי (slug לא תואם: ${apiSlug})`);
      }

      // ── מלאי: מוצר שאזל — דילוג ─────────────────────────────────────────────
      if (p.is_in_stock === false) {
        skippedOOS.push({ url, name: stripHtml(p.name) });
        console.log(`${String(i + 1).padStart(2)}. 🚫 המלאי אזל — מדלג: ${stripHtml(p.name)}`);
        await sleep(DELAY_MS);
        continue;
      }

      const { variantOptions, basePrice } = buildVariantOptions(p, variations);
      const minor = p.prices?.currency_minor_unit ?? 2;
      const apiPrice = parseInt(p.prices?.price ?? '0', 10) / 10 ** minor;
      let price = basePrice ?? apiPrice;
      const priceRaised = price < MIN_PRICE;
      if (priceRaised) price = MIN_PRICE;

      const sku = `SIM-${p.sku || p.id}`;
      const skip = existingSkus.has(sku);
      rows.push({
        supplierId: p.id, sku, skip,
        name:  stripHtml(p.name),
        desc:  stripHtml(p.description || p.short_description || ''),
        price, priceRaised,
        supplierPrice: basePrice ?? apiPrice,
        images: (p.images || []).map((im) => im.src).filter(Boolean).slice(0, MAX_IMAGES),
        minOrderQty: p.add_to_cart?.minimum ?? 1,
        variantOptions,
        sourceUrl: url,
      });
      const vDesc = variantOptions.map((o) => `${o.name}: ${o.values.length}${o.surcharges ? ' (+תוספות מחיר)' : ''}`).join(' | ');
      console.log(`${String(i + 1).padStart(2)}. ${skip ? '⏭️  קיים' : '🆕'}  [${sku}] ${stripHtml(p.name)} — ₪${price}${priceRaised ? ` (הועלה מ-₪${basePrice ?? apiPrice})` : ''}${vDesc ? ` — ${vDesc}` : ''}`);
    } catch (e) {
      errors.push({ url, error: e.message });
      console.log(`${String(i + 1).padStart(2)}. ❌ ${label} — ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  const toImport = rows.filter((r) => !r.skip);
  console.log(`\n📋 לייבוא: ${toImport.length} | קיימים: ${rows.length - toImport.length} | אזל מהמלאי: ${skippedOOS.length} | שגיאות: ${errors.length}\n`);

  const date = new Date().toISOString().slice(0, 10);

  if (!EXECUTE) {
    const csvPath = resolve(__dirname, `simchonim-candidates-${date}.csv`);
    const csv = '﻿' + [
      'sku,name,price,supplierPrice,variants,images,desc,url',
      ...toImport.map((r) => [
        r.sku, `"${r.name.replace(/"/g, '""')}"`, r.price, r.supplierPrice,
        `"${r.variantOptions.map((o) => `${o.name}: ${o.values.join('/')}${o.surcharges ? ' ' + JSON.stringify(o.surcharges).replace(/"/g, "'") : ''}`).join(' | ')}"`,
        r.images.length,
        `"${r.desc.replace(/"/g, '""').replace(/\n/g, ' | ')}"`, r.sourceUrl,
      ].join(',')),
    ].join('\n');
    writeFileSync(csvPath, csv, 'utf8');
    console.log(`📄 CSV מועמדים: ${csvPath}`);
    console.log('▶️  לביצוע: node scripts/importSimchonim.mjs --execute\n');
    process.exit(0);
  }

  // ── EXECUTE ──────────────────────────────────────────────────────────────────
  const log = [];
  let ok = 0, failed = 0;
  for (const [i, r] of toImport.entries()) {
    process.stdout.write(`${String(i + 1).padStart(2)}/${toImport.length} ${r.name} ... `);
    try {
      const cloudUrls = [];
      for (const src of r.images) {
        try { cloudUrls.push(await uploadToCloudinary(src)); }
        catch (e) { console.log(`\n   ⚠️ תמונה נכשלה (${e.message.slice(0, 50)}) — שומר URL מקורי`); cloudUrls.push(src); }
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
        subCategory:       '',
        priority:          50,
        isBestSeller:      false,
        badge:             null,
        status:            'active',
        isEventProduct:    true,
        addons:            SIMCHONIM_ADDONS,
        ...(r.variantOptions.length ? { variantOptions: r.variantOptions } : {}),
        minOrderQty:       r.minOrderQty,
        source:            SOURCE,
        sourceUrl:         r.sourceUrl,
        supplierProductId: r.supplierId,
        createdAt:         FieldValue.serverTimestamp(),
      };
      if (cloudUrls[1]) docData.imgUrl2 = cloudUrls[1];
      if (cloudUrls[2]) docData.imgUrl3 = cloudUrls[2];

      const ref = await db.collection('products').add(docData);
      ok++;
      log.push({ id: ref.id, sku: r.sku, name: r.name, price: r.price, variants: r.variantOptions.length, images: cloudUrls.length });
      console.log(`✅ (${ref.id})`);
    } catch (e) {
      failed++;
      log.push({ sku: r.sku, name: r.name, error: e.message });
      console.log(`❌ ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  const logPath = resolve(__dirname, `simchonim-import-log-${date}.json`);
  writeFileSync(logPath, JSON.stringify({ date, ok, failed, skippedOOS, errors, log }, null, 2), 'utf8');

  console.log(`\n✅ יובאו: ${ok} | ❌ נכשלו: ${failed} | 🚫 אזל מהמלאי: ${skippedOOS.length}`);
  console.log(`🪵 לוג: ${logPath}`);
  console.log('\n▶️  סנכרון חיפוש: אדמין → הגדרות אתר → "🔄 סנכרן חיפוש (Algolia)"');
  console.log('▶️  בדיקה: https://your-sofer.com/event-kippot\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Fatal:', err);
  process.exit(1);
});
