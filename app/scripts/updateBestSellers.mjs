/**
 * updateBestSellers.mjs
 *
 * Counts per-product sales from the `orders` collection (orders with status != 'pending_payment').
 * Updates each product with:
 *   salesCount  — total units sold across all orders
 *   orderCount  — number of distinct orders containing the product
 *   isBestSeller — true for the top 50 products by salesCount
 *
 * Run: node app/scripts/updateBestSellers.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Init Firebase Admin ────────────────────────────────────────────────────────

const serviceAccountPath = resolve(process.cwd(), 'service-account.json');
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch {
  console.error('❌  service-account.json not found. Place it at the project root.');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

// ── Count sales ────────────────────────────────────────────────────────────────

const SKIP_STATUSES = new Set(['pending_payment', 'cancelled']);
const TOP_N = 50;

async function run() {
  console.log('📦  Fetching orders…');
  const ordersSnap = await db.collection('orders').get();
  console.log(`   Found ${ordersSnap.size} orders total`);

  /** Map of productId → { orderCount, salesCount } */
  const counts = new Map();

  for (const orderDoc of ordersSnap.docs) {
    const order = orderDoc.data();
    if (SKIP_STATUSES.has(order.status)) continue;
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      const id = item.id || item.productId;
      if (!id) continue;
      const qty = typeof item.quantity === 'number' ? item.quantity : 1;
      const entry = counts.get(id) ?? { orderCount: 0, salesCount: 0 };
      entry.orderCount += 1;
      entry.salesCount += qty;
      counts.set(id, entry);
    }
  }

  console.log(`   Counted ${counts.size} distinct products with sales`);

  // Sort by salesCount descending → top 50 are best sellers
  const sorted = [...counts.entries()].sort((a, b) => b[1].salesCount - a[1].salesCount);
  const topIds = new Set(sorted.slice(0, TOP_N).map(([id]) => id));

  console.log(`🔝  Top ${TOP_N} best sellers: ${[...topIds].slice(0, 5).join(', ')} …`);

  // ── Batch-write updates ──────────────────────────────────────────────────────

  let batch = db.batch();
  let ops = 0;
  const BATCH_LIMIT = 499;

  async function flushBatch() {
    if (ops === 0) return;
    await batch.commit();
    batch = db.batch();
    ops = 0;
  }

  // Update products that have sales data
  for (const [id, { orderCount, salesCount }] of counts.entries()) {
    const ref = db.collection('products').doc(id);
    batch.update(ref, {
      salesCount,
      orderCount,
      isBestSeller: topIds.has(id),
    });
    ops++;
    if (ops >= BATCH_LIMIT) await flushBatch();
  }

  // Clear isBestSeller on products that are no longer in top 50
  // (only for products that currently have isBestSeller=true but aren't in topIds)
  const currentBSSnap = await db.collection('products').where('isBestSeller', '==', true).get();
  for (const docSnap of currentBSSnap.docs) {
    if (!topIds.has(docSnap.id)) {
      batch.update(docSnap.ref, { isBestSeller: false });
      ops++;
      if (ops >= BATCH_LIMIT) await flushBatch();
    }
  }

  await flushBatch();

  console.log(`✅  Done. Updated ${counts.size} products. Top ${TOP_N} marked as isBestSeller.`);
  console.log('\nTop 10 best sellers:');
  sorted.slice(0, 10).forEach(([id, { orderCount, salesCount }], i) => {
    console.log(`  ${i + 1}. ${id} — ${salesCount} units in ${orderCount} orders`);
  });
}

run().catch(e => { console.error(e); process.exit(1); });
