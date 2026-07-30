/**
 * backfillSupplierSourceUrl.mjs
 *
 * סקריפטי הייבוא כתבו supplier_url, אבל טופס עריכת המוצר באדמין קורא sourceUrl.
 * הסקריפט הזה ממלא sourceUrl מ-supplier_url לכל מוצר מיובא שחסר לו.
 *
 * לא דורס sourceUrl שהוזן ידנית.
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
  let already = 0;

  snap.forEach(d => {
    const p = d.data();
    if (p.sourceUrl) { already++; return; }
    if (p.supplier_url) todo.push({ ref: d.ref, name: p.name, url: p.supplier_url, sku: p.supplier_sku });
  });

  console.log(`   כבר יש sourceUrl: ${already}`);
  console.log(`   דורשים מילוי:     ${todo.length}\n`);

  if (todo.length === 0) { console.log('✅ אין מה למלא'); return; }

  console.log('דוגמאות:');
  todo.slice(0, 5).forEach(t =>
    console.log(`   · ${t.name}  [מק"ט ${t.sku || '-'}]`)
  );

  if (!fix) {
    console.log('\n💡 לביצוע:  node app/scripts/backfillSupplierSourceUrl.mjs --fix');
    return;
  }

  let n = 0;
  for (let i = 0; i < todo.length; i += 400) {
    const batch = db.batch();
    for (const t of todo.slice(i, i + 400)) {
      batch.set(t.ref, { sourceUrl: t.url }, { merge: true });
      n++;
    }
    await batch.commit();
    console.log(`   ${n}/${todo.length}`);
  }

  console.log(`\n✅ ${n} מוצרים עודכנו`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
