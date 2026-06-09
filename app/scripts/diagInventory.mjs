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

// ── 1. Build soldMap from non-cancelled, non-pending orders ──────────────────
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

// ── 2. Paginate all products ─────────────────────────────────────────────────
const allProducts = [];
let cursor = null;
while (true) {
  let q = db.collection('products').limit(500);
  if (cursor) q = q.startAfter(cursor);
  const snap = await q.get();
  if (snap.empty) break;
  cursor = snap.docs[snap.docs.length - 1];
  for (const d of snap.docs) {
    const p = d.data();
    allProducts.push({ id: d.id, ...p });
  }
}

// ── SECTION A: products with any inventory flag > 0 ─────────────────────────
const withInventory = allProducts.filter(p =>
  (p.receivedFromSupplier ?? 0) > 0 ||
  (p.inStock ?? 0) > 0 ||
  (p.stockCount ?? 0) > 0
);

withInventory.sort((a, b) => (b.receivedFromSupplier ?? 0) - (a.receivedFromSupplier ?? 0));

console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('SECTION A — מוצרים עם receivedFromSupplier>0 או inStock>0 או stockCount>0');
console.log(`סה"כ: ${withInventory.length} מוצרים`);
console.log('══════════════════════════════════════════════════════════════════════');
const hdr = [
  'שם'.padEnd(42),
  'sku'.padEnd(14),
  'recv'.padEnd(6),
  'inStk'.padEnd(7),
  'stkCnt'.padEnd(7),
  'נמכר'.padEnd(6),
  'computed'.padEnd(9),
  'supplierCost',
].join(' ');
console.log(hdr);
console.log('─'.repeat(100));

for (const p of withInventory) {
  const recv    = p.receivedFromSupplier ?? 0;
  const inStock = p.inStock ?? 0;
  const stkCnt  = p.stockCount ?? 0;
  const sold    = soldMap[p.id] ?? 0;
  const computed = recv - sold;
  const cost    = p.supplierCost != null ? `₪${p.supplierCost}` : (p.soferBasePrice != null ? `~₪${p.soferBasePrice}` : '⚠ חסר');
  const name    = (p.name ?? '').slice(0, 41);
  const sku     = String(p.sku ?? p.supplierCode ?? '—').slice(0, 13);
  console.log([
    name.padEnd(42),
    sku.padEnd(14),
    String(recv).padEnd(6),
    String(inStock).padEnd(7),
    String(stkCnt).padEnd(7),
    String(sold).padEnd(6),
    String(computed).padEnd(9),
    cost,
  ].join(' '));
}

// ── SECTION B: Analysis of display logic ─────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('SECTION B — מה InventoryTab מציג?');
console.log('══════════════════════════════════════════════════════════════════════');
console.log(`סה"כ מוצרים ב-collection: ${allProducts.length}`);
console.log(`InventoryTab טוען את כל ${allProducts.length} המוצרים ואין לו פילטר מלאי!`);
console.log(`הוא מראה את כולם — ממוין לפי computedInStock = receivedFromSupplier - sold`);
console.log(`כלומר: מוצרים עם receivedFromSupplier=0 יופיעו בתחתית עם computedInStock=0`);
console.log(`המוצרים "שלא אמורים להופיע" הם כנראה אלה עם computedInStock > 0 ו-receivedFromSupplier שאמור להיות 0`);
console.log();

const shouldBeZero = withInventory.filter(p => (p.receivedFromSupplier ?? 0) > 0);
console.log(`מוצרים עם receivedFromSupplier > 0 (אלה הנראים "בחצ'): ${shouldBeZero.length}`);

// ── SECTION C: stockStatus flags ────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('SECTION C — stockStatus flags');
console.log('══════════════════════════════════════════════════════════════════════');

const statusCounts = {};
let missingStatus = 0;
for (const p of allProducts) {
  const s = p.stockStatus ?? '__missing__';
  statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  if (!p.stockStatus) missingStatus++;
}

for (const [status, count] of Object.entries(statusCounts).sort((a,b) => b[1]-a[1])) {
  console.log(`  stockStatus="${status === '__missing__' ? '(none)' : status}": ${count} מוצרים`);
}

const inStockStatus = allProducts.filter(p => p.stockStatus === 'in_stock');
console.log(`\nמוצרים עם stockStatus='in_stock': ${inStockStatus.length}`);

// cross: in_stock but receivedFromSupplier=0
const inStockNoRecv = inStockStatus.filter(p => !(p.receivedFromSupplier > 0));
console.log(`מתוכם: עם stockStatus='in_stock' אבל receivedFromSupplier=0 (או חסר): ${inStockNoRecv.length}`);
if (inStockNoRecv.length > 0) {
  console.log('\nהפרטים:');
  console.log('─'.repeat(80));
  for (const p of inStockNoRecv.slice(0, 30)) {
    console.log(`  [${p.id.slice(0,12)}] ${(p.name??'').slice(0,40)} | recv=${p.receivedFromSupplier??'—'} inStock=${p.inStock??'—'} stockStatus=${p.stockStatus}`);
  }
  if (inStockNoRecv.length > 30) console.log(`  ... ועוד ${inStockNoRecv.length - 30}`);
}

// Also check for any 'inStock' boolean = true
const inStockBool = allProducts.filter(p => p.inStock === true);
console.log(`\nמוצרים עם inStock=true (boolean): ${inStockBool.length}`);

// Summary
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('סיכום');
console.log('══════════════════════════════════════════════════════════════════════');
console.log(`סה"כ מוצרים:                               ${allProducts.length}`);
console.log(`עם receivedFromSupplier > 0:                ${allProducts.filter(p=>(p.receivedFromSupplier??0)>0).length}`);
console.log(`עם inStock > 0 (מספר):                     ${allProducts.filter(p=>typeof p.inStock==='number'&&p.inStock>0).length}`);
console.log(`עם stockCount > 0:                         ${allProducts.filter(p=>(p.stockCount??0)>0).length}`);
console.log(`עם stockStatus = 'in_stock':                ${inStockStatus.length}`);
console.log(`עם inStock = true (boolean):                ${inStockBool.length}`);

process.exit(0);
