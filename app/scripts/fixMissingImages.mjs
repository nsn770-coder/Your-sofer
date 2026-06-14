/**
 * fixMissingImages.mjs
 *
 * For each product already imported (listed in scripts/import_plan.json),
 * build the correct public image URL (/big/ or /webp/), upload to Cloudinary,
 * and update only the `image` field on the existing Firestore doc.
 *
 * Usage:
 *   node app/scripts/fixMissingImages.mjs            ← dry-run (5 samples, no writes)
 *   node app/scripts/fixMissingImages.mjs --confirm  ← update all 1,033 products
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '../..');
const CONFIRM   = process.argv.includes('--confirm');

const sa = JSON.parse(readFileSync(
  resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'
));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const BASE_URL       = 'https://www.israel-judaica.com';
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';
const UPLOAD_PRESET  = 'yoursofer_upload';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function buildPublicImgUrl(filename) {
  if (!filename) return null;
  const ext = filename.split('.').pop().toLowerCase();
  return `${BASE_URL}/${ext === 'webp' ? 'webp' : 'big'}/${filename}`;
}

async function uploadToCloudinary(imageUrl) {
  const form = new FormData();
  form.append('file', imageUrl);
  form.append('upload_preset', UPLOAD_PRESET);
  const res  = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message ?? 'no secure_url');
  return data.secure_url;
}

// ── Load plan ─────────────────────────────────────────────────────────────────
const plan = JSON.parse(readFileSync(resolve(ROOT, 'scripts/import_plan.json'), 'utf8'));
console.log(`Import plan: ${plan.length} products`);

// ── DRY-RUN: test 5 URLs ──────────────────────────────────────────────────────
if (!CONFIRM) {
  console.log('\n─── DRY-RUN: testing 5 image URLs ───\n');
  const samples = plan.slice(0, 5);
  for (const item of samples) {
    const url = buildPublicImgUrl(item.filename);
    let status = '?';
    try {
      const res = await fetch(url, { method: 'HEAD' });
      status = res.status;
    } catch (e) {
      status = `ERR: ${e.message}`;
    }
    const ok = status === 200 ? '✅' : '❌';
    console.log(`  ${ok} ${item.sku.padEnd(10)} ${String(status).padEnd(5)} ${url}`);
  }
  console.log('\nDRY-RUN complete. If all 5 show ✅ 200, run with --confirm.');
  process.exit(0);
}

// ── CONFIRM: update all products ──────────────────────────────────────────────
console.log('\nLoading Firestore SKU → docId index…');
const snap    = await db.collection('products').select('sku').get();
const skuToId = {};
snap.forEach(d => { if (d.data().sku) skuToId[d.data().sku] = d.id; });
console.log(`  ${Object.keys(skuToId).length} products indexed\n`);

let uploaded = 0, failed = 0, notFound = 0;

for (let i = 0; i < plan.length; i++) {
  const item   = plan[i];
  const docId  = skuToId[item.sku];
  if (!docId) {
    console.log(`  NOT_FOUND ${item.sku}`);
    notFound++;
    continue;
  }

  const imgUrl = buildPublicImgUrl(item.filename);
  if (!imgUrl) {
    console.log(`  NO_IMG    ${item.sku}`);
    failed++;
    continue;
  }

  try {
    const cloudUrl = await uploadToCloudinary(imgUrl);
    await db.collection('products').doc(docId).update({ image: cloudUrl });
    uploaded++;
    if (uploaded % 50 === 0 || i === plan.length - 1) {
      console.log(`  Progress: ${i + 1}/${plan.length}  (ok=${uploaded}, err=${failed}, notFound=${notFound})`);
    }
  } catch (e) {
    console.log(`  IMG_ERR   ${item.sku}: ${e.message.slice(0, 80)}`);
    failed++;
  }

  await sleep(80);
}

console.log('\n═══════════════════════════════');
console.log(`✅ Done`);
console.log(`   Uploaded & updated : ${uploaded}`);
console.log(`   Errors             : ${failed}`);
console.log(`   Not found in DB    : ${notFound}`);
process.exit(0);
