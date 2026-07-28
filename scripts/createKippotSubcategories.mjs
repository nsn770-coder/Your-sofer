/**
 * createKippotSubcategories.mjs
 * Creates subcategory documents under "כיפות" in the Firestore categories
 * collection — one doc per subcategory, mirroring the structure used by
 * the existing יודאיקה subcategories (slug, displayName, parentCategory,
 * priority, productCount, createdAt).
 *
 * DRY_RUN = true by default — pass --live to write.
 *
 * Usage:
 *   node scripts/createKippotSubcategories.mjs          ← dry-run
 *   node scripts/createKippotSubcategories.mjs --live   ← live create
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DRY_RUN = !process.argv.includes('--live');

const SA_PATH = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Desired subcategories in display order (priority = index + 1)
const DESIRED = [
  'כיפות מיוחדות',
  'כיפות סאטן וטרילין',
  'כיפות סרוגות',
  'כיפות סרוגות DMC',
  'כיפות סרוגות עם רקמה',
  'כיפות עור',
  'כיפות פריק',
  'כיפות פריק עבודת יד',
  'כיפות קטיפה',
  'סיכות לכיפה',
];

async function main() {
  console.log(`\n${'═'.repeat(62)}`);
  console.log(`📂 createKippotSubcategories — ${DRY_RUN ? '🧪 DRY RUN (no writes)' : '🔴 LIVE CREATE'}`);
  console.log(`${'═'.repeat(62)}\n`);

  // ── 1. Fetch actual subCategory values from Firestore ─────────────────────
  console.log('📥 שולף subCategory מ-Firestore (cat="כיפות")...');
  const prodSnap = await db.collection('products').where('cat', '==', 'כיפות').get();

  const actualCounts = {};
  for (const doc of prodSnap.docs) {
    const sub = doc.data().subCategory;
    if (sub) actualCounts[sub] = (actualCounts[sub] || 0) + 1;
  }

  console.log(`\n── ערכי subCategory בפועל (${Object.keys(actualCounts).length} ייחודיים) ──`);
  const sortedActual = Object.entries(actualCounts).sort((a, b) => b[1] - a[1]);
  for (const [sub, cnt] of sortedActual) {
    console.log(`  ${String(cnt).padStart(4)}  "${sub}"`);
  }

  // ── 2. Check existing כיפות subcategory docs in categories collection ─────
  console.log('\n📥 בודק מסמכי categories קיימים עם parentCategory="כיפות"...');
  const catSnap = await db.collection('categories').where('parentCategory', '==', 'כיפות').get();
  const existingSlugs = new Set();
  if (!catSnap.empty) {
    console.log(`  נמצאו ${catSnap.docs.length} מסמכים קיימים:`);
    for (const doc of catSnap.docs) {
      const slug = doc.data().slug || doc.data().displayName;
      existingSlugs.add(slug);
      console.log(`  • [${doc.id}] slug="${slug}"`);
    }
  } else {
    console.log('  אין מסמכים קיימים — אפס כפילויות.');
  }

  // ── 3. Validate each desired name against actual data ─────────────────────
  console.log('\n── השוואה: שמות רצויים מול נתוני Firestore ──');
  const toCreate = [];
  const skipped  = [];

  for (let i = 0; i < DESIRED.length; i++) {
    const name  = DESIRED[i];
    const count = actualCounts[name]; // exact string match (===)

    if (existingSlugs.has(name)) {
      console.log(`  ⏭️  "${name}" — כבר קיים ב-categories (מדולג)`);
      skipped.push({ name, reason: 'כבר קיים ב-categories' });
      continue;
    }

    if (!count) {
      // Check for near-matches to surface typos
      const nearMatch = Object.keys(actualCounts).find(
        k => k.replace(/\s+/g, ' ').trim() === name.replace(/\s+/g, ' ').trim() && k !== name
      );
      if (nearMatch) {
        console.log(`  ⚠️  "${name}" — אי-התאמה: ב-Firestore השם הוא "${nearMatch}" (${actualCounts[nearMatch]} מוצרים) — מדולג`);
        skipped.push({ name, reason: `אי-התאמה: ב-Firestore "${nearMatch}"` });
      } else {
        console.log(`  ❌  "${name}" — אין מוצרים עם שם זה ב-Firestore — מדולג`);
        skipped.push({ name, reason: 'אין מוצרים תואמים' });
      }
      continue;
    }

    console.log(`  ✅  "${name}" — ${count} מוצרים, priority ${i + 1}`);
    toCreate.push({ name, priority: i + 1, productCount: count });
  }

  // ── 4. DRY-RUN report ─────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(62)}`);
  console.log(`📊 סיכום`);
  console.log(`${'─'.repeat(62)}`);
  console.log(`  ייווצרו:  ${toCreate.length} מסמכים`);
  console.log(`  ידולגו:   ${skipped.length} מסמכים`);

  if (toCreate.length > 0) {
    console.log(`\n── מסמכים שייווצרו ──`);
    for (const { name, priority, productCount } of toCreate) {
      console.log(`\n  {`);
      console.log(`    slug:           "${name}",`);
      console.log(`    displayName:    "${name}",`);
      console.log(`    parentCategory: "כיפות",`);
      console.log(`    priority:       ${priority},`);
      console.log(`    productCount:   ${productCount},`);
      console.log(`    createdAt:      <serverTimestamp>`);
      console.log(`  }`);
    }
  }

  if (skipped.length > 0) {
    console.log(`\n── מסמכים שדולגו ──`);
    for (const { name, reason } of skipped) {
      console.log(`  • "${name}" — ${reason}`);
    }
  }

  if (DRY_RUN) {
    console.log(`\n🧪 DRY RUN — לא נוצרו מסמכים.`);
    console.log('   להפעלת יצירה אמיתית:\n');
    console.log('   node scripts/createKippotSubcategories.mjs --live\n');
    process.exit(0);
  }

  // ── 5. LIVE: create docs ──────────────────────────────────────────────────
  if (toCreate.length === 0) {
    console.log('\nאין מסמכים חדשים ליצירה.\n');
    process.exit(0);
  }

  console.log(`\n✏️  יוצר ${toCreate.length} מסמכים ב-categories...`);
  let created = 0, failed = 0;

  for (const { name, priority, productCount } of toCreate) {
    try {
      const ref = await db.collection('categories').add({
        slug:           name,
        displayName:    name,
        parentCategory: 'כיפות',
        priority,
        productCount,
        createdAt:      FieldValue.serverTimestamp(),
      });
      console.log(`  ✅ [${ref.id}] "${name}" (priority ${priority}, ${productCount} מוצרים)`);
      created++;
    } catch (err) {
      console.error(`  ❌ "${name}": ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${'═'.repeat(62)}`);
  console.log('✅ הסתיים');
  console.log(`${'═'.repeat(62)}`);
  console.log(`  נוצרו:  ${created} מסמכים`);
  if (failed > 0) console.log(`  נכשלו: ${failed} מסמכים`);
  console.log();

  process.exit(0);
}

main().catch(err => { console.error('\n❌ Fatal:', err.message); process.exit(1); });
