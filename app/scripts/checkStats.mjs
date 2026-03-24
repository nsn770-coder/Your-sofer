import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const app = initializeApp({ 
  apiKey: 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I', 
  projectId: 'your-sofer' 
});
const db = getFirestore(app);

console.log('טוען מוצרים...');
const snap = await getDocs(collection(db, 'products'));

const cats = {};
const statuses = {};

snap.forEach(d => {
  const p = d.data();
  
  // סטטוסים
  const st = p.status || 'ללא';
  statuses[st] = (statuses[st] || 0) + 1;
  
  // קטגוריות
  const cat = p.cat || 'ללא קטגוריה';
  if (!cats[cat]) cats[cat] = { total: 0, noImg: 0, done: 0, ready: 0 };
  cats[cat].total++;
  if (!p.imgUrl && !p.image_url) cats[cat].noImg++;
  else if (p.imgUrl2) cats[cat].done++;
  else cats[cat].ready++;
});

console.log('\n=== סטטוסים ===');
console.log(statuses);

console.log('\n=== סטטוס לפי קטגוריה ===');
Object.entries(cats)
  .sort((a,b) => b[1].total - a[1].total)
  .forEach(([cat, c]) => {
    console.log(`${cat} | סה"כ: ${c.total} | ללא תמונה: ${c.noImg} | עובד: ${c.done} | ממתין: ${c.ready}`);
  });

process.exit(0);
