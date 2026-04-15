/**
 * Updates subCategory on products by keyword matching.
 *
 * Scope A — cat: "יודאיקה"
 *   Rules (first match wins):
 *   פסח          → מצה, מצות, סדר, הגדה, מרור, כרפס, אפיקומן, קערת סדר, פסח
 *   חנוכה        → חנוכי, חנוכה, מנורה, שמן, סביבון
 *   שבת          → שבת, נר, פמוט, קידוש, הבדלה, בשמים, כוס קידוש, מפית שבת
 *   נטילת ידיים  → נטל, נטלה, מעמד, בסיס, נטילה
 *   סטים ומארזים → סט, מארז, קבוצה, ערכה
 *   יודאיקה כללי → (fallback)
 *
 * Scope B — cat: "הגשה ואירוח" | "עיצוב הבית"
 *   Only products whose name contains holiday keywords get a subCategory;
 *   the rest are left alone (no subCategory set).
 *
 * Run: node scripts/updateSubCategories.mjs
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

// ── Keyword rules (first match wins) ──────────────────────────────────────────
const JUDAICA_RULES = [
  { sub: 'פסח',          kw: ['מצה', 'מצות', 'סדר', 'הגדה', 'מרור', 'כרפס', 'אפיקומן', 'קערת סדר', 'פסח'] },
  { sub: 'חנוכה',        kw: ['חנוכי', 'חנוכה', 'מנורה', 'שמן', 'סביבון'] },
  { sub: 'שבת',          kw: ['שבת', 'נר', 'פמוט', 'קידוש', 'הבדלה', 'בשמים', 'כוס קידוש', 'מפית שבת'] },
  { sub: 'נטילת ידיים',  kw: ['נטל', 'נטלה', 'מעמד', 'בסיס', 'נטילה'] },
  { sub: 'סטים ומארזים', kw: ['סט', 'מארז', 'קבוצה', 'ערכה'] },
];

// Holiday keywords used to tag הגשה/עיצוב products
const HOLIDAY_RULES = [
  { sub: 'פסח',   kw: ['מצה', 'מצות', 'סדר', 'הגדה', 'מרור', 'כרפס', 'אפיקומן', 'פסח'] },
  { sub: 'חנוכה', kw: ['חנוכי', 'חנוכה', 'מנורה', 'סביבון'] },
  { sub: 'שבת',   kw: ['שבת', 'פמוט', 'קידוש', 'הבדלה', 'בשמים'] },
];

function matchRules(name, rules) {
  for (const rule of rules) {
    if (rule.kw.some(kw => name.includes(kw))) return rule.sub;
  }
  return null;
}

const BATCH_SIZE = 400;

async function commitBatch(batch, count) {
  await batch.commit();
  console.log(`   📤 batch שלוח (${count} עד כה)`);
}

async function processCollection(snap, getRuleFn, label) {
  const summary = {};
  let batch = db.batch();
  let batchCount = 0;
  let total = 0;

  for (const docSnap of snap.docs) {
    const name = docSnap.data().name ?? '';
    const sub  = getRuleFn(name);
    if (sub === null) continue;            // skip — no update needed

    batch.update(docSnap.ref, { subCategory: sub });
    summary[sub] = (summary[sub] ?? 0) + 1;
    total++;
    batchCount++;

    if (batchCount === BATCH_SIZE) {
      await commitBatch(batch, total);
      batch = db.batch();
      batchCount = 0;
    }
  }
  if (batchCount > 0) await commitBatch(batch, total);

  console.log(`\n  ${label} — ${total} עודכנו:`);
  for (const [sub, cnt] of Object.entries(summary).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${sub.padEnd(20)} ${cnt}`);
  }
  return total;
}

async function main() {
  console.log('\n🔄 updateSubCategories\n');

  // ── Scope A: יודאיקה ────────────────────────────────────────────────────
  console.log('📂 טוען מוצרי יודאיקה...');
  const judaicaSnap = await db.collection('products')
    .where('cat', '==', 'יודאיקה')
    .get();
  console.log(`   נמצאו: ${judaicaSnap.size}`);

  const totalA = await processCollection(
    judaicaSnap,
    name => matchRules(name, JUDAICA_RULES) ?? 'יודאיקה כללי',
    'יודאיקה'
  );

  // ── Scope B: הגשה ואירוח ────────────────────────────────────────────────
  console.log('\n📂 טוען מוצרי הגשה ואירוח...');
  const hostingSnap = await db.collection('products')
    .where('cat', '==', 'הגשה ואירוח')
    .get();
  console.log(`   נמצאו: ${hostingSnap.size}`);

  const totalB = await processCollection(
    hostingSnap,
    name => matchRules(name, HOLIDAY_RULES),   // null = no update
    'הגשה ואירוח'
  );

  // ── Scope C: עיצוב הבית ──────────────────────────────────────────────────
  console.log('\n📂 טוען מוצרי עיצוב הבית...');
  const decorSnap = await db.collection('products')
    .where('cat', '==', 'עיצוב הבית')
    .get();
  console.log(`   נמצאו: ${decorSnap.size}`);

  const totalC = await processCollection(
    decorSnap,
    name => matchRules(name, HOLIDAY_RULES),   // null = no update
    'עיצוב הבית'
  );

  console.log('\n' + '='.repeat(40));
  console.log(`סה"כ עודכנו: ${totalA + totalB + totalC} מוצרים`);
  console.log('='.repeat(40) + '\n');

  process.exit(0);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
