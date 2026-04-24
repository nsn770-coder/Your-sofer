/**
 * Rewrites Cloudinary imageUrl strings in Firestore products to include
 * f_auto,q_auto:good and a width transform chosen by original file size:
 *
 *   original < 100 KB  →  f_auto,q_auto:good          (no resize — already small)
 *   original ≥ 100 KB  →  f_auto,q_auto:good,w_600    (resize to 600px)
 *
 * Fields handled: imgUrl, image_url, imgUrl2, imgUrl3
 * Products with isBestSeller === true are processed first.
 * Runs 5 as a test with before/after preview, then asks before the full run.
 *
 * Run: node scripts/optimizeCloudinaryImages.mjs
 */

import { readFileSync } from 'fs';
import { createInterface } from 'readline';
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
const SIZE_THRESHOLD_BYTES = 100 * 1024; // 100 KB

/**
 * Strip any existing transform segment right after /upload/.
 * Returns the bare original URL.
 */
function stripTransforms(url) {
  if (!url || !url.includes(UPLOAD_MARKER)) return url;
  const idx         = url.indexOf(UPLOAD_MARKER);
  const afterUpload = url.slice(idx + UPLOAD_MARKER.length);
  const firstSeg    = afterUpload.split('/')[0];
  // A transform segment contains at least one underscore after a lowercase letter
  // e.g. "f_auto,q_auto:good,w_600" or "q_auto" but NOT "v1234567" or a public_id
  const isTransform = /^[a-z]_/.test(firstSeg) && !firstSeg.startsWith('v1');
  if (isTransform) {
    return url.slice(0, idx + UPLOAD_MARKER.length) + afterUpload.slice(firstSeg.length + 1);
  }
  return url;
}

/**
 * Apply a transform string right after /upload/ on a bare URL.
 */
function applyTransform(url, transform) {
  if (!url || !url.includes(UPLOAD_MARKER)) return url;
  const idx = url.indexOf(UPLOAD_MARKER);
  return url.slice(0, idx + UPLOAD_MARKER.length) + transform + '/' + url.slice(idx + UPLOAD_MARKER.length);
}

/**
 * Skip URLs that are not Cloudinary or already have f_auto,q_auto:good applied.
 */
function needsOptimization(url) {
  if (!url || typeof url !== 'string') return false;
  if (!url.includes('cloudinary.com'))  return false;
  if (!url.includes(UPLOAD_MARKER))     return false;
  if (url.includes('f_auto,q_auto:good')) return false; // already done
  return true;
}

/**
 * Fetch the file size of a URL via HEAD, falling back to GET if needed.
 * Returns bytes, or null on failure.
 */
async function fetchSize(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    const cl = r.headers.get('content-length');
    if (cl) return parseInt(cl, 10);
  } catch { /* fall through */ }
  try {
    const r = await fetch(url);
    return (await r.arrayBuffer()).byteLength;
  } catch { return null; }
}

/**
 * Choose the transform string based on original file size.
 */
function chooseTransform(originalBytes) {
  if (originalBytes !== null && originalBytes < SIZE_THRESHOLD_BYTES) {
    return 'f_auto,q_auto:good'; // tiny original — format/quality only, no resize
  }
  return 'f_auto,q_auto:good,w_600'; // large original — resize to 600px
}

// ── Field list ────────────────────────────────────────────────────────────────

const IMAGE_FIELDS = ['imgUrl', 'image_url', 'imgUrl2', 'imgUrl3'];

// ── Async compute updates (includes HTTP size check) ─────────────────────────

async function computeUpdatesAsync(data) {
  const updates   = {};
  const reasons   = {}; // for logging

  for (const field of IMAGE_FIELDS) {
    const url = data[field];
    if (!needsOptimization(url)) continue;

    const bare         = stripTransforms(url);
    const originalSize = await fetchSize(bare);
    const transform    = chooseTransform(originalSize);
    const newUrl       = applyTransform(bare, transform);

    updates[field] = newUrl;
    reasons[field] = {
      originalKb: originalSize !== null ? (originalSize / 1024).toFixed(1) : '?',
      transform,
    };
  }

  return Object.keys(updates).length > 0 ? { updates, reasons } : null;
}

// ── Concurrency limiter ───────────────────────────────────────────────────────

/**
 * Run async tasks with a max concurrency cap.
 * tasks: array of () => Promise<T>
 */
