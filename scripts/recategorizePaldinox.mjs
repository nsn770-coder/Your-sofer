/**
 * Re-categorizes existing paldinox products in Firestore:
 *   → הגשה ואירוח: מגש, קערה, קנקן, בקבוק, כוס, גביע, ספל, צלחת, סכו"ם, מפית, טס, מגבת
 *   → עיצוב הבית:  פמוט, נר, מסגרת, שעון, קופסה, קישוט, דקור, מראה, כרית, שטיח, תמונה
 *   → שאר          → יודאיקה (unchanged)
 *
 * Run: node scripts/recategorizePaldinox.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
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
  } catch { }
}
loadEnvLocal();

const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

const RULES = [
  {
    cat:      'הגשה ואירוח',
    keywords: ['מגש', 'קערה', 'קנקן', 'בקבוק', 'כוס', 'גביע', 'ספל', 'צלחת', 'סכו"ם', 'מפית', 'טס', 'מגבת'],
  },
  {
    cat:      'עיצוב הבית',
    keywords: ['פמוט', 'נר', 'מסגרת', 'שעון', 'קופסה', 'קישוט', 'דקור', 'מראה', 'כרית', 'שטיח', 'תמונה'],
  },
];

function categorize(name) {
  for (const rule of RULES) {
    if (rule.keywords.some(kw => name.includes(kw))) return rule.cat;
  }
  return null; // keep existing
}

async function main() {
  console.log('\n🔄 recategorizePaldinox\n');

  const snap = await db.collection('products').where('source', '==', 'paldinox').get();
  console.log(`   נטענו ${snap.size} מוצרי paldinox\n`);

  const BATCH_SIZE = 400;
  let batch = db.batch();
  let batchCount = 0;
  const summary = {};
  let updated = 0, unchanged = 0;

  for (const docSnap of snap.docs) {
    const data     = docSnap.data();
    const newCat   = categorize(data.name);

    if (!newCat || (data.cat === newCat && data.category === newCat)) {
      unchanged++;
      continue;
    }

    batch.update(docSnap.ref, { cat: newCat, category: newCat });
    summary[newCat] = (summary[newCat] ?? 0) + 1;
    updated++;
    batchCount++;

    if (batchCount === BATCH_SIZE) {
      await batch.commit();
      console.log(`   📤 batch נשלח (${updated} עד כה)`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();

  console.log('\n=== סיכום עדכון ===');
  for (const [cat, count] of Object.entries(summary)) {
    console.log(`  ${cat}: ${count}`);
  }
  console.log(`  ללא שינוי: ${unchanged}`);
  console.log(`  סה"כ עודכנו: ${updated}\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
