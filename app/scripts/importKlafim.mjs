// scripts/importKlafim.cjs
// הרץ פעם אחת: node scripts/importKlafim.cjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore';

// ══ הגדרות ══
const GOOGLE_API_KEY = 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I';
const ROOT_FOLDER    = '1wkvwr_zUb7intTFIUk_ilYhP-yKjPqR9';

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

async function driveGet(url) {
  const res  = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(`Drive API error: ${data.error.message}`);
  return data;
}

async function getProductFolders() {
  const url = `https://www.googleapis.com/drive/v3/files?q=%27${ROOT_FOLDER}%27+in+parents+and+mimeType%3D%27application%2Fvnd.google-apps.folder%27+and+trashed%3Dfalse&fields=files(id%2Cname)&pageSize=100&key=${GOOGLE_API_KEY}`;
  const data = await driveGet(url);
  return data.files || [];
}

async function getImagesInFolder(folderId) {
  const url = `https://www.googleapis.com/drive/v3/files?q=%27${folderId}%27+in+parents+and+mimeType+contains+%27image%2F%27+and+trashed%3Dfalse&fields=files(id%2Cname)&pageSize=200&key=${GOOGLE_API_KEY}`;
  const data = await driveGet(url);
  return data.files || [];
}

async function getExistingKlafIds() {
  const snap = await getDocs(collection(db, 'klafim'));
  const ids  = new Set();
  snap.forEach(d => ids.add(d.id));
  return ids;
}

async function importAll() {
  console.log('🚀 מתחיל ייבוא קלפים מ-Google Drive...\n');

  const existingIds    = await getExistingKlafIds();
  console.log(`📦 קלפים קיימים ב-Firestore: ${existingIds.size}\n`);

  const productFolders = await getProductFolders();
  console.log(`📁 תיקיות מוצרים שנמצאו: ${productFolders.length}`);
  productFolders.forEach(f => console.log(`   • ${f.name} (${f.id})`));
  console.log('');

  let totalAdded   = 0;
  let totalSkipped = 0;

  for (const folder of productFolders) {
    const productId = folder.name;
    const images    = await getImagesInFolder(folder.id);
    console.log(`📂 ${productId} — ${images.length} תמונות`);

    for (const img of images) {
      if (existingIds.has(img.id)) {
        console.log(`   ⏭️  דילוג (כבר קיים): ${img.name}`);
        totalSkipped++;
        continue;
      }

      const klafDoc = {
        productId:   productId,
        driveFileId: img.id,
        name:        img.name,
        imageUrl:    `https://drive.google.com/thumbnail?id=${img.id}&sz=w400`,
        status:      'available',
        orderId:     null,
        createdAt:   new Date().toISOString(),
      };

      await setDoc(doc(db, 'klafim', img.id), klafDoc);
      console.log(`   ✅ נוסף: ${img.name}`);
      totalAdded++;
    }
  }

  console.log('\n══════════════════════════════');
  console.log(`✅ סיום! נוספו: ${totalAdded} | דולגו: ${totalSkipped}`);
  console.log('══════════════════════════════');
  process.exit(0);
}

importAll().catch(err => {
  console.error('❌ שגיאה:', err.message);
  process.exit(1);
});
