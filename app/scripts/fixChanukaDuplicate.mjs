/**
 * fixChanukaDuplicate.mjs
 *
 * Copies image/banner fields from categories/mAutRmUezBhJQ1vHULHM (the doc the
 * admin writes to) → categories/חנוכה (the doc the homepage reads from).
 *
 * Also scans the whole categories collection and reports every slug that appears
 * in more than one document.
 *
 * Usage:
 *   node app/scripts/fixChanukaDuplicate.mjs           ← preview only, no writes
 *   node app/scripts/fixChanukaDuplicate.mjs --confirm ← execute the copy
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { readFileSync }        from 'fs';
import { resolve, dirname }    from 'path';
import { fileURLToPath }       from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(
  resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'
));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const CONFIRM = process.argv.includes('--confirm');

// Image / banner fields we care about
const IMAGE_FIELDS = ['imageUrl', 'imgUrl', 'bannerUrl', 'mobileImageUrl', 'bannerImageUrl', 'bannerMobile', 'bannerDesktop'];

const SOURCE_ID = 'mAutRmUezBhJQ1vHULHM'; // admin writes here
const TARGET_ID = 'חנוכה';                 // homepage reads here

// ── 1. Read both docs ──────────────────────────────────────────────────────────
const [sourceSnap, targetSnap] = await Promise.all([
  db.collection('categories').doc(SOURCE_ID).get(),
  db.collection('categories').doc(TARGET_ID).get(),
]);

if (!sourceSnap.exists) { console.error(`ERROR: source doc "${SOURCE_ID}" not found`); process.exit(1); }
if (!targetSnap.exists) { console.error(`ERROR: target doc "${TARGET_ID}" not found`); process.exit(1); }

const src = sourceSnap.data();
const tgt = targetSnap.data();

// ── 2. Show preview ────────────────────────────────────────────────────────────
console.log('=== PREVIEW: fields to copy ===\n');
console.log(`SOURCE  id="${SOURCE_ID}"  (admin writes here)`);
console.log(`TARGET  id="${TARGET_ID}"  (homepage reads here)\n`);

const toCopy = {};
for (const field of IMAGE_FIELDS) {
  const srcVal = src[field];
  const tgtVal = tgt[field];
  if (srcVal !== undefined) {
    const changed = srcVal !== tgtVal;
    console.log(`  ${changed ? '→' : '='} ${field}`);
    console.log(`      SOURCE: ${srcVal || '(empty)'}`);
    console.log(`      TARGET: ${tgtVal ?? '(not set)'}`);
    if (changed) toCopy[field] = srcVal;
  } else if (tgtVal !== undefined) {
    console.log(`  ✓ ${field} (only in target — not touched)`);
    console.log(`      TARGET: ${tgtVal}`);
  }
}

if (Object.keys(toCopy).length === 0) {
  console.log('\n✅ No differences found — target is already up to date. Nothing to do.');
} else {
  console.log(`\nFields that will be written to "${TARGET_ID}":`);
  for (const [k, v] of Object.entries(toCopy)) {
    console.log(`  ${k}: ${v}`);
  }
}

// ── 3. Execute (only with --confirm) ──────────────────────────────────────────
if (!CONFIRM) {
  console.log('\n⚠️  DRY RUN — no changes made.');
  console.log('   Re-run with --confirm to apply.\n');
} else if (Object.keys(toCopy).length === 0) {
  console.log('\nNothing to write.');
} else {
  await db.collection('categories').doc(TARGET_ID).update(toCopy);
  console.log(`\n✅ WRITTEN — "${TARGET_ID}" updated with ${Object.keys(toCopy).length} field(s).`);

  // Verify
  const verify = await db.collection('categories').doc(TARGET_ID).get();
  const v = verify.data();
  console.log('\nVerification — target doc after update:');
  for (const field of IMAGE_FIELDS) {
    if (v[field]) console.log(`  ${field}: ${v[field]}`);
  }
}

// ── 4. Duplicate-slug scan across all categories ───────────────────────────────
console.log('\n\n=== DUPLICATE SLUG SCAN (all categories) ===\n');

const snap = await db.collection('categories').get();
const slugIndex = new Map(); // slug → [doc ids]

for (const d of snap.docs) {
  const r = d.data();
  // A doc "owns" these slug values
  const slugs = new Set([
    d.id,
    r.slug,
    r.name,
  ].filter(Boolean).map(String));

  for (const s of slugs) {
    if (!slugIndex.has(s)) slugIndex.set(s, []);
    slugIndex.get(s).push(d.id);
  }
}

let hasDuplicates = false;
for (const [slug, ids] of [...slugIndex.entries()].sort()) {
  // Only flag when multiple *different* doc IDs share the same slug
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length > 1) {
    hasDuplicates = true;
    console.log(`⚠️  slug "${slug}" → ${uniqueIds.length} docs: ${uniqueIds.map(id => `"${id}"`).join(', ')}`);
  }
}

if (!hasDuplicates) {
  console.log('✅ No duplicate slugs found across all categories.');
} else {
  console.log('\n(docs listed above each appear in more than one category document)');
}
