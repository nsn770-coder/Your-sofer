/**
 * increasePrices12.mjs — העלאת מחירים גורפת + מחיר מחוק
 *
 * לכל מוצר עם price תקין:
 *   price (מחיר סופי לתשלום)  = oldPrice × 1.12  (מעוגל לשקל שלם)
 *   was   (מחיר מחוק לתצוגה)  = oldPrice × 1.40  (מעוגל לשקל שלם)
 *   oldPriceBeforeIncrease     = oldPrice         (גיבוי לשחזור)
 *   priceMigrationBackup       = { price, was, salePrice, clearanceSalePrice, originalPrice }
 *
 * שדות מבצע פעילים (salePrice / clearanceSalePrice / originalPrice) מוכפלים
 * גם הם ב-1.12 כדי שהמחיר לתשלום בפועל תמיד יעלה ב-12%.
 *
 * שימוש:
 *   node scripts/increasePrices12.mjs                 → dry-run (ברירת מחדל, אין כתיבה)
 *   node scripts/increasePrices12.mjs --apply         → עדכון אמיתי ב-Firestore
 *   node scripts/increasePrices12.mjs --rollback      → שחזור מהגיבוי (מבטל את ההעלאה)
 *   node scripts/increasePrices12.mjs --limit=20      → הגבלת כמות מוצרים (לבדיקה)
 *
 * SERVICE_ACCOUNT_PATH=... אופציונלי; אחרת מחפש את קובץ ה-admin-sdk במיקומים המוכרים.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── מצב הרצה ─────────────────────────────────────────────────────────────────
const APPLY    = process.argv.includes('--apply');
const ROLLBACK = process.argv.includes('--rollback');
const DRY_RUN  = !APPLY && !ROLLBACK;
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const LIMIT    = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

if (APPLY && ROLLBACK) {
  console.error('❌ אי אפשר --apply ו---rollback ביחד');
  process.exit(1);
}

// ── מקדמים ───────────────────────────────────────────────────────────────────
const FINAL_FACTOR = 1.12; // מחיר סופי אחרי הנחה
const WAS_FACTOR   = 1.40; // מחיר מחוק לפני הנחה

// ── Firebase Admin ────────────────────────────────────────────────────────────
const SA_CANDIDATES = [
  process.env.SERVICE_ACCOUNT_PATH,
  resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'),
  resolve(__dirname, '../app/scripts/your-sofer-firebase-adminsdk-fbsvc-dd43a60da9.json'),
  resolve(__dirname, '../app/scripts/serviceAccount.json'),
].filter(Boolean);

const SA_PATH = SA_CANDIDATES.find(p => existsSync(p));
if (!SA_PATH) {
  console.error('❌ לא נמצא קובץ service account. הגדר SERVICE_ACCOUNT_PATH.');
  process.exit(1);
}
const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── עזרים ────────────────────────────────────────────────────────────────────
const roundNIS = n => Math.round(n); // עיגול לשקל שלם, בלי אגורות

function computeNewPrices(oldPrice) {
  const newPrice = roundNIS(oldPrice * FINAL_FACTOR);
  let   newWas   = roundNIS(oldPrice * WAS_FACTOR);
  let   wasFixed = false;
  // ולידציה: מחיר מחוק חייב להיות גבוה מהמחיר הסופי
  if (newWas <= newPrice) { newWas = newPrice + 1; wasFixed = true; }
  return { newPrice, newWas, wasFixed };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═'.repeat(64));
  console.log(' YourSofer — העלאת מחירים 12% + מחיר מחוק 40%');
  console.log(` מצב: ${DRY_RUN ? '🧪 DRY-RUN (אין כתיבה)' : APPLY ? '🚀 APPLY (כתיבה אמיתית)' : '↩️  ROLLBACK (שחזור מגיבוי)'}`);
  console.log('═'.repeat(64));

  const snap = await db.collection('products').get();
  console.log(`\n📦 נטענו ${snap.size} מוצרים מ-Firestore\n`);

  const stats = { updated: 0, skippedNoPrice: 0, skippedAlreadyMigrated: 0, skippedNoBackup: 0, wasFixed: 0 };
  const noPriceList = [];
  const sampleLogs  = [];
  let processed = 0;

  const CHUNK = 400;
  let ops = [];
  const flush = async () => {
    if (!ops.length || DRY_RUN) { ops = []; return; }
    const batch = db.batch();
    for (const { ref, data } of ops) batch.update(ref, data);
    await batch.commit();
    ops = [];
  };

  for (const docSnap of snap.docs) {
    if (processed >= LIMIT) break;
    const d    = docSnap.data();
    const name = d.name || docSnap.id;

    // ── ROLLBACK ──
    if (ROLLBACK) {
      if (d.oldPriceBeforeIncrease == null) { stats.skippedNoBackup++; continue; }
      const b = d.priceMigrationBackup || {};
      const restore = {
        price: d.oldPriceBeforeIncrease,
        was:   b.was !== undefined ? b.was : FieldValue.delete(),
        salePrice:          b.salePrice          !== undefined ? b.salePrice          : FieldValue.delete(),
        clearanceSalePrice: b.clearanceSalePrice !== undefined ? b.clearanceSalePrice : FieldValue.delete(),
        originalPrice:      b.originalPrice      !== undefined ? b.originalPrice      : FieldValue.delete(),
        oldPriceBeforeIncrease: FieldValue.delete(),
        priceMigrationBackup:   FieldValue.delete(),
      };
      ops.push({ ref: docSnap.ref, data: restore });
      stats.updated++;
      processed++;
      if (sampleLogs.length < 15) sampleLogs.push(`  ↩️  ${name.slice(0, 45).padEnd(45)} ₪${d.price} → ₪${d.oldPriceBeforeIncrease}`);
      if (ops.length >= CHUNK) await flush();
      continue;
    }

    // ── FORWARD (dry-run / apply) ──
    // הגנה מהרצה כפולה: מוצר שכבר עבר migration לא מוכפל שוב
    if (d.oldPriceBeforeIncrease != null) { stats.skippedAlreadyMigrated++; continue; }

    const oldPrice = typeof d.price === 'number' ? d.price : parseFloat(d.price);
    if (!oldPrice || isNaN(oldPrice) || oldPrice <= 0) {
      stats.skippedNoPrice++;
      noPriceList.push(`${docSnap.id} — ${String(name).slice(0, 50)}`);
      continue;
    }

    const { newPrice, newWas, wasFixed } = computeNewPrices(oldPrice);
    if (wasFixed) stats.wasFixed++;

    const update = {
      price: newPrice,
      was:   newWas,
      oldPriceBeforeIncrease: oldPrice,
      priceMigrationBackup: {
        price: oldPrice,
        ...(d.was                !== undefined && { was: d.was }),
        ...(d.salePrice          !== undefined && { salePrice: d.salePrice }),
        ...(d.clearanceSalePrice !== undefined && { clearanceSalePrice: d.clearanceSalePrice }),
        ...(d.originalPrice      !== undefined && { originalPrice: d.originalPrice }),
        migratedAt: new Date().toISOString(),
      },
    };

    // שדות מבצע קיימים — מועלים גם הם ב-12% כדי שהתשלום בפועל יעלה ב-12%
    if (typeof d.salePrice === 'number')          update.salePrice          = roundNIS(d.salePrice * FINAL_FACTOR);
    if (typeof d.clearanceSalePrice === 'number') update.clearanceSalePrice = roundNIS(d.clearanceSalePrice * FINAL_FACTOR);
    if (typeof d.originalPrice === 'number')      update.originalPrice      = roundNIS(d.originalPrice * FINAL_FACTOR);

    // ולידציה סופית: לעולם לא מוצר בלי מחיר, לעולם לא was <= price
    if (!update.price || update.price <= 0) { stats.skippedNoPrice++; continue; }
    if (update.was <= update.price)          update.was = update.price + 1;

    ops.push({ ref: docSnap.ref, data: update });
    stats.updated++;
    processed++;

    const line = `  ${name.slice(0, 45).padEnd(45)} ישן: ₪${oldPrice}  → סופי: ₪${newPrice}  מחוק: ₪${newWas}${wasFixed ? '  ⚠️ was תוקן' : ''}${d.salePrice ? `  (salePrice: ₪${d.salePrice}→₪${update.salePrice})` : ''}`;
    if (sampleLogs.length < 15) sampleLogs.push(line);

    if (ops.length >= CHUNK) await flush();
  }
  await flush();

  // ── דוח ─────────────────────────────────────────────────────────────────────
  console.log('──── דוגמאות ────');
  sampleLogs.forEach(l => console.log(l));

  console.log('\n──── סיכום ────');
  console.log(`  ${DRY_RUN ? 'היו מתעדכנים' : 'עודכנו'}:        ${stats.updated}`);
  if (!ROLLBACK) {
    console.log(`  דולגו (אין מחיר):        ${stats.skippedNoPrice}`);
    console.log(`  דולגו (כבר עברו):        ${stats.skippedAlreadyMigrated}`);
    console.log(`  תוקנו was<=price:        ${stats.wasFixed}`);
  } else {
    console.log(`  דולגו (אין גיבוי):       ${stats.skippedNoBackup}`);
  }

  if (noPriceList.length) {
    console.log('\n⚠️  מוצרים ללא מחיר תקין (לא נגעתי בהם):');
    noPriceList.slice(0, 30).forEach(s => console.log('   ', s));
    if (noPriceList.length > 30) console.log(`    ...ועוד ${noPriceList.length - 30}`);
    const reportPath = resolve(__dirname, 'increasePrices12-no-price.json');
    writeFileSync(reportPath, JSON.stringify(noPriceList, null, 2));
    console.log(`    📄 רשימה מלאה: ${reportPath}`);
  }

  if (DRY_RUN)  console.log('\n🧪 DRY-RUN הסתיים — לא בוצעה שום כתיבה. להרצה אמיתית: --apply');
  if (APPLY)    console.log('\n✅ העדכון בוצע. אל תשכח: node scripts/syncAlgolia.mjs (עדכון חיפוש)');
  if (ROLLBACK) console.log('\n↩️  השחזור בוצע. אל תשכח: node scripts/syncAlgolia.mjs');
  process.exit(0);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
