// feedDiagnostics.mjs — Google Merchant feed diagnostics
// Run locally: node app/scripts/feedDiagnostics.mjs
// Mirrors the exact filter logic of app/api/google-feed/route.ts and reports
// how many products enter the feed and why the rest are skipped.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require   = createRequire(import.meta.url);
const sa        = require(path.join(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// ── Fetch all products (paginated, no hardcoded cap) ────────────────────────
const all = [];
let cursor = null;
while (true) {
  let q = db.collection('products').limit(500);
  if (cursor) q = q.startAfter(cursor);
  const snap = await q.get();
  if (snap.empty) break;
  cursor = snap.docs[snap.docs.length - 1];
  for (const d of snap.docs) all.push({ id: d.id, ...d.data() });
}

// ── Apply the exact google-feed filter logic ────────────────────────────────
const CDN = 'https://res.cloudinary.com/dyxzq3ucy/image/upload/';
const normalizeImg = (u) => (!u || typeof u !== 'string' || !u.trim()) ? null : (u.startsWith('http') ? u : CDN + u);

const skipped = {};
const skip = (r, p) => { (skipped[r] ??= []).push(p.id); };
const included = [];
const seenIds = new Set();
const invalidImageUrls = [];
const invalidLinks = [];

for (const p of all) {
  const name  = p.name ?? '';
  const price = typeof p.price === 'number' ? p.price : Number(p.price) || 0;

  if (p.hidden === true)              { skip('hidden', p); continue; }
  if (p.status && p.status !== 'active') { skip(`status_${p.status}`, p); continue; }
  if (!name)                          { skip('missing_name', p); continue; }
  if (!price)                         { skip('missing_or_zero_price', p); continue; }

  const imgs = [
    normalizeImg(p.imgUrl ?? p.image_url ?? p.img1),
    normalizeImg(p.imgUrl2 ?? p.img2),
    normalizeImg(p.imgUrl3 ?? p.img3),
    normalizeImg(p.imgUrl4),
  ].filter(Boolean);
  if (imgs.length === 0)              { skip('missing_image', p); continue; }
  if (seenIds.has(p.id))              { skip('duplicate_id', p); continue; }
  seenIds.add(p.id);

  if (!imgs[0].startsWith('https://')) invalidImageUrls.push({ id: p.id, url: imgs[0] });
  included.push(p);
}

// ── Report ──────────────────────────────────────────────────────────────────
console.log('══════════════════════════════════════════════');
console.log('Google Merchant Feed — Diagnostics');
console.log('══════════════════════════════════════════════');
console.log(`Total products in Firestore:   ${all.length}`);
console.log(`Included in feed:              ${included.length}`);
console.log(`Skipped total:                 ${all.length - included.length}`);
console.log('\nSkipped by reason:');
for (const [reason, ids] of Object.entries(skipped).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${reason.padEnd(26)} ${String(ids.length).padStart(5)}   e.g. ${ids.slice(0, 3).join(', ')}`);
}
if (invalidImageUrls.length) {
  console.log(`\n⚠ Non-HTTPS image URLs (${invalidImageUrls.length}):`);
  invalidImageUrls.slice(0, 10).forEach(x => console.log(`  ${x.id}: ${x.url}`));
}
if (invalidLinks.length) {
  console.log(`\n⚠ Invalid product links (${invalidLinks.length}):`);
  invalidLinks.slice(0, 10).forEach(x => console.log(`  ${x.id}`));
}

// Field-quality breakdown of the FULL catalog (context for the numbers above)
const active = all.filter(p => (!p.status || p.status === 'active') && p.hidden !== true);
console.log('\nCatalog context:');
console.log(`  active & not hidden:         ${active.length}`);
console.log(`  status=inactive:             ${all.filter(p => p.status === 'inactive').length}`);
console.log(`  status=draft:                ${all.filter(p => p.status === 'draft').length}`);
console.log(`  hidden=true:                 ${all.filter(p => p.hidden === true).length}`);
console.log(`  other statuses:              ${all.filter(p => p.status && !['active','inactive','draft'].includes(p.status)).length}`);

console.log('\nTip: live counts are also available at https://your-sofer.com/api/google-feed?diag=1');
process.exit(0);
