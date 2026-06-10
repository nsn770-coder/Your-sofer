/**
 * fixDuplicateCategoryImages.mjs
 *
 * For every slug that appears in more than one categories doc:
 *   1. Finds the doc whose id === slug  (the "canonical" doc that the homepage/
 *      categories page looks up by key).
 *   2. Compares imageUrl Cloudinary timestamps (v1XXXXXXXXX) across all docs in
 *      the duplicate group.
 *   3. If the canonical doc does NOT already hold the newest image, copies the
 *      newest imageUrl to it — without deleting anything.
 *
 * Usage:
 *   node app/scripts/fixDuplicateCategoryImages.mjs           ← preview only
 *   node app/scripts/fixDuplicateCategoryImages.mjs --confirm ← apply writes
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract numeric Cloudinary version timestamp from a URL, e.g. v1781103553 → 1781103553. */
function cloudinaryTs(url) {
  if (!url) return 0;
  const m = url.match(/\/v(\d+)\//);
  return m ? parseInt(m[1], 10) : 0;
}

function shortUrl(url) {
  if (!url) return '(empty)';
  // show just the version + filename
  const m = url.match(/(v\d+\/[^/]+)$/);
  return m ? '...' + m[1] : url.slice(-60);
}

// ── Load all category docs (no orderBy — gets every doc) ──────────────────────
const snap = await db.collection('categories').get();
const allDocs = snap.docs.map(d => ({ _id: d.id, ...d.data() }));

// ── Build slug → [docs] index ─────────────────────────────────────────────────
// A doc "owns" a slug if its id, slug, OR name field equals that slug.
const slugIndex = new Map(); // slug → Set of _id strings
for (const d of allDocs) {
  for (const val of [d._id, d.slug, d.name].filter(Boolean).map(String)) {
    if (!slugIndex.has(val)) slugIndex.set(val, new Set());
    slugIndex.get(val).add(d._id);
  }
}

// Keep only slugs that appear in >1 distinct doc
const duplicates = [...slugIndex.entries()]
  .filter(([, ids]) => ids.size > 1)
  .map(([slug, ids]) => ({ slug, ids: [...ids] }));

console.log(`Found ${duplicates.length} duplicate slug(s): ${duplicates.map(d => `"${d.slug}"`).join(', ')}\n`);
console.log('='.repeat(70));

const writes = []; // { docId, imageUrl, slug } — collected during preview, applied with --confirm

for (const { slug, ids } of duplicates) {
  console.log(`\nslug: "${slug}"`);

  const docs = ids.map(id => allDocs.find(d => d._id === id));

  // Print every doc in the group with its imageUrl + timestamp
  for (const d of docs) {
    const img = d.imageUrl || d.imgUrl || '';
    const ts  = cloudinaryTs(img);
    const marker = d._id === slug ? ' ← homepage reads this (id=slug)' : '';
    console.log(`  doc "${d._id}"${marker}`);
    console.log(`    imageUrl : ${shortUrl(img)}`);
    console.log(`    timestamp: ${ts || '(no cloudinary ts)'}`);
  }

  // Find canonical doc (id === slug)
  const canonical = docs.find(d => d._id === slug);
  if (!canonical) {
    console.log(`  ⚠️  No doc with id="${slug}" — cannot determine homepage target. SKIPPED.`);
    continue;
  }

  // Find doc with newest imageUrl
  const newest = docs.reduce((best, d) => {
    const ts = cloudinaryTs(d.imageUrl || d.imgUrl || '');
    return ts > cloudinaryTs(best.imageUrl || best.imgUrl || '') ? d : best;
  });

  const canonicalImg = canonical.imageUrl || canonical.imgUrl || '';
  const newestImg    = newest.imageUrl || newest.imgUrl || '';

  if (newest._id === canonical._id || canonicalImg === newestImg) {
    console.log(`  ✅ canonical doc already has the newest image — no action needed.`);
  } else {
    console.log(`  → WILL COPY newest image from "${newest._id}" → "${slug}"`);
    console.log(`    new imageUrl: ${shortUrl(newestImg)}`);
    writes.push({ docId: slug, imageUrl: newestImg, slug });
  }
}

console.log('\n' + '='.repeat(70));

if (writes.length === 0) {
  console.log('\n✅ All canonical docs already have the newest images. Nothing to write.');
} else {
  console.log(`\nSummary: ${writes.length} write(s) pending:`);
  for (const w of writes) {
    console.log(`  categories/"${w.docId}".imageUrl = ${shortUrl(w.imageUrl)}`);
  }

  if (!CONFIRM) {
    console.log('\n⚠️  DRY RUN — no changes made.');
    console.log('   Re-run with --confirm to apply.\n');
  } else {
    console.log('\nApplying writes...');
    for (const w of writes) {
      await db.collection('categories').doc(w.docId).update({ imageUrl: w.imageUrl });
      const verify = (await db.collection('categories').doc(w.docId).get()).data();
      console.log(`  ✅ "${w.docId}" updated. Verified imageUrl: ${shortUrl(verify?.imageUrl)}`);
    }
    console.log('\n✅ Done.');
  }
}
