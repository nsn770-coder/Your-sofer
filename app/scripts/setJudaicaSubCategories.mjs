// setJudaicaSubCategories.mjs
// עובר על כל מוצרי יודאיקה ומגדיר subCategory לפי שם המוצר:
//   "חנוכי"      → "חנוכיות"
//   "פמוט"       → "פמוטים"
//   "מנורה"      → "מנורות"
//   "כוס"/"גביע" → "כוסות קידוש"
//
// מצב בדיקה (ללא כתיבה):
//   node app/scripts/setJudaicaSubCategories.mjs --test
// ריצה אמיתית:
//   node app/scripts/setJudaicaSubCategories.mjs

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ══ Firebase Admin ══
const serviceAccount = resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const TEST = process.argv.includes('--test');

if (TEST) {
  console.log('🧪 מצב בדיקה — ללא כתיבה ל-Firestore\n');
} else {
  console.log('🚀 מצב ריצה אמיתית — כותב ל-Firestore\n');
}

// ══ כללי ה-mapping ══
function resolveSubCategory(name) {
  if (!name) return null;
  if (name.includes('חנוכי')) return 'חנוכיות';
  if (name.includes('פמוט'))  return 'פמוטים';
  if (name.includes('מנורה')) return 'מנורות';
  if (name.includes('כוס') || name.includes('גביע')) return 'כוסות קידוש';
  return null;
}

// ══ שלב 1: שליפת כל מוצרי יודאיקה ══
const snap = await db.collection('products')
  .where('cat', '==', 'יודאיקה')
  .get();

console.log(`📦 סה"כ מוצרי יודאיקה: ${snap.size}\n`);

// ══ שלב 2: ספירת מוצרים עם "חנוכי" ובלי subCategory ══
const chanukiNoSub = snap.docs.filter(d => {
  const data = d.data();
  const name = data.name || '';
  return name.includes('חנוכי') && !data.subCategory;
});

console.log(`🕎 מוצרים עם "חנוכי" בשם וללא subCategory: ${chanukiNoSub.length}`);
if (chanukiNoSub.length > 0 && TEST) {
  chanukiNoSub.forEach(d => console.log(`   • ${d.data().name}`));
}
console.log('');

// ══ שלב 3: עיבוד כל המוצרים ══
let willUpdate   = 0;
let alreadyHas   = 0;
let noMatch      = 0;
let updated      = 0;
let failed       = 0;

const toUpdate = []; // { ref, name, newSubCat, oldSubCat }

for (const docSnap of snap.docs) {
  const data = docSnap.data();
  const name = data.name || '';
  const newSubCat = resolveSubCategory(name);

  if (!newSubCat) {
    noMatch++;
    continue;
  }

  if (data.subCategory === newSubCat) {
    alreadyHas++;
    continue;
  }

  toUpdate.push({
    ref:       db.collection('products').doc(docSnap.id),
    name,
    newSubCat,
    oldSubCat: data.subCategory || '—',
  });
  willUpdate++;
}

// ══ שלב 4: הדפס תצוגה מקדימה ══
console.log(`📊 סיכום לפני עדכון:`);
console.log(`   ✏️  יעודכנו:         ${willUpdate}`);
console.log(`   ✅ כבר מוגדר נכון:  ${alreadyHas}`);
console.log(`   ⏭  ללא התאמה:       ${noMatch}`);
console.log('');

if (toUpdate.length > 0) {
  // קיבוץ לפי subCategory חדשה
  const byNewCat = {};
  for (const item of toUpdate) {
    if (!byNewCat[item.newSubCat]) byNewCat[item.newSubCat] = [];
    byNewCat[item.newSubCat].push(item);
  }

  for (const [cat, items] of Object.entries(byNewCat)) {
    console.log(`📂 ${cat} (${items.length} מוצרים):`);
    for (const item of items) {
      const oldLabel = item.oldSubCat !== '—' ? ` [היה: ${item.oldSubCat}]` : '';
      console.log(`   • ${item.name}${oldLabel}`);
    }
    console.log('');
  }
}

if (TEST) {
  console.log('🧪 זו הייתה ריצת בדיקה. הפעל ללא --test לעדכון אמיתי.');
  process.exit(0);
}

// ══ שלב 5: כתוב לFirestore ══
console.log('⏳ מעדכן Firestore...\n');

for (const item of toUpdate) {
  try {
    await item.ref.update({ subCategory: item.newSubCat });
    console.log(`   ✅ ${item.name} → ${item.newSubCat}`);
    updated++;
  } catch (err) {
    console.log(`   ❌ ${item.name} — שגיאה: ${err.message}`);
    failed++;
  }
}

console.log(`\n══════════════════════════════════`);
console.log(`🎉 סיום!`);
console.log(`✅ עודכנו:       ${updated}`);
console.log(`⏭  ללא שינוי:    ${alreadyHas + noMatch}`);
console.log(`❌ נכשלו:        ${failed}`);

process.exit(0);
