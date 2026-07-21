/**
 * fixTallitotCategory.mjs — תיקון מוצרי הייבוא (טליתות mofet + מארזי חתן rikmat):
 *  1. טליתות: העברה לקטגוריה החיה 'טליתות וציציות'
 *  2. הוספת status='active' לכל מוצרי הייבוא — בלעדיו הם לא נכנסים לאינדקס החיפוש (Algolia)
 *
 * Usage: node app/scripts/fixTallitotCategory.mjs
 */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const __dir = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dir, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) {
  initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf-8'))) });
}
const db = getFirestore();

// טליתות: קטגוריה + סטטוס
const tallitot = await db.collection('products').where('source', '==', 'mofet').get();
if (tallitot.size > 0) {
  const batch = db.batch();
  tallitot.docs.forEach(d => batch.update(d.ref, {
    cat: 'טליתות וציציות',
    category: 'טליתות וציציות',
    status: 'active',
  }));
  await batch.commit();
}
console.log(`✅ ${tallitot.size} טליתות: קטגוריה "טליתות וציציות" + status active`);

// מארזי חתן: סטטוס
const chatan = await db.collection('products').where('source', '==', 'rikmat').get();
if (chatan.size > 0) {
  const batch2 = db.batch();
  chatan.docs.forEach(d => batch2.update(d.ref, { status: 'active' }));
  await batch2.commit();
}
console.log(`✅ ${chatan.size} מארזי חתן: status active`);

console.log('\nעכשיו הרץ: node scripts/syncAlgolia.mjs — ואז החיפוש ימצא אותם.');
process.exit(0);
