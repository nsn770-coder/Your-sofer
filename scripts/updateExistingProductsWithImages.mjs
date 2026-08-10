/**
 * updateExistingProductsWithImages.mjs
 *
 * Updates existing products with images from israel-judaica:
 * 1. Download image from israel-judaica
 * 2. Upload to Cloudinary
 * 3. Update product in Firestore
 *
 * Usage:
 *   node scripts/updateExistingProductsWithImages.mjs --test
 *   node scripts/updateExistingProductsWithImages.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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

// ── Constants ─────────────────────────────────────────────────
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';
const UPLOAD_PRESET = 'yoursofer_upload';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Load israel-judaica products for images ────────────────────
const israelJudaicaPath = resolve(__dirname, 'israel-judaica-products.json');
let skuToImage = {};
try {
  const allProducts = JSON.parse(readFileSync(israelJudaicaPath, 'utf8'));
  skuToImage = {};
  allProducts.forEach(p => {
    if (p.sku && p.image_url) {
      skuToImage[p.sku] = p.image_url;
    }
  });
  console.log(`✓ Loaded images for ${Object.keys(skuToImage).length} products from israel-judaica\n`);
} catch (e) {
  console.warn(`⚠️  Could not load israel-judaica images: ${e.message}\n`);
}

// ── Upload to Cloudinary ──────────────────────────────────────
async function uploadToCloudinary(imageUrl) {
  const form = new FormData();
  form.append('file', imageUrl);
  form.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
  const data = await res.json();

  if (!data.secure_url) {
    throw new Error(data.error?.message ?? 'Cloudinary upload failed');
  }

  return data.secure_url;
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');

  console.log(`\n${testMode ? '🧪 TEST MODE' : '🚀 UPDATING'} — Existing products with israel-judaica images`);
  console.log(`SKU→Image map has ${Object.keys(skuToImage).length} products\n`);

  // Fetch all existing products
  const productsSnap = await db.collection('products').get();
  const products = [];

  productsSnap.forEach(doc => {
    const data = doc.data();
    if (data.sku && skuToImage[data.sku]) {
      products.push({
        id: doc.id,
        sku: data.sku,
        name: data.name,
        imageUrl: skuToImage[data.sku],
      });
    }
  });

  console.log(`📦 Found ${products.length} existing products with available images\n`);

  const subset = testMode ? products.slice(0, 5) : products;
  let updated = 0, failed = 0, noImage = 0;

  for (let i = 0; i < subset.length; i++) {
    const { id, sku, name, imageUrl } = subset[i];

    if (!imageUrl) {
      console.log(`[${i + 1}/${subset.length}] ⚠️  ${sku}: No image URL`);
      noImage++;
      continue;
    }

    try {
      console.log(`[${i + 1}/${subset.length}] ${sku}...`);

      // Upload to Cloudinary
      const cloudinaryUrl = await uploadToCloudinary(imageUrl);
      console.log(`  ☁️ Cloudinary: OK`);

      // Update Firestore
      await db.collection('products').doc(id).update({
        imgUrl: cloudinaryUrl,
        images: [cloudinaryUrl],
        updatedAt: new Date().toISOString(),
      });
      console.log(`  📊 Firestore: ✅ Updated`);
      updated++;
    } catch (e) {
      console.error(`  ❌ Error: ${e.message}`);
      failed++;
    }

    await sleep(300);
  }

  console.log(`\n${'─'.repeat(50)}`);
  if (testMode) {
    console.log(`✅ Test: ${updated} | ⚠️  No image: ${noImage}`);
  } else {
    console.log(`✅ Updated: ${updated} | ⚠️  No image: ${noImage} | ❌ Failed: ${failed}`);
  }
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
