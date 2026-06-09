/**
 * READ-ONLY — מכין נתונים למיזוג כיסוי תפילין + סט טלית תפילין
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({ apiKey: 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I', projectId: 'your-sofer' });
const db  = getFirestore(app);

const CATS = ['כיסוי תפילין', 'סט טלית תפילין'];

console.log('סורק שתי קטגוריות...\n');

for (const cat of CATS) {
  const snap = await getDocs(query(collection(db, 'products'), where('cat', '==', cat)));
  const subCounts = {};
  const nameSamples = { thermal: [], rashiTam: [], noSub: [] };

  snap.forEach(d => {
    const p   = d.data();
    const sub = p.subCategory ?? '(ללא subCategory)';
    subCounts[sub] = (subCounts[sub] || 0) + 1;

    const name = (p.name ?? '').toLowerCase();
    const isThermal  = name.includes('טרמ') || sub.includes('טרמ');
    const isRashiTam = /רש.?י|ר.?ת/.test(p.name ?? '');

    if (isThermal  && nameSamples.thermal.length  < 4) nameSamples.thermal.push({ id: d.id, name: p.name, sub });
    if (isRashiTam && nameSamples.rashiTam.length < 5) nameSamples.rashiTam.push({ id: d.id, name: p.name, sub });
    if (!p.subCategory && nameSamples.noSub.length < 3) nameSamples.noSub.push({ id: d.id, name: p.name });
  });

  console.log('══════════════════════════════════════════════════════');
  console.log(`קטגוריה: "${cat}" — ${snap.size} מוצרים`);
  console.log('══════════════════════════════════════════════════════');

  console.log('\nערכי subCategory:');
  Object.entries(subCounts)
    .sort((a,b) => b[1]-a[1])
    .forEach(([s,n]) => console.log(`  "${s}" — ${n} מוצרים`));

  console.log('\nדוגמאות תרמי:');
  nameSamples.thermal.forEach(p => console.log(`  [${p.id.slice(0,8)}] ${p.name} | sub: ${p.sub}`));
  if (!nameSamples.thermal.length) console.log('  (אין)');

  console.log('\nדוגמאות רש"י ר"ת:');
  nameSamples.rashiTam.forEach(p => console.log(`  [${p.id.slice(0,8)}] ${p.name} | sub: ${p.sub}`));
  if (!nameSamples.rashiTam.length) console.log('  (אין)');

  console.log('\nדוגמאות ללא subCategory:');
  nameSamples.noSub.forEach(p => console.log(`  [${p.id.slice(0,8)}] ${p.name}`));
  if (!nameSamples.noSub.length) console.log('  (אין — לכולם יש subCategory)');

  console.log();
}

process.exit(0);
