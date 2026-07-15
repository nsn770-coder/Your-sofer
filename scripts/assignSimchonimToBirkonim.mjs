/**
 * assignSimchonimToBirkonim.mjs
 * משייך את כל מוצרי שמחונים שהם ברכונים/זמירות לסקרול "ברכונים" (birkonim)
 * בעמוד /event-kippot.
 *
 * Usage:
 *   node scripts/assignSimchonimToBirkonim.mjs             ← DRY-RUN
 *   node scripts/assignSimchonimToBirkonim.mjs --execute   ← ביצוע
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');
const SECTION = 'birkonim';
const NAME_KEYWORDS = ['ברכון', 'זמירות'];

const sa = JSON.parse(
  readFileSync(resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8')
);
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function main() {
  console.log(`\n🚀 assignSimchonimToBirkonim ${EXECUTE ? '— EXECUTE' : '— DRY-RUN'}\n`);

  const snap = await db.collection('products').where('source', '==', 'simchonim').get();
  console.log(`🗃️  ${snap.size} מוצרי simchonim ב-Firestore\n`);

  let updated = 0, skipped = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const isBirkon = NAME_KEYWORDS.some((k) => (d.name ?? '').includes(k));
    if (!isBirkon) {
      console.log(`⏭️  לא ברכון/זמירות — מדלג: ${d.name}`);
      skipped++;
      continue;
    }
    if (d.eventScrollSection === SECTION) {
      console.log(`✔️  כבר משויך: ${d.name}`);
      continue;
    }
    if (EXECUTE) await doc.ref.update({ eventScrollSection: SECTION });
    updated++;
    console.log(`${EXECUTE ? '✅' : '🆕'} ${d.name} [${d.sku}] → ${SECTION}`);
  }

  console.log(`\n${EXECUTE ? '✅ עודכנו' : '📋 יעודכנו'}: ${updated} | דולגו: ${skipped}`);
  if (!EXECUTE) console.log('▶️  לביצוע: node scripts/assignSimchonimToBirkonim.mjs --execute\n');
  process.exit(0);
}

main().catch((err) => { console.error('\n❌ Fatal:', err); process.exit(1); });
