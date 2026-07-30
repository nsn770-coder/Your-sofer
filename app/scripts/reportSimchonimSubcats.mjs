/**
 * reportSimchonimSubcats.mjs
 *
 * מדפיס את כל תתי-הקטגוריות של מוצרי סימחונים, עם ספירה ודוגמאות שמות.
 * הבסיס לתכנון מיפוי תתי-הקטגוריות — כדי לא לנחש.
 *
 * node app/scripts/reportSimchonimSubcats.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SA_FILE = 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json';
const sa = JSON.parse(readFileSync(resolve(__dirname, '../../', SA_FILE), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function main() {
  const snap = await db.collection('products').where('supplier', '==', 'simchonim').get();

  const groups = new Map();
  snap.forEach(d => {
    const p = d.data();
    const key = `${p.cat} ▸ ${p.subCategory || '(ריק)'}`;
    if (!groups.has(key)) groups.set(key, { n: 0, names: [], paths: new Set() });
    const g = groups.get(key);
    g.n++;
    if (g.names.length < 4) g.names.push(p.name);
    if (p.supplier_category_path) g.paths.add(p.supplier_category_path);
  });

  console.log(`\n📦 ${snap.size} מוצרי סימחונים · ${groups.size} שילובי קטגוריה/תת-קטגוריה\n`);

  [...groups.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .forEach(([key, g]) => {
      console.log(`${String(g.n).padStart(4)}  ${key}`);
      g.names.forEach(n => console.log(`        · ${n}`));
    });

  console.log('\n─── נתיבי הספק המקוריים ───\n');
  const paths = new Map();
  snap.forEach(d => {
    const p = d.data().supplier_category_path;
    if (p) paths.set(p, (paths.get(p) || 0) + 1);
  });
  [...paths.entries()].sort((a, b) => b[1] - a[1])
    .forEach(([p, n]) => console.log(`${String(n).padStart(4)}  ${p}`));
}

main().catch(e => { console.error('❌', e); process.exit(1); });
