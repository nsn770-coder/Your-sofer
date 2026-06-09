import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I',
  projectId: 'your-sofer',
});
const db = getFirestore(app);

const TARGET = 'עיצוב הבית';

// 1. Try direct document lookup by ID
const directSnap = await getDoc(doc(db, 'categories', TARGET));
if (directSnap.exists()) {
  console.log(`\n✅ נמצא מסמך ישיר (ID="${TARGET}"):`);
  console.log(JSON.stringify(directSnap.data(), null, 2));
} else {
  console.log(`ℹ️  אין מסמך עם ID="${TARGET}", סורק את כל הקולקציה...`);
}

// 2. Scan all docs and match by any image-like field
const snap = await getDocs(collection(db, 'categories'));
snap.forEach(d => {
  const data = d.data();
  const slug = data.slug || data.name || d.id;
  if (slug === TARGET || d.id === TARGET) {
    console.log(`\n📄 מסמך (ID="${d.id}"):`);
    const imageFields = Object.entries(data).filter(([k]) =>
      /img|image|url|photo|banner/i.test(k)
    );
    if (imageFields.length) {
      console.log('שדות תמונה:');
      imageFields.forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    } else {
      console.log('אין שדות תמונה. כל הנתונים:');
      console.log(JSON.stringify(data, null, 2));
    }
  }
});

process.exit(0);
