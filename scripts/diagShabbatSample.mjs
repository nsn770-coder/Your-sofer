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
  // What SUBCATEGORY_PAGES actually loads for 'שבת'
  const bySubcat = await db.collection('products')
    .where('subCategory', '==', 'שבת').limit(3).get();
  console.log(`\nQ3: where(subCategory=='שבת') → ${bySubcat.size} docs`);
  bySubcat.forEach(d => {
    const p = d.data();
    console.log(`  cat="${p.cat}" sub="${p.subCategory}" status="${p.status}" hidden=${p.hidden ?? false} name="${(p.name||'').slice(0,40)}"`);
  });

  // Q5: real פמוטים product
  const pam = await db.collection('products')
    .where('cat', '==', 'שבת').where('subCategory', '==', 'פמוטים').limit(2).get();
  console.log(`\nQ5: where(cat=='שבת', sub=='פמוטים') → ${pam.size} docs`);
  pam.forEach(d => {
    const p = d.data();
    console.log(`  id=${d.id}`);
    for (const k of ['cat','category','subCategory','status','hidden','name','priority','sku','collection']) {
      if (p[k] !== undefined) console.log(`    ${k}: ${JSON.stringify(p[k])}`);
    }
  });

  // Collections breakdown for cat='שבת' products
  const all = await db.collection('products').where('cat', '==', 'שבת').limit(1000).get();
  const colls = {};
  all.forEach(d => {
    const c = d.data().collection || '__none__';
    colls[c] = (colls[c] ?? 0) + 1;
  });
  console.log(`\nQ4: collections breakdown for cat='שבת' (${all.size} docs):`);
  for (const [c, n] of Object.entries(colls).sort((a,b) => b[1]-a[1]))
    console.log(`  ${String(n).padStart(5)}  collection="${c}"`);

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
