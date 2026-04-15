/**
 * Sets subCategory field on paldinox יודאיקה products based on name keywords.
 *
 * Rules (first match wins):
 *   נטל/נטלה/מעמד/בסיס     → נטילת ידיים
 *   חנוכי/חנוכה/מנורה       → חנוכה
 *   מצה/מצות/ארגז מצ        → פסח
 *   הבדלה/בשמים/קידוש/שבת   → שבת
 *   מארז/סט/טס              → סטים ומארזים
 *   שאר                     → יודאיקה כללי
 *
 * Run: node scripts/updateJudaicaSubcategories.mjs
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
  } catch {}
}
loadEnvLocal();

const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

const RULES = [
  { sub: 'נטילת ידיים',  kw: ['נטל', 'נטלה', 'מעמד', 'בסיס'] },
  { sub: 'חנוכה',        kw: ['חנוכי', 'חנוכה', 'מנורה'] },
  { sub: 'פסח',          kw: ['מצה', 'מצות', 'ארגז מצ'] },
  { sub: 'שבת',          kw: ['הבדלה', 'בשמים', 'קידוש', 'שבת'] },
  { sub: 'סטים ומארזים', kw: ['מארז', 'סט', 'טס'] },
];

function getSubCategory(name) {
  for (const rule of RULES) {
    if (rule.kw.some(kw => name.includes(kw))) return rule.sub;
  }
  return 'יודאיקה כללי';
}

async function main() {
  console.log('\n🔄 updateJudaicaSubcategories\n');

  const snap = await db.collection('products')
    .where('cat', '==', 'יודאיקה')
    .where('source', '==', 'paldinox')
    .get();

  console.log(`   נטענו ${snap.size} מוצרי יודאיקה\n`);

  const BATCH_SIZE = 400;
  let batch = db.batch();
  let batchCount = 0;
  const summary = {};
  let updated = 0;

  for (const docSnap of snap.docs) {
    const name = docSnap.data().name ?? '';
    const sub  = getSubCategory(name);

    batch.update(docSnap.ref, { subCategory: sub });
    summary[sub] = (summary[sub] ?? 0) + 1;
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

  console.log('\n=== סיכום subCategory ===');
  for (const [sub, count] of Object.entries(summary).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${sub.padEnd(22)} ${count}`);
  }
  console.log(`\n  סה"כ עודכנו: ${updated}\n`);
  process.exit(0);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
