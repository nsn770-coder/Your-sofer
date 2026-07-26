/**
 * applyPriceRounding.mjs
 * A1 — whole-shekel rounding write pass.
 * Math.round() on `price` and `was` only. Writes only fields whose rounded
 * value differs from the stored value; batched (400/batch).
 * Then VERIFIES: re-reads all products, compares against the backup file,
 * and reports count changed + total shekel delta, up and down separately.
 *
 * Never deletes products. Never touches orders/invoices.
 *
 * Usage: node scripts/applyPriceRounding.mjs
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

const BACKUP_PATH = resolve(__dirname, 'price-backup-2026-07-26T04-11-40-251Z.json');

function toNum(v) {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

async function run() {
  // ── Load backup ──
  const backup = JSON.parse(readFileSync(BACKUP_PATH, 'utf8'));
  const backupById = new Map(backup.products.map(p => [p.id, p]));
  console.log(`🗄️  גיבוי נטען: ${backup.count} מוצרים (${backup.generatedAt})`);

  // ── Phase 1: write pass ──
  console.log('📥 שולף מוצרים מ-Firestore...');
  const snap = await db.collection('products').get();
  console.log(`📦 נמצאו ${snap.size} מוצרים`);

  let batch = db.batch();
  let inBatch = 0;
  let batchesCommitted = 0;
  let docsUpdated = 0;
  let priceWrites = 0;
  let wasWrites = 0;
  let notInBackup = 0;

  const commit = async () => {
    if (inBatch === 0) return;
    await batch.commit();
    batchesCommitted++;
    batch = db.batch();
    inBatch = 0;
  };

  for (const doc of snap.docs) {
    const d = doc.data();
    if (!backupById.has(doc.id)) notInBackup++;

    const update = {};
    const price = toNum(d.price);
    if (price !== null && Math.round(price) !== price) {
      update.price = Math.round(price);
      priceWrites++;
    }
    const was = toNum(d.was);
    if (was !== null && Math.round(was) !== was) {
      update.was = Math.round(was);
      wasWrites++;
    }

    if (Object.keys(update).length > 0) {
      batch.update(doc.ref, update);
      inBatch++;
      docsUpdated++;
      if (inBatch >= 400) await commit();
    }
  }
  await commit();

  console.log('\n── שלב כתיבה הושלם ──');
  console.log(`✏️  מסמכים עודכנו: ${docsUpdated} (batches: ${batchesCommitted})`);
  console.log(`   שדות price: ${priceWrites} | שדות was: ${wasWrites}`);
  if (notInBackup > 0) console.log(`   ⚠️ מוצרים שלא קיימים בגיבוי (חדשים מאז): ${notInBackup}`);

  // ── Phase 2: verification — fresh re-read, compare to BACKUP ──
  console.log('\n🔎 אימות: קריאה חוזרת מלאה והשוואה לגיבוי...');
  const snap2 = await db.collection('products').get();

  const stats = {
    price: { changed: 0, up: 0, down: 0, upDelta: 0, downDelta: 0 },
    was:   { changed: 0, up: 0, down: 0, upDelta: 0, downDelta: 0 },
  };
  let stillFractional = 0;
  let productsChanged = 0;
  let verifiedAgainstBackup = 0;
  const fractionalExamples = [];

  snap2.forEach(doc => {
    const d = doc.data();
    const b = backupById.get(doc.id);

    // Anything still fractional after the pass is a failure signal
    for (const f of ['price', 'was']) {
      const v = toNum(d[f]);
      if (v !== null && Math.round(v) !== v) {
        stillFractional++;
        if (fractionalExamples.length < 10) fractionalExamples.push(`${doc.id}.${f}=${v}`);
      }
    }

    if (!b) return; // new product, no baseline to diff against
    verifiedAgainstBackup++;

    let changedThisDoc = false;
    for (const f of ['price', 'was']) {
      const before = toNum(b[f]);
      const after = toNum(d[f]);
      if (before === null || after === null) continue;
      const delta = after - before;
      if (delta !== 0) {
        changedThisDoc = true;
        stats[f].changed++;
        if (delta > 0) { stats[f].up++; stats[f].upDelta += delta; }
        else { stats[f].down++; stats[f].downDelta += -delta; }
      }
    }
    if (changedThisDoc) productsChanged++;
  });

  const r2 = n => Math.round(n * 100) / 100;
  const report = {
    generatedAt: new Date().toISOString(),
    backupFile: 'price-backup-2026-07-26T04-11-40-251Z.json',
    totalDocsNow: snap2.size,
    verifiedAgainstBackup,
    newProductsNotInBackup: notInBackup,
    writePhase: { docsUpdated, priceWrites, wasWrites, batchesCommitted },
    productsChanged,
    price: { ...stats.price, upDelta: r2(stats.price.upDelta), downDelta: r2(stats.price.downDelta), netDelta: r2(stats.price.upDelta - stats.price.downDelta) },
    was:   { ...stats.was,   upDelta: r2(stats.was.upDelta),   downDelta: r2(stats.was.downDelta),   netDelta: r2(stats.was.upDelta - stats.was.downDelta) },
    stillFractionalAfterPass: stillFractional,
    fractionalExamples,
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = resolve(__dirname, `price-rounding-report-${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n══════════ דוח אימות ══════════');
  console.log(`📦 מוצרים כעת: ${snap2.size} | הושוו לגיבוי: ${verifiedAgainstBackup}`);
  console.log(`🔁 מוצרים שהשתנו: ${productsChanged}`);
  console.log(`price: שונו ${stats.price.changed} | ↑ ${stats.price.up} (+₪${r2(stats.price.upDelta)}) | ↓ ${stats.price.down} (−₪${r2(stats.price.downDelta)}) | נטו ₪${r2(stats.price.upDelta - stats.price.downDelta)}`);
  console.log(`was:   שונו ${stats.was.changed} | ↑ ${stats.was.up} (+₪${r2(stats.was.upDelta)}) | ↓ ${stats.was.down} (−₪${r2(stats.was.downDelta)}) | נטו ₪${r2(stats.was.upDelta - stats.was.downDelta)}`);
  console.log(stillFractional === 0
    ? '✅ אפס מחירים שבורים נותרו אחרי המעבר'
    : `❌ נותרו ${stillFractional} ערכים שבורים! ${fractionalExamples.join(', ')}`);
  console.log(`📄 דוח נשמר: ${outPath}`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
