/**
 * backfillIsraelJudaicaSource.mjs
 *
 * Backfills source/sku/sourceUrl on products that were imported from
 * israel-judaica.com via CSV but never had supplier fields written.
 *
 * Criteria: product has no `source` field AND imgUrl contains "israel-judaica.com"
 * SKU is extracted from the imgUrl filename (e.g. "big/20008.jpg" → "20008")
 *
 * Run: node app/scripts/backfillIsraelJudaicaSource.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I',
  authDomain:        'your-sofer.firebaseapp.com',
  projectId:         'your-sofer',
  storageBucket:     'your-sofer.firebasestorage.app',
  messagingSenderId: '7710397068',
  appId:             '1:7710397068:web:3c9880f24871efd4d661a9',
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

function extractSku(imgUrl) {
  // Matches filenames like "20008.jpg", "20008.webp" — digits only before the extension
  const match = imgUrl.match(/\/(\d+)\.[a-zA-Z]+(?:\?|$)/);
  return match ? match[1] : null;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('🧪 DRY-RUN MODE — Firestore will NOT be modified\n');

  console.log('🔍 טוען מוצרים ללא שדה source...\n');

  const snap = await getDocs(collection(db, 'products'));

  const toUpdate = [];
  snap.forEach(d => {
    const p = d.data();
    if (p.source) return;

    const imgUrl = p.imgUrl || p.image_url || '';
    if (!imgUrl.includes('israel-judaica.com')) return;

    const sku = extractSku(imgUrl);
    if (!sku) return;

    toUpdate.push({ id: d.id, sku, imgUrl });
  });

  console.log(`📦 נמצאו ${toUpdate.length} מוצרים לעדכון\n`);

  if (toUpdate.length === 0) {
    console.log('✅ אין מה לעדכן.');
    process.exit(0);
  }

  if (dryRun) {
    console.log('🔎 Sample (first 5):');
    toUpdate.slice(0, 5).forEach(({ id, sku, imgUrl }) => {
      console.log(`  id: ${id}  |  sku: ${sku}  |  imgUrl: ${imgUrl}`);
    });
    console.log(`\n✅ Dry-run complete. Would update ${toUpdate.length} products.`);
    process.exit(0);
  }

  let updated = 0;
  for (const { id, sku } of toUpdate) {
    const sourceUrl = `https://www.israel-judaica.com/index.php?option=com_art&view=product&sku=${encodeURIComponent(sku)}&lang=he`;
    await updateDoc(doc(db, 'products', id), {
      source:    'israel-judaica',
      sku,
      sourceUrl,
    });
    console.log(`  ✅ Updated product ${id} with sku ${sku}`);
    updated++;
  }

  console.log(`\n🎉 הושלם! עודכנו ${updated} מוצרים.`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ שגיאה:', err.message);
  process.exit(1);
});
