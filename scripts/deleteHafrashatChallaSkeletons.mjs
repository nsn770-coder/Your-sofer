/**
 * deleteHafrashatChallaSkeletons.mjs
 *
 * מוחק רק docs שעונים על שני התנאים גם יחד:
 *   1. sku נמצא ברשימת 26 השלדים
 *   2. name ריק OR status !== 'active'  ← בטחון: לא נוגע במוצר תקין
 *
 * Usage:
 *   node scripts/deleteHafrashatChallaSkeletons.mjs --dry-run   ← הצג בלבד
 *   node scripts/deleteHafrashatChallaSkeletons.mjs             ← מחק
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN   = process.argv.includes('--dry-run');

const SA_PATH = process.env.SERVICE_ACCOUNT_PATH
  || resolve(__dirname, '../app/scripts/your-sofer-firebase-adminsdk-fbsvc-dd43a60da9.json');
const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const TARGET_SKUS = new Set([
  'UK51563','UK51675','UK51564','UK51631','UK82327',
  'UK40093','UK66467','UK48864','UK52137','UK89928',
  'UK67311','UK67381','UK67312','UK67313','UK67382',
  'UK67383','UK67379','UK67380','UK66466','UK67000',
  'UK67157','UK67158','UK67159','UK67160','UK80693',
  'UK80698',
]);

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — ללא מחיקה' : '🗑️  LIVE — מוחק מ-Firestore');
  console.log(`מחפש ${TARGET_SKUS.size} SKU...\n`);

  const toDelete = [];

  for (const sku of TARGET_SKUS) {
    const snap = await db.collection('products').where('sku', '==', sku).limit(1).get();
    if (snap.empty) {
      console.log(`  ${sku}  ⚠️  לא נמצא ב-Firestore`);
      continue;
    }
    const doc  = snap.docs[0];
    const data = doc.data();

    const nameEmpty    = !data.name || String(data.name).trim() === '';
    const notActive    = data.status !== 'active';
    const isSkeleton   = nameEmpty || notActive;

    if (!isSkeleton) {
      // בטחון: מוצר עם name + status=active — לא נמחק
      console.log(`  ${sku}  🔒 דולג — name ומעמד תקינים (name="${data.name}", status=${data.status})`);
      continue;
    }

    toDelete.push({ sku, docId: doc.id, name: data.name || '(ריק)', status: data.status || '(ריק)' });
  }

  console.log('\nרשימת מסמכים לְמחיקה:');
  console.log('SKU        docId                        name       status');
  console.log('─'.repeat(70));
  for (const r of toDelete) {
    console.log(
      r.sku.padEnd(10) + ' ' +
      r.docId.padEnd(28) + ' ' +
      String(r.name).slice(0, 10).padEnd(11) +
      r.status
    );
  }
  console.log('─'.repeat(70));
  console.log(`סה"כ למחיקה: ${toDelete.length} מתוך ${TARGET_SKUS.size} מטרות`);

  if (toDelete.length !== 26) {
    console.log(`\n⚠️  צפוי 26 — נמצא ${toDelete.length}. בדוק לפני המשך!`);
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN הסתיים — הפעל ללא --dry-run למחיקה אמיתית.');
    process.exit(0);
  }

  // Live delete
  console.log('\n⏳ מוחק...');
  const batch = db.batch();
  for (const r of toDelete) {
    batch.delete(db.collection('products').doc(r.docId));
  }
  await batch.commit();
  console.log(`✅ נמחקו ${toDelete.length} מסמכים.`);
  process.exit(0);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
