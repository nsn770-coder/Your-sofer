/**
 * mergeBirkonimCategory.mjs
 *
 * מאחד את הברכונים לקטגוריה אחת:
 *     יודאיקה ▸ ברכונים   →   ספרי קודש וברכונים ▸ ברכונים
 *
 * למה: אחרי ייבוא סימחונים היו ברכונים בשתי קטגוריות (273 ביודאיקה, 37
 * בספרי קודש) — מלאי מפוצל ללקוח, ושתי עמודות שמתחרות על אותה מילת חיפוש.
 *
 * הסקריפט מזהיר על מוצרים שהשם שלהם לא נראה כברכון, כדי שתת-קטגוריה
 * שגויה אצל הספק לא תגרור מוצר לקטגוריה הלא נכונה בלי שנשים לב.
 *
 * ⚠️ להשלמה אחרי הריצה:
 *      • הסרת 'ברכונים' מ-SUB_CATS['יודאיקה'] ומהתפריט
 *      • redirect מ-/category/יודאיקה?filter=ברכונים
 *      • node scripts/syncAlgolia.mjs
 *
 * node app/scripts/mergeBirkonimCategory.mjs            # תצוגה
 * node app/scripts/mergeBirkonimCategory.mjs --fix      # ביצוע
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

const FROM_CAT = 'יודאיקה';
const TO_CAT   = 'ספרי קודש וברכונים';
const SUB      = 'ברכונים';

const fix = process.argv.includes('--fix');

/**
 * תת-הקטגוריה "יודאיקה ▸ ברכונים" מתויגת לא נכון: רק חלק קטן ממנה הוא
 * חוברות ברכונים. הרוב פריטי נוי — ברכות לתלייה, מסגרות ותמונות קיר.
 * הסיווג כאן מפריד ביניהם; רק חוברות עוברות לקטגוריית הספרים.
 *
 * הסדר קובע — "מעמד אקריליק עם 6 ברכונים" הוא מעמד, לא ברכון.
 */
function classify(name) {
  const n = name || '';

  if (/מעמד|סטנד|עץ ברכות/.test(n)) return 'stand';

  // נוי לקיר/שולחן: מסגרת, תמונה, פלקטה, חיתוך לייזר, בלוק
  if (/מסגרת|תמונה לתלייה|לתלייה|פלקטה|חיתוך לייזר|בלוק אקריליק|ממוסגרת/.test(n)) return 'decor';

  // חוברת ברכון אמיתית
  if (/ברכון|ברכת המזון|ובנה ירושלים|ברכת מעין|זמירות/.test(n)) return 'booklet';

  // "ברכת הבית" / "ברכת העסק" / "אשת חיל" ללא מילת חוברת = נוי
  if (/ברכ|אשר יצר|אשת חיל|מזמור לתודה|קידוש/.test(n)) return 'decor';

  return 'other';
}

const BUCKET_LABEL = {
  booklet: 'חוברות ברכונים   → ספרי קודש וברכונים ▸ ברכונים',
  stand:   'מעמדים וסטנדים   → יודאיקה ▸ מעמדים וסטנדים',
  decor:   'ברכות לתלייה     → יודאיקה ▸ ברכות לתלייה',
  other:   'נוי כללי         → יודאיקה ▸ יודאיקה כללי',
};

/** לאן כל דלי הולך: [cat, subCategory] */
const BUCKET_TARGET = {
  booklet: [TO_CAT,   'ברכונים'],
  stand:   [FROM_CAT, 'מעמדים וסטנדים'],
  decor:   [FROM_CAT, 'ברכות לתלייה'],
  other:   [FROM_CAT, 'יודאיקה כללי'],   // תת-קטגוריה קיימת
};

async function main() {
  const snap = await db.collection('products')
    .where('cat', '==', FROM_CAT)
    .where('subCategory', '==', SUB)
    .get();

  console.log(`\n🔀 "${FROM_CAT} ▸ ${SUB}"  →  "${TO_CAT} ▸ ${SUB}"`);
  console.log(`\n📦 ${snap.size} מוצרים\n`);

  if (snap.size === 0) { console.log('אין מה להעביר'); return; }

  const buckets = { booklet: [], stand: [], decor: [], other: [] };
  snap.forEach(d => {
    const p = d.data();
    buckets[classify(p.name)].push({ ref: d.ref, name: p.name });
  });

  for (const k of ['booklet', 'stand', 'decor', 'other']) {
    const b = buckets[k];
    if (!b.length) continue;
    console.log(`${String(b.length).padStart(4)}  ${BUCKET_LABEL[k]}`);
    b.slice(0, 6).forEach(x => console.log(`        · ${x.name}`));
    if (b.length > 6) console.log(`        … ועוד ${b.length - 6}`);
    console.log('');
  }

  const existing = await db.collection('products')
    .where('cat', '==', TO_CAT).where('subCategory', '==', SUB).get();

  console.log(`אחרי הפיצול:`);
  console.log(`   ספרי קודש וברכונים ▸ ברכונים: ${existing.size} + ${buckets.booklet.length} = ${existing.size + buckets.booklet.length}`);
  console.log(`   יודאיקה ▸ מעמדים וסטנדים:     ${buckets.stand.length}`);
  console.log(`   יודאיקה ▸ ברכות לתלייה:       ${buckets.decor.length}`);
  console.log(`   יודאיקה ▸ יודאיקה כללי:       +${buckets.other.length}`);

  if (!fix) {
    console.log('\n💡 לביצוע:  node app/scripts/mergeBirkonimCategory.mjs --fix');
    return;
  }

  console.log('');
  for (const key of ['booklet', 'stand', 'decor', 'other']) {
    const items = buckets[key];
    if (!items.length) continue;
    const [cat, sub] = BUCKET_TARGET[key];

    for (let i = 0; i < items.length; i += 400) {
      const batch = db.batch();
      for (const t of items.slice(i, i + 400)) {
        batch.set(t.ref, {
          cat,
          subCategory: sub,
          previousCat: FROM_CAT,
          previousSubCategory: SUB,
          categoryMovedAt: new Date(),
        }, { merge: true });
      }
      await batch.commit();
    }
    console.log(`   ✓ ${String(items.length).padStart(3)} → ${cat} ▸ ${sub}`);
  }
  console.log('\n⚠️  להשלמה:');
  console.log('   1. git push  (הסרת ברכונים מתפריט יודאיקה + redirect)');
  console.log('   2. node scripts/syncAlgolia.mjs');
}

main().catch(e => { console.error('❌', e); process.exit(1); });
