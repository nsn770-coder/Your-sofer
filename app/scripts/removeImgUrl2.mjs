/**
 * removeImgUrl2.mjs
 * For active products that have imgUrl + imgUrl2 + imgUrl3 + imgUrl4,
 * deletes the imgUrl2 field (duplicate AI image from pipeline running twice).
 *
 * Dry-run (default):
 *   node app/scripts/removeImgUrl2.mjs
 *
 * Apply fixes:
 *   node app/scripts/removeImgUrl2.mjs --fix
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dir = dirname(fileURLToPath(import.meta.url));

const SA_PATH = resolve(__dir, '../../serviceAccountKey.json.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA_PATH) });
const db = getFirestore();

const FIX_MODE = process.argv.includes('--fix');

async function run() {
  console.log(`🔍 מצב: ${FIX_MODE ? '🔧 תיקון (--fix)' : '🔎 dry-run בלבד'}`);
  console.log('📦 טוען מוצרים פעילים...');

  const snap = await db.collection('products').get();
  const active = [];
  snap.forEach(d => { const p = d.data(); if (p.status === 'active') active.push({ ...p, id: d.id }); });
  console.log(`✅ ${active.length} מוצרים פעילים\n`);

  const affected = active.filter(p =>
    p.imgUrl?.trim() && p.imgUrl2?.trim() && p.imgUrl3?.trim() && p.imgUrl4?.trim()
  );

  console.log('════════════════════════════════════════');
  console.log('📋 מוצרים עם imgUrl + imgUrl2 + imgUrl3 + imgUrl4');
  console.log('════════════════════════════════════════');
  console.log(`מוצרים מושפעים: ${affected.length}`);

  console.log('\n🔎 3 דוגמאות:');
  for (const p of affected.slice(0, 3)) {
    console.log(`\n  ${p.name} (${p.cat || '—'})  [${p.id}]`);
    console.log(`    imgUrl:  ${p.imgUrl.slice(0, 70)}...`);
    console.log(`    imgUrl2: ${p.imgUrl2.slice(0, 70)}...  ← יימחק`);
    console.log(`    imgUrl3: ${p.imgUrl3.slice(0, 70)}...`);
    console.log(`    imgUrl4: ${p.imgUrl4.slice(0, 70)}...`);
  }

  if (!FIX_MODE) {
    console.log('\n💡 הרץ עם --fix כדי למחוק imgUrl2 מכל המוצרים האלה:');
    console.log('   node app/scripts/removeImgUrl2.mjs --fix');
    process.exit(0);
  }

  console.log('\n🔧 מוחק imgUrl2...');
  let done = 0;
  for (const p of affected) {
    await db.collection('products').doc(p.id).update({ imgUrl2: FieldValue.delete() });
    done++;
    if (done % 50 === 0) console.log(`  ${done}/${affected.length}...`);
  }

  console.log(`\n✅ הושלם — imgUrl2 נמחק מ-${done} מוצרים.`);
  process.exit(0);
}

run().catch(err => {
  console.error('❌ שגיאה:', err.message);
  process.exit(1);
});
