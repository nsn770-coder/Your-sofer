// activateProducts.mjs
// מפעיל כל מוצרים ללא סטטוס
// הרצה: node app/scripts/activateProducts.mjs

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I",
  authDomain: "your-sofer.firebaseapp.com",
  projectId: "your-sofer",
  storageBucket: "your-sofer.firebasestorage.app",
  messagingSenderId: "7710397068",
  appId: "1:7710397068:web:3c9880f24871efd4d661a9"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

console.log('🔍 סורק מוצרים ללא סטטוס...');
const snap = await getDocs(collection(db, 'products'));

const toActivate = [];
snap.forEach(d => {
  const p = d.data();
  if (!p.status) toActivate.push(d.id);
});

console.log(`📦 נמצאו ${toActivate.length} מוצרים להפעלה`);

let done = 0;
for (const id of toActivate) {
  await updateDoc(doc(db, 'products', id), { status: 'active' });
  done++;
  if (done % 50 === 0) console.log(`  הופעלו ${done}/${toActivate.length}`);
}

console.log(`\n🎉 הושלם! הופעלו ${done} מוצרים.`);
process.exit(0);
