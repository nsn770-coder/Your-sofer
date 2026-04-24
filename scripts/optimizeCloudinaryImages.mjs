/**
 * Rewrites Cloudinary imageUrl strings in Firestore products to include
 * f_auto, q_auto:good, and appropriate width transforms.
 *
 * Fields handled:
 *   imgUrl / image_url  → w_800  (main product image)
 *   imgUrl2 / imgUrl3   → w_400  (secondary / thumbnail)
 *
 * Products with isBestSeller === true are processed first.
 * Runs on 5 products as a dry-test first, then asks before processing the rest.
 *
 * Run: node scripts/optimizeCloudinaryImages.mjs
 */

import { readFileSync, createInterface } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ── Env loader ────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
  const vars = {};
  let key = null, val = [];
  for (const line of raw.split('\n')) {
    const m = line.trimEnd().match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    if (m) {
      if (key) vars[key] = val.join('\n');
      key = m[1]; val = [m[2]];
    } else if (key) {
      val.push(line.trimEnd());
    }
  }
  if (key) vars[key] = val.join('\n');
  return vars;
}

const env = loadEnv();
const projectId   = env['FIREBASE_PROJECT_ID'];
const clientEmail = (env['FIREBASE_CLIENT_EMAIL'] ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (env['FIREBASE_PRIVATE_KEY']  ?? '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌  Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local');
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// ── Cloudinary URL helpers ────────────────────────────────────────────────────

const UPLOAD_MARKER = '/upload/';

/**
 * Returns true if the URL is a Cloudinary URL that does NOT yet have
 * f_auto,q_auto:good,w_<N> transformations applied.
 */
function needsOptimization(url, width) {
  if (!url || typeof url !== 'string') return false;
  if (!url.includes('cloudinary.com')) return false;
  // Already has the exact transform we want → skip
  const target = `f_auto,q_auto:good,w_${width}`;
  if (url.includes(target)) return false;
  // Has /upload/ and it's followed by a non-transformation path (v\d or image ID)
  return url.includes(UPLOAD_MARKER);
}

/**
 * Injects f_auto,q_auto:good,w_<width> right after /upload/.
 * If the URL already has some other transformation chain between /upload/ and
 * the image path, it is stripped and replaced to avoid stacking.
 *
 * Cloudinary URL forms:
 *   /upload/<public_id>
 *   /upload/v<version>/<public_id>
 *   /upload/<existing_transforms>/<public_id>   ← strip + replace
 */
function applyTransform(url, width) {
  if (!url || !url.includes(UPLOAD_MARKER)) return url;

  const idx = url.indexOf(UPLOAD_MARKER);
  const afterUpload = url.slice(idx + UPLOAD_MARKER.length);
  const transform   = `f_auto,q_auto:good,w_${width}`;

  // If something is already between /upload/ and the versioned/named segment,
  // strip it so we don't stack transforms.
  // A "clean" segment starts with v\d (version) or a letter/digit that is the public_id.
  // A transform segment contains commas or underscores with known Cloudinary params.
  const firstSegment = afterUpload.split('/')[0];
  const looksLikeTransform = /^[a-z]_/.test(firstSegment) && firstSegment.includes('_');

  let cleanAfter;
  if (looksLikeTransform) {
    // Strip the existing transform segment
    cleanAfter = afterUpload.slice(firstSegment.length + 1); // skip "segment/"
  } else {
    cleanAfter = afterUpload;
  }

  return url.slice(0, idx + UPLOAD_MARKER.length) + transform + '/' + cleanAfter;
}

// ── Field definitions ─────────────────────────────────────────────────────────

// [fieldName, width] — main images get w_800, secondary get w_400
const IMAGE_FIELDS = [
  ['imgUrl',     800],
  ['image_url',  800],
  ['imgUrl2',    400],
  ['imgUrl3',    400],
];

// ── Core logic ────────────────────────────────────────────────────────────────

/**
 * Compute what updates are needed for a single product doc.
 * Returns null if nothing needs changing.
 */
function computeUpdates(data) {
  const updates = {};
  for (const [field, width] of IMAGE_FIELDS) {
    const url = data[field];
    if (needsOptimization(url, width)) {
      updates[field] = applyTransform(url, width);
    }
  }
  return Object.keys(updates).length > 0 ? updates : null;
}

/**
 * Process a batch of Firestore docs: compute + apply updates, log results.
 * Returns { updated, skipped }.
 */
async function processBatch(docs) {
  const BATCH_SIZE = 400;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk  = docs.slice(i, i + BATCH_SIZE);
    const batch  = db.batch();
    let   batchN = 0;

    for (const snap of chunk) {
      const data    = snap.data();
      const updates = computeUpdates(data);

      if (!updates) {
        skipped++;
        continue;
      }

      // Log each changed field
      const name = data.name ?? snap.id;
      const fieldSummary = Object.keys(updates).join(', ');
      console.log(`  ✅  Updated product: ${name}  [fields: ${fieldSummary}]`);

      batch.update(snap.ref, updates);
      batchN++;
      updated++;
    }

    if (batchN > 0) await batch.commit();
  }

  return { updated, skipped };
}

