/**
 * fixHagimCat.mjs
 * מעדכן cat="חגים" לכל מוצר שה-subCategory שלו הוא אחד מחגי ישראל
 * הרץ: node scripts/fixHagimCat.mjs [--execute]
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');

const SA_PATH = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (!getApps().length) initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

const HAG_SUBCATS = new Set(['חנוכה', 'פסח', 'סוכות', 'פורים', 'ראש השנה']);

async function main() {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  fixHagimCat — ${EXECUTE ? '🚀 EXECUTE' : '🧪 DRY-RUN'}`);
  console.log(`════════════════════════════════════════\n`);

  const snap = await db.collection('products').get();
  const toFix = snap.docs.filter(d => {
    const data = d.data();
    return HAG_SUBCATS.has(data.subCategory) && data.cat !== 'חגים';
  });

  console.log(`נמצאו ${toFix.length} מוצרים לעדכון\n`);

  if (!EXECUTE) {
    console.log('🧪 DRY-RUN — לא עודכן כלום. הוסף --execute להרצה אמיתית.');
    for (const d of toFix.slice(0, 10)) {
      const p = d.data();
      console.log(`  • "${(p.name||'').slice(0,40)}" | cat="${p.cat??'(חסר)'}" → "חגים" | sub="${p.subCategory}"`);
    }
    if (toFix.length > 10) console.log(`  ... ועוד ${toFix.length - 10}`);
    process.exit(0);
  }

  // עדכון ב-batches של 500
  let updated = 0, failed = 0;
  const BATCH_SIZE = 500;
  for (let i = 0; i < toFix.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = toFix.slice(i, i + BATCH_SIZE);
    for (const d of chunk) batch.update(d.ref, { cat: 'חגים' });
    try {
      await batch.commit();
      updated += chunk.length;
      console.log(`  ✅ עודכנו ${updated}/${toFix.length}`);
    } catch (e) {
      failed += chunk.length;
      console.error(`  ❌ שגיאה ב-batch ${i}:`, e.message);
    }
  }

  console.log(`\n════════════════════════════════════════`);
  console.log(`✅ הושלם: ${updated} עודכנו, ${failed} נכשלו`);
  console.log(`════════════════════════════════════════\n`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
