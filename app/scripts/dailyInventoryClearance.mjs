/**
 * dailyInventoryClearance.mjs
 *
 * Usage:
 *   node app/scripts/dailyInventoryClearance.mjs             ← dry-run
 *   node app/scripts/dailyInventoryClearance.mjs --execute   ← ביצוע
 *
 * Logic:
 *   ENTER clearance: price > 40 AND inStock >= 1 AND source === 'israel-judaica' AND !clearanceDiscount
 *   EXIT  clearance: inStock <= 0 AND clearanceDiscount === true
 *   salePrice = Math.round(price * 0.9 * 100) / 100  (10% off)
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const __dir   = dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');

// Load service account key from project root
const keyPath = resolve(__dir, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) {
  initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf-8'))) });
}
const db = getFirestore();

async function dailyInventoryClearance() {
  console.log(`🔄 Daily Inventory Clearance ${EXECUTE ? '(EXECUTING)' : '(DRY-RUN)'}`);
  console.log(`📅 Time: ${new Date().toLocaleString('he-IL')}\n`);

  const snapshot = await db.collection('products').get();

  const toMark   = [];
  const toRemove = [];
  let skipped = 0;

  snapshot.forEach(docSnap => {
    const p = docSnap.data();

    // Only numeric inStock is reliable
    if (typeof p.inStock !== 'number') { skipped++; return; }

    const hasCleared = p.clearanceDiscount === true;

    const eligible =
      p.price > 40 &&
      p.inStock >= 1 &&
      p.source === 'israel-judaica' &&
      !hasCleared;

    if (eligible) {
      // Whole shekels only (pricing-integrity): no agorot in clearanceSalePrice
      const salePrice = Math.round(p.price * 0.9);
      toMark.push({ id: docSnap.id, name: p.name ?? '', price: p.price, salePrice, inStock: p.inStock });
    } else if (p.inStock <= 0 && hasCleared) {
      toRemove.push({ id: docSnap.id, name: p.name ?? '', originalPrice: p.originalPrice ?? p.price });
    }
  });

  console.log(`📦 מוצרים שנכנסו ל-clearance (price > 40, source=israel-judaica): ${toMark.length}`);
  toMark.slice(0, 10).forEach(p =>
    console.log(`  ✓ ${p.name} — ₪${p.price} → ₪${p.salePrice} (inStock: ${p.inStock})`));

  console.log(`\n🔄 מוצרים שיצאו מ-clearance (inStock <= 0): ${toRemove.length}`);
  toRemove.slice(0, 5).forEach(p =>
    console.log(`  ✗ ${p.name} — חזר למחיר מקורי ₪${p.originalPrice}`));

  console.log(`\n⏭️  דלוגים (ללא inStock מספרי): ${skipped}`);

  if (!EXECUTE) {
    console.log('\n⚠️  DRY-RUN — לא עודכן כלום.');
    console.log('   להרצה: node app/scripts/dailyInventoryClearance.mjs --execute');
    process.exit(0);
  }

  // ── Write to Firestore ──────────────────────────────────────────────────────
  const now      = new Date();
  const BATCH_SIZE = 400;

  const allOps = [
    ...toMark.map(p => ({
      id:   p.id,
      data: { clearanceDiscount: true,  clearanceSalePrice: p.salePrice, originalPrice: p.price, lastInventoryCheck: now },
    })),
    ...toRemove.map(p => ({
      id:   p.id,
      data: { clearanceDiscount: false, clearanceSalePrice: null, originalPrice: null, lastInventoryCheck: now },
    })),
  ];

  let done = 0;
  for (let i = 0; i < allOps.length; i += BATCH_SIZE) {
    const chunk = allOps.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach(op => batch.update(db.collection('products').doc(op.id), op.data));
    await batch.commit();
    done += chunk.length;
    console.log(`  ${done}/${allOps.length} עודכנו`);
  }

  console.log('\n✅ הושלם!');
  process.exit(0);
}

dailyInventoryClearance().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
