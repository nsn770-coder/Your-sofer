/**
 * mapCloudinaryImages.mjs
 *
 * For each active product that has imgUrl2:
 *   1. List ALL images in Cloudinary folder yoursofer/{productId}/
 *   2. Sort by created_at oldest first
 *   3. Map to imgUrl, imgUrl2, imgUrl3, imgUrl4, imgUrl5 in order
 *
 * Dry-run on 5 products, then prompt before full run.
 *
 * node app/scripts/mapCloudinaryImages.mjs
 * node app/scripts/mapCloudinaryImages.mjs --yes   (skip prompts)
 */

import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Env loader ─────────────────────────────────────────────────────────────────

function loadEnv() {
  const raw = readFileSync(resolve(__dirname, '../../.env.local'), 'utf8');
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
  console.error('❌  Missing Firebase credentials in .env.local');
  process.exit(1);
}

// ── Firebase Admin ────────────────────────────────────────────────────────────

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// ── Cloudinary config ─────────────────────────────────────────────────────────

const CLOUD_NAME       = 'dyxzq3ucy';
const CLOUDINARY_KEY   = '768969912295749';
const CLOUDINARY_SECRET = '8QthVmK6c0Doa866Xpc2IalFH6U';
const CLOUDINARY_AUTH  = Buffer.from(`${CLOUDINARY_KEY}:${CLOUDINARY_SECRET}`).toString('base64');

// ── Constants ─────────────────────────────────────────────────────────────────

const IMG_FIELDS  = ['imgUrl', 'imgUrl2', 'imgUrl3', 'imgUrl4', 'imgUrl5'];
const DRY_SIZE    = 5;
const CONCURRENCY = 4;          // keep well under rate limit
const DELAY_MS    = 300;        // pause between batches (~13 req/s sustained)

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Cloudinary: list all images in a product folder ───────────────────────────

async function listFolder(productId) {
  const prefix = `yoursofer/${productId}/`;
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image` +
    `?type=upload&prefix=${encodeURIComponent(prefix)}&max_results=500`;

  const res = await fetch(url, {
    headers: { Authorization: `Basic ${CLOUDINARY_AUTH}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cloudinary ${res.status}: ${body.slice(0, 200)}`);
  }

  return (await res.json()).resources ?? [];
}

// ── Build an optimised Cloudinary delivery URL ────────────────────────────────

function toDeliveryUrl(r) {
  const ver = r.version ? `v${r.version}/` : '';
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto:good/${ver}${r.public_id}.${r.format}`;
}

// ── Compute the field→URL mapping for a product ───────────────────────────────

function computeMapping(resources) {
  const sorted = [...resources].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
  const updates = {};
  for (let i = 0; i < sorted.length && i < IMG_FIELDS.length; i++) {
    updates[IMG_FIELDS[i]] = toDeliveryUrl(sorted[i]);
  }
  return { sorted, updates };
}

// ── Write a list of { ref, updates, currentData } to Firestore ────────────────

async function applyMappings(entries) {
  const BATCH = 400;
  let written = 0;
  for (let i = 0; i < entries.length; i += BATCH) {
    const chunk = entries.slice(i, i + BATCH);
    const batch = db.batch();
    for (const { ref, updates, currentData } of chunk) {
      const firestoreUpdate = { ...updates };
      // Delete extra fields that used to exist but are beyond what we found
      for (const field of IMG_FIELDS) {
        if (!updates[field] && currentData[field]) {
          firestoreUpdate[field] = FieldValue.delete();
        }
      }
      batch.update(ref, firestoreUpdate);
      written++;
    }
    await batch.commit();
    console.log(`  ↳ committed ${i + 1}–${Math.min(i + BATCH, entries.length)} of ${entries.length}`);
  }
  return written;
}

// ── Prompt helper ─────────────────────────────────────────────────────────────

const YES_FLAG        = process.argv.includes('--yes') || process.argv.includes('-y');
const DRY_ONLY_FLAG   = process.argv.includes('--dry-only');
const APPLY_DRY_FLAG  = process.argv.includes('--apply-dry-only');
const RETRY_FLAG      = process.argv.includes('--retry'); // skip already-mapped products
const rl = (YES_FLAG || DRY_ONLY_FLAG || APPLY_DRY_FLAG) ? null : createInterface({ input: process.stdin, output: process.stdout });
const ask = q => YES_FLAG
  ? (process.stdout.write(q + 'y\n'), Promise.resolve('y'))
  : new Promise(r => rl.question(q, a => r(a.trim())));
