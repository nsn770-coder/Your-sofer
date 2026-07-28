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
  clientEmail: (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i,'').trim(),
  privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\n/g,'\n'),
})});
const db = getFirestore();

async function main() {
  const snap = await db.collection('products')
    .where('cat', '==', 'כיפות').get();
  let active = 0;
  snap.forEach(d => {
    const p = d.data();
    if (p.status === 'active' && p.hidden !== true) active++;
  });
  console.log(`where(cat=='כיפות') → ${snap.size} total, ${active} active+visible`);

  // Sample one product
  const sample = snap.docs[0]?.data();
  if (sample) {
    console.log('\nדוגמה:');
    for (const k of ['cat','category','subCategory','status','hidden','name','sku']) {
      if (sample[k] !== undefined) console.log(`  ${k}: ${JSON.stringify(sample[k])}`);
    }
  }

  // Check /bar-mitzvah-kippot page — what products does it show?
  const kippotEvent = await db.collection('products')
    .where('cat', '==', 'כיפות').limit(1).get();
  console.log(`\n/bar-mitzvah-kippot uses its own KippotEventClient — not CategoryClient`);
  console.log(`CategoryClient for /category/כיפות will do where('cat','==','כיפות') → ${active} products`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
