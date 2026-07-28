import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require   = createRequire(import.meta.url);
const sa        = require(path.join(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// ── Step 1: Find all products with receivedFromSupplier > 0 ───────────────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('שלב 1 — מוצרים שעומדים להתאפס');
console.log('═══════════════════════════════════════════════════════════════');

const toReset = [];
let cursor = null;
while (true) {
  let q = db.collection('products').limit(500);
  if (cursor) q = q.startAfter(cursor);
  const snap = await q.get();
  if (snap.empty) break;
  cursor = snap.docs[snap.docs.length - 1];
  for (const d of snap.docs) {
    const p = d.data();
    if (p.receivedFromSupplier && p.receivedFromSupplier > 0) {
      toReset.push({ ref: d.ref, id: d.id, name: p.name ?? '—', received: p.receivedFromSupplier });
    }
  }
}

if (toReset.length === 0) {
  console.log('⚠ לא נמצאו מוצרים עם receivedFromSupplier > 0 — יוצא.');
  process.exit(0);
}

for (const p of toReset) {
  console.log(`  [${p.id}] ${p.name.slice(0, 50).padEnd(52)} receivedFromSupplier=${p.received}`);
}
console.log(`\nסה"כ: ${toReset.length} מוצרים ייאופסו.\n`);

// ── Step 2: Reset receivedFromSupplier + inStock ONLY ────────────────────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('שלב 2 — מאפס receivedFromSupplier ו-inStock בלבד');
console.log('═══════════════════════════════════════════════════════════════');

// Firestore batch limit = 500 writes. 14 products fits in one batch.
const batch = db.batch();
for (const p of toReset) {
  batch.update(p.ref, {
    receivedFromSupplier: 0,
    inStock: 0,
  });
}
await batch.commit();

for (const p of toReset) {
  console.log(`  ✓ אופס: ${p.name.slice(0, 55)}`);
}
console.log(`\nאופסו ${toReset.length} מוצרים.\n`);

// ── Step 3: Delete all invoices ───────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('שלב 3 — מוחק רשומות invoices');
console.log('═══════════════════════════════════════════════════════════════');

let invoicesDeleted = 0;
while (true) {
  const snap = await db.collection('invoices').limit(400).get();
  if (snap.empty) break;
  const delBatch = db.batch();
  snap.docs.forEach(d => delBatch.delete(d.ref));
  await delBatch.commit();
  invoicesDeleted += snap.docs.length;
  console.log(`  נמחקו ${snap.docs.length} רשומות (סה"כ עד כה: ${invoicesDeleted})`);
}
console.log(`\nסה"כ נמחקו ${invoicesDeleted} רשומות מ-invoices.\n`);

// ── Step 4: Verification — supplierCost count must stay 3,919 ────────────────
console.log('═══════════════════════════════════════════════════════════════');
console.log('שלב 4 — בדיקת ודאות: ספירת supplierCost > 0');
console.log('═══════════════════════════════════════════════════════════════');

let withCost = 0;
let totalProducts = 0;
cursor = null;
while (true) {
  let q = db.collection('products').limit(500);
  if (cursor) q = q.startAfter(cursor);
  const snap = await q.get();
  if (snap.empty) break;
  cursor = snap.docs[snap.docs.length - 1];
  for (const d of snap.docs) {
    totalProducts++;
    const p = d.data();
    if (p.supplierCost !== undefined && p.supplierCost !== null && p.supplierCost > 0) withCost++;
  }
}

const expected = 3919;
const ok = withCost >= expected;
console.log(`  supplierCost > 0: ${withCost}/${totalProducts}`);
console.log(`  צפוי: ${expected}`);
console.log(ok
  ? `  ✅ תקין — supplierCost לא נפגע`
  : `  ❌ אזהרה! הצפוי ${expected}, נמצא ${withCost} — בדוק!`
);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('סיכום איפוס:');
console.log(`  מוצרים שאופסו:         ${toReset.length}`);
console.log(`  invoices שנמחקו:       ${invoicesDeleted}`);
console.log(`  supplierCost שמור:     ${withCost} (${ok ? 'תקין ✅' : 'בעיה ❌'})`);
console.log('═══════════════════════════════════════════════════════════════');

process.exit(0);
