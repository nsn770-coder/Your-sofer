import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const SA_PATH = resolve(__dir, '../../serviceAccountKey.json.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA_PATH) });
const db = getFirestore();

async function run() {
  console.log('📦 טוען מוצרים פעילים...');
  const snap = await db.collection('products').get();
  const toFix = [];
  snap.forEach(d => {
    const p = { ...d.data(), id: d.id };
    if (p.status === 'active' && p.imgUrl2?.trim() && p.imgUrl3?.trim() && p.imgUrl4?.trim()) {
      toFix.push(p.id);
    }
  });
  console.log(`🔧 מוצרים לתיקון: ${toFix.length}`);

  let done = 0;
  for (const id of toFix) {
    await db.collection('products').doc(id).update({ imgUrl3: FieldValue.delete() });
    done++;
    if (done % 100 === 0) console.log(`  ${done}/${toFix.length}...`);
  }
  console.log(`\n✅ הושלם — imgUrl3 נמחק מ-${done} מוצרים.`);
  process.exit(0);
}

run().catch(err => { console.error('❌ שגיאה:', err.message); process.exit(1); });
