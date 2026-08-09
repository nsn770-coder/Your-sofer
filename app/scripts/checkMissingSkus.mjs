/**
 * checkMissingSkus.mjs
 *
 * בודק רשימת SKUs מול הקטלוג בפיירסטור ומדווח מה באמת חסר.
 * לא כותב כלום — בדיקה בלבד.
 *
 * Usage: node app/scripts/checkMissingSkus.mjs [scripts/missing-skus.json]
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                 from 'firebase-admin/firestore';
import { readFileSync, writeFileSync }  from 'fs';
import { resolve, dirname }             from 'path';
import { fileURLToPath }                from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '../..');
const LIST_PATH = resolve(ROOT, process.argv[2] || 'scripts/missing-skus.json');

if (getApps().length === 0) {
  initializeApp({ credential: cert(JSON.parse(
    readFileSync(resolve(ROOT, 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'))) });
}
const db = getFirestore();

(async () => {
  const wanted = JSON.parse(readFileSync(LIST_PATH, 'utf8')).map(s => String(s).trim().toUpperCase());
  console.log(`רשימה לבדיקה: ${wanted.length} SKUs\n`);

  // שליפת כל הקטלוג פעם אחת — זול יותר מ-186 שאילתות נפרדות
  const snap = await db.collection('products').get();
  const bySku = new Map();
  snap.forEach(d => {
    const p = d.data();
    if (typeof p.sku === 'string') bySku.set(p.sku.trim().toUpperCase(), { id: d.id, ...p });
  });
  console.log(`הקטלוג: ${snap.size} מוצרים, מתוכם ${bySku.size} עם SKU\n`);

  const exists = [], missing = [];
  for (const sku of wanted) {
    const p = bySku.get(sku);
    if (p) exists.push({ sku, id: p.id, name: p.name, hidden: p.hidden, status: p.status, hasImg: !!p.imgUrl, cat: p.cat });
    else missing.push(sku);
  }

  console.log('══ תוצאה ══');
  console.log(`  כבר קיימים אצלנו:  ${exists.length}`);
  console.log(`  באמת חסרים:        ${missing.length}\n`);

  if (exists.length) {
    // הקיימים — האם הם בכלל גלויים ללקוח?
    const hiddenCount = exists.filter(p => p.hidden === true).length;
    const noImg       = exists.filter(p => !p.hasImg).length;
    console.log(`  מתוך הקיימים:`);
    console.log(`    מוסתרים מהאתר:  ${hiddenCount}`);
    console.log(`    בלי תמונה:      ${noImg}`);
    console.log(`    גלויים ותקינים: ${exists.length - hiddenCount - noImg}\n`);
    console.log('  דוגמאות:');
    for (const p of exists.slice(0, 5)) {
      console.log(`    ${p.sku} | hidden=${p.hidden} status=${p.status} img=${p.hasImg ? '✓' : '✗'} | ${(p.name || '').slice(0, 40)}`);
    }
  }

  if (missing.length) {
    console.log('\n  חסרים (10 ראשונים):');
    for (const s of missing.slice(0, 10)) console.log(`    ${s}`);
    const out = resolve(ROOT, 'scripts/truly-missing-skus.json');
    writeFileSync(out, JSON.stringify(missing, null, 2), 'utf8');
    console.log(`\n  📄 נשמר: ${out}`);
  }
  process.exit(0);
})();
