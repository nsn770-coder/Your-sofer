/**
 * fixDuplicateImages.mjs
 * Clears the stale `images` array field from 4 products where images[0] === imgUrl.
 * Identified by imageAudit.mjs.
 *
 * Requires: app/scripts/serviceAccountKey.json
 * Run: node app/scripts/fixDuplicateImages.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SA_PATH = resolve(__dirname, './serviceAccountKey.json');

if (getApps().length === 0) initializeApp({ credential: cert(SA_PATH) });
const db = getFirestore();

const DUPLICATE_IDS = [
  '25kT78CtBmI0fpOElEt9', // חנוכיית כסף "אור הנס"
  'ikPPtjqGWgyhH094Rp13', // פמוט זכוכית אפור מעודן
  'qKUqsYnmmbBD4Fa5ckyu', // פמוט זכוכית ענבר לנר
  'zF4h91LrqQilH15VVt0x', // זוג מלחיות קריסטל כוכב בגוון ענבר
];

async function run() {
  console.log(`🔧 מתקן ${DUPLICATE_IDS.length} מוצרים עם תמונות כפולות...`);

  for (const id of DUPLICATE_IDS) {
    await db.collection('products').doc(id).update({ images: FieldValue.delete() });
    console.log(`  ✅ נוקה שדה images ממוצר ${id}`);
  }

  console.log('\n✅ הושלם — שדה images הוסר מכל המוצרים הכפולים.');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ שגיאה:', err.message);
  process.exit(1);
});
