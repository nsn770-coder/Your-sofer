// setAllSubCategories.mjs
// מגדיר subCategory לכל המוצרים ללא subCategory לפי כללי חומר/סוג
//
// מצב בדיקה (ללא כתיבה):
//   node app/scripts/setAllSubCategories.mjs --test
// ריצה אמיתית:
//   node app/scripts/setAllSubCategories.mjs

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const TEST = process.argv.includes('--test');
console.log(TEST ? '🧪 מצב בדיקה — ללא כתיבה ל-Firestore\n' : '🚀 מצב ריצה אמיתית — כותב ל-Firestore\n');

// ══ כללי ה-mapping לפי cat ══
function resolveSubCategory(cat, name) {
  if (!name) return null;
  const n = name;

  switch (cat) {

    case 'מזוזות':
      if (n.includes('פולימר') || n.includes('בטון') || n.includes('סמנט')) return 'מזוזות פולימר';
      if (n.includes('פלסטיק'))                                               return 'מזוזות פלסטיק';
      if (n.includes('אלומיניום') || n.includes('אלומניום') || n.includes('מתכת')) return 'מזוזות מתכת';
      if (n.includes('עץ'))                                                   return 'מזוזות עץ';
      if (n.includes('זכוכית'))                                               return 'מזוזות זכוכית';
      if (n.includes('אבן'))                                                  return 'מזוזות אבן';
      if (n.includes('כותל'))                                                 return 'מזוזות כותל';
      if (n.includes('אמייל'))                                                return 'מזוזות אמייל';
      if (n.toLowerCase().includes('marble'))                                 return 'מזוזות מרמור';
      if (n.toLowerCase().includes('art deco'))                               return 'מזוזות art deco';
      if (n.includes('אפוקסי'))                                               return 'מזוזות אפוקסי';
      if (n.includes('קריסטל'))                                               return 'מזוזות קריסטל';
      if (n.includes('מוכסף') || n.includes('מוזהב'))                        return 'מזוזות ציפוי';
      if (n.includes('דבק') || n.includes('סטנד') || n.includes('כלי עבודה')) return 'אביזרי מזוזה';
      return null;

    case 'סט טלית תפילין':
      if (n.includes('מדומה') || n.includes('דמוי עור'))                     return 'סטים עור מדומה';
      if (n.includes('בד') || n.includes('פשתן'))                            return 'סטים בד';
      if (n.includes('קטיפה'))                                                return 'סטים קטיפה';
      if (n.includes('תיק') && !n.includes('סט'))                            return 'תיקים';
      if (n.includes('קורדרוי'))                                              return 'סטים קורדרוי';
      if (n.includes('ארוג'))                                                 return 'סטים ארוג';
      if (n.includes('פיו'))                                                  return 'סטים פיו';
      if (n.includes('רקמה'))                                                 return 'סטים רקמה';
      return null;

    case 'כיסוי תפילין':
      if (n.includes('טרמי'))                                                 return 'תיקים טרמי';
      if (n.includes('בתי תפילין'))                                           return 'בתי תפילין';
      return 'תיקי עור מדומה';

    case 'עיצוב הבית':
      if (n.includes('מעמד'))                                                 return 'מעמדות לנר';
      if (n.includes('מגבת'))                                                 return 'מגבות';
      return 'אביזרי עיצוב';

    case 'כלי שולחן והגשה':
      if (n.includes('מחלק'))                                                 return 'מחלקי יין';
      if (n.includes('מגש'))                                                  return 'מגשים';
      return 'סטים';

    case 'בר מצווה':
      if (n.includes('דקה'))                                                  return 'סטים בהמה דקה';
      if (n.includes('גסה'))                                                  return 'סטים בהמה גסה';
      return 'מארזי בר מצווה';

    case 'מגילות':
      return 'מגילת אסתר';

    case 'ספרי תורה':
      return 'ספרי תורה';

    case 'קלפי מזוזה':
      return 'קלפים';

    case 'תפילין קומפלט':
      return 'תפילין קומפלט';

    case 'מתנות':
      if (n.includes('חתן'))                                                  return 'מארזים לחתן';
      if (n.includes('קדושה'))                                                return 'מארזי קדושה';
      return null;

    default:
      return null;
  }
}

