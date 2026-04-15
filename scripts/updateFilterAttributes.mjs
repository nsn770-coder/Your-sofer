// updateFilterAttributes.mjs
// מעדכן filterAttributes לכל המוצרים לפי שם המוצר
// הרצה: node app/scripts/updateFilterAttributes.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    const lines = raw.split('\n');
    let key = null, val = '';
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) {
        if (key && !process.env[key]) process.env[key] = val.trim();
        key = m[1]; val = m[2];
      } else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch {}
}
loadEnvLocal();

const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// ====== מיפוי מילות מפתח → filterAttributes ======

const RULES = {
  // נוסח
  נוסח: [
    { keywords: ['אשכנזי', 'אשכנז'], value: 'אשכנזי' },
    { keywords: ['ספרדי', 'ספרד'], value: 'ספרדי' },
    { keywords: ['ימני', 'תימני', 'תימן'], value: 'תימני' },
    { keywords: ['חסידי', 'חסיד'], value: 'חסידי' },
    { keywords: ['איטלקי', 'איטליה'], value: 'איטלקי' },
  ],

  // כתב
  כתב: [
    { keywords: ['בית יוסף', 'ב"י', 'בי"ס'], value: 'בית יוסף' },
    { keywords: ['וועלישׁ', 'וועליש', 'ולוויש'], value: 'וועליש' },
    { keywords: ['אר"י', 'אריז"ל', 'ארי'], value: 'אר"י' },
    { keywords: ['משה"ת', 'משה תם'], value: 'משה תם' },
  ],

  // חומר
  חומר: [
    { keywords: ['עור', 'עורי'], value: 'עור' },
    { keywords: ['קלף', 'קלפים'], value: 'קלף' },
    { keywords: ['בד', 'אריג', 'ברוקד'], value: 'בד' },
    { keywords: ['כסף'], value: 'כסף' },
    { keywords: ['עץ'], value: 'עץ' },
    { keywords: ['אלומיניום', 'מתכת'], value: 'אלומיניום' },
    { keywords: ['פלסטיק', 'אקרילי', 'אקריל'], value: 'פלסטיק' },
    { keywords: ['קרמיקה', 'חרס'], value: 'קרמיקה' },
  ],

  // גודל (בס"מ)
  גודל: [
    { keywords: ['10 ס"מ', '10 סמ', '10ס"מ', "10 סנ'מ"], value: '10' },
    { keywords: ['12 ס"מ', '12 סמ', '12ס"מ'], value: '12' },
    { keywords: ['15 ס"מ', '15 סמ', '15ס"מ'], value: '15' },
    { keywords: ['20 ס"מ', '20 סמ', '20ס"מ'], value: '20' },
    { keywords: ['25 ס"מ', '25 סמ', '25ס"מ'], value: '25' },
    { keywords: ['30 ס"מ', '30 סמ', '30ס"מ'], value: '30' },
    { keywords: ['קטן', 'מיני'], value: 'קטן' },
    { keywords: ['גדול', 'XL', 'ענק'], value: 'גדול' },
    { keywords: ['בינוני', 'סטנדרט'], value: 'בינוני' },
  ],

  // כשרות
  כשרות: [
    { keywords: ['מהודר', 'מהודרת', 'הידור'], value: 'מהודר' },
    { keywords: ['מהדרין'], value: 'מהדרין' },
    { keywords: ['כשר', 'כשרה', 'כשרות'], value: 'כשר' },
    { keywords: ['לכתחילה'], value: 'לכתחילה' },
    { keywords: ['בדיעבד'], value: 'בדיעבד' },
  ],

  // צבע
  צבע: [
    { keywords: ['שחור', 'שחורה'], value: 'שחור' },
    { keywords: ['לבן', 'לבנה', 'לבן כסף', 'לבן זהב'], value: 'לבן' },
    { keywords: ['חום', 'חומה', 'קאמל'], value: 'חום' },
    { keywords: ['כחול', 'כחולה', 'תכלת'], value: 'כחול' },
    { keywords: ['אפור', 'אפורה'], value: 'אפור' },
    { keywords: ['זהב', 'זהבה', 'גולד'], value: 'זהב' },
    { keywords: ['כסף', 'סילבר'], value: 'כסף' },
    { keywords: ['אדום', 'אדומה', 'בורדו'], value: 'אדום' },
    { keywords: ['ירוק', 'ירוקה'], value: 'ירוק' },
    { keywords: ['ורוד', 'ורודה', 'פינק'], value: 'ורוד' },
    { keywords: ['סגול', 'סגולה'], value: 'סגול' },
    { keywords: ['בז\'', 'בז', 'קרם'], value: 'בז\'' },
  ],
};

function extractAttributes(name, description = '') {
  const text = `${name} ${description}`.toLowerCase();
  const attrs = {};

  for (const [attrKey, rules] of Object.entries(RULES)) {
    for (const rule of rules) {
      const matched = rule.keywords.some(kw => text.includes(kw.toLowerCase()));
      if (matched) {
        attrs[attrKey] = rule.value;
        break; // רק ערך אחד לכל attribute
      }
    }
  }

  return attrs;
}

async function run() {
  console.log('🔍 טוען מוצרים מ-Firestore...');
  
  const snapshot = await db.collection('products').get();
  const total = snapshot.size;
  console.log(`📦 נמצאו ${total} מוצרים`);

  let updated = 0;
  let skipped = 0;
  let batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 400;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const name = data.name || data.title || '';
    const description = data.description || '';

    const newAttrs = extractAttributes(name, description);

    // דלג אם אין שום attribute שנמצא
    if (Object.keys(newAttrs).length === 0) {
      skipped++;
      continue;
    }

    batch.update(doc.ref, { filterAttributes: newAttrs });
    updated++;
    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`✅ עדכן ${updated} מוצרים עד כה...`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`\n🎉 סיום!`);
  console.log(`✅ עודכנו: ${updated} מוצרים`);
  console.log(`⏭️  דולגו (ללא attributes): ${skipped} מוצרים`);
  console.log(`📊 סה"כ: ${total} מוצרים`);
}

run().catch(console.error);
