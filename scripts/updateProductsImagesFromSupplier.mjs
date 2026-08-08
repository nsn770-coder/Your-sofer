/**
 * updateProductsImagesFromSupplier.mjs
 *
 * Updates our 110 products with images from israel-judaica using Cloudinary
 * Uses the proven method from importAllIsraelJudaica.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Constants ─────────────────────────────────────────────────────
const BASE_URL       = 'https://www.israel-judaica.com';
const LANG           = 'he';
const BATCH          = 100;
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';
const UPLOAD_PRESET  = 'yoursofer_upload';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Firebase Admin ────────────────────────────────────────────────
const SA_PATH = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA_PATH) });
const db = getFirestore();

// ── Our 110 SKUs ──────────────────────────────────────────────────
const OUR_SKUS = [
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

const ourSkuSet = new Set(OUR_SKUS);

// ── Scrape helpers ────────────────────────────────────────────────

async function fetchBatch(categoryCode, offset) {
  const body = new URLSearchParams({
    category:      categoryCode,
    filterChoices: '[]',
    limit:         String(BATCH),
    offset:        String(offset),
    sortValue:     '',
    sortDirection: '',
    note:          '',
    search_term:   '',
  });
  const res = await fetch(`${BASE_URL}/index.php?option=com_art&task=category.getProducts`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} at offset ${offset}`);
  const json = await res.json();
  if (!json.status) throw new Error(json.error || json.msg || 'API status=false');
  return json.products || {};
}

function buildImgUrl(filename) {
  if (!filename) return null;
  const ext = filename.split('.').pop().toLowerCase();
  return `${BASE_URL}/${ext === 'webp' ? 'webp' : 'big'}/${filename}`;
}

// ── Cloudinary upload (proven method) ──────────────────────────────
async function uploadToCloudinary(imageUrl) {
  const form = new FormData();
  form.append('file', imageUrl);
  form.append('upload_preset', UPLOAD_PRESET);
  const res  = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message ?? 'Cloudinary upload failed');
  return data.secure_url;
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Updating images for ${OUR_SKUS.length} products\n`);

  const args = process.argv.slice(2);
  const testMode = args.includes('--test');

  // Scrape israel-judaica for ALL products (all categories)
  console.log('📡 Scraping all categories from israel-judaica...\n');

  const allProducts = {};
  const categories = ['1118', '1119', '1121', '1122', '1123', '1124', '1125', '1127', '1129', '1130', '1131', '1132', '1133', '1160', '1161', '1163', '1164', '1165', '1166', '1167', '1168', '1169', '1171', '1172', '1173', '1174', '1175', '1176', '1177', '1178', '1180', '1185', '1187', '1193', '1116'];

  for (const code of categories) {
    try {
      let offset = 0;
      while (true) {
        const batch = await fetchBatch(code, offset);
        const keys = Object.keys(batch);
        if (keys.length === 0) break;
        for (const [sku, p] of Object.entries(batch)) {
          allProducts[sku] = p;
        }
        if (keys.length < BATCH) break;
        offset += BATCH;
        await sleep(100);
      }
    } catch (e) {
      console.warn(`⚠️  Category ${code} error: ${e.message}`);
    }
  }

  console.log(`✓ Scraped ${Object.keys(allProducts).length} total products\n`);

  // Now filter to only OUR SKUs
  const ourProducts = OUR_SKUS
    .map(sku => ({ sku, data: allProducts[sku] }))
    .filter(p => p.data);

  console.log(`✓ Found ${ourProducts.length}/${OUR_SKUS.length} of our SKUs in israel-judaica\n`);

  if (testMode) {
    console.log(`🧪 TEST MODE — First 3 products:\n`);
    ourProducts.slice(0, 3).forEach(p => {
      const imgUrl = buildImgUrl(p.data.image);
      console.log(`  ${p.sku}: ${imgUrl ? '✓' : '✗'}`);
    });
    process.exit(0);
  }

  // Upload images to Cloudinary
  let updated = 0, failed = 0, noImage = 0;

  for (let i = 0; i < ourProducts.length; i++) {
    const { sku, data } = ourProducts[i];
    const imgUrl = buildImgUrl(data.image);

    if (!imgUrl) {
      console.log(`[${i + 1}/${ourProducts.length}] ⚠️  ${sku}: No image on supplier`);
      noImage++;
      continue;
    }

    try {
      console.log(`[${i + 1}/${ourProducts.length}] ${sku}...`);
      const cloudinaryUrl = await uploadToCloudinary(imgUrl);

      // Update Firestore
      const snap = await db.collection('products').where('sku', '==', sku).limit(1).get();
      if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        await docRef.update({
          imgUrl: cloudinaryUrl,
          images: [cloudinaryUrl],
          updatedAt: new Date().toISOString(),
        });
        console.log(`     ✅ Updated with Cloudinary image`);
        updated++;
      } else {
        console.log(`     ⚠️  Product not in Firestore`);
      }
    } catch (e) {
      console.error(`     ❌ Failed: ${e.message}`);
      failed++;
    }

    await sleep(300);
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ Updated: ${updated} | ⚠️  No image: ${noImage} | ❌ Failed: ${failed}`);
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
