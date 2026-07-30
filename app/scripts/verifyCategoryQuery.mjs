/**
 * verifyCategoryQuery.mjs
 *
 * מריץ בדיוק את השאילתה שעמוד הקטגוריה מריץ (CategoryClient.tsx:1338):
 *     where('cat','==',cat) + orderBy('priority','desc')
 *
 * המטרה: לאמת שמוצרים לא נופלים בגלל שדה מיון חסר, במקום לנחש.
 *
 * node app/scripts/verifyCategoryQuery.mjs
 * node app/scripts/verifyCategoryQuery.mjs "בתי מזוזה"
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

const CAT = process.argv[2] || 'ספרי קודש וברכונים';

async function main() {
  console.log(`\n🔍 קטגוריה: "${CAT}"\n`);

  // 1. כמה מוצרים בקטגוריה בסך הכל (בלי מיון)
  const plain = await db.collection('products').where('cat', '==', CAT).get();

  // 2. מה שהעמוד באמת מקבל — עם orderBy
  const ordered = await db.collection('products')
    .where('cat', '==', CAT)
    .orderBy('priority', 'desc')
    .limit(1000)
    .get();

  console.log(`   בקטגוריה (בלי מיון):        ${plain.size}`);
  console.log(`   מה שהעמוד מקבל (orderBy):   ${ordered.size}`);

  const gap = plain.size - ordered.size;
  if (gap > 0) {
    console.log(`\n   ⚠️  ${gap} מוצרים נופלים — חסר להם priority:`);
    const orderedIds = new Set(ordered.docs.map(d => d.id));
    plain.docs.filter(d => !orderedIds.has(d.id)).slice(0, 10)
      .forEach(d => console.log(`      · ${d.data().name}`));
  } else {
    console.log('\n   ✅ אין פער — כל מוצרי הקטגוריה מגיעים לעמוד');
  }

  // 3. פירוט לפי ספק ותת-קטגוריה
  const bySupplier = {};
  const bySub = {};
  ordered.forEach(d => {
    const p = d.data();
    bySupplier[p.supplier || '(ללא ספק)'] = (bySupplier[p.supplier || '(ללא ספק)'] || 0) + 1;
    bySub[p.subCategory || '(ללא תת)'] = (bySub[p.subCategory || '(ללא תת)'] || 0) + 1;
  });

  console.log('\n   לפי ספק:');
  Object.entries(bySupplier).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`      ${k}: ${v}`));

  console.log('\n   לפי תת-קטגוריה:');
  Object.entries(bySub).sort((a, b) => b[1] - a[1]).slice(0, 15)
    .forEach(([k, v]) => console.log(`      ${k}: ${v}`));

  // 4. שלמות נתונים במוצרים שיוצגו
  let noImg = 0, noPrice = 0, hidden = 0;
  ordered.forEach(d => {
    const p = d.data();
    if (!p.imgUrl && !p.image_url) noImg++;
    if (!p.price || p.price <= 0) noPrice++;
    if (p.hidden === true) hidden++;
  });

  console.log('\n   שלמות:');
  console.log(`      בלי תמונה: ${noImg}`);
  console.log(`      בלי מחיר:  ${noPrice}`);
  console.log(`      מוסתרים:   ${hidden}`);
  console.log(`      → יוצגו בפועל: ${ordered.size - hidden}\n`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
