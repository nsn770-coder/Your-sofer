/**
 * importMySiddurName.mjs
 *
 * ייבוא מוצרים מ-mysiddurname.co.il (סידורניים) לפי רשימת קישורים.
 *
 * מקור הקישורים: scripts/mysiddurname-urls.txt (שורה לכל מוצר, # = הערה)
 *
 * לכל קישור:
 *   1. שולף את דף המוצר ומחלץ את ה-product ID (postid / shortlink)
 *   2. שולף נתונים מלאים מה-WooCommerce Store API (שם, תיאור, מחיר, תמונות)
 *   3. מעלה עד 3 תמונות ל-Cloudinary (unsigned preset)
 *   4. יוצר מסמך ב-Firestore products עם:
 *        cat/category: "מזכרות לאירועים", isEventProduct: true, status: active
 *        sku: MSN-<id>, מחיר כפי שהוא באתר הספק
 *
 * בנוסף: יוצר את הקטגוריה "מזכרות לאירועים" ב-categories אם אינה קיימת.
 * דילוג אוטומטי על מוצרים שכבר קיימים (לפי sku).
 *
 * Usage:
 *   node scripts/importMySiddurName.mjs             ← DRY-RUN (ברירת מחדל, כותב CSV)
 *   node scripts/importMySiddurName.mjs --execute   ← ייבוא בפועל
 *
 * דגלים:
 *   --urls=<file>          ← קובץ קישורים אחר בתיקיית scripts (ברירת מחדל: mysiddurname-urls.txt)
 *   --section=<id>         ← שיוך לסקרול בעמוד האירועים (למשל headcovers / birkonim / havdalah)
 *
 * דוגמה — כיסויי ראש:
 *   node scripts/importMySiddurName.mjs --urls=mysiddurname-headcovers-urls.txt --section=headcovers --execute
 *
 * אחרי --execute מומלץ להריץ: node scripts/syncAlgolia.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const EXECUTE        = process.argv.includes('--execute');
const urlsArg        = process.argv.find((a) => a.startsWith('--urls='));
const sectionArg     = process.argv.find((a) => a.startsWith('--section='));
const SCROLL_SECTION = sectionArg ? sectionArg.split('=')[1] : null;
const CATEGORY_NAME  = 'מזכרות לאירועים';
const PARENT_CAT     = 'מתנות';
const SOURCE         = 'mysiddurname';
const BASE           = 'https://mysiddurname.co.il';
const URLS_FILE      = resolve(__dirname, urlsArg ? urlsArg.split('=')[1] : 'mysiddurname-urls.txt');
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';
const UPLOAD_PRESET  = 'yoursofer_upload';
const DELAY_MS       = 600;
const MAX_IMAGES     = 3;
const UA             = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// ── Firebase Admin ────────────────────────────────────────────────────────────
const sa = JSON.parse(
  readFileSync(resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8')
);
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'he' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.text();
}

/** דף מוצר → product ID */
async function getProductId(url) {
  const html = await fetchText(url);
  let m = html.match(/postid-(\d+)/);
  if (m) return m[1];
  m = html.match(/rel=["']shortlink["'][^>]*\?p=(\d+)/) || html.match(/\?p=(\d+)['"][^>]*rel=["']shortlink/);
  if (m) return m[1];
  m = html.match(/["']product_id["']\s*:\s*["']?(\d+)/);
  if (m) return m[1];
  throw new Error('לא נמצא product ID בדף');
}

/** Store API → נתוני מוצר */
async function getProduct(id) {
  const res = await fetch(`${BASE}/wp-json/wc/store/v1/products/${id}`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`Store API HTTP ${res.status} (id=${id})`);
  const p = await res.json();
  const minor = p.prices?.currency_minor_unit ?? 2;
  return {
    supplierId: p.id,
    name:       stripHtml(p.name),
    desc:       stripHtml(p.description || p.short_description || ''),
    price:      parseInt(p.prices?.price ?? '0', 10) / 10 ** minor,
    images:     (p.images || []).map((im) => im.src).filter(Boolean).slice(0, MAX_IMAGES),
    minQty:     p.add_to_cart?.minimum ?? 1,
    inStock:    p.is_in_stock !== false,
    permalink:  p.permalink,
  };
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

/** קטגוריה "מזכרות לאירועים" — יצירה אם חסרה */
async function ensureCategory() {
  const snap = await db.collection('categories').get();
  let maxPriority = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if ((data.slug ?? '') === CATEGORY_NAME) {
      console.log(`📁 קטגוריה "${CATEGORY_NAME}" כבר קיימת (id=${d.id})`);
      return false;
    }
    if (typeof data.priority === 'number' && data.priority > maxPriority) maxPriority = data.priority;
  }
  if (!EXECUTE) {
    console.log(`📁 קטגוריה "${CATEGORY_NAME}" לא קיימת — תיווצר ב---execute (priority=${maxPriority + 1})`);
    return true;
  }
  await db.collection('categories').add({
    slug:           CATEGORY_NAME,
    displayName:    CATEGORY_NAME,
    priority:       maxPriority + 1,
    parentCategory: PARENT_CAT,
    createdAt:      FieldValue.serverTimestamp(),
  });
  console.log(`📁 ✅ נוצרה קטגוריה "${CATEGORY_NAME}" (priority=${maxPriority + 1}, parent=${PARENT_CAT})`);
  return true;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 importMySiddurName ${EXECUTE ? '— EXECUTE' : '— DRY-RUN (ללא כתיבה)'}\n`);

  // 1. קישורים
  const urls = [...new Set(
    readFileSync(URLS_FILE, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
  )];
  console.log(`🔗 ${urls.length} קישורים ייחודיים\n`);

  // 2. קיימים ב-Firestore (לפי sku)
  const existingSnap = await db.collection('products').where('source', '==', SOURCE).get();
  const existingSkus = new Set();
  existingSnap.forEach((d) => { const s = d.data().sku; if (s) existingSkus.add(s); });
  console.log(`🗃️  ${existingSkus.size} מוצרי ${SOURCE} כבר קיימים ב-Firestore\n`);

  // 3. קטגוריה
  await ensureCategory();
  console.log('');

  // 4. שליפה מהספק
  const rows = [];
  const errors = [];
  for (const [i, url] of urls.entries()) {
    const label = decodeURIComponent(url).split('/product/')[1]?.replace(/\/$/, '').replace(/-/g, ' ') ?? url;
    try {
      const id = await getProductId(url);
      const p  = await getProduct(id);
      p.sku = `MSN-${p.supplierId}`;
      p.sourceUrl = url;
      const skip = existingSkus.has(p.sku);
      rows.push({ ...p, skip });
      console.log(`${String(i + 1).padStart(2)}. ${skip ? '⏭️  קיים' : '🆕'}  [${p.sku}] ${p.name} — ₪${p.price}${p.minQty > 1 ? ` (מינ' ${p.minQty} יח')` : ''} — ${p.images.length} תמונות`);
    } catch (e) {
      errors.push({ url, error: e.message });
      console.log(`${String(i + 1).padStart(2)}. ❌ ${label} — ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  const toImport = rows.filter((r) => !r.skip);
  console.log(`\n📋 לייבוא: ${toImport.length} | קיימים: ${rows.length - toImport.length} | שגיאות: ${errors.length}\n`);

  // 5. DRY-RUN → CSV ויציאה
  if (!EXECUTE) {
    const date = new Date().toISOString().slice(0, 10);
    const csvPath = resolve(__dirname, `mysiddurname-candidates-${date}.csv`);
    const csv = '﻿' + [
      'sku,name,price,minQty,images,inStock,desc,url',
      ...toImport.map((r) =>
        [r.sku, `"${r.name.replace(/"/g, '""')}"`, r.price, r.minQty, r.images.length, r.inStock,
         `"${r.desc.replace(/"/g, '""').replace(/\n/g, ' | ')}"`, r.sourceUrl].join(',')
      ),
    ].join('\n');
    writeFileSync(csvPath, csv, 'utf8');
    console.log(`📄 CSV מועמדים: ${csvPath}`);
    const flags = [urlsArg, sectionArg].filter(Boolean).join(' ');
    console.log(`▶️  לביצוע: node scripts/importMySiddurName.mjs ${flags ? flags + ' ' : ''}--execute\n`);
    process.exit(0);
  }

  // 6. EXECUTE — Cloudinary + Firestore
  const log = [];
  let ok = 0, failed = 0;
  for (const [i, p] of toImport.entries()) {
    process.stdout.write(`${String(i + 1).padStart(2)}/${toImport.length} ${p.name} ... `);
    try {
      const cloudUrls = [];
      for (const src of p.images) {
        try { cloudUrls.push(await uploadToCloudinary(src)); }
        catch (e) { console.log(`\n   ⚠️ תמונה נכשלה (${e.message.slice(0, 50)}) — שומר URL מקורי`); cloudUrls.push(src); }
      }

      const docData = {
        name:              p.name,
        desc:              p.desc,
        price:             p.price,
        was:               null,
        imgUrl:            cloudUrls[0] ?? '',
        images:            cloudUrls,
        sku:               p.sku,
        cat:               CATEGORY_NAME,
        category:          CATEGORY_NAME,
        subCategory:       '',
        priority:          50,
        isBestSeller:      false,
        badge:             null,
        status:            'active',
        isEventProduct:    true,
        ...(SCROLL_SECTION ? { eventScrollSection: SCROLL_SECTION } : {}),
        source:            SOURCE,
        sourceUrl:         p.sourceUrl,
        supplierProductId: p.supplierId,
        minOrderQty:       p.minQty,
        createdAt:         FieldValue.serverTimestamp(),
      };
      if (cloudUrls[1]) docData.imgUrl2 = cloudUrls[1];
      if (cloudUrls[2]) docData.imgUrl3 = cloudUrls[2];

      const ref = await db.collection('products').add(docData);
      ok++;
      log.push({ id: ref.id, sku: p.sku, name: p.name, price: p.price, images: cloudUrls.length });
      console.log(`✅ (${ref.id})`);
    } catch (e) {
      failed++;
      log.push({ sku: p.sku, name: p.name, error: e.message });
      console.log(`❌ ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  const date = new Date().toISOString().slice(0, 10);
  const logPath = resolve(__dirname, `mysiddurname-import-log-${date}.json`);
  writeFileSync(logPath, JSON.stringify({ date, ok, failed, errors, log }, null, 2), 'utf8');

  console.log(`\n✅ יובאו: ${ok} | ❌ נכשלו: ${failed}`);
  console.log(`🪵 לוג: ${logPath}`);
  console.log('\n▶️  עכשיו להריץ: node scripts/syncAlgolia.mjs');
  console.log('▶️  בדיקה: https://your-sofer.com/event-kippot\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Fatal:', err);
  process.exit(1);
});
