import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require   = createRequire(import.meta.url);
const sa        = require(path.join(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const supplierPrices = JSON.parse(
  readFileSync(path.join(__dirname, '../../scripts/supplier_prices.json'), 'utf8')
);

// 1. How many have source=israel-judaica?
const countSnap = await db.collection('products')
  .where('source', '==', 'israel-judaica')
  .limit(200)
  .get();
console.log(`סה"כ מוצרים source=israel-judaica: ${countSnap.size}\n`);

// 2. Check what price fields they actually have
const priceFields = ['price','purchasePrice','soferBasePrice','cost','supplierPrice','basePrice','was'];
const fieldCounts = Object.fromEntries(priceFields.map(f => [f, 0]));
for (const d of countSnap.docs) {
  const p = d.data();
  priceFields.forEach(f => { if (p[f] !== undefined && p[f] !== null) fieldCounts[f]++; });
}
console.log('כיסוי שדות מחיר (מוצרי israel-judaica):');
for (const [f, n] of Object.entries(fieldCounts)) {
  if (n > 0) console.log(`  ${f.padEnd(16)}: ${n}/${countSnap.size}`);
}

// 3. Show 3 with sku + cross-ref supplier_prices.json (use soferBasePrice as cost proxy)
console.log('\n── 3 דוגמאות עם SKU ──');
let shown = 0;
for (const d of countSnap.docs) {
  if (shown >= 3) break;
  const p = d.data();
  const sku = p.sku || p.supplierCode;
  if (!sku) continue;
  shown++;

  const jsonPrice = supplierPrices[sku] ?? supplierPrices[sku.toUpperCase()] ?? '—';
  console.log(`\n  ${(p.name || d.id).slice(0, 50)}`);
  console.log(`  sku:            ${sku}`);
  console.log(`  price (מכירה):  ${p.price ?? '—'}`);
  console.log(`  soferBasePrice: ${p.soferBasePrice ?? '—'}`);
  console.log(`  purchasePrice:  ${p.purchasePrice ?? '—'}`);
  console.log(`  supplier_prices.json[${sku}]: ${jsonPrice}`);
  if (p.soferBasePrice && jsonPrice !== '—') {
    console.log(`  soferBasePrice / json = ${(p.soferBasePrice / jsonPrice).toFixed(4)}`);
  }
}
if (shown === 0) console.log('⚠ אף מוצר israel-judaica עם SKU לא נמצא');

process.exit(0);
