/**
 * READ-ONLY temp audit — התפלגות השדות category / cat / subcategory
 * מריצים פעם אחת כדי לקבוע לפי איזה שדה לסנן כל קבוצה.
 * למחיקה אחרי השימוש.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const app = initializeApp({ apiKey: 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I', projectId: 'your-sofer' });
const db = getFirestore(app);

console.log('טוען מוצרים...');
const snap = await getDocs(collection(db, 'products'));
console.log('סה"כ מוצרים בקולקציה:', snap.size, '\n');

function dist(field) {
  const c = {};
  snap.forEach((d) => {
    const v = d.data()[field];
    const k = v === undefined ? '∅undef' : v === '' ? '∅empty' : String(v);
    c[k] = (c[k] || 0) + 1;
  });
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}

for (const field of ['category', 'cat', 'subcategory', 'subCategory']) {
  console.log(`=== ${field} (top 40) ===`);
  dist(field).slice(0, 40).forEach(([k, n]) => console.log(`${n}\t${k}`));
  console.log('');
}

process.exit(0);
