/**
 * dailyInventoryClearance.mjs
 *
 * Usage:
 *   node app/scripts/dailyInventoryClearance.mjs             ← dry-run
 *   node app/scripts/dailyInventoryClearance.mjs --execute   ← ביצוע
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const __dir  = dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');

const app = initializeApp({ apiKey: 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I', projectId: 'your-sofer' });
const db  = getFirestore(app);

async function dailyInventoryClearance() {
  console.log(`🔄 Daily Inventory Clearance ${EXECUTE ? '(EXECUTING)' : '(DRY-RUN)'}`);
  console.log(`📅 Time: ${new Date().toLocaleString('he-IL')}\n`);

  const snapshot = await getDocs(collection(db, 'products'));

  const toMark   = [];
  const toRemove = [];
  let skipped = 0;

  snapshot.forEach(docSnap => {
    const product = docSnap.data();

    // Skip legacy boolean inStock — we need a real numeric count
    if (typeof product.inStock !== 'number') { skipped++; return; }
    const inStock = product.inStock;

    const hasCleared = product.clearanceDiscount ?? false;

    if (inStock > 0 && !hasCleared) {
      const salePrice = Math.round(product.price * 0.9 * 100) / 100;
      toMark.push({ id: docSnap.id, name: product.name, price: product.price, salePrice, inStock });
    } else if (inStock === 0 && hasCleared) {
      toRemove.push({ id: docSnap.id, name: product.name, originalPrice: product.originalPrice ?? product.price });
    }
  });

  // Report
  toMark.slice(0, 10).forEach(p =>
    console.log(`  ✓ ${p.name} — ₪${p.price} → ₪${p.salePrice} (qty: ${p.inStock})`));
  if (toRemove.length) toRemove.slice(0, 5).forEach(p =>
    console.log(`  ✗ ${p.name} — מלאי נגמר, חזר למחיר מקורי`));

  console.log(`\n✅ Complete!
  📦 מוצרים שעברו להנחה:       ${toMark.length}
  🔄 מוצרים שחזרו למחיר מקורי: ${toRemove.length}
  ⏭️  דלוגים (ללא inStock):     ${skipped}`);

  if (!EXECUTE) {
    console.log('\n⚠️  DRY-RUN — לא עודכן כלום.');
    console.log('   להרצה: node app/scripts/dailyInventoryClearance.mjs --execute');
    return;
  }

  // ── Write via Admin SDK (bypasses Firestore rules) ──────────────────────
  const envPath = resolve(__dir, '../../.env.local');
  try {
    const env = readFileSync(envPath, 'utf-8');
    let key = null, val = [], multi = false;
    for (const line of env.split('\n')) {
      if (!multi && line.includes('=')) {
        const eq = line.indexOf('='); key = line.slice(0, eq).trim();
        const rest = line.slice(eq + 1);
        if (rest.includes('-----BEGIN')) { multi = true; val = [rest]; }
        else { process.env[key] = rest.trim(); key = null; }
      } else if (multi) {
        val.push(line);
        if (line.includes('-----END PRIVATE KEY-----')) {
          process.env[key] = val.join('\n').trim(); multi = false; key = null; val = [];
        }
      }
    }
  } catch { /* rely on existing env */ }

  const { initializeApp: adminInit, cert, getApps } = await import('firebase-admin/app');
  const { getFirestore: adminGetDb }                 = await import('firebase-admin/firestore');
  if (getApps().length === 0) adminInit({ credential: cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim(),
    privateKey:  (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n'),
  })});
  const adminDb = adminGetDb();

  const now = new Date();
  const BATCH_SIZE = 400;
  const allOps = [
    ...toMark.map(p   => ({ id: p.id, data: { clearanceDiscount: true,  clearanceSalePrice: p.salePrice,  originalPrice: p.price, lastInventoryCheck: now } })),
    ...toRemove.map(p  => ({ id: p.id, data: { clearanceDiscount: false, clearanceSalePrice: null,         originalPrice: null,    lastInventoryCheck: now } })),
  ];

  let done = 0;
  for (let i = 0; i < allOps.length; i += BATCH_SIZE) {
    const chunk = allOps.slice(i, i + BATCH_SIZE);
    const batch = adminDb.batch();
    chunk.forEach(op => batch.update(adminDb.collection('products').doc(op.id), op.data));
    await batch.commit();
    done += chunk.length;
    console.log(`  ${done}/${allOps.length} עודכנו`);
  }
}

dailyInventoryClearance().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
