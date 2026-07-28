import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require   = createRequire(import.meta.url);
const sa        = require(path.join(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// Build soldMap from non-cancelled, non-pending orders
const ordSnap = await db.collection('orders')
  .where('status', '!=', 'pending_payment')
  .limit(2000)
  .get();

const soldMap = {};
for (const d of ordSnap.docs) {
  const o = d.data();
  if (o.status === 'cancelled') continue;
  for (const item of o.items ?? []) {
    const pid = item.productId ?? item.id;
    if (!pid) continue;
    soldMap[pid] = (soldMap[pid] ?? 0) + (item.quantity ?? 1);
  }
}

// Paginate products, collect those with receivedFromSupplier > 0
const found = [];
let cursor = null;
while (true) {
  let q = db.collection('products').limit(500);
  if (cursor) q = q.startAfter(cursor);
  const snap = await q.get();
  if (snap.empty) break;
  cursor = snap.docs[snap.docs.length - 1];
  for (const d of snap.docs) {
    const p = d.data();
    if (!p.receivedFromSupplier || p.receivedFromSupplier <= 0) continue;
    found.push({
      id: d.id,
      name: (p.name ?? '').slice(0, 42),
      sku: p.sku ?? p.supplierCode ?? '—',
      received: p.receivedFromSupplier,
      supplierCost: p.supplierCost ?? null,
      sold: soldMap[d.id] ?? 0,
    });
  }
}

found.sort((a, b) => b.received - a.received);

console.log(`מוצרים עם receivedFromSupplier > 0: ${found.length}\n`);
console.log('─'.repeat(100));
console.log(`${'שם'.padEnd(44)} ${'sku'.padEnd(14)} ${'התקבל'.padEnd(8)} ${'נמכר'.padEnd(7)} ${'במלאי'.padEnd(7)} supplierCost`);
console.log('─'.repeat(100));

for (const p of found) {
  const inStock = p.received - p.sold;
  const cost    = p.supplierCost != null ? `₪${p.supplierCost}` : '⚠ חסר';
  console.log(
    `${p.name.padEnd(44)} ${String(p.sku).padEnd(14)} ${String(p.received).padEnd(8)} ${String(p.sold).padEnd(7)} ${String(inStock).padEnd(7)} ${cost}`
  );
}

const totalReceived = found.reduce((s, p) => s + p.received, 0);
const totalSold     = found.reduce((s, p) => s + p.sold,     0);
const withCost      = found.filter(p => p.supplierCost != null).length;
console.log('\n─'.repeat(100));
console.log(`סה"כ: ${found.length} מוצרים | ${totalReceived} התקבלו | ${totalSold} נמכרו | ${totalReceived - totalSold} במלאי`);
console.log(`supplierCost קיים: ${withCost}/${found.length}`);

process.exit(0);
