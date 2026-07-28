import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const snap = await db.collection('categories').orderBy('priority', 'asc').get();
console.log(`Total docs: ${snap.size}\n`);
for (const d of snap.docs) {
  const { slug, name, priority, hidden } = d.data();
  console.log(`id="${d.id}"  slug="${slug ?? '—'}"  name="${name ?? '—'}"  priority=${priority ?? '—'}  hidden=${hidden ?? false}`);
}
