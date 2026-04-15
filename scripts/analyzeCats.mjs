/**
 * Print all unique `cat` values in Firestore products with per-category counts.
 * Run: node scripts/analyzeCats.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
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
  } catch {}
}
loadEnvLocal();

const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

async function main() {
  console.log('\n🔍 ניתוח קטגוריות מוצרים ב-Firestore\n');

  const snap = await db.collection('products').get();
  console.log(`סה"כ מוצרים: ${snap.size}\n`);

  const catCount = {};
  const subCatCount = {};

  for (const doc of snap.docs) {
    const d = doc.data();
    const cat = d.cat ?? '(ריק)';
    const sub = d.subCategory ?? null;
    catCount[cat] = (catCount[cat] ?? 0) + 1;
    if (sub) subCatCount[sub] = (subCatCount[sub] ?? 0) + 1;
  }

  const sorted = Object.entries(catCount).sort((a, b) => b[1] - a[1]);

  console.log('='.repeat(50));
  console.log('cat'.padEnd(28) + 'כמות');
  console.log('='.repeat(50));
  for (const [cat, count] of sorted) {
    console.log(cat.padEnd(28) + String(count).padStart(6));
  }
  console.log('='.repeat(50));

  if (Object.keys(subCatCount).length > 0) {
    const sortedSub = Object.entries(subCatCount).sort((a, b) => b[1] - a[1]);
    console.log('\n--- subCategory ---');
    for (const [sub, count] of sortedSub) {
      console.log(sub.padEnd(28) + String(count).padStart(6));
    }
  }

  process.exit(0);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
