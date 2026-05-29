// checkTefillin.mjs
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const snap = await db.collection('products')
  .where('category', '==', 'קלפי תפילין')
  .limit(2)
  .get();

snap.docs.forEach(doc => {
  const d = doc.data();
  console.log('\n─────────────────────────');
  console.log('ID:', doc.id);
  console.log('שם:', d.name);
  console.log('תיאור:', d.description?.substring(0, 200));
  console.log('descriptionUpdatedAt:', d.descriptionUpdatedAt);
  console.log('descriptionSource:', d.descriptionSource);
});
