/**
 * fixMezuzotCat.mjs — מתקן מוצרי בתי מזוזה שיובאו עם cat="יודאיקה".
 * מעדכן cat + category ל"בתי מזוזה" לכל מוצר עם subCategory של מזוזות.
 *
 * Usage:
 *   node scripts/fixMezuzotCat.mjs            ← DRY-RUN (תצוגה בלבד)
 *   node scripts/fixMezuzotCat.mjs --execute  ← ביצוע
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');

const SA_PATH = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

const MEZUZAH_SUBCATS = new Set([
  'מזוזות זכוכית', 'מזוזות אלומיניום', 'מזוזות פולירזין', 'מזוזות לרכב',
  'מזוזות מתכת', 'מזוזות עץ', 'מזוזות פלסטיק',
]);

const snap = await db.collection('products').get();
const toFix = [];
snap.forEach(d => {
  const p = d.data();
  if (MEZUZAH_SUBCATS.has(p.subCategory) && p.cat !== 'בתי מזוזה') {
    toFix.push({ id: d.id, name: p.name, cat: p.cat, subCategory: p.subCategory });
  }
});

console.log(`\n${EXECUTE ? '🚀 EXECUTE' : '🧪 DRY-RUN'} — נמצאו ${toFix.length} מוצרים לתיקון (cat → "בתי מזוזה")\n`);
toFix.slice(0, 10).forEach(p => console.log(`  • ${(p.name||'').slice(0,50)} | cat="${p.cat}" → "בתי מזוזה" | ${p.subCategory}`));
if (toFix.length > 10) console.log(`  ... ועוד ${toFix.length - 10}`);

if (!EXECUTE) {
  console.log('\n🧪 DRY-RUN — לא עודכן כלום. הוסף --execute לביצוע.\n');
  process.exit(0);
}

let updated = 0;
// batched writes (מקס 500 לבאץ')
for (let i = 0; i < toFix.length; i += 400) {
  const batch = db.batch();
  for (const p of toFix.slice(i, i + 400)) {
    batch.update(db.collection('products').doc(p.id), { cat: 'בתי מזוזה', category: 'בתי מזוזה' });
    updated++;
  }
  await batch.commit();
  console.log(`  ✅ עודכנו ${updated}/${toFix.length}`);
}

console.log(`\n🎉 בוצע! ${updated} מוצרים הועברו ל-cat="בתי מזוזה" ויוצגו בדף הקטגוריה.\n`);
