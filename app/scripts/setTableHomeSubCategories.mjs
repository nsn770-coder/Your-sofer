// setTableHomeSubCategories.mjs
// מגדיר subCategory למוצרים בקטגוריות "כלי שולחן והגשה" ו"עיצוב הבית"
// (כולל מוצרים עם subCategory "הגשה ואירוח" בכל קטגוריה שהיא)
//
// מצב בדיקה:  node app/scripts/setTableHomeSubCategories.mjs --test
// ריצה אמיתית: node app/scripts/setTableHomeSubCategories.mjs

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const TEST = process.argv.includes('--test');
console.log(TEST ? '🧪 מצב בדיקה — ללא כתיבה\n' : '🚀 מצב ריצה אמיתית — כותב ל-Firestore\n');

// ══ כללי mapping ══
function resolveSubCategory(cat, subCategory, name) {
  const n = name;
  // cat גובר על subCategory — עיצוב הבית תמיד ישתמש בכללי decor
  const isDecor     = cat === 'עיצוב הבית';
  const isTableware = !isDecor && (cat === 'כלי שולחן והגשה' || subCategory === 'הגשה ואירוח');

  if (isTableware) {
    if (n.includes('מגש'))                                        return 'מגשים';
    if (n.includes('כוסות') || n.includes('כוס'))                return 'כוסות';
    if (n.includes('צלחות') || n.includes('צלחת'))               return 'צלחות וקערות';
    if (n.includes('קערה')  || n.includes('קעריות'))             return 'צלחות וקערות';
    if (n.includes('קנקן'))                                       return 'קנקנים';
    if (n.includes('מזלג'))                                       return 'כלי אכילה';
    if (n.includes('פח') && !n.includes('נפח'))                   return 'פחים ומגסים';
    if (n.includes('ספל'))                                        return 'ספלים';
    if (n.includes('מערכת') && n.includes('אוכל'))               return 'מערכות אוכל';
    if (n.includes('מפית'))                                       return 'מפיות';
    if (cat === 'כלי שולחן והגשה')                               return 'כלי הגשה';
    return null;
  }

  if (isDecor) {
    if (n.includes('אגרטל'))                                      return 'אגרטלים';
    if (n.includes('מראה'))                                       return 'מראות';
    if (n.includes('מסגרת'))                                      return 'מסגרות תמונה';
    if (n.includes('פמוט') || n.includes('פמוטי'))               return 'פמוטים';
    if (n.includes('מעמד') && (n.includes('נר') || n.includes('לנר'))) return 'מעמדות לנר';
    if (n.includes('עציץ'))                                       return 'עציצים';
    if (n.includes('ריחני'))                                      return 'נרות ריחניים';
    if (n.includes('קולב') || n.includes('תלייה'))               return 'תלייה וקולבים';
    if (n.includes('עיטור') || n.includes('זר'))                 return 'עיטורים וזרים';
    if (n.includes('קנטייר'))                                     return 'קנטיירים';
    if (n.includes('קופסא') || n.includes('קופסת'))              return 'קופסאות תכשיטים';
    if (n.includes('מעמד') && (n.includes('עציץ') || n.includes('לעציץ'))) return 'עציצים';
    if (n.includes('צנצנת') || n.includes('צנצנות'))             return 'צנצנות';
    if (n.includes('קישוט') || n.includes('כינור') || n.includes('פסנתר') || n.includes('אננס')) return 'קישוטים';
    if (cat === 'עיצוב הבית')                                     return 'אביזרי בית';
    return null;
  }

  return null;
}

// subCategories גנריות שמותר לקאצ'אול לדרוס
const OVERRIDABLE_BY_CATCHALL = new Set([
  'הגשה ואירוח', 'עיצוב הבית', 'שבת', 'פסח', 'חנוכה', ''
]);
const CATCHALL_SUBS = new Set(['אביזרי בית', 'כלי הגשה']);

// ══ שליפה ועיבוד ══
const snap = await db.collection('products').get();
const toUpdate = [];
let skippedSameSub    = 0;
let noMatch           = 0;
let notRelevant       = 0;
let protectedSpecific = 0;

