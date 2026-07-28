/**
 * diagCategoryMismatch.mjs  —  READ-ONLY diagnostic
 *
 * Checks for two classes of miscategorised products:
 *
 * A) Products where cat = a יודאיקה sub-value (חנוכה / פסח / סטים ומארזים /
 *    יודאיקה כללי).  These are queried by subCategory on their own pages, so
 *    they won't appear there — they'll only show up on a "cat=חנוכה" query
 *    which nothing currently runs.
 *
 * B) Products where subCategory is populated but cat does not match the
 *    expected parent (יודאיקה for יודאיקה-subs, טליתות for טליתות-subs).
 *    These products will miss the parent category page.
 *
 * Run:  node scripts/diagCategoryMismatch.mjs
 */

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
  projectId:   process.env.FIREBASE_PROJECT_ID ?? 'your-sofer',
  clientEmail: (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim(),
  privateKey:  (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
})});
const db = getFirestore();

// ─── Category mappings (mirrors CategoryClient + SUB_CATS) ────────────────────

// Sub-values that /category/[sub] pages query by subCategory
const SUBCATEGORY_PAGES = new Set(['חנוכה', 'פסח', 'סטים ומארזים', 'יודאיקה כללי']);

// sub-value → expected parent cat
const EXPECTED_PARENT = {
  // יודאיקה subs
  'נטילת ידיים': 'יודאיקה',
  'שבת':          'יודאיקה',
  'חנוכה':        'יודאיקה',
  'פסח':          'יודאיקה',
  'סטים ומארזים': 'יודאיקה',
  'יודאיקה כללי': 'יודאיקה',
  // טליתות subs
  'טלית קטן':       'טליתות',
  'טלית צמר':       'טליתות',
  'סט טלית תפילין': 'טליתות',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sample(arr, n = 3) {
  return arr.slice(0, n).map(p => ({
    name: (p.name ?? '').slice(0, 45),
    cat: p.cat ?? p.category ?? '',
    subCategory: p.subCategory ?? '',
  }));
}

function printTable(rows) {
  if (rows.length === 0) { console.log('  (אין)'); return; }
  for (const r of rows) {
    console.log(`  • "${r.name}"`);
    console.log(`      cat="${r.cat}"  subCategory="${r.subCategory}"`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nטוען מוצרים מ-Firestore...');
  const snap = await db.collection('products').get();
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`סה"כ מוצרים ב-products: ${all.length}`);
  console.log(`מוצרים active/no-hidden: ${all.filter(p => p.status === 'active' && p.hidden !== true).length}`);

  // ────────────────────────────────────────────────────────────────────────────
  // GROUP A: cat = one of the יודאיקה SUBCATEGORY_PAGES values
  // These products were tagged with the sub-value as their primary cat, not
  // as subCategory.  /category/חנוכה queries WHERE subCategory == 'חנוכה',
  // so they WILL NOT appear there.
  // ────────────────────────────────────────────────────────────────────────────
  const groupA = [];
  const groupABySub = {};

  for (const p of all) {
    const cat = p.cat ?? p.category ?? '';
    if (SUBCATEGORY_PAGES.has(cat)) {
      groupA.push(p);
      if (!groupABySub[cat]) groupABySub[cat] = [];
      groupABySub[cat].push(p);
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('A) מוצרים שה-cat שלהם הוא ערך תת-קטגוריה של יודאיקה');
  console.log('   (אלה יופיעו על /category/X ב-where cat==X, אבל עמוד X');
  console.log('    שולף where subCategory==X — לכן לא יופיעו בעמוד שלהם)');
  console.log('═'.repeat(70));
  console.log(`סה"כ: ${groupA.length} מוצרים\n`);

  for (const [sub, products] of Object.entries(groupABySub)) {
    console.log(`  [${sub}]  ${products.length} מוצרים — דוגמאות:`);
    printTable(sample(products));
    console.log();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GROUP B: subCategory is set but cat ≠ expected parent
  // E.g. subCategory='חנוכה' but cat='חגים' (won't appear on /category/יודאיקה)
  //      subCategory='טלית קטן' but cat='כיפות'  (won't appear on /category/טליתות)
  // ────────────────────────────────────────────────────────────────────────────
  const groupB = [];
  const groupBByIssue = {};

  for (const p of all) {
    const cat = p.cat ?? p.category ?? '';
    const sub = p.subCategory ?? '';
    if (!sub) continue;
    const expected = EXPECTED_PARENT[sub];
    if (!expected) continue;       // sub value not in our mapping — skip
    if (cat === expected) continue; // all good
    // mismatch
    groupB.push(p);
    const key = `subCategory="${sub}" — צפוי cat="${expected}", יש cat="${cat}"`;
    if (!groupBByIssue[key]) groupBByIssue[key] = [];
    groupBByIssue[key].push(p);
  }

  console.log('═'.repeat(70));
  console.log('B) מוצרים שיש להם subCategory אבל cat לא תואם לאב הצפוי');
  console.log('   (יופיעו בעמוד התת-קטגוריה אם הוא ב-SUBCATEGORY_PAGES,');
  console.log('    אבל לא בעמוד קטגוריית-האב)');
  console.log('═'.repeat(70));
  console.log(`סה"כ: ${groupB.length} מוצרים\n`);

  for (const [issue, products] of Object.entries(groupBByIssue)) {
    console.log(`  [${issue}]  ${products.length} מוצרים — דוגמאות:`);
    printTable(sample(products));
    console.log();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ────────────────────────────────────────────────────────────────────────────
  console.log('═'.repeat(70));
  console.log('סיכום');
  console.log('═'.repeat(70));
  console.log(`A) cat = sub-value של יודאיקה:  ${groupA.length} מוצרים`);
  console.log(`B) subCategory ≠ צפוי-אב:       ${groupB.length} מוצרים`);
  console.log(`   סה"כ שעלולים להיות בעיה:     ${new Set([...groupA.map(p=>p.id), ...groupB.map(p=>p.id)]).size} ייחודיים`);
  if (groupA.length === 0 && groupB.length === 0) {
    console.log('\n✅ לא נמצאו בעיות — אין צורך ב-migration script.');
  } else {
    console.log('\n⚠️  יש מוצרים שדורשים בדיקה. שקול migration script לתיקון.');
  }
  console.log();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
