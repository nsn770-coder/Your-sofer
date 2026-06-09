import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I',
  projectId: 'your-sofer',
});
const db = getFirestore(app);

const IDS = ['עיצוב הבית', 'u1tqaMUt9EenFnfW51Qz'];

for (const id of IDS) {
  const snap = await getDoc(doc(db, 'categories', id));
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📄 ID: "${id}"`);
  if (!snap.exists()) {
    console.log('  ❌ מסמך לא קיים');
  } else {
    console.log(JSON.stringify(snap.data(), null, 2));
  }
}

process.exit(0);
