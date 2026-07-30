/**
 * checkCategoriesCollection.mjs
 *
 * ה-collection `categories` הוא נפרד מ-`products` — סקריפט שינוי שם הקטגוריה
 * לא נגע בו. הסקריפט הזה בודק אם השם הישן שרד שם, ומתקן אם צריך.
 *
 * node app/scripts/checkCategoriesCollection.mjs            # בדיקה בלבד
 * node app/scripts/checkCategoriesCollection.mjs --fix      # תיקון
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// משתמש בקובץ מפתח השירות שכבר קיים בשורש הפרויקט (מוגן ב-gitignore)
const SA_FILE = 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json';
const sa = JSON.parse(readFileSync(resolve(__dirname, '../../', SA_FILE), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const OLD = 'ספרי קודש וסידורים';
const NEW = 'ספרי קודש וברכונים';
const fix = process.argv.includes('--fix');

async function main() {
  const snap = await db.collection('categories').get();
  console.log(`\n🗂️  ${snap.size} מסמכים ב-categories\n`);

  const hits = [];
  snap.forEach(d => {
    const data = d.data();
    if (JSON.stringify(data).includes(OLD)) hits.push({ ref: d.ref, id: d.id, data });
  });

  if (hits.length === 0) {
    console.log(`✅ אין אזכור ל-"${OLD}" — הקולקציה נקייה`);
    return;
  }

  console.log(`⚠️  ${hits.length} מסמכים עם השם הישן:\n`);
  hits.forEach(h => {
    console.log(`   [${h.id}]`);
    Object.entries(h.data).forEach(([k, v]) => {
      if (typeof v === 'string' && v.includes(OLD)) console.log(`      ${k}: "${v}"`);
    });
  });

  if (!fix) {
    console.log('\n💡 להרצה עם תיקון:  node app/scripts/checkCategoriesCollection.mjs --fix');
    return;
  }

  const batch = db.batch();
  for (const h of hits) {
    const update = {};
    // מחליף את השם בכל שדה טקסט שמכיל אותו — שומר על שאר התוכן
    Object.entries(h.data).forEach(([k, v]) => {
      if (typeof v === 'string' && v.includes(OLD)) update[k] = v.replaceAll(OLD, NEW);
    });
    if (Object.keys(update).length) {
      update.categoryRenamedAt = new Date();
      batch.set(h.ref, update, { merge: true });
    }
  }
  await batch.commit();
  console.log(`\n✅ ${hits.length} מסמכים עודכנו`);
  console.log('⚠️  להריץ שוב:  node scripts/syncAlgolia.mjs');
}

main().catch(e => { console.error('❌', e); process.exit(1); });
