/**
 * fixCandleDescriptions.mjs
 * Fixes 5 candelabra products where "הלכה" (Jewish law) was used instead of "לכה" (lacquer).
 * Replaces: ציפוי הלכה → ציפוי לכה, שכבת הלכה → שכבת לכה
 */

import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dir = dirname(fileURLToPath(import.meta.url));

const admin = require('firebase-admin');
const serviceAccount = require(resolve(__dir, '../../serviceAccountKey.json.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

const PRODUCT_IDS = [
  '5NzRWuaV0tOd3nxez7BS',
  'OEoqnRiqFbIORDtTtUKA',
  'f3b09LCwq1I41CYukDnj',
  'joRCfXX1Kltge0UEhPO6',
  'o15sNnNaVFOyFojhaPQr',
];

function fixDesc(desc) {
  if (!desc) return desc;
  return desc
    .replace(/ציפוי הלכה/g, 'ציפוי לכה')
    .replace(/שכבת הלכה/g, 'שכבת לכה');
}

async function run() {
  let updated = 0;
  let skipped = 0;

  for (const id of PRODUCT_IDS) {
    const ref = db.collection('products').doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      console.log(`⚠️  ${id} — not found, skipping`);
      skipped++;
      continue;
    }

    const data = snap.data();
    const field = data.desc !== undefined ? 'desc' : 'description';
    const originalDesc = data[field] || '';
    const fixedDesc = fixDesc(originalDesc);

    if (fixedDesc === originalDesc) {
      console.log(`✅ ${id} — no changes needed`);
      skipped++;
      continue;
    }

    await ref.update({ [field]: fixedDesc });
    console.log(`✏️  ${id} — updated (${data.name || 'ללא שם'})`);
    updated++;
  }

  console.log(`\n════════════════════════════`);
  console.log(`עודכנו: ${updated} מוצרים`);
  console.log(`דולגו:  ${skipped} מוצרים`);
  process.exit(0);
}

run().catch(err => {
  console.error('❌ שגיאה:', err.message);
  process.exit(1);
});
