// Deletes category docs for 3 removed categories — does NOT touch products.
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

console.log('=== DELETE: removed category docs ===\n');

let totalDeleted = 0;

for (const slug of REMOVED_CATS) {
  const direct  = await db.collection('categories').doc(slug).get();
  const bySlug  = await db.collection('categories').where('slug', '==', slug).get();
  const byName  = await db.collection('categories').where('name', '==', slug).get();

  // Deduplicate by doc id
  const seen = new Set();
  const toDelete = [];
  for (const snap of [direct.exists ? direct : null, ...bySlug.docs, ...byName.docs]) {
    if (!snap) continue;
    if (!seen.has(snap.id)) {
      seen.add(snap.id);
      toDelete.push(snap);
    }
  }

  for (const snap of toDelete) {
    const data = snap.data() ?? {};
    await db.collection('categories').doc(snap.id).delete();
    console.log(`  DELETED  slug="${slug}"  doc id="${snap.id}"  priority=${data.priority ?? '—'}`);
    totalDeleted++;
  }
}

console.log(`\n── Total deleted: ${totalDeleted} doc(s) ──`);
console.log('\n=== DONE ===');
