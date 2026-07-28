import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({ apiKey: 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I', projectId: 'your-sofer' });
const db  = getFirestore(app);

const TARGETS = [
  'כיסויי תפילין', 'כיסויי טלית ותפילין',
  'כיסויי רש"י ור"ת', 'כיסויים תרמיים', 'כיסוי תפילין',
];

console.log('טוען מוצרים...');
const snap = await getDocs(collection(db, 'products'));
console.log(`סה"כ: ${snap.size} מוצרים\n`);

const counts = {};
const subCatValues = new Set();
let fullSample = null;

snap.forEach(d => {
  const p = d.data();
  const cat = p.cat || p.category || '';
  counts[cat] = (counts[cat] || 0) + 1;

  if (cat === 'כיסוי תפילין') {
    if (p.subCategory) subCatValues.add(p.subCategory);
    if (!fullSample) fullSample = { id: d.id, ...p };
  }
});

// ── 1. טבלה ──
console.log('=== ממצא 1: קטגוריות כיסויים ב-Firestore ===');
for (const t of TARGETS) {
  const n = counts[t] ?? 0;
  console.log(`${n > 0 ? '✅' : '❌'}  "${t}" — ${n} מוצרים`);
}

// כל קטגוריות עם "כיסו"
console.log('\nכל קטגוריות עם "כיסו" ב-Firestore:');
Object.entries(counts).filter(([c]) => c.includes('כיסו'))
  .sort((a,b) => b[1]-a[1])
  .forEach(([c,n]) => console.log(`  "${c}" — ${n}`));

// ── 4. subCategory values + sample ──
console.log('\n=== ממצא 4: ערכי subCategory בקטגוריית "כיסוי תפילין" ===');
const sorted = [...subCatValues].sort();
sorted.forEach(v => console.log(`  • "${v}"`));
if (!sorted.length) console.log('  (אין שדה subCategory בשום מוצר)');

console.log('\n--- דוגמה למוצר מלא ---');
if (fullSample) {
  const { id, ...fields } = fullSample;
  console.log('ID:', id);
  for (const [k, v] of Object.entries(fields)) {
    if (v !== null && v !== undefined && v !== '') {
      const display = typeof v === 'object' ? JSON.stringify(v) : v;
      console.log(`  ${k}: ${display}`);
    }
  }
}

process.exit(0);
