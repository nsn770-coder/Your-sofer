import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Run: node app/scripts/fixKlafSelection.mjs
// This sets hasKlafSelection=true on products where sofer includes "קורנפלד"

const app = initializeApp({ credential: cert('./service-account.json') });
const db = getFirestore(app);

async function fix() {
  const snap = await db.collection('products').where('sofer', '==', 'הרב יעקב קורנפלד').get();
  console.log('Found:', snap.size, 'products');
  for (const doc of snap.docs) {
    await doc.ref.update({ hasKlafSelection: true });
    console.log('Fixed:', doc.id, doc.data().name);
  }
  console.log('Done');
}
fix().catch(console.error);
