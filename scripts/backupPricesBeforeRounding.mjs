/**
 * backupPricesBeforeRounding.mjs
 * Snapshot of every product's price-related fields, taken before the
 * whole-shekel rounding migration. Read-only — writes nothing to Firestore.
 *
 * Usage: node scripts/backupPricesBeforeRounding.mjs
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SA_PATH = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

const FIELDS = ['price', 'was', 'salePrice', 'clearanceSalePrice'];

async function run() {
  console.log('📥 שולף מוצרים מ-Firestore...');
  const snap = await db.collection('products').get();
  console.log(`📦 נמצאו ${snap.size} מוצרים`);

  const products = [];
  snap.forEach(doc => {
    const d = doc.data();
    const entry = { id: doc.id };
    for (const f of FIELDS) {
      entry[f] = d[f] === undefined ? null : d[f];
    }
    products.push(entry);
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = resolve(__dirname, `price-backup-${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    fields: FIELDS,
    count: products.length,
    products,
  }, null, 2), 'utf8');

  console.log(`✅ גיבוי נשמר: ${outPath}`);
  console.log(`   ${products.length} מוצרים, שדות: ${FIELDS.join(', ')}`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
