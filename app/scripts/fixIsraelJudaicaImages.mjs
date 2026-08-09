/**
 * fixIsraelJudaicaImages.mjs
 *
 * תיקון רטרואקטיבי למוצרים שיובאו מ-israel-judaica לפני 08/2026.
 *
 * מה הוא עושה, לכל מוצר עם source='israel-judaica':
 *   1. imgUrl שמצביע לאתר הספק (קישור חם) → מנסה להעלות ל-Cloudinary
 *   2. imgUrl ריק → מנסה לבנות מחדש מהתמונה אצל הספק ולהעלות
 *   3. יש תמונה ב-Cloudinary  → מפרסם (hidden:false, status:'active')
 *      אין תמונה              → משאיר טיוטה + needsImage:true
 *
 * Usage:
 *   node app/scripts/fixIsraelJudaicaImages.mjs            ← DRY-RUN
 *   node app/scripts/fixIsraelJudaicaImages.mjs --execute  ← ביצוע
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                 from 'firebase-admin/firestore';
import { readFileSync, writeFileSync }  from 'fs';
import { resolve, dirname }             from 'path';
import { fileURLToPath }                from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '../..');
const EXECUTE   = process.argv.includes('--execute');

function loadEnv(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('='); if (i === -1) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv(resolve(ROOT, '.env.local'));

const CLOUD      = 'dyxzq3ucy';
const UPLOAD_PRESET = 'yoursofer_upload';
const SUPPLIER   = 'https://www.israel-judaica.com';
const sleep = ms => new Promise(r => setTimeout(r, ms));

if (getApps().length === 0) {
  initializeApp({ credential: cert(JSON.parse(
    readFileSync(resolve(ROOT, 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'))) });
}
const db = getFirestore();

/** זהה בדיוק ל-uploadToCloudinary שבסקריפט הסנכרון — unsigned preset.
 *  חשוב שיהיו זהים, אחרת התמונות ייכנסו לחשבון עם הגדרות שונות. */
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
const isSupplier   = u => typeof u === 'string' && u.includes('israel-judaica.com');

(async () => {
  if (!EXECUTE) console.log('🧪 DRY-RUN — לא נכתב כלום. הוסף --execute לביצוע.\n');

  const snap = await db.collection('products').where('source', '==', 'israel-judaica').get();
  console.log(`נמצאו ${snap.size} מוצרים מ-israel-judaica\n`);

  const stats = { alreadyOk: 0, uploaded: 0, uploadFailed: 0, wouldUpload: 0, published: 0, stillNoImage: 0, failed: 0 };
  const uploadErrors = [];
  const noImage = [];

  let seen = 0;
  for (const doc of snap.docs) {
    if (++seen % 100 === 0) process.stdout.write(`  ...${seen}/${snap.size}\n`);
    const p = doc.data();
    let cloudUrl = isCloudinary(p.imgUrl) ? p.imgUrl : null;

    // תמונה שמצביעה לספק — קישור חם שנחסם. מנסים להעלות אותה אלינו.
    // ב-DRY-RUN לא מעלים בפועל: זה איטי, וגם היה יוצר נכסים כפולים
    // ב-Cloudinary כשירוץ אחר כך --execute. רק סופרים מה *היה* מועלה.
    if (!cloudUrl && isSupplier(p.imgUrl)) {
      if (!EXECUTE) {
        stats.wouldUpload++;
        cloudUrl = 'DRY_RUN_PLACEHOLDER'; // מניחים הצלחה לצורך הספירה
      } else {
        let lastErr = null;
        for (let a = 1; a <= 3 && !cloudUrl; a++) {
          try { cloudUrl = await uploadToCloudinary(p.imgUrl); stats.uploaded++; }
          catch (e) { lastErr = e.message; if (a < 3) await sleep(1200 * a); }
        }
        if (!cloudUrl) {
          stats.uploadFailed++;
          uploadErrors.push({ sku: p.sku, url: p.imgUrl, error: lastErr });
        }
        await sleep(300);
      }
    }

    const shouldPublish = !!cloudUrl;
    const needsUpdate =
      (cloudUrl && cloudUrl !== p.imgUrl) ||
      p.hidden !== !shouldPublish ||
      p.status !== (shouldPublish ? 'active' : 'draft');

    if (!needsUpdate) { stats.alreadyOk++; continue; }

    if (!cloudUrl) {
      stats.stillNoImage++;
      noImage.push({ id: doc.id, sku: p.sku, name: p.name, imgUrl: p.imgUrl ?? null });
    } else {
      stats.published++;
    }

    if (EXECUTE) {
      try {
        await doc.ref.update({
          ...(cloudUrl && cloudUrl !== 'DRY_RUN_PLACEHOLDER' ? { imgUrl: cloudUrl } : {}),
          hidden:     !shouldPublish,
          status:     shouldPublish ? 'active' : 'draft',
          needsImage: !shouldPublish,
        });
      } catch (e) { stats.failed++; console.error(`  ✗ ${p.sku}: ${e.message}`); }
    }
  }

  console.log('══ סיכום ══');
  console.log(`  תקינים מלכתחילה:      ${stats.alreadyOk}`);
  console.log(`  תמונות שהועלו מחדש:   ${stats.uploaded}`);
  if (stats.wouldUpload) console.log(`  יועלו בהרצה אמיתית:    ${stats.wouldUpload}`);
  console.log(`  פורסמו למכירה:         ${stats.published}`);
  console.log(`  נשארו בלי תמונה:       ${stats.stillNoImage}`);
  console.log(`  כשלי כתיבה לפיירסטור:  ${stats.failed}`);
  if (stats.uploadFailed) {
    console.log(`  ❌ העלאות שנכשלו:      ${stats.uploadFailed}`);
    // הסיבות הנפוצות, מקובצות — כך רואים מיד אם זו חסימה או 404
    const byErr = uploadErrors.reduce((a, e) => { a[e.error || 'unknown'] = (a[e.error || 'unknown'] || 0) + 1; return a; }, {});
    for (const [err, n] of Object.entries(byErr).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      console.log(`       ${n}×  ${err}`);
    }
    console.log(`       דוגמה: ${uploadErrors[0]?.url}`);
  }

  if (noImage.length) {
    const out = resolve(ROOT, `scripts/needs-image-${new Date().toISOString().slice(0,10)}.json`);
    try { writeFileSync(out, JSON.stringify(noImage, null, 2), 'utf8'); console.log(`\n  📄 רשימת חסרי תמונה: ${out}`); } catch {}
  }
  if (!EXECUTE) console.log('\n🧪 זו הייתה הרצה יבשה. הוסף --execute כדי לכתוב.');
  process.exit(0);
})();
