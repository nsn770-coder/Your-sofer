/**
 * debugCategoryValues.mjs — READ ONLY, no writes.
 * Finds all unique category values in Firestore "products" that contain
 * "חתונה", "חתן", "כלה", or "חיים".
 *
 * Usage: node scripts/debugCategoryValues.mjs
 */

import { readFileSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const SA_PATH = 'C:/Users/Owner/Downloads/your-sofer-firebase-adminsdk-fbsvc-a682983bfd.json';
const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const KEYWORDS = ['חתונה', 'חתן', 'כלה', 'חיים'];

async function main() {
  console.log('קורא את כל המוצרים מ-Firestore (select category בלבד)...\n');

  const snap = await db.collection('products').select('category', 'cat').get();
  console.log(`סה"כ מסמכים: ${snap.size}\n`);

  const catSet = new Set();
  snap.forEach(d => {
    const cat = d.data().category || d.data().cat || '';
    if (cat) catSet.add(cat);
  });

  const matched = [...catSet].filter(c =>
    KEYWORDS.some(kw => c.includes(kw))
  ).sort();

  if (matched.length === 0) {
    console.log('לא נמצאו קטגוריות המכילות את המילות חיפוש.');
  } else {
    console.log(`נמצאו ${matched.length} ערכי category ייחודיים:\n`);
    matched.forEach(c => console.log(`  "${c}"`));
  }

  console.log(`\nכל ${catSet.size} ערכי category ייחודיים בקולקציה:\n`);
  [...catSet].sort().forEach(c => console.log(`  "${c}"`));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
