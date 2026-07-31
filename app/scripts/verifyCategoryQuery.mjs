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

  // 2. אותה שאילתה בלי limit — מבדיל בין שתי סיבות שונות לפער:
  //    (א) מסמך בלי priority → Firestore מחריג אותו לגמרי
  //    (ב) יותר מ-1000 מוצרים  → נחתך ע"י ה-limit של העמוד
  const orderedAll = await db.collection('products')
    .where('cat', '==', CAT)
    .orderBy('priority', 'desc')
    .get();

  const PAGE_LIMIT = 1000;
  const delivered = Math.min(orderedAll.size, PAGE_LIMIT);

  console.log(`   בקטגוריה (בלי מיון):        ${plain.size}`);
  console.log(`   עוברים את orderBy:          ${orderedAll.size}`);
  console.log(`   מה שהעמוד מקבל (limit ${PAGE_LIMIT}): ${delivered}`);

  const missingPriority = plain.size - orderedAll.size;
  const cutByLimit = orderedAll.size - delivered;

  if (missingPriority > 0) {
    console.log(`\n   ❌ ${missingPriority} מוצרים חסרי priority — בלתי נראים לחלוטין:`);
    const ids = new Set(orderedAll.docs.map(d => d.id));
    plain.docs.filter(d => !ids.has(d.id)).slice(0, 10)
      .forEach(d => console.log(`      · ${d.data().name}`));
    console.log('      → תיקון: הוסף priority (ברירת מחדל 50)');
  } else {
    console.log('\n   ✅ לכל המוצרים יש priority');
  }

  if (cutByLimit > 0) {
    console.log(`\n   ⚠️  ${cutByLimit} מוצרים נחתכים ע"י limit(${PAGE_LIMIT}) בעמוד הקטגוריה`);
    console.log('      → אלה המוצרים עם ה-priority הנמוך; הם לא נגישים בגלילה');
  }

  // 3. פירוט לפי ספק ותת-קטגוריה
  const ordered = orderedAll;
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
