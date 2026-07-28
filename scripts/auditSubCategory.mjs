import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    const lines = raw.split('\n'); let key = null, val = '';
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) { if (key && !process.env[key]) process.env[key] = val.trim(); key = m[1]; val = m[2]; }
      else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch {}
}
loadEnv();

if (!getApps().length) initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_PROJECT_ID ?? 'your-sofer',
  clientEmail: (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim(),
  privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
})});

const db = getFirestore();

// Mirrored from app/constants/categories.ts
const SUB_CATS = {
  'טליתות':    ['טלית קטן', 'טלית צמר', 'סט טלית תפילין'],
  'יודאיקה':   ['נטילת ידיים', 'שבת', 'חנוכה', 'פסח', 'סטים ומארזים', 'יודאיקה כללי'],
  'חגים':      ['חנוכה', 'פסח'],
  'בר מצווה':  ['סטים לבר מצווה', 'תפילין קומפלט', 'טליתות', 'מתנות לבר מצווה'],
  'קלפים':     ['קלפי מזוזה', 'קלפי תפילין'],
};

// Flat set of all valid sub-category strings
const ALL_SUBCATS = new Set(Object.values(SUB_CATS).flat());

// Reverse map: "סטים ומארזים" → "יודאיקה"
const SUBCAT_TO_PARENT = {};
for (const [parent, subs] of Object.entries(SUB_CATS)) {
  for (const sub of subs) SUBCAT_TO_PARENT[sub] = parent;
}

async function main() {
  const snap = await db.collection('products').limit(5000).get();
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  SUB-CATEGORY AUDIT  —  DRY RUN (no writes)`);
  console.log(`═══════════════════════════════════════════════\n`);

  // ── A. Total
  console.log(`A. סה"כ מוצרים: ${all.length}`);

  // ── B. Missing subCategory entirely
  const missingAny = all.filter(p => !p.subCategory || p.subCategory.trim() === '');
  console.log(`\nB. מוצרים ללא שדה subCategory כלל: ${missingAny.length}`);

  // ── C. Orphans: cat (or category) is a known sub-category value
  //       but subCategory is missing or doesn't match
  const orphans = all.filter(p => {
    const catVal = (p.cat || p.category || '').trim();
    if (!ALL_SUBCATS.has(catVal)) return false;          // cat is not a sub-category value → skip
    const sub = (p.subCategory || '').trim();
    return sub !== catVal;                                // subCategory missing or wrong
  });

  // Group orphans by their cat value (the sub-category they belong to)
  const byCat = {};
  for (const p of orphans) {
    const catVal = (p.cat || p.category || '').trim();
    if (!byCat[catVal]) byCat[catVal] = [];
    byCat[catVal].push(p);
  }

  console.log(`\nC. "יתומים" — cat הוא תת-קטגוריה תקפה אך subCategory חסר/שגוי: ${orphans.length}`);
  console.log(`   פירוט לפי cat:`);
  const sorted = Object.entries(byCat).sort((a, b) => b[1].length - a[1].length);
  for (const [catVal, prods] of sorted) {
    const parent = SUBCAT_TO_PARENT[catVal] || '?';
    console.log(`     "${catVal}"  (אמור להיות תחת "${parent}")  →  ${prods.length} מוצרים`);
  }

  // ── D. 5 example orphans
  console.log(`\nD. 5 דוגמאות של יתומים:`);
  const examples = orphans.slice(0, 5);
  for (const p of examples) {
    const name = (p.name || '').substring(0, 40);
    console.log(`   id: ${p.id}`);
    console.log(`     name:        "${name}"`);
    console.log(`     cat:         "${p.cat ?? '—'}"`);
    console.log(`     category:    "${p.category ?? '—'}"`);
    console.log(`     subCategory: "${p.subCategory ?? '(חסר)'}"`);
    console.log(``);
  }

  // ── Summary of what backfill would do
  console.log(`\n── מה ה-backfill יעשה ──`);
  for (const [catVal, prods] of sorted) {
    const parent = SUBCAT_TO_PARENT[catVal] || '?';
    console.log(`  ${prods.length} מוצרי "${catVal}": cat → "${parent}", subCategory → "${catVal}"`);
  }
  console.log(`  סה"כ: ${orphans.length} מסמכים יעודכנו\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