const closeRl = () => rl?.close();

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔍  Loading active products with imgUrl2…\n');

  const SKIP_CATS = new Set(['קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'מגילות', 'ספרי תורה']);

  const snap = await db.collection('products').where('status', '==', 'active').get();
  const withAI = snap.docs.filter(d => {
    const p = d.data();
    if (!p.imgUrl2 || SKIP_CATS.has(p.cat)) return false;
    // --retry: skip products whose imgUrl already points to their own Cloudinary folder
    if (RETRY_FLAG && typeof p.imgUrl === 'string' && p.imgUrl.includes(`yoursofer/${d.id}/`)) return false;
    return true;
  });
  const skippedCat = snap.docs.filter(d => {
    const p = d.data();
    return p.imgUrl2 && SKIP_CATS.has(p.cat);
  }).length;

  console.log(`    Active products total : ${snap.size}`);
  console.log(`    Have imgUrl2          : ${withAI.length + skippedCat}`);
  console.log(`    Skipped (category)    : ${skippedCat}`);
  console.log(`    Will process          : ${withAI.length}\n`);

  if (!withAI.length) { console.log('Nothing to do.\n'); closeRl(); process.exit(0); }

  // ── DRY-RUN ────────────────────────────────────────────────────────────────

  console.log('─'.repeat(70));
  console.log(`🧪  DRY-RUN — first ${DRY_SIZE} products\n`);

  const dryEntries = [];

  for (const docSnap of withAI.slice(0, DRY_SIZE)) {
    const data = docSnap.data();
    const name = (data.name ?? docSnap.id).slice(0, 60);

    console.log(`📦  ${name}`);
    console.log(`    ID: ${docSnap.id}`);

    let resources;
    try {
      resources = await listFolder(docSnap.id);
    } catch (err) {
      console.log(`    ⚠️  Cloudinary error: ${err.message}\n`);
      continue;
    }

    if (!resources.length) {
      console.log(`    ⚠️  No images found in yoursofer/${docSnap.id}/\n`);
      continue;
    }

    const { sorted, updates } = computeMapping(resources);

    console.log(`    Found ${resources.length} image(s) — sorted oldest→newest:`);
    sorted.forEach((r, i) => {
      const ts    = r.created_at.slice(0, 19).replace('T', ' ');
      const field = i < IMG_FIELDS.length ? `→ ${IMG_FIELDS[i]}` : '→ (skipped, beyond imgUrl5)';
      console.log(`      [${i + 1}] ${ts}  ${field}  ${r.public_id}.${r.format}`);
    });

    console.log(`    Proposed mapping:`);
    for (const field of IMG_FIELDS) {
      if (updates[field]) {
        const mark = data[field] === updates[field] ? '' : '  ← new/changed';
        console.log(`      ${field.padEnd(8)} : ${updates[field]}${mark}`);
      } else if (data[field]) {
        console.log(`      ${field.padEnd(8)} : (will be deleted — no image at position)`);
      }
    }
    console.log();

    dryEntries.push({ ref: docSnap.ref, updates, currentData: data });
  }

  if (!dryEntries.length) {
    console.log('⚠️  No products could be processed.\n');
    closeRl(); process.exit(0);
  }

  if (DRY_ONLY_FLAG) {
    console.log(`\n✅  Dry-run complete — ${dryEntries.length} products ready.`);
    console.log('    Run with --yes to apply all changes.\n');
    process.exit(0);
  }

  const ans1 = APPLY_DRY_FLAG ? 'y' : await ask(`Apply this mapping to ${dryEntries.length} products in Firestore? (y/N) → `);
  if (ans1.toLowerCase() !== 'y') {
    console.log('\n⛔  Aborted — nothing written.\n');
    closeRl(); process.exit(0);
  }

  console.log('\n⚙️   Writing…\n');
  const dryWritten = await applyMappings(dryEntries);
  console.log(`\n✅  Dry-run done — ${dryWritten} products updated.\n`);

  // ── FULL RUN ───────────────────────────────────────────────────────────────

  const remaining = withAI.slice(DRY_SIZE);
  if (!remaining.length) {
    console.log('🎉  All done — no remaining products.\n');
    closeRl(); process.exit(0);
  }

  if (APPLY_DRY_FLAG) {
    console.log('⏸   Stopped — waiting for approval before full run.\n');
    process.exit(0);
  }

  console.log('─'.repeat(70));
  console.log(`📦  ${remaining.length} remaining products.\n`);

  const ans2 = await ask(`Run full mapping on all ${remaining.length} products? (y/N) → `);
  if (ans2.toLowerCase() !== 'y') {
    console.log('\n⛔  Stopped after dry-run.\n');
    closeRl(); process.exit(0);
  }

  closeRl();
  console.log('\n⚙️   Processing…\n');

  const fullEntries = [];
  let errors = 0, empty = 0;

  for (let i = 0; i < remaining.length; i += CONCURRENCY) {
    const chunk = remaining.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      chunk.map(d => listFolder(d.id).then(r => ({ d, r })))
    );

    for (const res of settled) {
      if (res.status === 'rejected') { errors++; continue; }
      const { d, r: resources } = res.value;
      if (!resources.length) { empty++; continue; }
      const { updates } = computeMapping(resources);
      fullEntries.push({ ref: d.ref, updates, currentData: d.data() });
    }

    const done = Math.min(i + CONCURRENCY, remaining.length);
    process.stdout.write(`\r  Fetched ${done}/${remaining.length}  (errors: ${errors}, empty: ${empty})…`);
    if (i + CONCURRENCY < remaining.length) await sleep(DELAY_MS);
  }

  console.log('\n');
  const fullWritten = await applyMappings(fullEntries);

  console.log('\n' + '─'.repeat(70));
  console.log('🎉  Complete!');
  console.log(`    Dry-run  : ${dryWritten}`);
  console.log(`    Full run : ${fullWritten}`);
  console.log(`    Errors   : ${errors}`);
  console.log(`    Empty    : ${empty}`);
  console.log(`    Total    : ${dryWritten + fullWritten} / ${withAI.length}\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌  Fatal:', err.message ?? err);
  process.exit(1);
});
