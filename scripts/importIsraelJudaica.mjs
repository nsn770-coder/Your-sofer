/**
 * importIsraelJudaica.mjs
 * Imports scripts/israel-judaica-products.json → Firestore 'products' collection
 *
 * Usage:
 *   node scripts/importIsraelJudaica.mjs --test      # 5 products, dry-run preview
 *   node scripts/importIsraelJudaica.mjs             # all 308 products
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';
import { readFileSync, existsSync }      from 'fs';
import { resolve, dirname }              from 'path';
import { fileURLToPath }                 from 'url';

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

// ── category mapping ──────────────────────────────────────────
function mapCat(sourceCat) {
  if (sourceCat === 'טליתות')           return { cat: 'טליתות וציציות', subCategory: 'טליתות חתן' };
  if (sourceCat === 'כיפות מיוחדות')   return { cat: 'כיפות',          subCategory: 'כיפות מיוחדות' };
  return { cat: sourceCat, subCategory: sourceCat };
}

// ── main ──────────────────────────────────────────────────────
async function main() {
  const args     = process.argv.slice(2);
  const testMode = args.includes('--test');

  const all    = JSON.parse(readFileSync(resolve(__dirname, 'israel-judaica-products.json'), 'utf8'));
  const subset = testMode ? all.slice(0, 5) : all;

  console.log(`\n${testMode ? '🧪 TEST MODE — 5 products' : `🚀 FULL IMPORT — ${subset.length} products`}`);
  console.log('Checking for existing SKUs in Firestore...\n');

  // Pre-fetch all existing SKUs in one query to avoid N individual reads
  const existingSnap = await db.collection('products').select('sku').get();
  const existingSkus = new Set();
  existingSnap.forEach(d => { if (d.data().sku) existingSkus.add(d.data().sku); });
  console.log(`Found ${existingSkus.size} existing products in Firestore.\n`);

  let created = 0, skipped = 0, failed = 0;

  for (let i = 0; i < subset.length; i++) {
    const p = subset[i];

    if (!p.name_he) {
      console.log(`[${i + 1}/${subset.length}] ⚠️  SKIP — no Hebrew name: ${p.sku}`);
      skipped++;
      continue;
    }

    if (existingSkus.has(p.sku)) {
      console.log(`[${i + 1}/${subset.length}] ⏭  SKIP — already exists: ${p.sku}`);
      skipped++;
      continue;
    }

    const { cat, subCategory } = mapCat(p.category);

    const doc = {
      name:        p.name_he,
      sku:         p.sku,
      imgUrl:      p.image_url || '',
      cat,
      subCategory,
      price:       0,
      source:      'israel-judaica',
      available:   true,
      status:      'active',
      createdAt:   new Date().toISOString(),
    };

    if (testMode) {
      console.log(`[${i + 1}/5] ✅ WOULD CREATE:`);
      console.log(JSON.stringify(doc, null, 4));
      created++;
      continue;
    }

    try {
      const ref = await db.collection('products').add(doc);
      console.log(`[${i + 1}/${subset.length}] ✅ Created ${p.sku} — ${p.name_he.slice(0, 50)} (id: ${ref.id})`);
      created++;
    } catch (e) {
      console.error(`[${i + 1}/${subset.length}] ❌ FAILED ${p.sku}: ${e.message}`);
      failed++;
    }
  }

  console.log('\n─────────────────────────────────');
  if (testMode) {
    console.log(`🧪 Test complete. Would create: ${created} | Would skip: ${skipped}`);
    console.log('\nRun WITHOUT --test to import all products.');
  } else {
    console.log(`✅ Created: ${created} | ⏭ Skipped: ${skipped} | ❌ Failed: ${failed}`);
  }
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
