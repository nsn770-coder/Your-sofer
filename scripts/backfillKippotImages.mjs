/**
 * backfillKippotImages.mjs
 * Uploads kippot product images from israel-judaica.com to Cloudinary storage
 * (upload, not fetch), then updates imgUrl / imgUrl2 / imgUrl3 in Firestore.
 *
 * Why: Cloudinary /image/fetch/ hits a monthly quota (401). Uploading once to
 * /upload/ removes the dependency on the fetch delivery type entirely.
 *
 * DRY_RUN = true by default — pass --live to upload + write.
 *
 * Usage:
 *   node scripts/backfillKippotImages.mjs          ← dry-run
 *   node scripts/backfillKippotImages.mjs --live   ← live backfill
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DRY_RUN = !process.argv.includes('--live');

const SA_PATH        = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';
const UPLOAD_PRESET  = 'yoursofer_upload';
const MAX_BATCH      = 500;
const SLEEP_UPLOAD   = 300; // ms between Cloudinary requests

const sleep = ms => new Promise(r => setTimeout(r, ms));

function isCloudinaryUpload(url) {
  return typeof url === 'string' && url.includes('cloudinary.com') && url.includes('/upload/');
}

function isIsraelJudaica(url) {
  return typeof url === 'string' && url.includes('israel-judaica.com');
}

async function uploadToCloudinary(imageUrl) {
  const form = new FormData();
  form.append('file', imageUrl);
  form.append('upload_preset', UPLOAD_PRESET);
  const res  = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message ?? JSON.stringify(data));
  return data.secure_url;
}

async function main() {
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`🖼️  backfillKippotImages — ${DRY_RUN ? '🧪 DRY RUN (no writes)' : '🔴 LIVE BACKFILL'}`);
  console.log(`${'═'.repeat(64)}\n`);

  // ── 1. Fetch all kippot products ─────────────────────────────────────────
  console.log('📥 שולף מוצרי כיפות מ-Firestore...');
  const snap = await db.collection('products').where('cat', '==', 'כיפות').get();
  console.log(`   נמצאו ${snap.docs.length} מוצרים\n`);

  // ── 2. Classify ──────────────────────────────────────────────────────────
  // A product "needs backfill" if its PRIMARY image is from israel-judaica.
  // Secondary images (imgUrl2/3) are handled opportunistically per-product.
  const alreadyUploaded = [];
  const needsBackfill   = [];
  let   noImage         = 0;

  for (const doc of snap.docs) {
    const d       = doc.data();
    const primary = d.imgUrl || d.image_url || '';
    if (!primary) { noImage++; continue; }
    if (isCloudinaryUpload(primary)) { alreadyUploaded.push(doc); continue; }
    if (isIsraelJudaica(primary))    { needsBackfill.push(doc);   continue; }
    // anything else (other domain) — skip silently
  }

  // Count total images across imgUrl / imgUrl2 / imgUrl3
  let totalImgCount = 0;
  for (const doc of needsBackfill) {
    const d = doc.data();
    if (isIsraelJudaica(d.imgUrl  || d.image_url || '')) totalImgCount++;
    if (isIsraelJudaica(d.imgUrl2 || ''))                totalImgCount++;
    if (isIsraelJudaica(d.imgUrl3 || ''))                totalImgCount++;
  }

  // ── 3. Report ─────────────────────────────────────────────────────────────
  console.log('── סטטיסטיקות ──');
  console.log(`  סה"כ כיפות:                       ${snap.docs.length}`);
  console.log(`  כבר ב-Cloudinary /upload/ (דולג): ${alreadyUploaded.length}`);
  console.log(`  ללא תמונה (דולג):                 ${noImage}`);
  console.log(`  צריכים backfill (israel-judaica):  ${needsBackfill.length}`);
  console.log(`  תמונות לעלאה סה"כ (incl. 2/3):   ${totalImgCount}`);

  // ── 4. Sample table ───────────────────────────────────────────────────────
  if (needsBackfill.length > 0) {
    console.log('\n── 5 דוגמאות מוצרים שיעברו backfill ──');
    for (const doc of needsBackfill.slice(0, 5)) {
      const d = doc.data();
      const oldUrl  = d.imgUrl || d.image_url || '';
      console.log(`  SKU: ${(d.sku || doc.id).padEnd(10)}  ישן: ${oldUrl}`);
      console.log(`  ${' '.repeat(16)} חדש: https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto/<id>.jpg`);
    }
  }

  if (DRY_RUN) {
    console.log('\n🧪 DRY RUN — לא הועלה כלום ולא נכתב ל-Firestore.');
    console.log('   להפעלת backfill אמיתי:\n');
    console.log('   node scripts/backfillKippotImages.mjs --live\n');
    process.exit(0);
  }

  // ── 5. LIVE: write backup first ───────────────────────────────────────────
  const backupDir  = resolve(__dirname, '../backups');
  mkdirSync(backupDir, { recursive: true });
  const ts         = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = resolve(backupDir, `kippot-imgUrl-backup-${ts}.json`);
  const backupData = needsBackfill.map(doc => {
    const d = doc.data();
    return { id: doc.id, sku: d.sku || null, imgUrl: d.imgUrl || d.image_url || null, imgUrl2: d.imgUrl2 || null, imgUrl3: d.imgUrl3 || null };
  });
  writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`\n💾 גיבוי נשמר: ${backupPath} (${backupData.length} מוצרים)\n`);

  // ── 6. LIVE: upload images ────────────────────────────────────────────────
  console.log(`⬆️  מעלה ${totalImgCount} תמונות ל-Cloudinary (upload)...\n`);
  const firestoreUpdates = new Map(); // docId → { imgUrl?, imgUrl2?, imgUrl3? }
  let uploadOk = 0, uploadFailed = 0;

  for (let i = 0; i < needsBackfill.length; i++) {
    const doc    = needsBackfill[i];
    const d      = doc.data();
    const update = {};

    const primary = d.imgUrl || d.image_url || '';
    if (isIsraelJudaica(primary)) {
      try {
        update.imgUrl = await uploadToCloudinary(primary);
        uploadOk++;
        process.stdout.write(`  ✅ [${i + 1}/${needsBackfill.length}] ${d.sku || doc.id} imgUrl\n`);
      } catch (e) {
        uploadFailed++;
        process.stdout.write(`  ⚠️  [${i + 1}/${needsBackfill.length}] ${d.sku || doc.id} imgUrl: ${e.message}\n`);
      }
      await sleep(SLEEP_UPLOAD);
    }

    if (isIsraelJudaica(d.imgUrl2 || '')) {
      try {
        update.imgUrl2 = await uploadToCloudinary(d.imgUrl2);
        uploadOk++;
      } catch (e) {
        uploadFailed++;
        console.warn(`  ⚠️  ${d.sku || doc.id} imgUrl2: ${e.message}`);
      }
      await sleep(SLEEP_UPLOAD);
    }

    if (isIsraelJudaica(d.imgUrl3 || '')) {
      try {
        update.imgUrl3 = await uploadToCloudinary(d.imgUrl3);
        uploadOk++;
      } catch (e) {
        uploadFailed++;
        console.warn(`  ⚠️  ${d.sku || doc.id} imgUrl3: ${e.message}`);
      }
      await sleep(SLEEP_UPLOAD);
    }

    if (Object.keys(update).length > 0) {
      firestoreUpdates.set(doc.id, update);
    }
  }

  console.log(`\n  העלאות: ${uploadOk} הצליחו / ${uploadFailed} נכשלו`);

  // ── 7. LIVE: batch Firestore writes ───────────────────────────────────────
  if (firestoreUpdates.size === 0) {
    console.log('\nאין עדכונים ל-Firestore (כל ההעלאות נכשלו).\n');
    process.exit(uploadFailed > 0 ? 1 : 0);
  }

  console.log(`\n✏️  מעדכן ${firestoreUpdates.size} מסמכים ב-Firestore (batches של ${MAX_BATCH})...`);
  const entries = [...firestoreUpdates.entries()];
  let fsOk = 0, fsFailed = 0;

  for (let i = 0; i < entries.length; i += MAX_BATCH) {
    const chunk = entries.slice(i, i + MAX_BATCH);
    const batch = db.batch();
    for (const [docId, fields] of chunk) {
      batch.update(db.collection('products').doc(docId), fields);
    }
    try {
      await batch.commit();
      fsOk += chunk.length;
      console.log(`  ✅ batch ${Math.floor(i / MAX_BATCH) + 1}: ${chunk.length} מסמכים (סה"כ ${fsOk}/${firestoreUpdates.size})`);
    } catch (err) {
      fsFailed += chunk.length;
      console.error(`  ❌ batch ${Math.floor(i / MAX_BATCH) + 1}: ${err.message}`);
    }
  }

  // ── 8. Summary ────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(64)}`);
  console.log('✅ backfill הושלם');
  console.log(`${'═'.repeat(64)}`);
  console.log(`  תמונות שהועלו ל-Cloudinary:  ${uploadOk}`);
  console.log(`  שגיאות העלאה (URL נשמר כמו שהוא): ${uploadFailed}`);
  console.log(`  מסמכי Firestore שעודכנו:     ${fsOk}`);
  if (fsFailed > 0) console.log(`  שגיאות Firestore:            ${fsFailed}`);
  console.log(`  גיבוי נשמר ב:               backups/kippot-imgUrl-backup-${ts}.json\n`);

  process.exit(0);
}

main().catch(err => { console.error('\n❌ Fatal:', err.message); process.exit(1); });
