/**
 * backfillSupplierSourceUrl.mjs
 *
 * משלים שדות שסקריפטי הייבוא לא כתבו, ובלעדיהם המוצרים לא מוצגים:
 *
 *   1. priority  ⚠️ קריטי — שאילתת עמוד הקטגוריה היא
 *        where('cat','==',cat) + orderBy('priority','desc')
 *      ו-Firestore מחריג לגמרי מסמך שחסר בו שדה המיון. בלי priority
 *      המוצר קיים ב-DB אבל בלתי נראה בקטלוג.
 *
 *   2. status: 'active'  — האדמין מסתמך עליו לסינון טיוטות
 *   3. sourceUrl         — טופס עריכת המוצר קורא אותו, הייבוא כתב supplier_url
 *
 * לא דורס ערכים קיימים.
 *
 * node app/scripts/backfillSupplierSourceUrl.mjs            # בדיקה
 * node app/scripts/backfillSupplierSourceUrl.mjs --fix      # ביצוע
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SA_FILE = 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json';
const sa = JSON.parse(readFileSync(resolve(__dirname, '../../', SA_FILE), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const fix = process.argv.includes('--fix');

async function main() {
  const snap = await db.collection('products').where('supplier', '==', 'simchonim').get();
  console.log(`\n📦 ${snap.size} מוצרי simchonim\n`);

  const todo = [];
  const missing = { priority: 0, status: 0, sourceUrl: 0 };

  snap.forEach(d => {
    const p = d.data();
    const update = {};

    // ⚠️ הסיבה שהמוצרים לא הופיעו בקטלוג
    if (p.priority == null) { update.priority = 50; missing.priority++; }
    if (!p.status) { update.status = 'active'; missing.status++; }
    if (!p.sourceUrl && p.supplier_url) { update.sourceUrl = p.supplier_url; missing.sourceUrl++; }

    if (Object.keys(update).length) {
      todo.push({ ref: d.ref, name: p.name, cat: p.cat, update });
    }
  });

  console.log('   שדות חסרים:');
  console.log(`      priority (חוסם תצוגה!): ${missing.priority}`);
  console.log(`      status:                 ${missing.status}`);
  console.log(`      sourceUrl:              ${missing.sourceUrl}`);
  console.log(`\n   מוצרים לעדכון: ${todo.length}\n`);

  if (todo.length === 0) { console.log('✅ אין מה למלא'); return; }

  console.log('דוגמאות:');
  todo.slice(0, 5).forEach(t =>
    console.log(`   · ${t.name}  [${t.cat}]  →  ${Object.keys(t.update).join(', ')}`)
  );

  if (!fix) {
    console.log('\n💡 לביצוע:  node app/scripts/backfillSupplierSourceUrl.mjs --fix');
    return;
  }

  let n = 0;
  for (let i = 0; i < todo.length; i += 400) {
    const batch = db.batch();
    for (const t of todo.slice(i, i + 400)) {
      batch.set(t.ref, t.update, { merge: true });
      n++;
    }
    await batch.commit();
    console.log(`   ${n}/${todo.length}`);
  }

  console.log(`\n✅ ${n} מוצרים עודכנו`);
  console.log('⚠️  להריץ:  node scripts/syncAlgolia.mjs');
}

main().catch(e => { console.error('❌', e); process.exit(1); });
