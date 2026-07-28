/**
 * cancelInventoryClearance.mjs — ביטול הנחת מלאי (clearance) מכל המוצרים.
 *
 * Usage:
 *   node app/scripts/cancelInventoryClearance.mjs             ← dry-run (רק מציג)
 *   node app/scripts/cancelInventoryClearance.mjs --execute   ← ביצוע בפועל
 *
 * מאפס: clearanceDiscount=false, clearanceSalePrice=null, originalPrice=null
 * על כל מוצר שמסומן clearanceDiscount === true.
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const __dir   = dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');

const keyPath = resolve(__dir, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) {
  initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf-8'))) });
}
const db = getFirestore();

async function run() {
  const snap = await db.collection('products').where('clearanceDiscount', '==', true).get();
  console.log(`נמצאו ${snap.size} מוצרים עם הנחת מלאי פעילה`);
  snap.docs.slice(0, 10).forEach(d => {
    const p = d.data();
    console.log(`  • ${p.name ?? d.id} — ₪${p.clearanceSalePrice} (מקורי ₪${p.originalPrice ?? p.price})`);
  });
  if (snap.size > 10) console.log(`  ... ועוד ${snap.size - 10}`);

  if (!EXECUTE) {
    console.log('\nDRY-RUN בלבד. להרצה בפועל: node app/scripts/cancelInventoryClearance.mjs --execute');
    return;
  }

  const BATCH = 400;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = db.batch();
    docs.slice(i, i + BATCH).forEach(d =>
      batch.update(d.ref, {
        clearanceDiscount:  false,
        clearanceSalePrice: null,
        originalPrice:      null,
        lastInventoryCheck: new Date(),
      })
    );
    await batch.commit();
    console.log(`עודכנו ${Math.min(i + BATCH, docs.length)}/${docs.length}`);
  }
  console.log('\n✅ הנחת המלאי בוטלה מכל המוצרים.');
  console.log('שים לב: אם המוצרים מסונכרנים לאלגוליה — הרץ גם: node scripts/syncAlgolia.mjs');
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
