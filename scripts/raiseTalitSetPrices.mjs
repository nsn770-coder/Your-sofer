/**
 * raiseTalitSetPrices.mjs
 * העלאת מחירים לעמוד "סט טלית תפילין" (כיסויי/סטי טלית ותפילין).
 *
 * בחירת המוצרים — זהה 1:1 לשאילתת עמוד הקטגוריה (CategoryClient):
 *   cat == 'סט טלית תפילין'  ∪  subCategory ∈ ['סט טלית תפילין', 'מארז לחתנים']
 *   (מוצרים מוסתרים hidden===true מדולגים)
 *
 * כללי ההעלאה:
 *   price > 800        → ללא שינוי
 *   100 ≤ price ≤ 800  → ‎+40₪ (גם ל-was אם קיים)
 *   50 ≤ price < 100   → ‎+30₪ (גם ל-was אם קיים)
 *   price < 50         → ללא שינוי
 *
 * בטיחות: כותב קובץ גיבוי JSON של כל המוצרים שישתנו לפני הכתיבה.
 *
 * הרצה:  node scripts/raiseTalitSetPrices.mjs --test   (בדיקה — ללא כתיבה)
 *        node scripts/raiseTalitSetPrices.mjs          (החלה אמיתית)
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SA_PATH = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

const CAT = 'סט טלית תפילין';
const SUBCATS = ['סט טלית תפילין', 'מארז לחתנים'];

function toNum(v) {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function deltaFor(price) {
  if (price > 800) return 0;   // מעל 800 — לא נוגעים
  if (price >= 100) return 40;
  if (price >= 50)  return 30;
  return 0;                    // מתחת ל-50 — לא נוגעים
}

async function run() {
  const testMode = process.argv.includes('--test');
  console.log(`🚀 העלאת מחירים — "${CAT}"${testMode ? ' (מצב בדיקה — ללא כתיבה)' : ''}`);

  // אותה בחירה כמו עמוד הקטגוריה
  const [byCat, bySub] = await Promise.all([
    db.collection('products').where('cat', '==', CAT).get(),
    db.collection('products').where('subCategory', 'in', SUBCATS).get(),
  ]);
  const seen = new Map();
  for (const snap of [byCat, bySub]) {
    snap.forEach(d => { if (!seen.has(d.id)) seen.set(d.id, d); });
  }
  console.log(`📦 נמצאו ${seen.size} מוצרים בעמוד (לפני סינון)`);

  const changes = [];
  let skippedHidden = 0, skippedOver800 = 0, skippedUnder50 = 0;

  for (const [id, doc] of seen) {
    const d = doc.data();
    if (d.hidden === true) { skippedHidden++; continue; }
    const price = toNum(d.price);
    if (price === null || price <= 0) continue;

    const delta = deltaFor(price);
    if (delta === 0) {
      if (price > 800) skippedOver800++;
      else skippedUnder50++;
      continue;
    }

    const was = toNum(d.was);
    changes.push({
      id,
      name: d.name ?? '',
      sku: d.sku ?? null,
      before: { price, was },
      after:  { price: price + delta, was: was !== null ? was + delta : null },
      delta,
    });
  }

  const plus40 = changes.filter(c => c.delta === 40).length;
  const plus30 = changes.filter(c => c.delta === 30).length;
  console.log('\n══════════ תוכנית שינוי ══════════');
  console.log(`  +₪40 (מחיר 100–800): ${plus40} מוצרים`);
  console.log(`  +₪30 (מחיר 50–99):   ${plus30} מוצרים`);
  console.log(`  ללא שינוי — מעל ₪800: ${skippedOver800} | מתחת ל-₪50: ${skippedUnder50} | מוסתרים: ${skippedHidden}`);
  console.log('\nדוגמאות:');
  changes.slice(0, 8).forEach(c =>
    console.log(`  [${c.sku ?? c.id}] ${c.name.slice(0, 40)} — ₪${c.before.price} → ₪${c.after.price}${c.before.was ? ` (was ₪${c.before.was} → ₪${c.after.was})` : ''}`));

  if (changes.length === 0) { console.log('אין מה לשנות.'); process.exit(0); }

  // גיבוי לפני כתיבה
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = resolve(__dirname, `talit-set-price-backup-${stamp}.json`);
  writeFileSync(backupPath, JSON.stringify({ generatedAt: new Date().toISOString(), rule: '+40 (100-800), +30 (50-99), was raised by same delta', changes }, null, 2), 'utf8');
  console.log(`\n🗄️ גיבוי נשמר: ${backupPath}`);

  if (testMode) { console.log('🧪 מצב בדיקה — לא נכתב כלום. הרץ בלי --test להחלה.'); process.exit(0); }

  const BATCH = 400;
  for (let i = 0; i < changes.length; i += BATCH) {
    const batch = db.batch();
    for (const c of changes.slice(i, i + BATCH)) {
      const update = { price: c.after.price };
      if (c.after.was !== null) update.was = c.after.was;
      batch.update(db.collection('products').doc(c.id), update);
    }
    await batch.commit();
    console.log(`✅ נכתבו ${Math.min(i + BATCH, changes.length)}/${changes.length}`);
  }

  console.log(`\n🎉 הושלם: ${changes.length} מוצרים עודכנו (+₪40: ${plus40}, +₪30: ${plus30})`);
  console.log('⚠️ לא לשכוח: node scripts/syncAlgolia.mjs כדי שהמיונים לפי מחיר יתעדכנו.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
