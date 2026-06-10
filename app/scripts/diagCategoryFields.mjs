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
const docs = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
const ukDocs = docs.filter(d => /^UK\d+$/.test(d.sku || ''));

console.log(`UK products: ${ukDocs.length}`);
console.log('\n═══ FIELD PRESENCE (all UK products) ═══');

const fields = ['cat', 'category', 'subcategory', 'subCategory'];
for (const f of fields) {
  const has    = ukDocs.filter(d => d[f] !== undefined && d[f] !== '').length;
  const unique = new Set(ukDocs.map(d => d[f]).filter(Boolean)).size;
  console.log(`  ${f.padEnd(14)}: ${String(has).padStart(5)} docs have it  (${unique} unique values)`);
}

console.log('\n═══ 6 SAMPLE UK PRODUCTS — all 4 fields side by side ═══');
const samples = ukDocs.sort(() => Math.random() - 0.5).slice(0, 6);
for (const d of samples) {
  console.log(`\n  sku=${d.sku}  id=${d._id}`);
  console.log(`    cat         = "${d.cat ?? '(missing)'}"`);
  console.log(`    category    = "${d.category ?? '(missing)'}"`);
  console.log(`    subcategory = "${d.subcategory ?? '(missing)'}"`);
  console.log(`    subCategory = "${d.subCategory ?? '(missing)'}"`);
}

console.log('\n═══ INCONSISTENCY COUNTS ═══');
// How many have subcategory ≠ subCategory (when both present)?
const bothPresent = ukDocs.filter(d => d.subcategory !== undefined && d.subCategory !== undefined);
const differ      = bothPresent.filter(d => d.subcategory !== d.subCategory);
console.log(`  have both subcategory AND subCategory  : ${bothPresent.length}`);
console.log(`  where subcategory ≠ subCategory         : ${differ.length}`);
if (differ.length > 0) {
  console.log('  First 5 differences:');
  differ.slice(0, 5).forEach(d =>
    console.log(`    sku=${d.sku}  subcategory="${d.subcategory}"  subCategory="${d.subCategory}"`)
  );
}

// category vs cat
const catDiffer = ukDocs.filter(d => d.cat && d.category && d.cat !== d.category);
console.log(`\n  where cat ≠ category                   : ${catDiffer.length}`);
if (catDiffer.length > 0) {
  console.log('  First 5 differences:');
  catDiffer.slice(0, 5).forEach(d =>
    console.log(`    sku=${d.sku}  cat="${d.cat}"  category="${d.category}"`)
  );
}

// How does the category page / filter actually query?
console.log('\n═══ WHERE IS subcategory USED IN CODE? ═══');
console.log('  (checking CategoryClient.tsx query logic — read from code, not Firestore)');

process.exit(0);
