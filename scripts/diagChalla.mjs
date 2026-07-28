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
  const snap = await db.collection('products').get();
  const challaRows = [];
  const weddingRows = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    if (d.status !== 'active' || d.hidden === true) continue;
    const name = (d.name || '').toLowerCase();
    const sub  = d.subCategory || '';
    const cat  = d.cat || '';

    // חיפוש לפי שם
    if (name.includes('חלה') || sub.includes('חלה') || sub.includes('הפרשת')) {
      challaRows.push({ cat, sub, name: d.name?.slice(0,40), sku: d.sku });
    }
    // כל מה שתחת subCategory="חתן וכלה"
    if (sub === 'חתן וכלה') {
      weddingRows.push({ cat, sub, name: d.name?.slice(0,40), sku: d.sku });
    }
  }

  console.log(`\n=== מוצרים עם "חלה" או "הפרשת" בשם/subCat ===`);
  const challaMap = {};
  for (const r of challaRows) {
    const key = `cat="${r.cat}" | sub="${r.sub}"`;
    challaMap[key] = (challaMap[key] ?? 0) + 1;
  }
  for (const [k,v] of Object.entries(challaMap)) console.log(`  ${String(v).padStart(4)}  ${k}`);
  console.log(`  דוגמאות (עד 5):`);
  challaRows.slice(0,5).forEach(r => console.log(`    sku=${r.sku} cat="${r.cat}" sub="${r.sub}" | ${r.name}`));

  console.log(`\n=== subCategory="חתן וכלה" — כמה ומה cat ===`);
  const wMap = {};
  for (const r of weddingRows) wMap[r.cat] = (wMap[r.cat] ?? 0) + 1;
  for (const [k,v] of Object.entries(wMap)) console.log(`  ${String(v).padStart(4)}  cat="${k}"`);
  console.log(`  דוגמאות (עד 5):`);
  weddingRows.slice(0,5).forEach(r => console.log(`    sku=${r.sku} cat="${r.cat}" | ${r.name}`));

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
