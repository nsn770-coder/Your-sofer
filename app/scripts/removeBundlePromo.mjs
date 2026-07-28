import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin (using service account from scripts folder)
const serviceAccount = JSON.parse(
  await import('fs').then(fs =>
    fs.promises.readFile(join(__dirname, 'serviceAccount.json'), 'utf8')
  )
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://your-sofer.firebaseio.com',
});

const db = admin.firestore();

async function removeBundlePromoFromKippot() {
  try {
    console.log('🔍 Searching for kippot items with bundlePromo field...\n');

    // Query all products with cat === 'כיפות'
    const kippotQuery = db.collection('products').where('cat', '==', 'כיפות');
    const kippotSnapshot = await kippotQuery.get();

    if (kippotSnapshot.empty) {
      console.log('❌ No kippot products found.');
      process.exit(0);
    }

    console.log(`📦 Found ${kippotSnapshot.size} kippot products\n`);

    let updated = 0;
    const batch = db.batch();

    // Iterate through each kippot product
    for (const doc of kippotSnapshot.docs) {
      const data = doc.data();
      if (data.bundlePromo) {
        console.log(`✅ ${doc.id} - "${data.name}"\n   Removing bundlePromo: "${data.bundlePromo}"`);
        batch.update(doc.ref, { bundlePromo: admin.firestore.FieldValue.delete() });
        updated++;
      }
    }

    if (updated === 0) {
      console.log('ℹ️  No kippot products have bundlePromo field to remove.');
      process.exit(0);
    }

    // Commit the batch
    console.log(`\n⏳ Committing ${updated} updates...\n`);
    await batch.commit();

    console.log(`✨ Successfully removed bundlePromo from ${updated} kippot products!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
removeBundlePromoFromKippot();
