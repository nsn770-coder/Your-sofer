/**
 * addSizeField.mjs
 * ─────────────────────────────────────────────────────────────
 * סקריפט חד-פעמי שסורק את כל מוצרי קלפי מזוזה ובתי מזוזה,
 * מחלץ גודל (12/15/20/25/30) מהשם או מהתיאור,
 * ושומר size field בפיירסטור.
 *
 * הרצה:  node app/scripts/addSizeField.mjs
 * דריי-ראן: node app/scripts/addSizeField.mjs --dry-run
 * ─────────────────────────────────────────────────────────────
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDryRun  = process.argv.includes('--dry-run');

const serviceAccount = JSON.parse(
  await import('fs').then(fs =>
    fs.promises.readFile(join(__dirname, 'serviceAccount.json'), 'utf8')
  )
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── קטגוריות רלוונטיות ──────────────────────────────────────
const RELEVANT_CATS = [
  'קלפי מזוזה',
  'בתי מזוזה',
  'מזוזות',        // על המקרה שיש קטגוריה כזו
];

// ─── גדלים תקניים ─────────────────────────────────────────────
const VALID_SIZES = ['10', '12', '15', '20', '25', '30'];

/**
 * מחלץ גודל מטקסט.
 * מחפש: 12 ס"מ / 15סמ / 20 ס׳מ / 25cm וכו'
 */
function extractSize(text = '') {
  if (!text) return null;

  // דפוס עברי: מספר + רווח אופציונלי + ס"מ / סמ / ס׳מ
  const heMatch = text.match(/(\d+)\s*ס[״"׳']?\s*מ/);
  if (heMatch && VALID_SIZES.includes(heMatch[1])) return heMatch[1];

  // דפוס אנגלי: מספר + cm
  const enMatch = text.match(/(\d+)\s*cm/i);
  if (enMatch && VALID_SIZES.includes(enMatch[1])) return enMatch[1];

  return null;
}

// ─── ריצה ראשית ───────────────────────────────────────────────
async function main() {
  console.log(isDryRun ? '🔍 DRY RUN — לא שומר כלום' : '✍️  מצב כתיבה — שומר לפיירסטור');
  console.log('');

  const snap = await db.collection('products').get();
  console.log(`סה"כ מוצרים בפיירסטור: ${snap.size}`);

  let checked = 0, updated = 0, skipped = 0, noSize = 0;

  const batch = db.batch();
  let batchCount = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const cat  = data.cat || '';

    // סנן רק קטגוריות רלוונטיות
    if (!RELEVANT_CATS.some(c => cat.includes(c))) continue;

    checked++;

    // אל תדרוס אם כבר קיים size
    if (data.size && VALID_SIZES.includes(String(data.size))) {
      console.log(`  ⏭️  [${docSnap.id}] כבר יש size=${data.size} — דילוג`);
      skipped++;
      continue;
    }

    // חלץ גודל מהשם ואז מהתיאור
    const name = data.name || '';
    const desc = data.desc || data.description || '';
    const size = extractSize(name) || extractSize(desc);

    if (!size) {
      console.log(`  ❓ [${docSnap.id}] "${name.slice(0, 50)}" — לא נמצא גודל`);
      noSize++;
      continue;
    }

    console.log(`  ✅ [${docSnap.id}] "${name.slice(0, 50)}" → size=${size}`);

    if (!isDryRun) {
      batch.update(docSnap.ref, { size });
      batchCount++;

      // Firestore batch מוגבל ל-500
      if (batchCount === 499) {
        await batch.commit();
        console.log('  📦 Batch committed (500)');
        batchCount = 0;
      }
    }

    updated++;
  }

  if (!isDryRun && batchCount > 0) {
    await batch.commit();
    console.log(`  📦 Batch committed (${batchCount})`);
  }

  console.log('');
  console.log('══════════════════════════════════════');
  console.log(`בדוק:    ${checked} מוצרים רלוונטיים`);
  console.log(`עודכן:   ${updated}`);
  console.log(`דולג:    ${skipped} (כבר היה size)`);
  console.log(`לא נמצא: ${noSize} (צריך לעדכן ידנית)`);
  console.log('══════════════════════════════════════');

  if (noSize > 0) {
    console.log('');
    console.log('💡 טיפ: מוצרים ללא גודל — ניתן לעדכן ידנית דרך טופס עריכת מוצר באתר');
  }
}

main().catch(err => {
  console.error('שגיאה:', err);
  process.exit(1);
});
