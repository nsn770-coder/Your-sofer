/**
 * Adds "בר מצווה" to the Firestore categories collection if not already there.
 * Run: node scripts/seed-bar-mitzvah-category.mjs
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I',
  authDomain: 'your-sofer.firebaseapp.com',
  projectId: 'your-sofer',
  storageBucket: 'your-sofer.firebasestorage.app',
  messagingSenderId: '7710397068',
  appId: '1:7710397068:web:3c9880f24871efd4d661a9',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const col = collection(db, 'categories');
  const existing = await getDocs(query(col, where('name', '==', 'בר מצווה')));

  if (!existing.empty) {
    console.log('✅ "בר מצווה" already exists in categories collection — skipping.');
    process.exit(0);
  }

  await addDoc(col, {
    name: 'בר מצווה',
    imgUrl: '',
    sub: 'סטים לבר מצווה',
    order: 8,
  });

  console.log('🎉 Added "בר מצווה" to Firestore categories collection.');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
