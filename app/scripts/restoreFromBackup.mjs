/**
 * restoreFromBackup.mjs  —  מחזיר מוצרים שנמחקו, מקובץ גיבוי, עם ה-ID המקורי.
 *
 * שימוש:
 *   node app/scripts/restoreFromBackup.mjs <backup.json>             ← DRY-RUN
 *   node app/scripts/restoreFromBackup.mjs <backup.json> --execute   ← שחזור בפועל
 *   node app/scripts/restoreFromBackup.mjs <backup.json> --only <id1,id2>   ← שחזור חלקי
 *
 * דוגמה:
 *   node app/scripts/restoreFromBackup.mjs scripts/deleted-no-code-backup-1783484948033.json --execute
 *
 * הערה: משחזר את מסמך המוצר בלבד (כל השדות המקוריים). לא נוגע בהזמנות/תמונות.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';
import { readFileSync }                   from 'fs';
import { resolve, dirname }               from 'path';
import { fileURLToPath }                  from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '../..');

const args    = process.argv.slice(2);
const file    = args.find(a => !a.startsWith('--') && a !== args[args.indexOf('--only') + 1]);
const EXECUTE = args.includes('--execute');
const onlyIdx = args.indexOf('--only');
const onlyIds = onlyIdx !== -1 ? new Set((args[onlyIdx + 1] || '').split(',').map(s => s.trim()).filter(Boolean)) : null;

if (!file) { console.error('❌ ציין קובץ גיבוי: node app/scripts/restoreFromBackup.mjs <backup.json> [--execute]'); process.exit(1); }

const SA_PATH = resolve(ROOT, 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

const backup = JSON.parse(readFileSync(resolve(ROOT, file), 'utf8'));
let products = backup.products || backup.items || (Array.isArray(backup) ? backup : []);
if (onlyIds) products = products.filter(p => onlyIds.has(p.id));

console.log(`מצב: ${EXECUTE ? '🚀 EXECUTE' : '🧪 DRY-RUN'} | לשחזור: ${products.length} מוצרים${onlyIds ? ` (מסונן ל-${onlyIds.size} IDs)` : ''}`);
products.slice(0, 15).forEach(p => console.log(`   ${p.id}  ${(p.name || '').slice(0, 45)}`));

if (!EXECUTE) { console.log('\n🧪 DRY-RUN — לא שוחזר כלום. הוסף --execute לביצוע.'); process.exit(0); }

const BATCH = 400;
let done = 0;
for (let i = 0; i < products.length; i += BATCH) {
  const chunk = products.slice(i, i + BATCH);
  const batch = db.batch();
  for (const p of chunk) {
    const { id, ...data } = p;
    batch.set(db.collection('products').doc(id), data);   // set = יוצר מחדש עם אותו ID
  }
  await batch.commit();
  done += chunk.length;
  process.stdout.write(`   ${done}/${products.length} שוחזרו\r`);
}
console.log(`\n✅ שוחזרו ${done} מוצרים עם ה-ID המקורי.`);
process.exit(0);
