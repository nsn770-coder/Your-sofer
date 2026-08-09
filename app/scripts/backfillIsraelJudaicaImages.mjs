/**
 * backfillIsraelJudaicaImages.mjs
 *
 * משלים תמונות למוצרי israel-judaica שיובאו בעבר בלי תמונה.
 *
 * למה זה נחוץ: ייבואים מוקדמים שמרו imgUrl ריק או קישור חם לאתר הספק.
 * מוצר בלי תמונה נשאר מוסתר ואינו נמכר — 186 מוצרים מבוזבזים.
 *
 * מה הוא עושה:
 *   1. סורק את כל קטגוריות הספק ובונה מפה SKU → שם קובץ תמונה
 *   2. מאתר בקטלוג שלנו מוצרי israel-judaica בלי תמונה תקינה
 *   3. מעלה את התמונה ל-Cloudinary (3 ניסיונות) ומעדכן
 *   4. מוצר שקיבל תמונה — מתפרסם. בלי תמונה — נשאר מוסתר.
 *
 * Usage:
 *   node app/scripts/backfillIsraelJudaicaImages.mjs            ← DRY-RUN
 *   node app/scripts/backfillIsraelJudaicaImages.mjs --execute  ← ביצוע
 *   node app/scripts/backfillIsraelJudaicaImages.mjs --skus=scripts/missing-skus.json --execute
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                 from 'firebase-admin/firestore';
import { readFileSync, writeFileSync }  from 'fs';
import { resolve, dirname }             from 'path';
import { fileURLToPath }                from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '../..');
const EXECUTE   = process.argv.includes('--execute');
const skusArg   = process.argv.find(a => a.startsWith('--skus='));

function loadEnv(p) {
  try {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim(); if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('='); if (i === -1) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv(resolve(ROOT, '.env.local'));

const CLOUD         = 'dyxzq3ucy';
const UPLOAD_PRESET = 'yoursofer_upload';
const BASE_URL      = 'https://www.israel-judaica.com';
const LANG          = 'he';
const BATCH         = 100;
const sleep = ms => new Promise(r => setTimeout(r, ms));

if (getApps().length === 0) {
  initializeApp({ credential: cert(JSON.parse(
    readFileSync(resolve(ROOT, 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'))) });
}
const db = getFirestore();

// ── שליפה מהספק — זהה לסקריפט הסנכרון ──────────────────────────────────────
async function fetchBatch(categoryCode, offset) {
  const body = new URLSearchParams({
    category: categoryCode, filterChoices: '[]',
    limit: String(BATCH), offset: String(offset),
    sortValue: '', sortDirection: '', note: '', search_term: '',
  });
  const res = await fetch(`${BASE_URL}/index.php?option=com_art&task=category.getProducts&lang=${LANG}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.status) return {};
  return json.products || {};
}

function buildImgUrl(filename) {
  if (!filename) return null;
  const ext = filename.split('.').pop().toLowerCase();
  return `${BASE_URL}/${ext === 'webp' ? 'webp' : 'big'}/${filename}`;
}

async function uploadToCloudinary(imageUrl) {
  const form = new FormData();
  form.append('file', imageUrl);
  form.append('upload_preset', UPLOAD_PRESET);
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message ?? 'Cloudinary upload failed');
  return data.secure_url;
}

const isCloudinary = u => typeof u === 'string' && u.includes('cloudinary.com');

(async () => {
  if (!EXECUTE) console.log('🧪 DRY-RUN — לא נכתב כלום ולא מועלות תמונות.\n');

  // ── שלב 1: מפת SKU → תמונה אצל הספק ──
  // קודי הקטגוריות נלקחים מסקריפט הסנכרון, כדי שהכיסוי יהיה זהה.
  const { CATEGORY_MAP } = await import('./ijCategoryCodes.mjs').catch(() => ({ CATEGORY_MAP: null }));
  let codes = CATEGORY_MAP?.map(c => c.code);
  if (!codes) {
    // נפילה לאחור: חילוץ הקודים מקובץ הסנכרון עצמו
    const src = readFileSync(resolve(__dirname, 'fullSyncIsraelJudaica.mjs'), 'utf8');
    codes = [...new Set([...src.matchAll(/code:\s*'(\d+)'/g)].map(m => m[1]))];
  }
  console.log(`שלב 1: סריקת ${codes.length} קטגוריות אצל הספק...`);

  const skuToImage = new Map();
  for (const [i, code] of codes.entries()) {
    let offset = 0;
    while (true) {
      let batch;
      try { batch = await fetchBatch(code, offset); }
      catch { break; }
      const keys = Object.keys(batch);
      if (!keys.length) break;
      for (const [sku, p] of Object.entries(batch)) {
        if (p?.image) skuToImage.set(String(sku).trim().toUpperCase(), p.image);
      }
      if (keys.length < BATCH) break;
      offset += BATCH;
      await sleep(250);
    }
    if ((i + 1) % 10 === 0) console.log(`  ...${i + 1}/${codes.length} קטגוריות | ${skuToImage.size} SKUs עם תמונה`);
  }
  console.log(`  ✅ נאספו ${skuToImage.size} SKUs עם תמונה\n`);

  // ── שלב 2: מוצרים אצלנו בלי תמונה תקינה ──
  const snap = await db.collection('products').where('source', '==', 'israel-judaica').get();
  let targets = snap.docs.filter(d => !isCloudinary(d.data().imgUrl));

  if (skusArg) {
    const want = new Set(JSON.parse(readFileSync(resolve(ROOT, skusArg.split('=')[1]), 'utf8'))
      .map(s => String(s).trim().toUpperCase()));
    targets = targets.filter(d => want.has(String(d.data().sku || '').trim().toUpperCase()));
    console.log(`שלב 2: סינון לרשימה שסופקה — ${targets.length} מוצרים\n`);
  } else {
    console.log(`שלב 2: ${targets.length} מוצרים בלי תמונה תקינה\n`);
  }

  // ── שלב 3: השלמה ──
  const stats = { uploaded: 0, published: 0, noSupplierImage: 0, uploadFailed: 0 };
  const stillMissing = [];

  for (const [i, doc] of targets.entries()) {
    const p   = doc.data();
    const sku = String(p.sku || '').trim().toUpperCase();
    const file = skuToImage.get(sku);

    if ((i + 1) % 25 === 0) console.log(`  ...${i + 1}/${targets.length}`);

    if (!file) {
      stats.noSupplierImage++;
      stillMissing.push({ sku, name: p.name, reason: 'לא נמצא אצל הספק' });
      continue;
    }

    const srcUrl = buildImgUrl(file);
    if (!EXECUTE) { stats.uploaded++; stats.published++; continue; }

    let cloudUrl = null, lastErr = null;
    for (let a = 1; a <= 3 && !cloudUrl; a++) {
      try { cloudUrl = await uploadToCloudinary(srcUrl); }
      catch (e) { lastErr = e.message; if (a < 3) await sleep(1200 * a); }
    }
    await sleep(300);

    if (!cloudUrl) {
      stats.uploadFailed++;
      stillMissing.push({ sku, name: p.name, url: srcUrl, reason: lastErr });
      continue;
    }

    try {
      await doc.ref.update({
        imgUrl: cloudUrl, hidden: false, status: 'active', needsImage: false,
      });
      stats.uploaded++; stats.published++;
    } catch (e) {
      console.error(`  ✗ ${sku}: ${e.message}`);
    }
  }

  console.log('\n══ סיכום ══');
  console.log(`  תמונות שהושלמו:        ${stats.uploaded}`);
  console.log(`  פורסמו למכירה:          ${stats.published}`);
  console.log(`  אין תמונה אצל הספק:     ${stats.noSupplierImage}`);
  console.log(`  העלאות שנכשלו:          ${stats.uploadFailed}`);

  if (stillMissing.length) {
    const out = resolve(ROOT, `scripts/still-missing-images-${new Date().toISOString().slice(0,10)}.json`);
    writeFileSync(out, JSON.stringify(stillMissing, null, 2), 'utf8');
    console.log(`\n  📄 ${stillMissing.length} שנשארו: ${out}`);
  }
  if (!EXECUTE) console.log('\n🧪 הרצה יבשה. הוסף --execute לביצוע.');
  process.exit(0);
})();
