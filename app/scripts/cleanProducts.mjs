// cleanProducts.mjs
// סוכן 1 — מכבה מוצרים ללא מחיר או תמונה
// הרצה: node app/scripts/cleanProducts.mjs

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

async function cleanProducts() {
  console.log('🔍 סורק מוצרים...\n');

  const snap = await getDocs(collection(db, 'products'));
  const products = [];
  snap.forEach(d => products.push({ id: d.id, ...d.data() }));
  console.log(`📊 סך מוצרים: ${products.length}`);

  const noPrice = products.filter(p => !p.price || p.price <= 0);
  const noImage = products.filter(p => !p.imgUrl && !p.image_url && p.price > 0);
  const toDisable = [...new Set([...noPrice.map(p => p.id), ...noImage.map(p => p.id)])];

  console.log(`❌ ללא מחיר: ${noPrice.length}`);
  console.log(`🖼️  ללא תמונה: ${noImage.length}`);
  console.log(`📴 סך להשבית: ${toDisable.length}\n`);

  if (toDisable.length === 0) {
    console.log('✅ אין מוצרים לניקוי!');
    process.exit(0);
  }

  console.log('מוצרים שישובתו:');
  toDisable.forEach((id, i) => {
    const p = products.find(x => x.id === id);
    const reason = !p.price || p.price <= 0 ? 'ללא מחיר' : 'ללא תמונה';
    console.log(`  ${i + 1}. ${p.name?.substring(0, 50)} — ${reason}`);
  });

  console.log('\n⏳ משבית...');
  let disabled = 0;
  for (const id of toDisable) {
    try {
      await updateDoc(doc(db, 'products', id), { status: 'inactive' });
      disabled++;
      if (disabled % 10 === 0) console.log(`  השבתו ${disabled}/${toDisable.length}`);
    } catch (e) {
      console.error(`  ❌ שגיאה ב-${id}:`, e.message);
    }
  }

  console.log(`\n🎉 הושלם! השבתו ${disabled} מוצרים.`);
  process.exit(0);
}

cleanProducts().catch(e => { console.error(e); process.exit(1); });