// ══ שליפת כל המוצרים ללא subCategory ══
const snap = await db.collection('products').get();

const toUpdate = [];
let alreadyHas = 0;
let noMatch    = 0;

for (const d of snap.docs) {
  const data = d.data();
  if (data.subCategory) { alreadyHas++; continue; }

  const cat      = data.cat || '';
  const name     = data.name || '';
  const newSub   = resolveSubCategory(cat, name);

  if (!newSub) { noMatch++; continue; }

  toUpdate.push({ ref: db.collection('products').doc(d.id), name, cat, newSub });
}

// ══ תצוגה מקדימה: קיבוץ לפי cat → subCategory ══
console.log(`📊 סיכום:`);
console.log(`   ✏️  יעודכנו:        ${toUpdate.length}`);
console.log(`   ✅ כבר יש subCat:   ${alreadyHas}`);
console.log(`   ⏭  ללא התאמה:      ${noMatch}\n`);

// הדפס לפי קטגוריה
const byCat = {};
for (const item of toUpdate) {
  if (!byCat[item.cat]) byCat[item.cat] = {};
  if (!byCat[item.cat][item.newSub]) byCat[item.cat][item.newSub] = [];
  byCat[item.cat][item.newSub].push(item.name);
}

for (const [cat, subs] of Object.entries(byCat)) {
  const total = Object.values(subs).reduce((s, a) => s + a.length, 0);
  console.log(`📂 ${cat} (${total} מוצרים):`);
  for (const [sub, names] of Object.entries(subs)) {
    console.log(`   → ${sub}: ${names.length} מוצרים`);
    if (TEST) names.slice(0, 3).forEach(n => console.log(`      • ${n}`));
  }
  console.log('');
}

// ══ הדפס מוצרים ללא התאמה לפי קטגוריה (ב-test בלבד) ══
if (TEST && noMatch > 0) {
  const noMatchByCat = {};
  for (const d of snap.docs) {
    const data = d.data();
    if (data.subCategory) continue;
    const cat = data.cat || '(ללא קטגוריה)';
    const name = data.name || '';
    if (resolveSubCategory(cat, name)) continue;
    if (!noMatchByCat[cat]) noMatchByCat[cat] = [];
    noMatchByCat[cat].push(name);
  }
  const cats = Object.keys(noMatchByCat);
  if (cats.length) {
    console.log(`\n⏭  ללא התאמה לפי קטגוריה:`);
    for (const [cat, names] of Object.entries(noMatchByCat)) {
      console.log(`   ${cat} (${names.length}):`);
      names.slice(0, 5).forEach(n => console.log(`      • ${n}`));
      if (names.length > 5) console.log(`      ... ועוד ${names.length - 5}`);
    }
    console.log('');
  }
}

if (TEST) {
  console.log('🧪 זו הייתה ריצת בדיקה. הפעל ללא --test לעדכון אמיתי.');
  process.exit(0);
}

// ══ כתיבה ל-Firestore ══
console.log('⏳ מעדכן Firestore...\n');
let updated = 0;
let failed  = 0;

for (const item of toUpdate) {
  try {
    await item.ref.update({ subCategory: item.newSub });
    console.log(`   ✅ [${item.cat}] ${item.name} → ${item.newSub}`);
    updated++;
  } catch (err) {
    console.log(`   ❌ ${item.name} — שגיאה: ${err.message}`);
    failed++;
  }
}

console.log(`\n══════════════════════════════════`);
console.log(`🎉 סיום!`);
console.log(`✅ עודכנו:    ${updated}`);
console.log(`❌ נכשלו:     ${failed}`);
console.log(`⏭  ללא שינוי: ${alreadyHas + noMatch}`);

process.exit(0);
