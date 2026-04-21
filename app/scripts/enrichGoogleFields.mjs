// enrichGoogleFields.mjs
// מעדכן שדות Google Merchant Center לכל המוצרים
//
// הרצה:
// node app/scripts/enrichGoogleFields.mjs
// מצב בדיקה (ללא כתיבה):
// node app/scripts/enrichGoogleFields.mjs --test

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ══ Firebase ══
const serviceAccount = resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ══ מיפוי קטגוריות לקוד Google Product Category ══
const CATEGORY_MAP = {
  'יודאיקה':              '5613',   // Religious & Ceremonial > Judaism
  'מתנות':                '5605',   // Gifts & Occasions
  'שבת וחגים':            '5613',
  'מזוזות':               '5613',
  'סט טלית ותפילין':      '5613',
  'כלי שולחן והגשה':      '672',    // Kitchen & Dining > Tableware
  'כלי שתייה':            '674',    // Drinkware
  'פמוטים':               '696',    // Home Decor > Candles & Holders
  'נרות':                 '696',
  'מגשים':                '672',
  'עציצים ואדניות':       '735',    // Home & Garden > Planters
  'כיסוי תפילין':         '5613',
  'תפילין קומפלט':        '5613',
  'טליתות':               '5613',
  'קלפי מזוזה':           '5613',
  'קלפי תפילין':          '5613',
  'חגים ומועדים':         '5613',
};

const DEFAULT_CATEGORY = '5613'; // ברירת מחדל — Judaica

const BATCH_SIZE = 400; // Firestore מגביל ל-500 פעולות לבאץ'
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');

  console.log('🚀 מתחיל עדכון שדות Google Merchant...');
  if (testMode) console.log('🧪 מצב בדיקה — ללא כתיבה ל-Firestore');

  // שלוף את כל המוצרים הפעילים
  console.log('\n📥 שולף מוצרים מ-Firestore...');
  const snap = await db.collection('products')
    .where('status', '==', 'active')
    .get();

  console.log(`📦 נמצאו ${snap.size} מוצרים פעילים`);

  let updated = 0;
  let skipped = 0;
  let failed  = 0;

  const docs = [];
  snap.forEach(d => docs.push({ id: d.id, data: d.data() }));

  // עבד בבאצ'ים
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const { id, data } of chunk) {
      try {
        // חלץ חומר וצבע מ-filterAttributes אם קיים
        const fa = data.filterAttributes || {};
        const material = fa['חומר'] || fa['material'] || '';
        const color    = fa['צבע']  || fa['color']    || '';

        // קטגוריה — נסה cat, אחר כך category
        const catKey = data.cat || data.category || '';
        const googleCat = CATEGORY_MAP[catKey] || DEFAULT_CATEGORY;

        const fields = {
          // שדות קבועים לכל המוצרים
          condition:          'new',
          availability:       'in_stock',
          brand:              'YourSofer',
          identifier_exists:  'no',
          google_product_category: googleCat,

          // שדות שחולצו מ-filterAttributes
          ...(material && { material }),
          ...(color    && { color    }),
        };

        if (testMode) {
          // בדיקה — רק מדפיס
          if (i === 0 && chunk.indexOf({ id, data }) < 3) {
            console.log(`\n🧪 [${id}] ${data.name?.substring(0, 40)}`);
            console.log('   שדות שיתווספו:', JSON.stringify(fields, null, 2));
          }
        } else {
          const ref = db.collection('products').doc(id);
          batch.update(ref, fields);
        }

        updated++;
      } catch (e) {
        console.error(`❌ שגיאה במוצר ${id}:`, e.message);
        failed++;
      }
    }

    if (!testMode) {
      try {
        await batch.commit();
        console.log(`✅ באץ' ${Math.floor(i / BATCH_SIZE) + 1}: עודכנו ${chunk.length} מוצרים (סה"כ ${Math.min(i + BATCH_SIZE, docs.length)}/${docs.length})`);
      } catch (e) {
        console.error(`❌ באץ' נכשל:`, e.message);
        failed += chunk.length;
        updated -= chunk.length;
      }
    }

    // המתן קצת בין באצ'ים כדי לא להעמיס
    if (i + BATCH_SIZE < docs.length) await sleep(500);
  }

  console.log('\n══════════════════════════════════════');
  console.log('🎉 סיום!');
  console.log(`✅ עודכנו: ${updated}`);
  console.log(`⏭  דולגו:  ${skipped}`);
  console.log(`❌ נכשלו:  ${failed}`);
  if (testMode) console.log('\n🧪 זו הייתה ריצת בדיקה. הפעל ללא --test לעדכון אמיתי.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
