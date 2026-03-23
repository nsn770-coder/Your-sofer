import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I',
  authDomain:        'your-sofer.firebaseapp.com',
  projectId:         'your-sofer',
  storageBucket:     'your-sofer.firebasestorage.app',
  messagingSenderId: '7710397068',
  appId:             '1:7710397068:web:3c9880f24871efd4d661a9',
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

async function migrate() {
  console.log('מתחיל migration: תפילין → כיסוי תפילין');

  const snap = await getDocs(collection(db, 'products'));
  let count = 0;

  for (const d of snap.docs) {
    const data = d.data();
    if (data.category === 'תפילין' || data.cat === 'תפילין') {
      await updateDoc(doc(db, 'products', d.id), {
        category: 'כיסוי תפילין',
        cat: 'כיסוי תפילין',
      });
      console.log(`✅ עודכן: ${data.name}`);
      count++;
    }
  }

  console.log(`\nסיום! עודכנו ${count} מוצרים`);
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ שגיאה:', err.message);
  process.exit(1);
});