// ── Interactive prompt ────────────────────────────────────────────────────────

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔍  Fetching all products from Firestore…\n');
  const snap = await db.collection('products').get();
  console.log(`    Found ${snap.size} products total.\n`);

  // Sort: isBestSeller first, then the rest
  const all  = snap.docs;
  const featured = all.filter(d => d.data().isBestSeller === true);
  const rest     = all.filter(d => d.data().isBestSeller !== true);
  const ordered  = [...featured, ...rest];

  console.log(`    isBestSeller (featured first): ${featured.length}`);
  console.log(`    Other products               : ${rest.length}\n`);

  // ── TEST RUN: first 5 products ────────────────────────────────────────────
  const TEST_SIZE = 5;
  const testDocs  = ordered.slice(0, TEST_SIZE);

  console.log(`${'─'.repeat(60)}`);
  console.log(`🧪  TEST RUN — first ${TEST_SIZE} products\n`);

  // Show what will happen before writing anything
  let testWillUpdate = 0;
  for (const snap of testDocs) {
    const data    = snap.data();
    const updates = computeUpdates(data);
    const name    = data.name ?? snap.id;

    if (!updates) {
      console.log(`  ⏭   Skip: ${name}  (no Cloudinary URLs or already optimized)`);
    } else {
      testWillUpdate++;
      for (const [field, newUrl] of Object.entries(updates)) {
        const oldUrl = data[field];
        console.log(`  📸  ${name}`);
        console.log(`       field : ${field}`);
        console.log(`       before: ${oldUrl}`);
        console.log(`       after : ${newUrl}`);
      }
    }
    console.log();
  }

  if (testWillUpdate === 0) {
    console.log('  ℹ️   All 5 test products are already optimized or have no Cloudinary URLs.\n');
  }

  const confirm1 = await ask(`Apply these ${testWillUpdate} updates to Firestore now? (y/N) → `);
  if (confirm1.toLowerCase() !== 'y') {
    console.log('\n⛔  Aborted — no changes written.\n');
    process.exit(0);
  }

  console.log('\n⚙️   Writing test batch…\n');
  const testResult = await processBatch(testDocs);
  console.log(`\n✅  Test run complete.`);
  console.log(`    Updated : ${testResult.updated}`);
  console.log(`    Skipped : ${testResult.skipped} (no Cloudinary URL or already optimized)\n`);

  // ── FULL RUN ──────────────────────────────────────────────────────────────
  const remaining = ordered.slice(TEST_SIZE);
  if (remaining.length === 0) {
    console.log('🎉  No remaining products — all done!\n');
    process.exit(0);
  }

  console.log(`${'─'.repeat(60)}`);
  console.log(`📦  ${remaining.length} products remaining.\n`);

  const confirm2 = await ask(`Run optimization on all ${remaining.length} remaining products? (y/N) → `);
  if (confirm2.toLowerCase() !== 'y') {
    console.log('\n⛔  Stopped after test run — remaining products untouched.\n');
    process.exit(0);
  }

  console.log('\n⚙️   Processing remaining products…\n');
  const fullResult = await processBatch(remaining);

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🎉  All done!`);
  console.log(`    Test run  — updated: ${testResult.updated}, skipped: ${testResult.skipped}`);
  console.log(`    Full run  — updated: ${fullResult.updated}, skipped: ${fullResult.skipped}`);
  console.log(`    Total updated: ${testResult.updated + fullResult.updated} / ${ordered.length}`);
  console.log();

  process.exit(0);
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err.message ?? err);
  process.exit(1);
});
