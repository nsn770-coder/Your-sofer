// Diagnostic only — no writes. Reports category docs and orphaned products for 3 removed categories.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const REMOVED_CATS = ['עיצוב הבית', 'כלי שולחן והגשה', 'הגשה ואירוח'];

console.log('=== DIAGNOSTIC: removed categories ===\n');

// ── 1. Count category docs ───────────────────────────────────────────────────
console.log('── categories collection ──');
for (const slug of REMOVED_CATS) {
  // Try direct doc ID match
  const direct = await db.collection('categories').doc(slug).get();

  // Try slug field match
  const bySlug = await db.collection('categories').where('slug', '==', slug).get();

  // Try name field match
  const byName = await db.collection('categories').where('name', '==', slug).get();

  const directHit = direct.exists ? 1 : 0;
  const bySlugIds = bySlug.docs.map(d => d.id);
  const byNameIds = byName.docs.map(d => d.id);

  // Deduplicate across all three lookup methods
  const allIds = new Set([
    ...(direct.exists ? [slug] : []),
    ...bySlugIds,
    ...byNameIds,
  ]);

  console.log(`  "${slug}": ${allIds.size} doc(s) found`);
  if (allIds.size > 0) {
    for (const id of allIds) {
      const snap = await db.collection('categories').doc(id).get();
      const data = snap.data() ?? {};
      console.log(`    doc id="${id}"  slug="${data.slug ?? '—'}"  name="${data.name ?? '—'}"  priority=${data.priority ?? '—'}`);
    }
  }
}

// ── 2. Count & list orphaned products ───────────────────────────────────────
console.log('\n── products with removed cat values ──');
let totalOrphans = 0;

for (const cat of REMOVED_CATS) {
  const snap = await db.collection('products').where('cat', '==', cat).get();
  const docs = snap.docs.filter(d => d.data().status !== 'deleted' && d.data().hidden !== true);
  totalOrphans += docs.length;

  console.log(`\n  cat="${cat}": ${docs.length} active product(s)`);
  if (docs.length > 0) {
    for (const d of docs) {
      const p = d.data();
      console.log(`    id=${d.id}  name="${p.name ?? '—'}"  subCategory="${p.subCategory ?? '—'}"  inStock=${p.inStock ?? '—'}`);
    }
  }
}

console.log(`\n── TOTAL orphaned active products: ${totalOrphans} ──`);
console.log('\n=== END DIAGNOSTIC — no changes made ===');
