/**
 * READ-ONLY preview — מציג שם נוכחי vs שם מוצע לפני כל עדכון
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const app = initializeApp({ apiKey: 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I', projectId: 'your-sofer' });
const db  = getFirestore(app);

const FIXES = [
  { id: '47vPam6IGCNv4DYe4sMp', pattern: /רש[״"]?יתם|רשי[״"]?תם/g, replacement: 'רש"י ר"ת' },
  { id: 'BytNVLipUibuIfEMeCE4',  pattern: /רש[״"]?יתם|רשיתם/g,       replacement: 'רש"י ר"ת' },
];

console.log('=== תצוגה מקדימה — לפני כל שינוי ===\n');

for (const { id, pattern, replacement } of FIXES) {
  const snap = await getDoc(doc(db, 'products', id));
  const current = snap.data()?.name ?? '(לא נמצא)';
  const proposed = current.replace(pattern, replacement);

  console.log(`ID:       ${id}`);
  console.log(`נוכחי:   ${current}`);
  console.log(`מוצע:    ${proposed}`);
  console.log(`שונה?    ${current !== proposed ? 'כן ✅' : 'לא — דפוס לא תואם ⚠️'}`);
  console.log();
}

console.log('⚠️  הסקריפט לא שינה שום דבר.');
process.exit(0);
