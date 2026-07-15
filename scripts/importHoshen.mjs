/**
 * importHoshen.mjs
 *
 * ייבוא מטפחות/כיסויי ראש מ-hoshenjudaica.co.il (חושן תשמישי קדושה).
 *
 * האתר (פלטפורמת Konimbo) חוסם גישה ללא דפדפן, ולכן הנתונים נשלפו מראש
 * דרך הדפדפן ונשמרו ב-scripts/hoshen-products.json (רק מוצרים במלאי —
 * 5 מוצרים שאזלו סוננו כבר בשלב השליפה).
 *
 * לכל מוצר:
 *   - מחיר ומחיר-קודם כמו באתר הספק (מינימום ₪5)
 *   - תוספות כמו אצל הספק: הטבעה לכל הכמות ₪130 (חד־פעמי), הטבעת שם ₪15 ליחידה
 *   - cat/category: "מזכרות לאירועים", isEventProduct: true
 *   - eventScrollSection: "headcovers" (סקרול כיסויי ראש בעמוד האירועים)
 *   - sku: HSN-<מק"ט>, תמונה ל-Cloudinary, sourceUrl
 *
 * Usage:
 *   node scripts/importHoshen.mjs             ← DRY-RUN
 *   node scripts/importHoshen.mjs --execute   ← ייבוא בפועל
 *
 * דגלים:
 *   --data=<file>      ← קובץ נתונים אחר בתיקיית scripts (ברירת מחדל: hoshen-products.json)
 *   --section=<id>     ← סקרול בעמוד האירועים (ברירת מחדל: headcovers)
 *
 * דוגמה — מזמור לתודה:
 *   node scripts/importHoshen.mjs --data=hoshen-mizmor-products.json --section=mizmor-letoda --execute
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
const dataArg        = process.argv.find((a) => a.startsWith('--data='));
const sectionArg     = process.argv.find((a) => a.startsWith('--section='));
const CATEGORY_NAME  = 'מזכרות לאירועים';
const SOURCE         = 'hoshenjudaica';
const SCROLL_SECTION = sectionArg ? sectionArg.split('=')[1] : 'headcovers';
const DATA_FILE      = resolve(__dirname, dataArg ? dataArg.split('=')[1] : 'hoshen-products.json');
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';
const UPLOAD_PRESET  = 'yoursofer_upload';
const DELAY_MS       = 600;
const MIN_PRICE      = 5;

// תוספות כפי שמופיעות אצל הספק (באנר האתר):
// "הטבעה לכל הכמות רק 130!!! הטבעת שם על יחידה אחת 15 ש"ח!"
const HOSHEN_ADDONS = [
  { id: 'dedication',   label: 'הטבעה לכל הכמות', price: 130, pricing: 'flat',    requiresText: true },
  { id: 'name-imprint', label: 'הטבעת שם',         price: 15,  pricing: 'perUnit', requiresText: true },
];

// ── Firebase Admin ────────────────────────────────────────────────────────────
const sa = JSON.parse(
  readFileSync(resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8')
);
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function uploadToCloudinary(imageUrl) {
  const form = new FormData();
  form.append('file', imageUrl);
  form.append('upload_preset', UPLOAD_PRESET);
  const res  = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message ?? 'Cloudinary upload failed');
  return data.secure_url;
}

async function main() {
  console.log(`\n🚀 importHoshen ${EXECUTE ? '— EXECUTE' : '— DRY-RUN (ללא כתיבה)'}\n`);

  const products = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  console.log(`📦 ${products.length} מוצרים ב-hoshen-products.json (במלאי בלבד)\n`);

  const existingSnap = await db.collection('products').where('source', '==', SOURCE).get();
  const existingSkus = new Set();
  existingSnap.forEach((d) => { const s = d.data().sku; if (s) existingSkus.add(s); });
  console.log(`🗃️  ${existingSkus.size} מוצרי ${SOURCE} כבר קיימים ב-Firestore\n`);

  const rows = products.map((p) => {
    const price = Math.max(p.price, MIN_PRICE);
    // אם אחרי רצפת ה-5 ₪ המחיר הקודם כבר לא גבוה מהמחיר — מוותרים עליו
    const was = p.was != null && p.was > price ? p.was : null;
    return { ...p, price, was, priceRaised: price !== p.price, skip: existingSkus.has(p.sku) };
  });

  for (const [i, r] of rows.entries()) {
    console.log(`${String(i + 1).padStart(2)}. ${r.skip ? '⏭️  קיים' : '🆕'}  [${r.sku}] ${r.name} — ₪${r.price}${r.was ? ` (מחיר קודם ₪${r.was})` : ''}${r.priceRaised ? ' (הועלה ל-5)' : ''}`);
  }

  const toImport = rows.filter((r) => !r.skip);
  console.log(`\n📋 לייבוא: ${toImport.length} | קיימים: ${rows.length - toImport.length}\n`);

  if (!EXECUTE) {
    const flags = [dataArg, sectionArg].filter(Boolean).join(' ');
    console.log(`▶️  לביצוע: node scripts/importHoshen.mjs ${flags ? flags + ' ' : ''}--execute\n`);
    process.exit(0);
  }

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
        name:               p.name,
        desc:               p.desc,
        price:              p.price,
        was:                p.was ?? null,
        imgUrl:             cloudUrls[0] ?? '',
        images:             cloudUrls,
        sku:                p.sku,
        cat:                CATEGORY_NAME,
        category:           CATEGORY_NAME,
        subCategory:        '',
        priority:           50,
        isBestSeller:       false,
        badge:              null,
        status:             'active',
        isEventProduct:     true,
        eventScrollSection: SCROLL_SECTION,
        addons:             HOSHEN_ADDONS,
        source:             SOURCE,
        sourceUrl:          p.sourceUrl,
        supplierProductId:  p.supplierId,
        createdAt:          FieldValue.serverTimestamp(),
      };
      if (cloudUrls[1]) docData.imgUrl2 = cloudUrls[1];
      if (cloudUrls[2]) docData.imgUrl3 = cloudUrls[2];

      const ref = await db.collection('products').add(docData);
      ok++;
      log.push({ id: ref.id, sku: p.sku, name: p.name, price: p.price });
      console.log(`✅ (${ref.id})`);
    } catch (e) {
      failed++;
      log.push({ sku: p.sku, name: p.name, error: e.message });
      console.log(`❌ ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  const date = new Date().toISOString().slice(0, 10);
  const logPath = resolve(__dirname, `hoshen-import-log-${date}.json`);
  writeFileSync(logPath, JSON.stringify({ date, ok, failed, log }, null, 2), 'utf8');

  console.log(`\n✅ יובאו: ${ok} | ❌ נכשלו: ${failed}`);
  console.log(`🪵 לוג: ${logPath}`);
  console.log('\n▶️  סנכרון חיפוש: אדמין → הגדרות אתר → "🔄 סנכרן חיפוש (Algolia)"');
  console.log('▶️  בדיקה: https://your-sofer.com/event-kippot (סקרול כיסויי ראש)\n');
  process.exit(0);
}

main().catch((err) => { console.error('\n❌ Fatal:', err); process.exit(1); });
