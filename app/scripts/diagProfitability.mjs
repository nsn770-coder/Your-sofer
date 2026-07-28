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

// ── 1. 3 real orders (status != pending_payment) ──────────────────────────
console.log('═══════════════════════════════════════════');
console.log('חלק 1 — הזמנות אמיתיות (3 ראשונות)');
console.log('═══════════════════════════════════════════\n');

const ordSnap = await db.collection('orders')
  .orderBy('createdAt', 'desc')
  .limit(30)
  .get();

let shown = 0;
for (const d of ordSnap.docs) {
  const o = d.data();
  if (o.status === 'pending_payment') continue;
  if (shown >= 3) break;
  shown++;

  // createdAt — show raw type + value
  const cat = o.createdAt;
  let catDesc;
  if (!cat)                         catDesc = '(missing)';
  else if (cat?.toDate)             catDesc = `Timestamp → ${cat.toDate().toISOString()}`;
  else if (typeof cat === 'number') catDesc = `number (millis) → ${new Date(cat).toISOString()}`;
  else if (typeof cat === 'string') catDesc = `string → "${cat}"`;
  else                              catDesc = `unknown: ${JSON.stringify(cat)}`;

  console.log(`── הזמנה ${shown}: ${d.id}`);
  console.log(`   status:    ${o.status}`);
  console.log(`   createdAt: ${catDesc}`);
  console.log(`   items count: ${Array.isArray(o.items) ? o.items.length : '(no items array)'}`);

  if (Array.isArray(o.items) && o.items.length > 0) {
    const item = o.items[0];
    const priceFields = ['price','finalPrice','soferBasePrice','cost','supplierPrice',
                         'purchasePrice','unitPrice','productId','id','productName','name','quantity'];
    console.log('   item[0] — שדות רלוונטיים:');
    for (const f of priceFields) {
      if (item[f] !== undefined) console.log(`     ${f}: ${JSON.stringify(item[f])}`);
    }
    console.log('   item[0] — כל השדות:', Object.keys(item).join(', '));
  } else {
    console.log('   ⚠ אין items');
  }
  console.log('');
}
if (shown === 0) console.log('⚠ לא נמצאו הזמנות שאינן pending_payment\n');

// ── 2. Product price fields — sample 3 products ───────────────────────────
console.log('═══════════════════════════════════════════');
console.log('חלק 2 — שדות מחיר במוצרים (3 דוגמאות)');
console.log('═══════════════════════════════════════════\n');

const prSnap = await db.collection('products').limit(20).get();
const priceKeys = new Set(['price','soferBasePrice','soferPrice','basePrice',
                           'cost','supplierPrice','purchasePrice','was']);
let pShown = 0;
for (const d of prSnap.docs) {
  const p = d.data();
  const found = Object.keys(p).filter(k => priceKeys.has(k));
  if (found.length === 0) continue;
  if (pShown >= 3) break;
  pShown++;
  console.log(`── מוצר: ${p.name?.slice(0,40)}`);
  for (const k of found) console.log(`   ${k}: ${JSON.stringify(p[k])}`);
  console.log('');
}
if (pShown === 0) console.log('⚠ לא נמצאו מוצרים עם שדות מחיר\n');

process.exit(0);