async function runConcurrent(tasks, limit = 10) {
  const results = new Array(tasks.length);
  let   next    = 0;

  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

// ── Batch processor ───────────────────────────────────────────────────────────

async function processBatch(docs, concurrency = 10) {
  const WRITE_BATCH = 400;
  let updated = 0;
  let skipped = 0;

  // Step 1: compute all updates concurrently (HTTP size checks)
  process.stdout.write(`  Checking original sizes (${docs.length} products, ${concurrency} concurrent)…`);
  const tasks   = docs.map(snap => () => computeUpdatesAsync(snap.data()));
  const results = await runConcurrent(tasks, concurrency);
  console.log(' done.\n');

  // Step 2: write to Firestore in batches
  for (let i = 0; i < docs.length; i += WRITE_BATCH) {
    const chunk  = docs.slice(i, i + WRITE_BATCH);
    const batch  = db.batch();
    let   batchN = 0;

    for (let j = 0; j < chunk.length; j++) {
      const result = results[i + j];
      if (!result) { skipped++; continue; }

      const { updates, reasons } = result;
      const name = chunk[j].data().name ?? chunk[j].id;

      for (const [field, reason] of Object.entries(reasons)) {
        const tag = reason.transform.includes('w_600') ? 'resize' : 'fmt only';
        console.log(`  ✅  ${name.slice(0, 50).padEnd(50)}  [${field}  ${reason.originalKb}KB → ${tag}]`);
      }

      batch.update(chunk[j].ref, updates);
      batchN++;
      updated++;
    }

    if (batchN > 0) {
      await batch.commit();
      console.log(`     ↳ batch committed (${i + 1}–${Math.min(i + WRITE_BATCH, docs.length)} of ${docs.length})\n`);
    }
  }

  return { updated, skipped };
}

// ── Interactive prompt ────────────────────────────────────────────────────────
// --yes flag skips all prompts (useful for piped / CI usage).

const YES_FLAG = process.argv.includes('--yes') || process.argv.includes('-y');

const rl = YES_FLAG ? null : createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  if (YES_FLAG) { process.stdout.write(question + 'y\n'); return Promise.resolve('y'); }
  return new Promise(resolve => rl.question(question, ans => resolve(ans.trim())));
}

function closeRl() { if (rl) rl.close(); }

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔍  Fetching all products from Firestore…\n');
  const snap = await db.collection('products').get();
  console.log(`    Found ${snap.size} products total.\n`);

  const all      = snap.docs;
  const featured = all.filter(d => d.data().isBestSeller === true);
  const rest     = all.filter(d => d.data().isBestSeller !== true);
  const ordered  = [...featured, ...rest];

  console.log(`    isBestSeller (featured first): ${featured.length}`);
  console.log(`    Other products               : ${rest.length}\n`);

  // ── TEST RUN: first 5 products ────────────────────────────────────────────

  const TEST_SIZE = 5;
  const testDocs  = ordered.slice(0, TEST_SIZE);

  console.log('─'.repeat(65));
  console.log(`🧪  TEST RUN — first ${TEST_SIZE} products\n`);
  console.log('    Fetching original sizes to decide transforms…\n');

  let testWillUpdate = 0;
  const testPreviews = [];

  for (const docSnap of testDocs) {
    const data = docSnap.data();
    const name = data.name ?? docSnap.id;
    const res  = await computeUpdatesAsync(data);

    if (!res) {
      console.log(`  ⏭   Skip: ${name}  (no Cloudinary URLs or already optimized)\n`);
      testPreviews.push(null);
      continue;
    }

    testWillUpdate++;
    testPreviews.push(res);

    for (const [field, { originalKb, transform }] of Object.entries(res.reasons)) {
      const tag = transform.includes('w_600') ? '≥100 KB → resize  w_600' : `<100 KB → fmt only (no resize)`;
      console.log(`  📸  ${name}`);
      console.log(`       field     : ${field}`);
      console.log(`       original  : ${originalKb} KB  (${tag})`);
      console.log(`       before    : ${data[field]}`);
      console.log(`       after     : ${res.updates[field]}`);
    }
    console.log();
  }

  const confirm1 = await ask(`Apply these ${testWillUpdate} updates to Firestore now? (y/N) → `);
  if (confirm1.toLowerCase() !== 'y') {
    console.log('\n⛔  Aborted — no changes written.\n');
    closeRl(); process.exit(0);
  }

  // Write test batch directly from precomputed results
  console.log('\n⚙️   Writing test batch…\n');
  let testUpdated = 0;
  const writeBatch = db.batch();
  for (let i = 0; i < testDocs.length; i++) {
    if (!testPreviews[i]) continue;
    writeBatch.update(testDocs[i].ref, testPreviews[i].updates);
    testUpdated++;
  }
  if (testUpdated > 0) await writeBatch.commit();

  console.log(`\n✅  Test run complete.`);
  console.log(`    Updated : ${testUpdated}`);
  console.log(`    Skipped : ${TEST_SIZE - testUpdated}\n`);

  // ── FULL RUN ──────────────────────────────────────────────────────────────

  const remaining = ordered.slice(TEST_SIZE);
  if (remaining.length === 0) {
    console.log('🎉  No remaining products — all done!\n');
    closeRl(); process.exit(0);
  }

  console.log('─'.repeat(65));
  console.log(`📦  ${remaining.length} products remaining.\n`);

  const confirm2 = await ask(`Run optimization on all ${remaining.length} remaining products? (y/N) → `);
  if (confirm2.toLowerCase() !== 'y') {
    console.log('\n⛔  Stopped after test run — remaining products untouched.\n');
    closeRl(); process.exit(0);
  }

  closeRl(); // done with prompts — release stdin before long HTTP/Firestore work

  console.log('\n⚙️   Processing remaining products…\n');
  const fullResult = await processBatch(remaining, 10);

  console.log('─'.repeat(65));
  console.log('🎉  All done!');
  console.log(`    Test run  — updated: ${testUpdated}, skipped: ${TEST_SIZE - testUpdated}`);
  console.log(`    Full run  — updated: ${fullResult.updated}, skipped: ${fullResult.skipped}`);
  console.log(`    Total updated: ${testUpdated + fullResult.updated} / ${ordered.length}`);
  console.log();

  process.exit(0);
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err.message ?? err);
  process.exit(1);
});
