/**
 * uploadImagesToCloudinary.mjs
 * Upload images to Cloudinary using direct URL (proven method)
 * Then update Firestore with Cloudinary URLs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Firebase ────────────────────────────────────────────
const envPath = resolve(__dirname, '../.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
}

const SA_PATH = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA_PATH) });
const db = getFirestore();

// ── Cloudinary credentials (proven method) ────────────────────────────────
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';
const UPLOAD_PRESET = 'yoursofer_upload';

// ── SKUs to process ────────────────────────────────────────
const SKUS = [
  'UK50636', 'UK59857', 'UK59870', 'UK59254', 'UK86041', 'UK59166', 'UK85733',
  'UK67950', 'UK59876', 'UK41046', 'UK41047', 'UK83441', 'UK86402', 'UK40873',
  'UK40886', 'UK41021', 'UK41045', 'UK41012', 'UK24767', 'UK83395', 'UK55852',
  'UK59653', 'UK24870', 'UK24871', 'UK24940', 'UK24941', 'UK24942', 'UK24943',
  'UK24944', 'UK24945', 'UK24946', 'UK24928', 'UK24875', 'UK24877', 'UK24880',
  'UK24881', 'UK24882', 'UK24883', 'UK24872', 'UK24874', 'UK24884', 'UK24886',
  'UK24873', 'UK24876', 'UK24878', 'UK24879', 'UK24885', 'UK57333', 'UK59488',
  'UK59854', 'UK59855', 'UK59325', 'UK59327', 'UK67961', 'UK67963', 'UK68007',
  'UK67955', 'UK67956', 'UK67953', 'UK67954', 'UK68008', 'UK68009', 'UK68010',
  'UK68011', 'UK68012', 'UK68013', 'UK67979', 'UK67980', 'UK67981', 'UK67982',
  'UK67983', 'UK67984', 'UK67934', 'UK67935', 'UK67936', 'UK67962', 'UK68001',
  'UK68005', 'UK68006', 'UK68086', 'UK68087', 'UK68088', 'UK68089', 'UK12411',
  'UK12424', 'UK12429', 'UK12430', 'UK12414', 'UK12422', 'UK12513', 'UK12533',
  'UK12473', 'UK12474', 'UK12479', 'UK12500', 'UK12415', 'UK12475', 'UK12476',
  'UK12502', 'UK12403', 'UK12504', 'UK12510', 'UK12521', 'UK12410', 'UK12507',
  'UK12512', 'UK12531', 'UK40901', 'UK41014', 'UK86403',
];

// ── Upload URL directly to Cloudinary ────────────────────────────────
async function uploadToCloudinary(imageUrl, sku) {
  try {
    const params = new URLSearchParams({
      file: imageUrl,
      upload_preset: UPLOAD_PRESET,
      public_id: sku,
      folder: 'your-sofer/products'
    });

    const res = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: params
    });

    const data = await res.json();
    if (!data.secure_url) throw new Error(data.error?.message ?? 'Cloudinary upload failed');
    return data.secure_url;
  } catch (e) {
    throw e;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');

  console.log(`\n${testMode ? '🧪 TEST MODE' : '🚀 UPLOADING IMAGES'} — ${SKUS.length} products\n`);

  const subset = testMode ? SKUS.slice(0, 5) : SKUS;
  let uploaded = 0, failed = 0;

  for (let i = 0; i < subset.length; i++) {
    const sku = subset[i];
    const imageUrl = `https://www.israel-judaica.com/big/${sku}.jpg`;

    console.log(`[${i + 1}/${subset.length}] ${sku}:`);

    if (testMode) {
      console.log(`  ✅ WOULD UPLOAD to Cloudinary`);
      uploaded++;
      continue;
    }

    try {
      console.log(`  Uploading to Cloudinary...`);
      const cloudinaryUrl = await uploadToCloudinary(imageUrl, sku);
      console.log(`  ✅ Cloudinary URL: ${cloudinaryUrl.substring(0, 80)}...`);

      // Update Firestore
      const snap = await db.collection('products').where('sku', '==', sku).limit(1).get();
      if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        await docRef.update({
          imgUrl: cloudinaryUrl,
          images: [cloudinaryUrl],
          updatedAt: new Date().toISOString(),
        });
        console.log(`  ✅ Updated in Firestore`);
        uploaded++;
      } else {
        console.log(`  ⚠️  Product not found in Firestore`);
      }
    } catch (e) {
      console.error(`  ❌ Failed: ${e.message}`);
      if (e.response) {
        console.error(`     Response: ${e.response}`);
      }
      failed++;
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n${'─'.repeat(50)}`);
  if (testMode) {
    console.log(`✅ Test: ${uploaded} | Ready to upload`);
    console.log('\nRun WITHOUT --test to upload all images to Cloudinary');
  } else {
    console.log(`✅ Uploaded: ${uploaded} | ❌ Failed: ${failed}`);
  }
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
