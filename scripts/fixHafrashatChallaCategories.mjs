/**
 * fixHafrashatChallaCategories.mjs
 *
 * חד-פעמי: מוצא את 28 מוצרי הפרשת חלה ב-Firestore לפי SKU,
 * ומעדכן cat + category (legacy) + subCategory.
 * לא נוגע ב-price, soferBasePrice, או כל שדה אחר.
 *
 * Usage:
 *   node scripts/fixHafrashatChallaCategories.mjs --dry-run   ← הצג טבלה, ללא כתיבה
 *   node scripts/fixHafrashatChallaCategories.mjs             ← כתוב ל-Firestore
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN   = process.argv.includes('--dry-run');

// ── Firebase Admin ────────────────────────────────────────────────────────────
const SA_PATH = process.env.SERVICE_ACCOUNT_PATH
  || resolve(__dirname, '../app/scripts/your-sofer-firebase-adminsdk-fbsvc-dd43a60da9.json');
const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── Target SKUs ───────────────────────────────────────────────────────────────
const TARGET_SKUS = [
  'UK51563', 'UK51675', 'UK51564', 'UK51631', 'UK82327',
  'UK40093', 'UK66467', 'UK48864', 'UK52137', 'UK89928',
  'UK67311', 'UK67381', 'UK67312', 'UK67313', 'UK67382',
  'UK67383', 'UK67379', 'UK67380', 'UK66466', 'UK67000',
  'UK67157', 'UK67158', 'UK67159', 'UK67160', 'UK80693',
  'UK80698', 'UK59495', 'UK86197',
];

const NEW_CAT     = 'שבת';
const NEW_SUBCAT  = 'הפרשת חלה';

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN
    ? '🔍 DRY RUN — ללא כתיבה ל-Firestore'
    : '✏️  LIVE RUN — כותב ל-Firestore');
  console.log(`מחפש ${TARGET_SKUS.length} SKU...\n`);

  // Fetch all docs for target SKUs in parallel (one query per SKU)
  const results = await Promise.all(
    TARGET_SKUS.map(async sku => {
      const snap = await db.collection('products').where('sku', '==', sku).limit(1).get();
      if (snap.empty) return { sku, found: false };
      const doc  = snap.docs[0];
      const data = doc.data();
      return {
        sku,
        found:      true,
        docId:      doc.id,
        ref:        doc.ref,
        catBefore:  data.cat      ?? '(ללא)',
        subBefore:  data.subCategory ?? '(ללא)',
        price:      data.price    ?? '(ללא)',
      };
    })
  );

  // ── Print table ───────────────────────────────────────────────────────────
  const COL = { sku: 10, catBefore: 18, catAfter: 6, subBefore: 20, subAfter: 14, price: 9 };
  const header =
    'SKU'.padEnd(COL.sku) +
    'cat לפני'.padEnd(COL.catBefore) +
    'cat אחרי'.padEnd(COL.catAfter + 4) +
    'subCategory לפני'.padEnd(COL.subBefore) +
    'subCategory אחרי'.padEnd(COL.subAfter + 4) +
    'price';
  console.log(header);
  console.log('─'.repeat(header.length + 8));

  let foundCount = 0, missingCount = 0;
  const toUpdate = [];

  for (const r of results) {
    if (!r.found) {
      console.log(`${r.sku.padEnd(COL.sku)} ❌ לא נמצא ב-Firestore`);
      missingCount++;
      continue;
    }
    foundCount++;
    toUpdate.push(r);

    const line =
      r.sku.padEnd(COL.sku) +
      r.catBefore.padEnd(COL.catBefore) +
      '→ שבת'.padEnd(COL.catAfter + 6) +
      r.subBefore.padEnd(COL.subBefore) +
      `→ ${NEW_SUBCAT}`.padEnd(COL.subAfter + 4) +
      `₪${r.price}`;
    console.log(line);
  }

  console.log('─'.repeat(header.length + 8));
  console.log(`\nנמצאו: ${foundCount}/${TARGET_SKUS.length}  |  חסרים: ${missingCount}`);
  console.log(`price: לא ישתנה לאף מוצר ✅`);

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN הסתיים — הפעל ללא --dry-run לעדכון אמיתי.');
    process.exit(0);
  }

  // ── Live write ────────────────────────────────────────────────────────────
  console.log('\n⏳ מעדכן Firestore...');
  const BATCH_SIZE = 400;
  let updated = 0, failed = 0;

  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const chunk = toUpdate.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const r of chunk) {
      batch.update(r.ref, {
        cat:         NEW_CAT,
        category:    NEW_CAT,      // legacy field
        subCategory: NEW_SUBCAT,
      });
    }
    try {
      await batch.commit();
      updated += chunk.length;
      console.log(`  ✅ batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} מוצרים`);
    } catch (e) {
      failed += chunk.length;
      console.error(`  ❌ batch failed: ${e.message}`);
    }
  }

  console.log(`\n🎉 סיום! עודכנו: ${updated}  |  נכשלו: ${failed}`);
  console.log('price לא שונה לאף מוצר ✅');
  process.exit(0);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
