/**
 * markAllInStock.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Marks all products as in-stock by clearing outOfStock / inStock / related
 * fields across the entire 'products' collection.
 *
 * Usage:
 *   DRY-RUN (default — no writes):
 *     node app/scripts/markAllInStock.mjs
 *
 *   EXECUTE (real writes):
 *     node app/scripts/markAllInStock.mjs --execute
 *
 * Steps:
 *   1. Backup current stock fields → app/scripts/backups/backup-stock-{ts}.json
 *   2. Print dry-run summary (always).
 *   3. If --execute: batched writes (500/batch), outOfStock=false, inStock=true,
 *      delete outOfStockReason + outOfStockDate.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname }                        from 'path';
import { fileURLToPath }                           from 'url';
import { initializeApp, cert, getApps }            from 'firebase-admin/app';
import { getFirestore, FieldValue }                from 'firebase-admin/firestore';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const IS_EXECUTE = process.argv.includes('--execute');
const BATCH_SIZE = 500;

// ── Load .env.local (same pattern as all other admin scripts) ─────────────────

function loadEnvLocal() {
  try {
    const raw   = readFileSync(resolve(__dirname, '../../.env.local'), 'utf8');
    const lines = raw.split('\n');
    let key = null, val = '';
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) {
        if (key && !process.env[key]) process.env[key] = val.trim();
        key = m[1]; val = m[2];
      } else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch { /* .env.local may not exist in CI */ }
}
loadEnvLocal();

// ── Init Firebase Admin ────────────────────────────────────────────────────────

const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

// ── Helpers ────────────────────────────────────────────────────────────────────

const STOCK_FIELDS = ['outOfStock', 'inStock', 'stock', 'available', 'outOfStockReason', 'outOfStockDate'];

function isOutOfStock(d) {
  return d.outOfStock === true || d.inStock === false || (typeof d.stock === 'number' && d.stock <= 0);
}

function pickStockFields(d) {
  const out = {};
  for (const f of STOCK_FIELDS) {
    if (f in d) out[f] = d[f];
  }
  return out;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n📦 markAllInStock —', IS_EXECUTE ? '⚡ EXECUTE MODE' : '🔍 DRY-RUN (no writes)');
  console.log('─'.repeat(60));

  // ── 1. Fetch all products ──────────────────────────────────────────────────

  console.log('\nטוען מוצרים מ-Firestore...');
  const snap = await db.collection('products').get();
  console.log(`   נטענו ${snap.size} מסמכים\n`);

  const docs      = snap.docs.map(d => ({ id: d.id, ref: d.ref, data: d.data() }));
  const affected  = docs.filter(d => isOutOfStock(d.data));

  // ── 2. Backup ──────────────────────────────────────────────────────────────

  const backupDir = resolve(__dirname, 'backups');
  mkdirSync(backupDir, { recursive: true });
  const timestamp  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = resolve(backupDir, `backup-stock-${timestamp}.json`);

  const backupData = docs
    .map(d => ({ id: d.id, name: d.data.name ?? '', sku: d.data.sku ?? '', ...pickStockFields(d.data) }))
    .filter(r => Object.keys(r).length > 3); // only include docs that have at least one stock field

  writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`✅ גיבוי נשמר: ${backupPath}`);
  console.log(`   (${backupData.length} מוצרים עם שדות מלאי)`);

  // ── 3. Dry-run summary ─────────────────────────────────────────────────────

  console.log('\n' + '─'.repeat(60));
  console.log('📊 סיכום DRY-RUN');
  console.log('─'.repeat(60));
  console.log(`   סה"כ מוצרים:           ${docs.length}`);
  console.log(`   מסומנים כלא-במלאי:     ${affected.length}`);
  console.log(`   לא יושפעו:             ${docs.length - affected.length}`);

  // Breakdown by outOfStockReason
  const reasonMap = {};
  for (const d of affected) {
    const reason = d.data.outOfStockReason ?? '(ללא סיבה)';
    reasonMap[reason] = (reasonMap[reason] ?? 0) + 1;
  }
  if (Object.keys(reasonMap).length > 0) {
    console.log('\n   פילוח לפי outOfStockReason:');
    for (const [reason, count] of Object.entries(reasonMap).sort((a, b) => b[1] - a[1])) {
      console.log(`     "${reason}": ${count}`);
    }
  }

  // Sample of 10 affected products
  if (affected.length > 0) {
    console.log('\n   דוגמאות (עד 10 מוצרים שיושפעו):');
    const sample = affected.slice(0, 10);
    for (const d of sample) {
      const fields = pickStockFields(d.data);
      const fieldsStr = Object.entries(fields).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ');
      console.log(`     [${d.id}] ${(d.data.name ?? '').slice(0, 40).padEnd(40)} SKU:${(d.data.sku ?? '').padEnd(12)} | ${fieldsStr}`);
    }
    if (affected.length > 10) {
      console.log(`     ... ועוד ${affected.length - 10} מוצרים`);
    }
  } else {
    console.log('\n   ✅ כל המוצרים כבר מסומנים כקיימים במלאי. אין מה לעדכן.');
  }

  if (!IS_EXECUTE) {
    console.log('\n' + '─'.repeat(60));
    console.log('💡 להרצה עם כתיבה אמיתית הוסף את הדגל --execute:');
    console.log('   node app/scripts/markAllInStock.mjs --execute');
    console.log('─'.repeat(60) + '\n');
    process.exit(0);
  }

  // ── 4. Execute: batched writes ─────────────────────────────────────────────

  if (affected.length === 0) {
    console.log('\n✅ אין מה לעדכן — יוצא.');
    process.exit(0);
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`⚡ מעדכן ${affected.length} מוצרים (${Math.ceil(affected.length / BATCH_SIZE)} batches)...`);
  console.log('─'.repeat(60));

  let updated = 0;
  for (let i = 0; i < affected.length; i += BATCH_SIZE) {
    const chunk = affected.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const d of chunk) {
      batch.update(d.ref, {
        outOfStock:        false,
        inStock:           true,
        outOfStockReason:  FieldValue.delete(),
        outOfStockDate:    FieldValue.delete(),
      });
    }

    await batch.commit();
    updated += chunk.length;
    console.log(`   ✅ batch ${Math.ceil(i / BATCH_SIZE) + 1}: עודכנו ${chunk.length} מוצרים (סה"כ ${updated}/${affected.length})`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`🎉 הושלם! עודכנו ${updated} מוצרים כקיימים במלאי.`);
  console.log(`   גיבוי לפני השינוי: ${backupPath}`);
  console.log('─'.repeat(60) + '\n');

  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ שגיאה:', err.message ?? err);
  process.exit(1);
});
