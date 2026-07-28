import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const snap = await db.collection('products').get();
const noSku = snap.docs
  .map(d => ({ _id: d.id, ...d.data() }))
  .filter(d => !d.sku);

console.log('סה"כ ללא sku:', noSku.length);

// ── Breakdowns ───────────────────────────────────────────────────────────────
const byCat    = {};
const bySubcat = {};
for (const d of noSku) {
  const cat    = d.cat || d.category || '(אין)';
  const subcat = d.subcategory || d.subCategory || d.category || '(אין)';
  byCat[cat]    = (byCat[cat]    || 0) + 1;
  bySubcat[subcat] = (bySubcat[subcat] || 0) + 1;
}

console.log('\n─── פילוח לפי cat (קטגוריה ראשית) ───');
Object.entries(byCat).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>
  console.log(`  ${String(v).padStart(4)}  ${k}`)
);

console.log('\n─── פילוח לפי subcategory / category ───');
Object.entries(bySubcat).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>
  console.log(`  ${String(v).padStart(4)}  ${k}`)
);

// ── Pick 20 representative samples ──────────────────────────────────────────
// Take up to 2 from each distinct subcat, spread across cats
const buckets = {};
for (const d of noSku) {
  const key = d.subcategory || d.subCategory || d.category || d.cat || '(אין)';
  if (!buckets[key]) buckets[key] = [];
  buckets[key].push(d);
}

const selected = [];
const keys = Object.keys(buckets).sort((a,b) => buckets[b].length - buckets[a].length);
// First pass: 1 per bucket
for (const k of keys) {
  if (selected.length >= 20) break;
  selected.push(buckets[k][0]);
}
// Second pass: fill to 20 from largest buckets
for (const k of keys) {
  if (selected.length >= 20) break;
  if (buckets[k][1]) selected.push(buckets[k][1]);
}

const hasImg = d => !!(d.imgUrl || d.images?.[0] || d.imgUrl2);

console.log('\n─── 20 דוגמאות מייצגות ───\n');
console.log(
  'שם'.padEnd(45) + ' | ' +
  'cat'.padEnd(12) + ' | ' +
  'subcategory'.padEnd(22) + ' | ' +
  'price'.padEnd(7) + ' | ' +
  'img'.padEnd(4) + ' | ' +
  'doc id'
);
console.log('─'.repeat(130));

for (const d of selected.slice(0, 20)) {
  const name   = (d.name || '').substring(0, 44);
  const cat    = (d.cat || d.category || '').substring(0, 12);
  const subcat = (d.subcategory || d.subCategory || d.category || '').substring(0, 22);
  const price  = d.price != null ? String(d.price) : '—';
  const img    = hasImg(d) ? 'כן' : 'לא';
  console.log(
    name.padEnd(45) + ' | ' +
    cat.padEnd(12)  + ' | ' +
    subcat.padEnd(22) + ' | ' +
    price.padEnd(7) + ' | ' +
    img.padEnd(4)   + ' | ' +
    d._id
  );
}

process.exit(0);
