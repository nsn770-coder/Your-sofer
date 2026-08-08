/**
 * updateProductsWithImages.mjs
 *
 * Updates existing "coming soon" products with images and available: true
 * Usage:
 *   node scripts/updateProductsWithImages.mjs --test      # 5 products only
 *   node scripts/updateProductsWithImages.mjs             # all products
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── env + Firebase ────────────────────────────────────────────
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

// ── Load images from sku-images.json ────────────────
const imagesPath = resolve(__dirname, 'sku-images.json');
let skuToImages = {};
try {
  skuToImages = JSON.parse(readFileSync(imagesPath, 'utf8'));
  console.log(`✓ Loaded images for ${Object.keys(skuToImages).length} products\n`);
} catch (e) {
  console.warn(`⚠️  Could not load images: ${e.message}\n`);
}

// ── Products to update (our 115 SKUs) ────────────────────────────
const SKUS_TO_UPDATE = [
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

async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');

  const subset = testMode ? SKUS_TO_UPDATE.slice(0, 5) : SKUS_TO_UPDATE;

  console.log(`\n${testMode ? '🧪 TEST MODE' : '🚀 UPDATING'} — ${subset.length} products\n`);

  let updated = 0, failed = 0, notFound = 0;

  for (let i = 0; i < subset.length; i++) {
    const sku = subset[i];
    const imageUrl = skuToImages[sku] || '';

    // Find product by SKU
    const snap = await db.collection('products').where('sku', '==', sku).limit(1).get();

    if (snap.empty) {
      console.log(`[${i + 1}/${subset.length}] ⚠️  NOT FOUND: ${sku}`);
      notFound++;
      continue;
    }

    const docRef = snap.docs[0].ref;
    const currentData = snap.docs[0].data();

    const updateData = {
      available: true,
      imgUrl: imageUrl,
      images: imageUrl ? [imageUrl] : [],
      updatedAt: new Date().toISOString(),
    };

    if (testMode) {
      console.log(`[${i + 1}/5] ✅ WOULD UPDATE: ${sku}`);
      console.log(`     Image: ${imageUrl ? '✓' : '✗'} ${imageUrl ? imageUrl.substring(0, 60) + '...' : '(no image)'}`);
      console.log(`     Available: false → true`);
      updated++;
      continue;
    }

    try {
      await docRef.update(updateData);
      console.log(`[${i + 1}/${subset.length}] ✅ ${sku} — image: ${imageUrl ? '✓' : '✗'}, available: true`);
      updated++;
    } catch (e) {
      console.error(`[${i + 1}/${subset.length}] ❌ ${sku}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  if (testMode) {
    console.log(`✅ Test: ${updated} | ⚠️  Not found: ${notFound}`);
    console.log('\nRun WITHOUT --test to update all products.');
  } else {
    console.log(`✅ Updated: ${updated} | ⚠️  Not found: ${notFound} | ❌ Failed: ${failed}`);
  }
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
