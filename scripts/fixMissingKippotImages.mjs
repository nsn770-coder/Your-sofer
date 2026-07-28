/**
 * fixMissingKippotImages.mjs
 * Fixes 7 kippot products that were imported without any image field.
 * Derives the supplier URL from SKU, validates it is a real image (not an
 * HTML error page), uploads to Cloudinary /upload/, then writes imgUrl +
 * images[] to Firestore.
 *
 * DRY_RUN = true by default — pass --live to upload + write.
 *
 * Usage:
 *   node scripts/fixMissingKippotImages.mjs          ← dry-run
 *   node scripts/fixMissingKippotImages.mjs --live   ← live fix
 */

import { readFileSync } from 'fs';
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
const SLEEP_MS       = 300;

const TARGET_SKUS = [
  'UK18976',
  'UK19029',
  'UK19030',
  'UK18329',
  'UK18330',
  'UK18327',
  'UK10271',
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function supplierUrl(sku) {
  const num = sku.replace(/^UK/, '');
  return `https://www.israel-judaica.com/big/${num}.jpg`;
}

async function validateSupplierUrl(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
    const ct = (r.headers.get('content-type') ?? '').toLowerCase();
    const ok = r.status === 200 && ct.startsWith('image/');
    return { status: r.status, contentType: ct, valid: ok };
  } catch (e) {
    return { status: 'ERR', contentType: '', valid: false, error: e.message };
  }
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
  console.log(`🖼️  fixMissingKippotImages — ${DRY_RUN ? '🧪 DRY RUN (no writes)' : '🔴 LIVE FIX'}`);
  console.log(`${'═'.repeat(64)}\n`);

  // ── 1. Fetch Firestore docs for all 7 SKUs ────────────────────────────────
  console.log('📥 שולף מסמכים מ-Firestore...\n');
  const entries = [];

  for (const sku of TARGET_SKUS) {
    const snap = await db.collection('products').where('sku', '==', sku).limit(1).get();
    if (snap.empty) {
      console.log(`  ⚠️  ${sku}: לא נמצא ב-Firestore — מדולג`);
      entries.push({ sku, doc: null, skip: true, skipReason: 'לא נמצא ב-Firestore' });
      continue;
    }
    const doc = snap.docs[0];
    const d   = doc.data();

    if (d.imgUrl) {
      console.log(`  ⏭️  ${sku}: כבר יש imgUrl (${d.imgUrl.slice(0, 60)}...) — מדולג`);
      entries.push({ sku, doc, skip: true, skipReason: 'כבר יש imgUrl' });
      continue;
    }

    const src = supplierUrl(sku);
    const validation = await validateSupplierUrl(src);

    if (!validation.valid) {
      const reason = validation.error
        ? `שגיאת רשת: ${validation.error}`
        : `URL לא תקין (status=${validation.status}, type=${validation.contentType || 'n/a'})`;
      console.log(`  ❌ ${sku}: ${reason} — מדולג`);
      entries.push({ sku, doc, skip: true, skipReason: reason });
      continue;
    }

    console.log(`  ✅ ${sku}: ${d.name || '(ללא שם)'}`);
    console.log(`     URL ספק: ${src}`);
    console.log(`     HEAD: status=${validation.status} type=${validation.contentType}`);
    entries.push({ sku, doc, skip: false, supplierUrl: src, name: d.name || '' });
  }

  const toProcess = entries.filter(e => !e.skip);

  // ── 2. DRY-RUN report ─────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`📊 סיכום`);
  console.log(`${'─'.repeat(64)}`);
  console.log(`  ייעובדו:  ${toProcess.length} מוצרים`);
  console.log(`  ידולגו:   ${entries.filter(e => e.skip).length} מוצרים`);

  if (toProcess.length > 0 && DRY_RUN) {
    console.log('\n── מה ייכתב ב-Firestore (אם --live) ──');
    for (const e of toProcess) {
      console.log(`\n  SKU: ${e.sku}  |  ${e.name}`);
      console.log(`  imgUrl  ← <cloudinary /upload/ URL שיתקבל אחרי העלאה>`);
      console.log(`  images  ← [<אותו URL>]`);
      console.log(`  מקור:   ${e.supplierUrl}`);
    }
  }

  if (DRY_RUN) {
    console.log('\n🧪 DRY RUN — לא הועלה כלום ולא נכתב ל-Firestore.');
    console.log('   להפעלת תיקון אמיתי:\n');
    console.log('   node scripts/fixMissingKippotImages.mjs --live\n');
    process.exit(0);
  }

  if (toProcess.length === 0) {
    console.log('\nאין מוצרים לעיבוד.\n');
    process.exit(0);
  }

  // ── 3. LIVE: upload + write ───────────────────────────────────────────────
  console.log(`\n⬆️  מעלה ${toProcess.length} תמונות ל-Cloudinary ומעדכן Firestore...\n`);
  let ok = 0, failed = 0;
  const failures = [];

  for (const e of toProcess) {
    // Upload
    let newUrl;
    try {
      newUrl = await uploadToCloudinary(e.supplierUrl);
      console.log(`  ✅ ${e.sku}: הועלה → ${newUrl}`);
    } catch (err) {
      failed++;
      failures.push({ sku: e.sku, reason: `Cloudinary: ${err.message}` });
      console.warn(`  ⚠️  ${e.sku}: העלאה נכשלה — ${err.message}`);
      await sleep(SLEEP_MS);
      continue;
    }
    await sleep(SLEEP_MS);

    // Write Firestore
    try {
      await e.doc.ref.update({ imgUrl: newUrl, images: [newUrl] });
      ok++;
      console.log(`     Firestore עודכן (imgUrl + images[0])`);
    } catch (err) {
      failed++;
      failures.push({ sku: e.sku, reason: `Firestore: ${err.message}` });
      console.error(`  ❌ ${e.sku}: כתיבה ל-Firestore נכשלה — ${err.message}`);
    }
  }

  // ── 4. Summary ────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(64)}`);
  console.log('✅ fixMissingKippotImages הושלם');
  console.log(`${'═'.repeat(64)}`);
  console.log(`  תוקנו בהצלחה: ${ok}`);
  console.log(`  כשלונות:       ${failed}`);
  if (failures.length > 0) {
    console.log('\n  SKUs שנכשלו:');
    for (const { sku, reason } of failures) {
      console.log(`    • ${sku}: ${reason}`);
    }
  }
  console.log();

  process.exit(0);
}

main().catch(err => { console.error('\n❌ Fatal:', err.message); process.exit(1); });
