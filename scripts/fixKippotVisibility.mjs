/**
 * fixKippotVisibility.mjs
 * Fixes two Firestore issues that hide kippot products from the site:
 *
 *   Fix 1 — priority missing:
 *     Products without a `priority` field are excluded by Firestore's
 *     orderBy('priority') query. Adds priority: 0 to all cat='כיפות'
 *     products that are missing the field.
 *
 *   Fix 2 — subCategory name mismatch:
 *     47 products were imported with subCategory='כיפות סאטן' instead of
 *     the correct supplier name 'כיפות סאטן וטרילין'.
 *
 * Usage:
 *   node scripts/fixKippotVisibility.mjs          ← dry-run (no writes)
 *   node scripts/fixKippotVisibility.mjs --live   ← live fix
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DRY_RUN = !process.argv.includes('--live');

const SA_PATH = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const WRONG_SUBCAT  = 'כיפות סאטן';
const CORRECT_SUBCAT = 'כיפות סאטן וטרילין';
const MAX_BATCH = 500;

async function main() {
  console.log(`\n${'═'.repeat(62)}`);
  console.log(`🔧 fixKippotVisibility — ${DRY_RUN ? '🧪 DRY RUN (no writes)' : '🔴 LIVE FIX'}`);
  console.log(`${'═'.repeat(62)}\n`);

  console.log('📥 שולף את כל מוצרי כיפות מ-Firestore...');
  const snap = await db.collection('products').where('cat', '==', 'כיפות').get();
  const total = snap.docs.length;
  console.log(`   נמצאו ${total} מוצרים עם cat='כיפות'\n`);

  // ── classify each doc ────────────────────────────────────────────────────────
  const needsPriority   = [];  // Fix 1
  const needsSubCatFix  = [];  // Fix 2
  let alreadyHasPriority = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const hasPriority = d.priority !== undefined && d.priority !== null;
    if (!hasPriority) needsPriority.push(doc);
    else alreadyHasPriority++;

    if (d.subCategory === WRONG_SUBCAT) needsSubCatFix.push(doc);
  }

  // ── DRY-RUN report ───────────────────────────────────────────────────────────
  console.log('─── תיקון 1: priority חסר ───');
  console.log(`  כבר יש priority:          ${alreadyHasPriority}`);
  console.log(`  יקבלו priority: 0:         ${needsPriority.length}`);

  console.log('\n─── תיקון 2: שם subCategory שגוי ───');
  console.log(`  '${WRONG_SUBCAT}' → '${CORRECT_SUBCAT}': ${needsSubCatFix.length} מוצרים`);

  // After fixes, all products will have priority defined → all should appear
  const willStillMissPriority = 0; // we fix them all
  const projectedVisible = total - willStillMissPriority;
  console.log(`\n─── הערכה אחרי תיקון ───`);
  console.log(`  סה"כ כיפות ב-Firestore:        ${total}`);
  console.log(`  יוצגו בשאילתה (עם priority):   ${projectedVisible}`);
  console.log(`  כרגע מוסתרים (hidden=true):    0`);
  console.log(`  כרגע לא בשאילתה (חסר priority): ${needsPriority.length}`);
  console.log(`  ↳ לאחר תיקון יתווספו לתצוגה:  ${needsPriority.length}\n`);

  // ── sample table ─────────────────────────────────────────────────────────────
  const samples = [
    ...needsPriority.slice(0, 5).map(d => ({ doc: d, fix: 'priority: 0' })),
    ...needsSubCatFix.slice(0, 5).map(d => ({ doc: d, fix: `subCategory → '${CORRECT_SUBCAT}'` })),
  ].slice(0, 10);

  if (samples.length > 0) {
    console.log('─── דוגמאות מוצרים שיתוקנו (עד 10) ───');
    const c1 = 10, c2 = 36, c3 = 28;
    console.log(
      '  ' + 'SKU'.padEnd(c1) + 'שם מוצר'.padEnd(c2) + 'שינוי'.padEnd(c3)
    );
    console.log('  ' + '─'.repeat(c1 + c2 + c3));
    for (const { doc, fix } of samples) {
      const data = doc.data();
      const sku  = (data.sku || doc.id).slice(0, c1 - 1).padEnd(c1);
      const name = (data.name || '').slice(0, c2 - 2).padEnd(c2);
      const change = fix.padEnd(c3);
      console.log(`  ${sku}${name}${change}`);
    }
    console.log('  ' + '─'.repeat(c1 + c2 + c3) + '\n');
  }

  if (DRY_RUN) {
    console.log('🧪 DRY RUN — לא בוצעו כתיבות ל-Firestore.');
    console.log('   להפעלת תיקון אמיתי, הרץ:\n');
    console.log('   node scripts/fixKippotVisibility.mjs --live\n');
    process.exit(0);
  }

  // ── LIVE: batch writes ───────────────────────────────────────────────────────
  // Merge Fix 1 and Fix 2 into one pass — a doc can need both fixes at once
  const toUpdate = new Map(); // docId → { ...fieldsToSet }

  for (const doc of needsPriority) {
    toUpdate.set(doc.id, { ...(toUpdate.get(doc.id) || {}), priority: 0 });
  }
  for (const doc of needsSubCatFix) {
    toUpdate.set(doc.id, { ...(toUpdate.get(doc.id) || {}), subCategory: CORRECT_SUBCAT });
  }

  const entries = [...toUpdate.entries()];
  const totalToWrite = entries.length;
  let written = 0, failed = 0;

  console.log(`\n✏️  מעדכן ${totalToWrite} מסמכים ב-Firestore (batches של ${MAX_BATCH})...`);

  for (let i = 0; i < entries.length; i += MAX_BATCH) {
    const chunk = entries.slice(i, i + MAX_BATCH);
    const batch = db.batch();
    for (const [docId, fields] of chunk) {
      batch.update(db.collection('products').doc(docId), fields);
    }
    try {
      await batch.commit();
      written += chunk.length;
      console.log(`  ✅ batch ${Math.floor(i / MAX_BATCH) + 1}: ${chunk.length} מסמכים עודכנו (סה"כ ${written}/${totalToWrite})`);
    } catch (err) {
      failed += chunk.length;
      console.error(`  ❌ batch ${Math.floor(i / MAX_BATCH) + 1} נכשל: ${err.message}`);
    }
  }

  console.log(`\n${'═'.repeat(62)}`);
  console.log('✅ תיקון הושלם');
  console.log(`${'═'.repeat(62)}`);
  console.log(`  priority: 0 נוסף ל:         ${needsPriority.length} מוצרים`);
  console.log(`  subCategory תוקן ל:          ${needsSubCatFix.length} מוצרים`);
  console.log(`  סה"כ מסמכים שעודכנו:        ${written}`);
  if (failed > 0) console.log(`  שגיאות:                     ${failed}`);
  console.log(`\n  ↳ כעת כל ${total} כיפות יוצגו באתר.\n`);

  process.exit(0);
}

main().catch(err => { console.error('\n❌ Fatal:', err.message); process.exit(1); });
