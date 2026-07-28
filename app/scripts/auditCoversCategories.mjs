/**
 * READ-ONLY — בודק אילו קטגוריות כיסויים קיימות ב-Firestore
 * וסופר כמה מוצרים בכל אחת.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I',
  projectId: 'your-sofer',
});
const db = getFirestore(app);

const TARGETS = [
  'כיסויי תפילין',
  'כיסויי טלית ותפילין',
  'כיסויי רש"י ור"ת',
  'כיסויים תרמיים',
  'כיסוי תפילין',        // הכתיב הקיים בקוד
  'כיסויי טלית',
];

console.log('טוען את כל המוצרים...');
const snap = await getDocs(collection(db, 'products'));
console.log(`סה"כ מוצרים: ${snap.size}\n`);

// ספור לפי cat
const counts = {};
const samplesByCategory = {};

snap.forEach(d => {
  const p = d.data();
  const cat = p.cat || p.category || '(ללא קטגוריה)';
  counts[cat] = (counts[cat] || 0) + 1;

  if (TARGETS.includes(cat)) {
    if (!samplesByCategory[cat]) samplesByCategory[cat] = [];
    if (samplesByCategory[cat].length < 3) {
      samplesByCategory[cat].push({
        id: d.id,
        name: p.name,
        price: p.price,
        color: p.color,
        material: p.material,
        style: p.style,
        subCategory: p.subCategory,
        look: p.look,
        badge: p.badge,
      });
    }
  }
});

// ── תוצאות קטגוריות יעד ──
console.log('══════════════════════════════════════════════════');
console.log('קטגוריות כיסויים — תוצאות:');
console.log('══════════════════════════════════════════════════');

for (const t of TARGETS) {
  const n = counts[t] ?? 0;
  const exists = n > 0;
  console.log(`\n${exists ? '✅' : '❌'} "${t}" — ${n} מוצרים`);
  if (exists && samplesByCategory[t]) {
    console.log('   דוגמאות + שדות:');
    samplesByCategory[t].forEach(p => {
      console.log(`   • [${p.id}] ${p.name} | מחיר:${p.price} | color:${p.color ?? '—'} | material:${p.material ?? '—'} | style:${p.style ?? '—'} | subCategory:${p.subCategory ?? '—'} | look:${p.look ?? '—'} | badge:${p.badge ?? '—'}`);
    });
  }
}

// ── כל הקטגוריות שמכילות "כיסו" ──
console.log('\n══════════════════════════════════════════════════');
console.log('כל הקטגוריות שמכילות "כיסו" ב-Firestore:');
console.log('══════════════════════════════════════════════════');
Object.entries(counts)
  .filter(([cat]) => cat.includes('כיסו'))
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, n]) => console.log(`  "${cat}" — ${n} מוצרים`));

console.log('\n⚠️  הסקריפט לא שינה שום דבר.');
process.exit(0);
