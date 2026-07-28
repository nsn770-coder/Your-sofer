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

// ── 1. Load all orders (not pending_payment) and build soldMap ────────────────
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
console.log(`הזמנות סרוקות: ${ordSnap.size} | מוצרים ייחודיים שנמכרו: ${Object.keys(soldMap).length}\n`);

// ── 2. Load all products, index by id ─────────────────────────────────────────
const allProds = {};
let cursor = null;
while (true) {
  let q = db.collection('products').limit(500);
  if (cursor) q = q.startAfter(cursor);
  const snap = await q.get();
  if (snap.empty) break;
  cursor = snap.docs[snap.docs.length - 1];
  for (const d of snap.docs) allProds[d.id] = { id: d.id, ...d.data() };
}
console.log(`מוצרים טעונים: ${Object.keys(allProds).length}\n`);

// ── 3. Find sold products without supplierCost ────────────────────────────────
const missing = [];
for (const [pid, qty] of Object.entries(soldMap)) {
  const p = allProds[pid];
  if (!p) continue;
  if (p.supplierCost && p.supplierCost !== 0) continue; // has cost — skip
  missing.push({ id: pid, name: p.name ?? '—', sku: p.sku ?? p.supplierCode ?? null,
                 price: p.price ?? 0, sold: qty, source: p.source ?? null });
}

missing.sort((a, b) => b.sold - a.sold);

// ── 4. Print ──────────────────────────────────────────────────────────────────
const noSku     = missing.filter(m => !m.sku).length;
const withIsrael = missing.filter(m => m.source === 'israel-judaica').length;

console.log(`מוצרים שנמכרו ללא supplierCost: ${missing.length}`);
console.log(`  ← מתוכם source=israel-judaica: ${withIsrael}`);
console.log(`  ← ללא SKU בכלל:               ${noSku}\n`);
console.log('─'.repeat(90));
console.log(`${'שם מוצר'.padEnd(42)} ${'sku'.padEnd(14)} ${'מחיר'.padEnd(8)} ${'נמכר'.padEnd(6)} מקור`);
console.log('─'.repeat(90));

for (const m of missing) {
  const name   = (m.name ?? '').slice(0, 40).padEnd(42);
  const sku    = (m.sku ?? '—').padEnd(14);
  const price  = `₪${m.price}`.padEnd(8);
  const sold   = String(m.sold).padEnd(6);
  const source = m.source ?? '—';
  console.log(`${name} ${sku} ${price} ${sold} ${source}`);
}

process.exit(0);
