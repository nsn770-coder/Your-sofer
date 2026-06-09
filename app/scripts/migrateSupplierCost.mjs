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

const BATCH_SIZE = 400;
let fromSofer = 0, fromPurchase = 0, skipped = 0;

// ── Paginate through all products ─────────────────────────────────────────────
let lastDoc = null;
let pageNum  = 0;

while (true) {
  let q = db.collection('products').limit(BATCH_SIZE);
  if (lastDoc) q = q.startAfter(lastDoc);

  const snap = await q.get();
  if (snap.empty) break;
  lastDoc = snap.docs[snap.docs.length - 1];
  pageNum++;
  console.log(`עמוד ${pageNum} — ${snap.size} מוצרים`);

  const batch = db.batch();
  let batchCount = 0;

  for (const d of snap.docs) {
    const p   = d.data();
    const ref = d.ref;

    // Already has supplierCost — skip
    if (p.supplierCost !== undefined && p.supplierCost !== null) {
      skipped++;
      continue;
    }

    // Priority 1: soferBasePrice
    if (p.soferBasePrice !== undefined && p.soferBasePrice !== null) {
      batch.update(ref, { supplierCost: p.soferBasePrice });
      fromSofer++;
      batchCount++;
      continue;
    }

    // Priority 2: purchasePrice (newer scraper)
    if (p.purchasePrice !== undefined && p.purchasePrice !== null) {
      batch.update(ref, { supplierCost: p.purchasePrice });
      fromPurchase++;
      batchCount++;
      continue;
    }
  }

  if (batchCount > 0) await batch.commit();
}

// ── Final count ───────────────────────────────────────────────────────────────
const totalSnap = await db.collection('products').limit(5000).get();
let withCost = 0;
for (const d of totalSnap.docs) {
  const p = d.data();
  if (p.supplierCost !== undefined && p.supplierCost !== null) withCost++;
}

console.log('\n═══════════════════════════════════════════════════════');
console.log('סיכום מיגרציה:');
console.log(`  הועתק מ-soferBasePrice:  ${fromSofer}`);
console.log(`  הועתק מ-purchasePrice:   ${fromPurchase}`);
console.log(`  כבר היה supplierCost:    ${skipped}`);
console.log(`  סה"כ עודכנו:             ${fromSofer + fromPurchase}`);
console.log(`\n  מוצרים עם supplierCost עכשיו: ${withCost}/${totalSnap.size}`);
console.log('═══════════════════════════════════════════════════════');

process.exit(0);
