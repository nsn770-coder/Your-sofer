/**
 * fixCategoryImages.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Repairs category docs that have imageUrl:'' (created by admin loadCategories).
 *
 * For each broken doc (ID = slug, imageUrl = ''):
 *   1. Copies imageUrl from a sibling doc with the same slug/name field.
 *   2. If no sibling has an image, queries the first product in that category.
 *
 * Safe to re-run: skips docs that already have a non-empty imageUrl.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync }                         from 'fs';
import { resolve, dirname }                     from 'path';
import { fileURLToPath }                        from 'url';
import { initializeApp, cert, getApps }         from 'firebase-admin/app';
import { getFirestore }                         from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ───────────────────────────────────────────────────────────
function loadEnvLocal() {
  try {
    const raw   = readFileSync(resolve(__dirname, '../../.env.local'), 'utf8');
    const lines = raw.split('\n');
    let key = null, val = '';
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) {
        if (key && !process.env[key]) process.env[key] = val.trim();
        key = m[1]; val = m[2];
      } else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch { /* ignore */ }
}
loadEnvLocal();

// ── Init Firebase Admin ───────────────────────────────────────────────────────
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

// ── 1. Read all category docs ─────────────────────────────────────────────────
const snap = await db.collection('categories').get();
const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
console.log(`📦 ${allDocs.length} מסמכי קטגוריה בסך הכל\n`);

// ── 2. Group by effective slug (r.slug or r.name — NOT d.id) ─────────────────
const bySlug = new Map();
for (const d of allDocs) {
  const slug = (d.slug || d.name || d.id);
  if (!bySlug.has(slug)) bySlug.set(slug, []);
  bySlug.get(slug).push(d);
}

// ── 3. Find docs that need fixing ─────────────────────────────────────────────
const fixes = [];
for (const [slug, group] of bySlug) {
  const nameDoc = group.find(d => d.id === slug);
  if (!nameDoc || nameDoc.imageUrl) continue; // already OK

  const sibling  = group.find(d => d.id !== slug && (d.imageUrl || d.imgUrl || ''));
  const siblingImg = sibling ? (sibling.imageUrl || sibling.imgUrl || '') : '';
  fixes.push({ slug, siblingImg, productImg: '' });
}
console.log(`🔧 ${fixes.length} קטגוריות לתיקון\n`);

if (fixes.length === 0) {
  console.log('✓ אין מה לתקן — כל הקטגוריות תקינות.');
  process.exit(0);
}

// ── 4. For docs still missing an image, query first product ───────────────────
await Promise.all(
  fixes
    .filter(f => !f.siblingImg)
    .map(async fix => {
      try {
        const pSnap = await db.collection('products')
          .where('cat', '==', fix.slug)
          .limit(1)
          .get();
        if (!pSnap.empty) {
          const d = pSnap.docs[0].data();
          fix.productImg = (d.imgUrl || d.image_url || '');
        }
      } catch { /* skip */ }
    })
);

// ── 5. Apply updates ──────────────────────────────────────────────────────────
let fixed = 0;
for (const { slug, siblingImg, productImg } of fixes) {
  const imageUrl = siblingImg || productImg || '';
  if (!imageUrl) {
    console.log(`⚠️  "${slug}" — אין תמונה זמינה`);
    continue;
  }
  try {
    await db.collection('categories').doc(slug).update({ imageUrl });
    console.log(`✅ "${slug}"\n   ← ${imageUrl.slice(0, 80)}`);
    fixed++;
  } catch (e) {
    console.log(`❌ "${slug}" — שגיאה: ${e.message}`);
  }
}

console.log(`\n✓ תוקנו ${fixed}/${fixes.length} קטגוריות`);
process.exit(0);
