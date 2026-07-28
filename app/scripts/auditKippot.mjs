/**
 * READ-ONLY — audit כיפות: שם קטגוריה, ספירה, התפלגות מחירים
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const app = initializeApp({ apiKey: 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I', projectId: 'your-sofer' });
const db  = getFirestore(app);

console.log('טוען מוצרים...');
const snap = await getDocs(collection(db, 'products'));

// מצא כל קטגוריה שמכילה "כיפ"
const kipCats = {};
snap.forEach(d => {
  const p = d.data();
  const cat = p.cat || p.category || '';
  if (cat.includes('כיפ')) kipCats[cat] = (kipCats[cat] || 0) + 1;
});

console.log('\n=== קטגוריות עם "כיפ" ===');
Object.entries(kipCats).sort((a,b) => b[1]-a[1]).forEach(([c,n]) => console.log(`  "${c}" — ${n}`));

// עבוד על הקטגוריה הגדולה ביותר
const mainCat = Object.entries(kipCats).sort((a,b) => b[1]-a[1])[0]?.[0];
if (!mainCat) { console.log('לא נמצאה קטגוריית כיפות'); process.exit(0); }

const kips = [];
snap.forEach(d => {
  const p = d.data();
  if ((p.cat || p.category || '') === mainCat) kips.push({ id: d.id, name: p.name, price: p.price, subCategory: p.subCategory });
});

console.log(`\n=== קטגוריה ראשית: "${mainCat}" — ${kips.length} מוצרים ===`);

// התפלגות מחירים
const ranges = [
  { label: 'A — ₪34-44',  min: 34, max: 44,  items: [] },
  { label: 'B — ₪25-33',  min: 25, max: 33,  items: [] },
  { label: 'C — ₪20-24',  min: 20, max: 24,  items: [] },
  { label: 'D — ₪9 בדיוק', min: 9,  max: 9,  items: [] },
];
const outOfRange = [];

for (const k of kips) {
  const p = Math.round(k.price * 100) / 100;
  let matched = false;
  for (const r of ranges) {
    if (p >= r.min && p <= r.max) { r.items.push(k); matched = true; break; }
  }
  if (!matched) outOfRange.push(k);
}

console.log('\n=== התפלגות מחירים ===');
for (const r of ranges) {
  console.log(`\n${r.label} — ${r.items.length} מוצרים`);
  r.items.slice(0, 4).forEach(k => console.log(`  ₪${k.price}  ${k.name?.slice(0,50)}`));
}

console.log(`\n=== מחוץ לכל הטווחים — ${outOfRange.length} מוצרים ===`);
// הצג התפלגות מחירים של ה-out-of-range
const orCounts = {};
outOfRange.forEach(k => {
  const bucket = Math.floor(k.price);
  orCounts[bucket] = (orCounts[bucket] || 0) + 1;
});
Object.entries(orCounts).sort((a,b) => Number(a[0])-Number(b[0]))
  .forEach(([p, n]) => console.log(`  ₪${p}x: ${n} מוצרים`));
console.log('דוגמאות:');
outOfRange.slice(0, 8).forEach(k => console.log(`  ₪${k.price}  ${k.name?.slice(0,50)}`));

process.exit(0);
