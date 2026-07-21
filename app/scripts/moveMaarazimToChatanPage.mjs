// moveMaarazimToChatanPage.mjs
// מעביר את המארזים החדשים מ"סט טלית תפילין" לעמוד מארזים לחתן:
//   cat = 'תיקי טלית ותפילין' | subCategory = 'מארז לחתנים'
// (אותו דפוס כמו 60 המארזים הקיימים — importChatanSets.mjs.)
// הם ימשיכו להופיע גם בעמוד "סט טלית תפילין" דרך SUBCATEGORY_GROUPS ב-CategoryClient.
//
// מצב בדיקה (ללא כתיבה):
//   node app/scripts/moveMaarazimToChatanPage.mjs
// ריצה אמיתית:
//   node app/scripts/moveMaarazimToChatanPage.mjs --execute

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const EXECUTE = process.argv.includes('--execute');
console.log(EXECUTE ? '🚀 מצב ריצה אמיתית — כותב ל-Firestore\n' : '🧪 מצב בדיקה — ללא כתיבה\n');

const TARGET_CAT = 'תיקי טלית ותפילין';
const TARGET_SUB = 'מארז לחתנים';
const SOURCE_VALUES = ['סט טלית תפילין', 'סט טלית ותפילין'];

// שליפה לפי cat וגם לפי subCategory (ליתר ביטחון), איחוד לפי id
const snaps = await Promise.all([
  ...SOURCE_VALUES.map(v => db.collection('products').where('cat', '==', v).get()),
  ...SOURCE_VALUES.map(v => db.collection('products').where('subCategory', '==', v).get()),
]);

const seen = new Map();
for (const s of snaps) for (const d of s.docs) seen.set(d.id, d);

const candidates = [...seen.values()].filter(d => {
  const p = d.data();
  return (p.name || '').includes('מארז') && p.subCategory !== TARGET_SUB;
});

console.log(`נמצאו ${candidates.length} מוצרים עם "מארז" בשם:\n`);
for (const d of candidates) {
  const p = d.data();
  console.log(`  • ${p.name}`);
  console.log(`      cat: ${p.cat} → ${TARGET_CAT} | sub: ${p.subCategory ?? '(ריק)'} → ${TARGET_SUB}`);
}

if (!EXECUTE) {
  console.log('\n🧪 לא בוצעה כתיבה. להרצה אמיתית: node app/scripts/moveMaarazimToChatanPage.mjs --execute');
  process.exit(0);
}

const batch = db.batch();
for (const d of candidates) batch.update(d.ref, { cat: TARGET_CAT, subCategory: TARGET_SUB });
await batch.commit();
console.log(`\n✅ עודכנו ${candidates.length} מוצרים.`);