for (const d of snap.docs) {
  const data = d.data();
  const cat  = data.cat || '';
  const sub  = data.subCategory || '';
  const name = data.name || '';

  const isRelevant =
    cat === 'כלי שולחן והגשה' ||
    cat === 'עיצוב הבית'       ||
    sub === 'הגשה ואירוח';

  if (!isRelevant) { notRelevant++; continue; }

  const newSub = resolveSubCategory(cat, sub, name);
  if (!newSub)        { noMatch++;        continue; }
  if (sub === newSub) { skippedSameSub++; continue; }

  // קאצ'אול לא ידרוס subCategory ספציפי שכבר הוגדר
  if (CATCHALL_SUBS.has(newSub) && !OVERRIDABLE_BY_CATCHALL.has(sub)) {
    protectedSpecific++;
    continue;
  }

  toUpdate.push({ ref: db.collection('products').doc(d.id), name, cat, oldSub: sub || '—', newSub });
}

// ══ תצוגה מקדימה ══
console.log(`📊 סיכום:`);
console.log(`   ✏️  יעודכנו:          ${toUpdate.length}`);
console.log(`   ✅ כבר נכון:          ${skippedSameSub}`);
console.log(`   ⏭  ללא התאמה:        ${noMatch}`);
console.log(`   🛡️  כבר מסווג:        ${protectedSpecific}`);
console.log(`   🔕 לא רלוונטי:       ${notRelevant}\n`);

// קיבוץ לפי cat → newSub
const byCat = {};
for (const item of toUpdate) {
  const key = item.cat;
  if (!byCat[key]) byCat[key] = {};
  if (!byCat[key][item.newSub]) byCat[key][item.newSub] = [];
  byCat[key][item.newSub].push(item);
}

for (const [cat, subs] of Object.entries(byCat)) {
  const total = Object.values(subs).reduce((s, a) => s + a.length, 0);
  console.log(`📂 ${cat} (${total} יעודכנו):`);
  for (const [sub, items] of Object.entries(subs).sort((a,b) => b[1].length - a[1].length)) {
    console.log(`   → ${sub}: ${items.length} מוצרים`);
    if (TEST) items.slice(0, 3).forEach(i => console.log(`      • [היה: ${i.oldSub}] ${i.name}`));
  }
  console.log('');
}

if (TEST) {
  // הצג גם כמה נשאר ללא התאמה לפי קטגוריה
  const noMatchByCat = {};
  for (const d of snap.docs) {
    const data = d.data();
    const cat  = data.cat || '';
    const sub  = data.subCategory || '';
    const name = data.name || '';
    const isRelevant = cat === 'כלי שולחן והגשה' || cat === 'עיצוב הבית' || sub === 'הגשה ואירוח';
    if (!isRelevant) continue;
    const newSub = resolveSubCategory(cat, sub, name);
    if (newSub && sub !== newSub) continue; // already in toUpdate
    if (!newSub) {
      const k = cat || '(ללא cat)';
      if (!noMatchByCat[k]) noMatchByCat[k] = [];
      noMatchByCat[k].push({ name, sub });
    }
  }
  if (Object.keys(noMatchByCat).length) {
    console.log(`⏭  ללא התאמה לפי קטגוריה:`);
    for (const [cat, items] of Object.entries(noMatchByCat)) {
      console.log(`   ${cat} (${items.length}):`);
      items.slice(0, 6).forEach(i => console.log(`      • [${i.sub || '—'}] ${i.name}`));
      if (items.length > 6) console.log(`      ... ועוד ${items.length - 6}`);
    }
  }
  console.log('\n🧪 זו הייתה ריצת בדיקה. הפעל ללא --test לעדכון אמיתי.');
  process.exit(0);
}

// ══ כתיבה ל-Firestore ══
console.log('⏳ מעדכן Firestore...\n');
let updated = 0, failed = 0;

for (const item of toUpdate) {
  try {
    await item.ref.update({ subCategory: item.newSub });
    console.log(`   ✅ [${item.cat}] ${item.name} → ${item.newSub}`);
    updated++;
  } catch (err) {
    console.log(`   ❌ ${item.name} — ${err.message}`);
    failed++;
  }
}

console.log(`\n══════════════════════════════════`);
console.log(`🎉 סיום!`);
console.log(`✅ עודכנו:    ${updated}`);
console.log(`❌ נכשלו:     ${failed}`);
console.log(`⏭  ללא שינוי: ${skippedSameSub + noMatch}`);

process.exit(0);
