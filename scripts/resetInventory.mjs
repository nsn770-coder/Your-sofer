import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sa = require(path.join(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'));

initializeApp({ credential: cert(sa) });
const db = getFirestore();

// ── 1. Reset all products ─────────────────────────────────────────────────────
console.log('שולף מוצרים...');
const productsSnap = await db.collection('products').get();
console.log(`נמצאו ${productsSnap.size} מוצרים`);

const BATCH_SIZE = 500;
let productBatches = 0;
let productCount = 0;
const productDocs = productsSnap.docs;

for (let i = 0; i < productDocs.length; i += BATCH_SIZE) {
  const batch = db.batch();
  const chunk = productDocs.slice(i, i + BATCH_SIZE);
  for (const d of chunk) {
    batch.update(d.ref, { receivedFromSupplier: 0, inStock: 0 });
    productCount++;
  }
  await batch.commit();
  productBatches++;
  console.log(`  batch ${productBatches}: עדכן ${chunk.length} מוצרים (סה"כ ${productCount})`);
}

// ── 2. Delete all invoices ────────────────────────────────────────────────────
console.log('\nשולף חשבוניות...');
const invoicesSnap = await db.collection('invoices').get();
console.log(`נמצאו ${invoicesSnap.size} חשבוניות`);

let invoiceCount = 0;
const invoiceDocs = invoicesSnap.docs;

for (let i = 0; i < invoiceDocs.length; i += BATCH_SIZE) {
  const batch = db.batch();
  const chunk = invoiceDocs.slice(i, i + BATCH_SIZE);
  for (const d of chunk) {
    batch.delete(d.ref);
    invoiceCount++;
  }
  await batch.commit();
  console.log(`  מחק ${chunk.length} חשבוניות (סה"כ ${invoiceCount})`);
}

console.log('\n══════════════════════════════════════');
console.log(`✓ מוצרים אופסו:    ${productCount}`);
console.log(`✓ חשבוניות נמחקו:  ${invoiceCount}`);
console.log('orders — לא נגענו');
process.exit(0);
