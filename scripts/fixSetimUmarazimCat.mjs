/**
 * fixSetimUmarazimCat.mjs  —  MIGRATION (write)
 *
 * Fixes exactly 11 products where:
 *   cat === 'סטים ומארזים'  AND  subCategory === 'סטים ומארזים'
 *
 * Change:  cat + category  →  'יודאיקה'
 * Keep:    subCategory     →  'סטים ומארזים'  (unchanged)
 *
 * Safety:
 *  - Filters on BOTH fields to avoid touching any other product.
 *  - Aborts if the candidate count is not exactly 11.
 *  - Prints every product name + id before writing.
 *  - Confirms each update individually.
 *  - Runs a post-update verification query.
 *
 * Run:  node scripts/fixSetimUmarazimCat.mjs
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

const TARGET_CAT = 'סטים ומארזים';
const TARGET_SUB = 'סטים ומארזים';
const NEW_CAT    = 'יודאיקה';
const EXPECTED_COUNT = 11;

async function main() {
  // ── Step 1: fetch candidates ───────────────────────────────────────────────
  console.log('\nשולף מועמדים...');
  const snap = await db.collection('products')
    .where('cat', '==', TARGET_CAT)
    .get();

  // Double-filter: also require subCategory match (Firestore can only filter
  // one inequality per query, so we apply the second condition client-side)
  const candidates = snap.docs.filter(d => d.data().subCategory === TARGET_SUB);

  console.log(`\nנמצאו ${candidates.length} מוצרים עם cat="${TARGET_CAT}" AND subCategory="${TARGET_SUB}":\n`);
  for (const d of candidates) {
    const p = d.data();
    console.log(`  • [${d.id}]  "${p.name ?? '(ללא שם)'}"`);
  }

  // ── Step 2: safety check ───────────────────────────────────────────────────
  if (candidates.length !== EXPECTED_COUNT) {
    console.error(`\n❌ עצירה: צפינו ל-${EXPECTED_COUNT} מוצרים, נמצאו ${candidates.length}. לא מבוצע שום עדכון.`);
    process.exit(1);
  }
  console.log(`\n✅ מספר מוצרים תואם (${EXPECTED_COUNT}). מתחיל עדכון...\n`);

  // ── Step 3: update ─────────────────────────────────────────────────────────
  let updated = 0;
  for (const d of candidates) {
    const p = d.data();
    await db.collection('products').doc(d.id).update({
      cat:      NEW_CAT,
      category: NEW_CAT,
      // subCategory stays 'סטים ומארזים' — not touched
    });
    updated++;
    console.log(`  ✔ עודכן [${d.id}]  "${p.name ?? '(ללא שם)'}"`);
    console.log(`      cat: "${TARGET_CAT}" → "${NEW_CAT}"  |  subCategory: "${TARGET_SUB}" (ללא שינוי)`);
  }

  console.log(`\nסה"כ עודכנו: ${updated} מוצרים.`);

  // ── Step 4: post-update verification ──────────────────────────────────────
  console.log('\nמריץ אימות סופי...');
  const remaining = await db.collection('products')
    .where('cat', '==', TARGET_CAT)
    .get();

  console.log(`\nמוצרים שנשארו עם cat="${TARGET_CAT}": ${remaining.size}`);
  if (remaining.size === 0) {
    console.log('✅ אימות עבר — אין יותר מוצרים עם cat="סטים ומארזים".');
  } else {
    console.log('⚠️  נשארו מוצרים עם cat="סטים ומארזים" (יתכן שהם תקינים — אין להם subCategory="סטים ומארזים"):');
    for (const d of remaining.docs) {
      const p = d.data();
      console.log(`    • [${d.id}]  "${p.name}"  subCategory="${p.subCategory ?? ''}"`);
    }
  }

  console.log('\nהמיגרציה הסתיימה.\n');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
