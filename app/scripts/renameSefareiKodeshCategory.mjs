/**
 * renameSefareiKodeshCategory.mjs
 *
 * שני שינויים בפעולה אחת:
 *   1. שינוי שם הקטגוריה:  "ספרי קודש וסידורים"  →  "ספרי קודש וברכונים"
 *   2. העברת מוצרי סימחונים שנכנסו ל-"מתנות" (מזכרות/ברכונים) לקטגוריה החדשה
 *
 * למה ההעברה חשובה: בורר ההטבעה ב-ProductClient מופעל לפי הקטגוריה
 * (EMBOSSING_CATEGORIES). מוצר ב-"מתנות" לא מקבל אותו; בקטגוריה החדשה כן.
 *
 * ⚠️ אחרי הריצה חייבים:
 *      • deploy (השם מוקשח בקוד — הוחלף במקביל)
 *      • סנכרון Algolia:  node scripts/syncAlgolia.mjs
 *      • ה-301 מה-URL הישן כבר קיים ב-next.config.ts
 *
 * node app/scripts/renameSefareiKodeshCategory.mjs --dry-run
 * node app/scripts/renameSefareiKodeshCategory.mjs --yes
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const raw = readFileSync(resolve(__dirname, '../../.env.local'), 'utf8');
  const vars = {};
  let key = null, val = [];
  for (const l of raw.split('\n')) {
    const m = l.trimEnd().match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    if (m) { if (key) vars[key] = val.join('\n'); key = m[1]; val = [m[2]]; }
    else if (key) val.push(l.trimEnd());
  }
  if (key) vars[key] = val.join('\n');
  return vars;
}

const env = loadEnv();
let pk = env['FIREBASE_PRIVATE_KEY']?.trim();
if (pk?.startsWith('"')) pk = pk.slice(1, -1);
pk = pk?.replace(/\\n/g, '\n');

initializeApp({
  credential: cert({
    projectId: env['FIREBASE_PROJECT_ID'],
    clientEmail: env['FIREBASE_CLIENT_EMAIL'],
    privateKey: pk,
  }),
});
const db = getFirestore();

const OLD_CAT = 'ספרי קודש וסידורים';
const NEW_CAT = 'ספרי קודש וברכונים';

const isDry = process.argv.includes('--dry-run');

async function confirm(msg) {
  if (process.argv.includes('--yes')) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(msg + ' (y/n) ', a => { rl.close(); r(a.toLowerCase() === 'y'); }));
}

/** כתיבה בבאצ'ים של 400 (מתחת לתקרת 500 של Firestore) */
async function commitAll(docs, buildUpdate, label) {
  let n = 0;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    for (const d of docs.slice(i, i + 400)) {
      batch.set(d.ref, buildUpdate(d), { merge: true });
      n++;
    }
    await batch.commit();
    console.log(`   ${label}: ${n}/${docs.length}`);
  }
  return n;
}

async function main() {
  console.log(`\n🔤 "${OLD_CAT}" → "${NEW_CAT}"\n`);

  // ── 1. כל המוצרים בקטגוריה הישנה ──
  const renameSnap = await db.collection('products').where('cat', '==', OLD_CAT).get();
  console.log(`1️⃣  ${renameSnap.size} מוצרים בקטגוריה הישנה`);

  // ── 2. מוצרי סימחונים שנכנסו ל-"מתנות" ──
  const giftSnap = await db.collection('products')
    .where('supplier', '==', 'simchonim')
    .where('cat', '==', 'מתנות')
    .get();
  console.log(`2️⃣  ${giftSnap.size} מוצרי סימחונים ב-"מתנות" שיעברו לקטגוריה החדשה`);

  if (giftSnap.size) {
    console.log('\n   דוגמאות:');
    giftSnap.docs.slice(0, 8).forEach(d =>
      console.log(`     · ${d.data().name}  (תת: ${d.data().subCategory || '-'})`)
    );
  }

  const total = renameSnap.size + giftSnap.size;
  console.log(`\n📊 סה"כ ${total} מוצרים יעודכנו`);

  if (isDry) { console.log('\n✅ dry-run — לא נכתב כלום'); return; }
  if (total === 0) { console.log('\nאין מה לעדכן'); return; }
  if (!(await confirm('\n💾 לבצע?'))) { console.log('❌ בוטל'); return; }

  console.log('');
  let n = 0;

  // שינוי שם: cat בלבד, תת-הקטגוריה נשמרת
  n += await commitAll(renameSnap.docs, () => ({
    cat: NEW_CAT,
    categoryRenamedAt: new Date(),
  }), 'שינוי שם');

  // העברה: cat + תיוג שהמוצר הועבר, כדי שיהיה ניתן לאתר/להחזיר
  n += await commitAll(giftSnap.docs, d => ({
    cat: NEW_CAT,
    previousCat: 'מתנות',
    categoryMovedAt: new Date(),
  }), 'העברה');

  console.log(`\n✅ ${n} מוצרים עודכנו`);
  console.log('\n⚠️  להשלמה:');
  console.log('   1. git push  (שם הקטגוריה מוקשח בקוד)');
  console.log('   2. node scripts/syncAlgolia.mjs');
}

main().catch(e => { console.error('❌', e); process.exit(1); });
