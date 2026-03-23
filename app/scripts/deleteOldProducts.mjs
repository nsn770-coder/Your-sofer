import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  await import('fs').then(fs => fs.promises.readFile(join(__dirname, 'serviceAccount.json'), 'utf8'))
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function deleteOldProducts() {
  const snapshot = await db.collection('products').get();
  let deleted = 0;
  for (const doc of snapshot.docs) {
    const d = doc.data();
    const hasBadge = d.badge && d.badge.length > 30;
    const noImage = !d.imgUrl;
    if (hasBadge && noImage) {
      await db.collection('products').doc(doc.id).delete();
      deleted++;
      if (deleted % 10 === 0) console.log('נמחקו: ' + deleted);
    }
  }
  console.log('סיום! נמחקו: ' + deleted);
  process.exit(0);
}

deleteOldProducts().catch(e => { console.error(e); process.exit(1); });
