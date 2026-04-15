/**
 * Updates cat/category fields for existing paldinox products in Firestore
 * based on paldinox_categorized.json.
 *
 * Run: node scripts/updatePaldinoxCategories.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    const lines = raw.split('\n');
    let key = null, val = '';
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) {
        if (key && !process.env[key]) process.env[key] = val.trim();
        key = m[1]; val = m[2];
      } else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch { }
}
loadEnvLocal();

const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

async function main() {
  console.log('\n🔄 updatePaldinoxCategories\n');

  const products = JSON.parse(
    readFileSync(resolve(__dirname, 'paldinox_categorized.json'), 'utf8')
  );

  // Build map: sourceUrl → cat
  const urlTocat = new Map(products.map(p => [p.url, p.cat]));

  // Load all paldinox docs from Firestore
  console.log('🔍 טוען מוצרי paldinox מ-Firestore...');
  const snap = await db.collection('products').where('source', '==', 'paldinox').get();
  console.log(`   נמצאו ${snap.size} מסמכים\n`);

  const batch_size = 400;
  let updated = 0, skipped = 0, batches = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const correctCat = urlTocat.get(data.sourceUrl);

    if (!correctCat) { skipped++; continue; }
    if (data.cat === correctCat && data.category === correctCat) { skipped++; continue; }

    batch.update(doc.ref, { cat: correctCat, category: correctCat });
    batchCount++;
    updated++;

    if (batchCount === batch_size) {
      await batch.commit();
      batches++;
      console.log(`  📤 batch ${batches} נשלח (${updated} עד כה)`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`  📤 batch אחרון נשלח`);
  }

  console.log(`\n✅ סיום!`);
  console.log(`   עודכנו: ${updated}`);
  console.log(`   דולגו:  ${skipped} (כבר נכון או לא נמצא)`);
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
