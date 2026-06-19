import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    const lines = raw.split('\n'); let key = null, val = '';
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) { if (key && !process.env[key]) process.env[key] = val.trim(); key = m[1]; val = m[2]; }
      else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch {}
}
loadEnv();

if (!getApps().length) initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_PROJECT_ID ?? 'your-sofer',
  clientEmail: (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim(),
  privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
})});

const db = getFirestore();

const PRODUCT_ID = 'MK5mg2bmEZRt7aifaJp1';

const ref = db.collection('products').doc(PRODUCT_ID);
await ref.update({
  cat: 'יודאיקה',
  category: 'יודאיקה',
  subCategory: 'סטים ומארזים',
});

const snap = await ref.get();
const d = snap.data();

console.log('\n✅ Product updated:');
console.log('  id:          ', PRODUCT_ID);
console.log('  name:        ', d.name);
console.log('  cat:         ', d.cat);
console.log('  category:    ', d.category);
console.log('  subCategory: ', d.subCategory);
console.log('  status:      ', d.status);
