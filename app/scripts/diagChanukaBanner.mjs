import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

console.log('=== categories docs for חנוכה ===\n');

// Get ALL docs from categories, find any related to חנוכה
const snap = await db.collection('categories').get();
for (const d of snap.docs) {
  const r = d.data();
  const slugOrName = (r.slug || r.name || d.id || '');
  if (String(slugOrName).includes('חנוכה') || d.id.includes('חנוכה')) {
    console.log(`--- doc id: "${d.id}" ---`);
    console.log(JSON.stringify(r, null, 2));
    console.log();
  }
}

console.log('\n=== curations doc for חנוכה ===\n');
const cur = await db.collection('curations').doc('חנוכה').get();
if (cur.exists) {
  console.log(JSON.stringify(cur.data(), null, 2));
} else {
  console.log('(no curations/חנוכה doc)');
}
