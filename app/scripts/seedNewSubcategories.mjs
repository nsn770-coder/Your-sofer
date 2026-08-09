/**
 * seedNewSubcategories.mjs
 *
 * יוצר באוסף `categories` את תת-הקטגוריות שנוספו ל-CATEGORY_MAP (08/2026),
 * כדי שמוצרים שייובאו אליהן יהיו משויכים לרשומה קיימת ולא ל"שום מקום".
 *
 * הרשומות נוצרות עם parentCategory, ולכן הן מופיעות גם כאריחי תת-קטגוריה
 * בעמוד הקטגוריה — מיד כשתעלה להן תמונה מהאדמין.
 *
 * מריץ merge: רשומה קיימת לא נדרסת, רק מושלמים שדות חסרים.
 *
 * Usage:
 *   node app/scripts/seedNewSubcategories.mjs            ← DRY-RUN
 *   node app/scripts/seedNewSubcategories.mjs --execute  ← ביצוע
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                 from 'firebase-admin/firestore';
import { readFileSync }                 from 'fs';
import { resolve, dirname }             from 'path';
import { fileURLToPath }                from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '../..');
const EXECUTE   = process.argv.includes('--execute');

if (getApps().length === 0) {
  initializeApp({ credential: cert(JSON.parse(
    readFileSync(resolve(ROOT, 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'))) });
}
const db = getFirestore();

// slug = הערך שאליו מסננים, וחייב להיות זהה ל-subCategory שנכתב על המוצרים
// ב-CATEGORY_MAP. אי-התאמה כאן = אריח שנראה תקין ולא מסנן כלום.
const SUBCATS = [
  { slug: 'קרשי חלה, סכינים ומפיונים', displayName: 'סכינים וקרשי חלה', parentCategory: 'שבת',        priority: 30 },
  { slug: 'מזוזות פלסטיק',              displayName: 'מזוזות אקריליק',    parentCategory: 'בתי מזוזה', priority: 30 },
  { slug: 'הבדלה',                      displayName: 'הבדלה',             parentCategory: 'יודאיקה',   priority: 30 },
  { slug: 'מוצרים לילדים',              displayName: 'מוצרים לילדים',     parentCategory: 'יודאיקה',   priority: 31 },
  { slug: 'כריות לברית',                displayName: 'כריות לברית',       parentCategory: 'יודאיקה',   priority: 32 },
  { slug: 'אביזרי תצוגה',               displayName: 'אביזרי תצוגה',      parentCategory: 'יודאיקה',   priority: 33 },
  { slug: 'סטים ומארזים',               displayName: 'סטים ומארזים',      parentCategory: 'יודאיקה',   priority: 34 },
];

(async () => {
  if (!EXECUTE) console.log('🧪 DRY-RUN — לא נכתב כלום.\n');

  const snap = await db.collection('categories').get();
  const existing = new Map();
  snap.forEach(d => {
    const r = d.data();
    existing.set((r.slug || d.id || '').trim(), { id: d.id, ...r });
  });
  console.log(`אוסף categories: ${snap.size} רשומות\n`);

  let created = 0, updated = 0, skipped = 0;

  for (const c of SUBCATS) {
    const found = existing.get(c.slug);

    if (found) {
      // קיימת — משלימים רק parentCategory אם חסר, בלי לדרוס שם או תמונה
      if (found.parentCategory === c.parentCategory) {
        console.log(`  ⏭  ${c.displayName} — כבר קיימת ומשויכת`);
        skipped++; continue;
      }
      console.log(`  ✏️  ${c.displayName} — קיימת, משלים parentCategory='${c.parentCategory}'`);
      if (EXECUTE) await db.collection('categories').doc(found.id).set(
        { parentCategory: c.parentCategory }, { merge: true });
      updated++; continue;
    }

    console.log(`  ➕ ${c.displayName}  (אב: ${c.parentCategory})`);
    if (EXECUTE) {
      await db.collection('categories').doc(c.slug).set({
        slug: c.slug,
        displayName: c.displayName,
        parentCategory: c.parentCategory,
        filterValue: c.slug,
        priority: c.priority,
        // בלי imageUrl — האריח לא יוצג עד שתעלה תמונה מהאדמין,
        // וזה מכוון: אריח בלי תמונה מפספס את כל הרעיון.
      }, { merge: true });
    }
    created++;
  }

  console.log(`\n══ סיכום ══`);
  console.log(`  נוצרו:   ${created}`);
  console.log(`  הושלמו:  ${updated}`);
  console.log(`  דולגו:   ${skipped}`);
  if (created && EXECUTE) {
    console.log(`\n  ⚠️  העלה תמונה לכל קטגוריה חדשה: דשבורד ← 🖼️ קטגוריות`);
    console.log(`      בלי תמונה האריח לא יוצג בעמוד הקטגוריה.`);
  }
  if (!EXECUTE) console.log('\n🧪 הרצה יבשה. הוסף --execute לביצוע.');
  process.exit(0);
})();
